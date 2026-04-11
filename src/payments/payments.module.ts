import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import { SupabaseProvider } from '../config/supabase.config';
import { AuditLogService } from '../common/audit-log.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    InvoiceService,
    SupabaseProvider,
    AuditLogService,
  ],
  exports: [PaymentsService, InvoiceService],
})
export class PaymentsModule {}
