import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SupabaseProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
