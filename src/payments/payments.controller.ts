import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Req,
  Headers,
  Request,
  Res,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post('create-intent/:bookingId')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(
    @Param('bookingId') bookingId: string,
    @Body('amount') amount: number,
    @Body('currency') currency?: string,
    @Body('paymentType') paymentType: 'deposit' | 'balance' | 'full' = 'full',
  ) {
    return this.paymentsService.createPaymentIntent(
      bookingId,
      amount,
      currency,
      paymentType,
    );
  }

  @Post('deposit/:bookingId')
  @UseGuards(JwtAuthGuard)
  async createDepositPaymentIntent(@Param('bookingId') bookingId: string) {
    return this.paymentsService.createDepositPaymentIntent(bookingId);
  }

  @Post('balance/:bookingId')
  @UseGuards(JwtAuthGuard)
  async createBalancePaymentIntent(@Param('bookingId') bookingId: string) {
    return this.paymentsService.createBalancePaymentIntent(bookingId);
  }

  @Post('confirm/:bookingId')
  @UseGuards(JwtAuthGuard)
  async confirmPayment(
    @Param('bookingId') bookingId: string,
    @Body('paymentIntentId') paymentIntentId: string,
  ) {
    await this.paymentsService.confirmPayment(bookingId, paymentIntentId);
    return { success: true };
  }

  @Get('status/:bookingId')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getPaymentStatus(bookingId);
  }

  @Post('refund/:bookingId')
  @UseGuards(JwtAuthGuard)
  async refundPayment(
    @Param('bookingId') bookingId: string,
    @Body('reason') reason?: string,
    @Req() req?: any,
  ) {
    return this.paymentsService.refundPayment(bookingId, reason);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentsService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
  @Get('invoice/:bookingId')
  @UseGuards(JwtAuthGuard)
  async downloadInvoice(
    @Param('bookingId') bookingId: string,
    @Res() res: Response,
  ) {
    return this.invoiceService.generateInvoicePdf(bookingId, res);
  }
}
