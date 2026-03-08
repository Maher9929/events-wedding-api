import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [ModerationController],
  providers: [ModerationService, SupabaseProvider],
  exports: [ModerationService],
})
export class ModerationModule {}
