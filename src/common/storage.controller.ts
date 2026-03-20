import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Storage controller — provides server-side proxy for Supabase Storage operations.
 * This complements the frontend direct-upload flow by offering:
 *   • Signed upload URLs (so the frontend never needs the service_role key)
 *   • Server-side file deletion (for cleanup)
 */
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Generate a signed upload URL so the frontend can upload directly to Supabase Storage
   * without exposing the service_role key.
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

    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { success: true };
  }
}
