import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import { SupabaseProvider } from '../config/supabase.config';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, InvoiceService, SupabaseProvider],
  exports: [PaymentsService, InvoiceService],
})
export class PaymentsModule {}
