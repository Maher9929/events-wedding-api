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
import {
  ConfirmPaymentDto,
  CreatePaymentIntentDto,
  RefundPaymentDto,
} from './dto/payment-request.dto';

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
    @Request() req,
    @Body() body: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(
      bookingId,
      req.user.id,
      body.amount,
      body.currency,
      body.paymentType || 'full',
    );
  }

  @Post('deposit/:bookingId')
  @UseGuards(JwtAuthGuard)
  async createDepositPaymentIntent(
    @Param('bookingId') bookingId: string,
    @Request() req,
  ) {
    return this.paymentsService.createDepositPaymentIntent(
      bookingId,
      req.user.id,
    );
  }

  @Post('balance/:bookingId')
  @UseGuards(JwtAuthGuard)
  async createBalancePaymentIntent(
    @Param('bookingId') bookingId: string,
    @Request() req,
  ) {
    return this.paymentsService.createBalancePaymentIntent(
      bookingId,
      req.user.id,
    );
  }

  @Post('confirm/:bookingId')
  @UseGuards(JwtAuthGuard)
  async confirmPayment(
    @Param('bookingId') bookingId: string,
    @Request() req,
    @Body() body: ConfirmPaymentDto,
  ) {
    await this.paymentsService.confirmPayment(
      bookingId,
      req.user.id,
      body.paymentIntentId,
    );
    return { success: true };
  }

  @Get('status/:bookingId')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @Param('bookingId') bookingId: string,
    @Request() req,
  ) {
    return this.paymentsService.getPaymentStatus(bookingId, req.user.id);
  }

  @Post('refund/:bookingId')
  @UseGuards(JwtAuthGuard)
  async refundPayment(
    @Param('bookingId') bookingId: string,
    @Request() req,
    @Body() body: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(
      bookingId,
      req.user.id,
      body.reason ?? '',
      body.amount,
    );
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
    @Request() req,
    @Res() res: Response,
  ) {
    await this.paymentsService.assertBookingAccess(bookingId, req.user.id);
    return this.invoiceService.generateInvoicePdf(bookingId, res);
  }
}
