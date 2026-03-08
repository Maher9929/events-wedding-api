import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  private async applyPaymentToBooking(
    bookingId: string,
    paidAmount: number,
    paymentIntentId: string,
    paymentType: 'deposit' | 'balance' | 'full',
  ): Promise<void> {
    const { data: booking, error: bookingError } = await this.supabase
      .from('bookings')
      .select(
        'id, amount, deposit_amount, balance_amount, payment_status, payment_intent_ids',
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(bookingError?.message || 'Booking not found');
    }

    // Idempotency: check if this payment intent was already applied
    const existingPaymentIds = Array.isArray(booking.payment_intent_ids)
      ? booking.payment_intent_ids
      : [];
    if (existingPaymentIds.includes(paymentIntentId)) {
      return;
    }

    const totalAmount = Number(booking.amount);
    const depositAmount = Number(booking.deposit_amount || 0);
    const currentBalance = Number(booking.balance_amount || totalAmount);

    let newPaymentStatus:
      | 'pending'
      | 'deposit_paid'
      | 'fully_paid'
      | 'refunded' = booking.payment_status || 'pending';
    let newBalance = currentBalance;

    if (paymentType === 'deposit') {
      newPaymentStatus = 'deposit_paid';
      newBalance = totalAmount - depositAmount;
    } else if (paymentType === 'balance') {
      newPaymentStatus = 'fully_paid';
      newBalance = 0;
    } else if (paymentType === 'full') {
      newPaymentStatus = 'fully_paid';
      newBalance = 0;
    }

    const { error: updateError } = await this.supabase
      .from('bookings')
      .update({
        payment_status: newPaymentStatus,
        balance_amount: newBalance,
        payment_intent_ids: [...existingPaymentIds, paymentIntentId],
      })
      .eq('id', bookingId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Create payment record for tracking
    await this.supabase.from('payment_records').insert({
      booking_id: bookingId,
      payment_intent_id: paymentIntentId,
      payment_type: paymentType,
      amount: paidAmount,
      status: 'completed',
      created_at: new Date().toISOString(),
    });
  }

  constructor(
    private readonly configService: ConfigService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2026-01-28.clover',
      },
    );
  }

  async createPaymentIntent(
    bookingId: string,
    amount: number,
    currency = 'qar',
    paymentType: 'deposit' | 'balance' | 'full' = 'full',
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const { data: booking, error: bookingError } = await this.supabase
      .from('bookings')
      .select('amount, deposit_amount, balance_amount, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate payment amount and type
    const totalAmount = Number(booking.amount);
    const depositAmount = Number(booking.deposit_amount || 0);
    const remainingBalance = Number(booking.balance_amount || totalAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    if (paymentType === 'deposit' && amount !== depositAmount) {
      throw new BadRequestException(
        'Deposit amount must match the required deposit',
      );
    }

    if (
      paymentType === 'balance' &&
      (booking.payment_status !== 'deposit_paid' || amount !== remainingBalance)
    ) {
      throw new BadRequestException(
        'Balance payment requires deposit to be paid first',
      );
    }

    if (paymentType === 'full' && amount !== totalAmount) {
      throw new BadRequestException(
        'Full payment amount must match the total booking amount',
      );
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        booking_id: bookingId,
        payment_type: paymentType,
        total_amount: totalAmount.toString(),
        deposit_amount: depositAmount.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  async createDepositPaymentIntent(
    bookingId: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .select('deposit_amount, payment_status')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.payment_status !== 'pending') {
      throw new BadRequestException('Deposit payment already processed');
    }

    const depositAmount = Number(booking.deposit_amount || 0);
    if (depositAmount <= 0) {
      throw new BadRequestException('No deposit required for this booking');
    }

    return this.createPaymentIntent(bookingId, depositAmount, 'qar', 'deposit');
  }

  async createBalancePaymentIntent(
    bookingId: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .select('balance_amount, payment_status')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.payment_status !== 'deposit_paid') {
      throw new BadRequestException('Deposit must be paid first');
    }

    const balanceAmount = Number(booking.balance_amount || 0);
    if (balanceAmount <= 0) {
      throw new BadRequestException('No balance remaining for this booking');
    }

    return this.createPaymentIntent(bookingId, balanceAmount, 'qar', 'balance');
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch {
      throw new Error('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const bookingId = intent.metadata?.booking_id;

      if (bookingId) {
        const paidAmount = Number(
          (intent.amount_received || intent.amount || 0) / 100,
        );
        const paymentType =
          (intent.metadata?.payment_type as 'deposit' | 'balance' | 'full') ||
          'full';
        await this.applyPaymentToBooking(
          bookingId,
          paidAmount,
          intent.id,
          paymentType,
        );

        // Store Stripe receipt URL if available
        try {
          const latestChargeId =
            typeof intent.latest_charge === 'string'
              ? intent.latest_charge
              : (intent.latest_charge as any)?.id;
          if (latestChargeId) {
            const charge = await this.stripe.charges.retrieve(latestChargeId);
            if (charge.receipt_url) {
              await this.supabase
                .from('bookings')
                .update({ receipt_url: charge.receipt_url })
                .eq('id', bookingId);
            }
          }
        } catch {
          // Non-critical — receipt URL is optional
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const bookingId = intent.metadata?.booking_id;
      if (bookingId) {
        await this.supabase
          .from('bookings')
          .update({ payment_status: 'pending' })
          .eq('id', bookingId);
      }
    }
  }

  async confirmPayment(
    bookingId: string,
    paymentIntentId: string,
  ): Promise<void> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (
      intent.status === 'succeeded' &&
      intent.metadata?.booking_id === bookingId
    ) {
      const paidAmount = Number(
        (intent.amount_received || intent.amount || 0) / 100,
      );
      const paymentType =
        (intent.metadata?.payment_type as 'deposit' | 'balance' | 'full') ||
        'full';
      await this.applyPaymentToBooking(
        bookingId,
        paidAmount,
        paymentIntentId,
        paymentType,
      );
    } else {
      throw new Error('Payment not confirmed');
    }
  }

  async getPaymentStatus(bookingId: string): Promise<{
    payment_status: string;
    payment_intent_id: string | null;
    balance_amount?: number;
    amount?: number;
  }> {
    const { data } = await this.supabase
      .from('bookings')
      .select('payment_status, payment_intent_id, balance_amount, amount')
      .eq('id', bookingId)
      .single();
    return (
      data || {
        payment_status: 'pending',
        payment_intent_id: null,
        balance_amount: 0,
        amount: 0,
      }
    );
  }

  async refundPayment(
    bookingId: string,
    reason?: string,
  ): Promise<{ refundId: string; status: string }> {
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .select('payment_intent_id, amount, payment_status')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!booking.payment_intent_id) {
      throw new BadRequestException('No payment found for this booking');
    }

    if (booking.payment_status !== 'paid') {
      throw new BadRequestException('Booking has not been paid yet');
    }

    const intent = await this.stripe.paymentIntents.retrieve(
      booking.payment_intent_id,
    );
    const latestChargeId =
      typeof intent.latest_charge === 'string'
        ? intent.latest_charge
        : (intent.latest_charge as any)?.id;

    if (!latestChargeId) {
      throw new BadRequestException('No charge found for this payment');
    }

    const refund = await this.stripe.refunds.create({
      charge: latestChargeId,
      reason: (reason as any) || 'requested_by_customer',
    });

    await this.supabase
      .from('bookings')
      .update({ payment_status: 'refunded', status: 'cancelled' })
      .eq('id', bookingId);

    return { refundId: refund.id, status: refund.status ?? 'pending' };
  }
}
