import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import { SupabaseProvider } from '../config/supabase.config';
import { AuditLogService } from '../common/audit-log.service';
import { ProviderContextService } from '../common/provider-context.service';
import { CommissionService } from '../common/commission.service';
import { BookingNotificationService } from '../common/booking-notification.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    InvoiceService,
    SupabaseProvider,
    AuditLogService,
    ProviderContextService,
    CommissionService,
    BookingNotificationService,
  ],
  exports: [PaymentsService, InvoiceService],
})
export class PaymentsModule {}
