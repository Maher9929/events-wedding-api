import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { SupabaseProvider } from '../config/supabase.config';
import { AuditLogService } from '../common/audit-log.service';

@Module({
  imports: [],
  controllers: [BookingsController],
  providers: [BookingsService, SupabaseProvider, AuditLogService],
  exports: [BookingsService],
})
export class BookingsModule {}
