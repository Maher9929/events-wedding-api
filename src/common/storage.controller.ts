import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  BadRequestException,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Logger,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { UserRole } from '../users/dto/create-user.dto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES_PER_REQUEST = 5;
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Storage controller — server-side proxy for Supabase Storage operations.
 * All uploads go through the backend (service_role key) so the frontend
 * never needs direct Supabase Storage write access.
 */
@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Upload a single file. Returns the public URL.
   * Body param `folder` is optional (defaults to 'general').
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `File type ${file.mimetype} not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    this.logger.log(
      `Upload request: file=${file?.originalname}, size=${file?.size}, folder=${folder}`,
    );
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.uploadToSupabase(file, req.user.id, folder || 'general');
  }

  /**
   * Upload multiple files (max 5). Returns an array of public URLs.
   */
  @Post('upload-multiple')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `File type ${file.mimetype} not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadMultipleFiles(
    @Request() req: AuthenticatedRequest,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ) {
    this.logger.log(
      `Upload-multiple request: files=${files?.length}, folder=${folder}`,
    );
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      throw new BadRequestException(
        `Too many files. Maximum is ${MAX_FILES_PER_REQUEST}`,
      );
    }

    const results = await Promise.all(
      files.map((file) =>
        this.uploadToSupabase(file, req.user.id, folder || 'general'),
      ),
    );

    return results;
  }

  /**
   * Generate a signed upload URL (legacy endpoint).
   */
  @Post('signed-url')
  async getSignedUploadUrl(
    @Request() req: AuthenticatedRequest,
    @Body('bucket') bucket: string,
    @Body('path') path: string,
  ) {
    if (!bucket || !path) {
      throw new BadRequestException('bucket and path are required');
    }
    if (bucket !== 'attachments') {
      throw new BadRequestException('Only attachments bucket is allowed');
    }

    const safePath = this.buildUserStoragePath(req.user.id, 'signed', path);

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUploadUrl(safePath);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
    };
  }

  /**
   * Get a public URL for a given file path.
   */
  @Post('public-url')
  async getPublicUrl(
    @Body('bucket') bucket: string,
    @Body('path') path: string,
  ) {
    if (!bucket || !path) {
      throw new BadRequestException('bucket and path are required');
    }
    if (bucket !== 'attachments') {
      throw new BadRequestException('Only attachments bucket is allowed');
    }

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);

    return { publicUrl: data.publicUrl };
  }

  /**
   * Delete a file from Supabase Storage.
   */
  @Delete(':bucket/*')
  async deleteFile(
    @Request() req: AuthenticatedRequest,
    @Param('bucket') bucket: string,
    @Param('*') path: string,
  ) {
    if (!bucket || !path) {
      throw new BadRequestException('bucket and path are required');
    }
    if (bucket !== 'attachments') {
      throw new BadRequestException('Only attachments bucket is allowed');
    }
    if (!this.canManagePath(req.user.id, req.user.role, path)) {
      throw new ForbiddenException('You can only delete your own files');
    }

    const { error } = await this.supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { success: true };
  }

  /**
   * Internal helper — uploads a file buffer to Supabase Storage and returns metadata.
   */
  private async uploadToSupabase(
    file: Express.Multer.File,
    userId: string,
    folder: string,
  ) {
    const bucket = 'attachments';
    this.validateOriginalFilename(file.originalname);

    const ext = MIME_EXTENSION[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Unsupported file type');
    }

    const filePath = this.buildUserStoragePath(
      userId,
      folder,
      `${Date.now()}_${randomUUID()}.${ext}`,
    );

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      this.logger.error(`Supabase upload failed: ${JSON.stringify(error)}`);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }

  private validateOriginalFilename(filename: string) {
    if (!filename || filename.length > 180) {
      throw new BadRequestException('Invalid file name');
    }

    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\') ||
      this.hasControlCharacters(filename)
    ) {
      throw new BadRequestException('Invalid file name');
    }
  }

  private hasControlCharacters(value: string) {
    return [...value].some((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127;
    });
  }

  private buildUserStoragePath(
    userId: string,
    folder: string,
    filename: string,
  ) {
    const safeFolder = this.sanitizePathSegment(folder || 'general');
    const safeFilename = this.sanitizePathSegment(filename);

    return `users/${userId}/${safeFolder}/${safeFilename}`;
  }

  private sanitizePathSegment(value: string) {
    const sanitized = value
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^\.+/, '')
      .slice(0, 120);

    if (!sanitized || sanitized === '.' || sanitized === '..') {
      throw new BadRequestException('Invalid storage path');
    }

    return sanitized;
  }

  private canManagePath(userId: string, role: string, path: string) {
    if (role === (UserRole.ADMIN as string)) {
      return true;
    }

    return path.startsWith(`users/${userId}/`);
  }
}
