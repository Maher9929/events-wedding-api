import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Logger,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    this.logger.log(
      `Upload request: file=${file?.originalname}, size=${file?.size}, folder=${folder}`,
    );
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.uploadToSupabase(file, folder || 'general');
  }

  /**
   * Upload multiple files (max 5). Returns an array of public URLs.
   */
  @Post('upload-multiple')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
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
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ) {
    this.logger.log(
      `Upload-multiple request: files=${files?.length}, folder=${folder}`,
    );
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results = await Promise.all(
      files.map((file) => this.uploadToSupabase(file, folder || 'general')),
    );

    return results;
  }

  /**
   * Generate a signed upload URL (legacy endpoint).
   */
  @Post('signed-url')
  async getSignedUploadUrl(
    @Body('bucket') bucket: string,
    @Body('path') path: string,
  ) {
    if (!bucket || !path) {
      throw new BadRequestException('bucket and path are required');
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

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

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);

    return { publicUrl: data.publicUrl };
  }

  /**
   * Delete a file from Supabase Storage.
   */
  @Delete(':bucket/*')
  async deleteFile(@Param('bucket') bucket: string, @Param('*') path: string) {
    if (!bucket || !path) {
      throw new BadRequestException('bucket and path are required');
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
  private async uploadToSupabase(file: Express.Multer.File, folder: string) {
    const bucket = 'attachments';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 12);
    const ext = file.originalname.split('.').pop() || 'bin';
    const filePath = `${folder}/${timestamp}_${random}.${ext}`;

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
}
