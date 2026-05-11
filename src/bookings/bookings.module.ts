import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { SupabaseProvider } from '../config/supabase.config';
import { AuditLogService } from '../common/audit-log.service';
import { ProviderContextService } from '../common/provider-context.service';
import { CommissionService } from '../common/commission.service';
import { BookingNotificationService } from '../common/booking-notification.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    SupabaseProvider,
    AuditLogService,
    ProviderContextService,
    CommissionService,
    BookingNotificationService,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
