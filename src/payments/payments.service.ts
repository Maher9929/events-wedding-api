import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { AuditLogService } from '../common/audit-log.service';
import { ProviderContextService } from '../common/provider-context.service';
import { CommissionService } from '../common/commission.service';
import { BookingNotificationService } from '../common/booking-notification.service';
import { COMMISSION_RATE, DEFAULT_CURRENCY } from '../common/constants';

/** Fields used by the payment helpers — keeps the service free of `any`. */
interface BookingRecord {
  id: string;
  amount: number;
  deposit_amount?: number;
  deposit_percentage?: number;
  balance_amount?: number;
  platform_fee?: number;
  payment_status: string;
  payment_intent_id?: string;
  payment_intent_ids?: string[];
  status: string;
  client_id: string;
  provider_id: string;
  booking_date?: string;
  refund_policy_id?: string;
  cancellation_reason?: string;
  receipt_url?: string;
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  private readonly logger = new Logger(PaymentsService.name);
  private readonly commissionRate = COMMISSION_RATE;
  private readonly defaultCurrency = DEFAULT_CURRENCY;

  constructor(
    private readonly configService: ConfigService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly auditLogService: AuditLogService,
    private readonly providerContext: ProviderContextService,
    private readonly commissionService: CommissionService,
    private readonly notificationService: BookingNotificationService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2026-01-28.clover',
      },
    );
  }

  // getProviderContext → delegated to this.providerContext

  async assertBookingAccess(
    bookingId: string,
    userId?: string,
  ): Promise<BookingRecord> {
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!userId) {
      return booking;
    }

    const hasAccess = await this.providerContext.canAccessBooking(
      booking,
      userId,
    );

    if (!hasAccess) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  private async assertBookingClientAccess(
    bookingId: string,
    userId?: string,
  ): Promise<BookingRecord> {
    const booking = await this.assertBookingAccess(bookingId, userId);

    if (userId && booking.client_id !== userId) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  private normalizeCurrency(currency?: string): string {
    return (currency || this.defaultCurrency).toLowerCase();
  }

  private getBookingAmounts(booking: BookingRecord) {
    const totalAmount = Number(booking.amount || 0);
    const depositAmount =
      Number(booking.deposit_amount || 0) ||
      Number((totalAmount * Number(booking.deposit_percentage || 20)) / 100);
    const balanceAmount =
      Number(booking.balance_amount ?? totalAmount - depositAmount) || 0;

    return {
      totalAmount: Number(totalAmount.toFixed(2)),
      depositAmount: Number(depositAmount.toFixed(2)),
      balanceAmount: Number(balanceAmount.toFixed(2)),
    };
  }

  private resolveExpectedAmount(
    booking: BookingRecord,
    paymentType: 'deposit' | 'balance' | 'full',
  ): number {
    const { totalAmount, depositAmount, balanceAmount } =
      this.getBookingAmounts(booking);

    if (paymentType === 'deposit') {
      return depositAmount;
    }

    if (paymentType === 'balance') {
      return balanceAmount;
    }

    return totalAmount;
  }

  private assertPaymentEligibility(
    booking: BookingRecord,
    paymentType: 'deposit' | 'balance' | 'full',
    amount: number,
  ): void {
    const expectedAmount = this.resolveExpectedAmount(booking, paymentType);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    if (Number(amount.toFixed(2)) !== Number(expectedAmount.toFixed(2))) {
      throw new BadRequestException(
        `${paymentType} payment amount must match the expected booking amount`,
      );
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      throw new BadRequestException(
        'Cancelled or rejected bookings cannot be paid',
      );
    }

    if (paymentType === 'deposit' && booking.payment_status !== 'pending') {
      throw new BadRequestException('Deposit payment already processed');
    }

    if (
      paymentType === 'balance' &&
      booking.payment_status !== 'deposit_paid'
    ) {
      throw new BadRequestException(
        'Balance payment requires a paid deposit first',
      );
    }

    if (paymentType === 'full' && booking.payment_status !== 'pending') {
      throw new BadRequestException(
        'Full payment is only allowed before any payment',
      );
    }
  }

  private async getCompletedPaymentTotals(bookingId: string): Promise<{
    totalPaid: number;
    totalRefunded: number;
  }> {
    const { data: paymentRecords } = await this.supabase
      .from('payment_records')
      .select('payment_type, amount, status')
      .eq('booking_id', bookingId)
      .in('status', ['completed', 'refunded']);

    const records = paymentRecords || [];
    const totalPaid = records
      .filter((record) =>
        ['deposit', 'balance', 'full'].includes(record.payment_type),
      )
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const totalRefunded = records
      .filter((record) => record.payment_type === 'refund')
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);

    return {
      totalPaid: Number(totalPaid.toFixed(2)),
      totalRefunded: Number(totalRefunded.toFixed(2)),
    };
  }

  private async resolveRefundAllowance(
    booking: BookingRecord,
  ): Promise<number> {
    const { totalPaid, totalRefunded } = await this.getCompletedPaymentTotals(
      booking.id,
    );
    const refundablePaid = Math.max(totalPaid - totalRefunded, 0);

    if (refundablePaid <= 0) {
      return 0;
    }

    const { data: policy } = booking.refund_policy_id
      ? await this.supabase
          .from('refund_policies')
          .select('*')
          .eq('id', booking.refund_policy_id)
          .maybeSingle()
      : { data: null };

    if (!policy || !booking.booking_date) {
      return refundablePaid;
    }

    const bookingDate = new Date(booking.booking_date);
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysBeforeEvent = Math.floor(
      (bookingDate.getTime() - now.getTime()) / msPerDay,
    );

    if (
      daysBeforeEvent >= Number(policy.days_before_event_for_full_refund || 0)
    ) {
      return refundablePaid;
    }

    if (
      daysBeforeEvent >=
      Number(policy.days_before_event_for_partial_refund || 0)
    ) {
      if (booking.payment_status === 'deposit_paid') {
        return Number(
          (
            refundablePaid *
            (Number(policy.deposit_refund_percentage || 0) / 100)
          ).toFixed(2),
        );
      }

      const { depositAmount, balanceAmount } = this.getBookingAmounts(booking);
      const depositRefund = Number(
        (
          depositAmount *
          (Number(policy.deposit_refund_percentage || 0) / 100)
        ).toFixed(2),
      );
      const balanceRefund = Number(
        (
          balanceAmount *
          (Number(policy.balance_refund_percentage || 0) / 100)
        ).toFixed(2),
      );
      return Math.min(
        refundablePaid,
        Number((depositRefund + balanceRefund).toFixed(2)),
      );
    }

    if (booking.payment_status === 'deposit_paid') {
      return Number(
        (
          refundablePaid *
          (Number(policy.deposit_refund_percentage || 0) / 100)
        ).toFixed(2),
      );
    }

    return Number(
      (
        refundablePaid *
        (Number(policy.balance_refund_percentage || 0) / 100)
      ).toFixed(2),
    );
  }

  private async applyPaymentToBooking(
    bookingId: string,
    paidAmount: number,
    paymentIntentId: string,
    paymentType: 'deposit' | 'balance' | 'full',
  ): Promise<void> {
    const { data: booking, error: bookingError } = await this.supabase
      .from('bookings')
      .select(
        'id, amount, deposit_amount, balance_amount, payment_status, payment_intent_id, payment_intent_ids, provider_id, client_id, platform_fee, status',
      )
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new BadRequestException(
        bookingError?.message || 'Booking not found',
      );
    }

    // Idempotency: check if this payment intent was already applied
    const existingPaymentIds = Array.isArray(booking.payment_intent_ids)
      ? booking.payment_intent_ids
      : [];
    if (existingPaymentIds.includes(paymentIntentId)) {
      return;
    }
    this.assertPaymentEligibility(booking, paymentType, paidAmount);

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
        payment_intent_id: paymentIntentId,
        payment_intent_ids: [...existingPaymentIds, paymentIntentId],
      })
      .eq('id', bookingId);

    if (updateError) {
      throw new BadRequestException(updateError.message);
    }

    // Create payment record for tracking
    await this.supabase.from('payment_records').insert({
      booking_id: bookingId,
      payment_intent_id: paymentIntentId,
      payment_type: paymentType,
      amount: paidAmount,
      platform_fee: Number(booking.platform_fee || 0),
      net_amount: paidAmount,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    const providerUserId = await this.providerContext.resolveProviderUserId(
      booking.provider_id,
    );
    await this.commissionService.upsert({
      bookingId,
      providerUserId,
      grossAmount: Number(booking.amount || 0),
      paymentStatus: newPaymentStatus,
      platformFee: Number(booking.platform_fee || 0),
      metadata: {
        payment_type: paymentType,
        payment_intent_id: paymentIntentId,
        amount: paidAmount,
      },
    });

    await this.auditLogService.log(
      booking.client_id || null,
      'payment_confirmed',
      'payments',
      paymentIntentId,
      {
        booking_id: bookingId,
        payment_type: paymentType,
        amount: paidAmount,
        payment_status: newPaymentStatus,
      },
    );

    await this.notificationService.notifyPayment(
      booking,
      paidAmount,
      paymentType,
      newPaymentStatus,
      this.defaultCurrency,
    );
  }

  // createPaymentNotifications → delegated to this.notificationService.notifyPayment
  // syncCommissionForBooking → delegated to this.commissionService.upsert
  // resolveCommissionProviderId → delegated to this.providerContext.resolveProviderUserId

  async createPaymentIntent(
    bookingId: string,
    userId: string | undefined,
    amount: number,
    currency?: string,
    paymentType: 'deposit' | 'balance' | 'full' = 'full',
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const booking = await this.assertBookingClientAccess(bookingId, userId);
    const { totalAmount, depositAmount } = this.getBookingAmounts(booking);
    this.assertPaymentEligibility(booking, paymentType, amount);

    const isMock =
      !this.configService.get<string>('STRIPE_SECRET_KEY') ||
      this.configService
        .get<string>('STRIPE_SECRET_KEY')
        ?.includes('YOUR_STRIPE_SECRET_KEY');

    if (isMock) {
      const suffix = `${bookingId}_${paymentType}_${Date.now()}`;
      return {
        clientSecret: `pi_mock_${suffix}_secret`,
        paymentIntentId: `pi_mock_${suffix}`,
      };
    }

    const stripeAmount = Math.round(amount * 100);
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: stripeAmount,
        currency: this.normalizeCurrency(currency),
        metadata: {
          booking_id: bookingId,
          payment_type: paymentType,
          total_amount: totalAmount.toString(),
          deposit_amount: depositAmount.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        idempotencyKey: `booking:${bookingId}:${paymentType}:${stripeAmount}`,
      },
    );

    await this.auditLogService.log(
      userId || booking.client_id || null,
      'payment_intent_created',
      'payments',
      paymentIntent.id,
      {
        booking_id: bookingId,
        payment_type: paymentType,
        amount,
        currency: this.normalizeCurrency(currency),
      },
    );

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  async createDepositPaymentIntent(
    bookingId: string,
    userId?: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const booking = await this.assertBookingClientAccess(bookingId, userId);

    if (booking.payment_status !== 'pending') {
      throw new BadRequestException('Deposit payment already processed');
    }

    const depositAmount = Number(booking.deposit_amount || 0);
    if (depositAmount <= 0) {
      throw new BadRequestException('No deposit required for this booking');
    }

    return this.createPaymentIntent(
      bookingId,
      userId,
      depositAmount,
      this.defaultCurrency,
      'deposit',
    );
  }

  async createBalancePaymentIntent(
    bookingId: string,
    userId?: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const booking = await this.assertBookingClientAccess(bookingId, userId);

    if (booking.payment_status !== 'deposit_paid') {
      throw new BadRequestException('Deposit must be paid first');
    }

    const balanceAmount = Number(booking.balance_amount || 0);
    if (balanceAmount <= 0) {
      throw new BadRequestException('No balance remaining for this booking');
    }

    return this.createPaymentIntent(
      bookingId,
      userId,
      balanceAmount,
      this.defaultCurrency,
      'balance',
    );
  }

  async createFullPaymentIntent(
    bookingId: string,
    userId?: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const booking = await this.assertBookingClientAccess(bookingId, userId);
    const amount = Number(booking.amount || 0);

    return this.createPaymentIntent(
      bookingId,
      userId,
      amount,
      this.defaultCurrency,
      'full',
    );
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook signature verification failed: ${message}`);
      throw new BadRequestException(`Webhook Error: ${message}`);
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
              : intent.latest_charge?.id;
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
    userIdOrPaymentIntentId: string,
    maybePaymentIntentId?: string,
  ): Promise<void> {
    const userId = maybePaymentIntentId ? userIdOrPaymentIntentId : undefined;
    const paymentIntentId = maybePaymentIntentId || userIdOrPaymentIntentId;

    const booking = await this.assertBookingClientAccess(bookingId, userId);

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (
      intent.status !== 'succeeded' ||
      intent.metadata?.booking_id !== bookingId
    ) {
      throw new BadRequestException('Payment not confirmed');
    }

    const paidAmount = Number(
      (intent.amount_received || intent.amount || 0) / 100,
    );
    const paymentType =
      (intent.metadata?.payment_type as 'deposit' | 'balance' | 'full') ||
      'full';
    this.assertPaymentEligibility(booking, paymentType, paidAmount);
  }

  async getPaymentStatus(
    bookingId: string,
    userId?: string,
  ): Promise<{
    payment_status: string;
    payment_intent_id: string | null;
    deposit_amount?: number;
    balance_amount?: number;
    amount?: number;
  }> {
    try {
      const booking = await this.assertBookingAccess(bookingId, userId);
      const paymentIntentIds = Array.isArray(booking.payment_intent_ids)
        ? booking.payment_intent_ids
        : [];
      return {
        payment_status: booking.payment_status || 'pending',
        payment_intent_id:
          booking.payment_intent_id ||
          paymentIntentIds[paymentIntentIds.length - 1] ||
          null,
        deposit_amount: booking.deposit_amount || 0,
        balance_amount: booking.balance_amount || 0,
        amount: booking.amount || 0,
      };
    } catch (error) {
      if (error instanceof NotFoundException && !userId) {
        return {
          payment_status: 'pending',
          payment_intent_id: null,
          deposit_amount: 0,
          balance_amount: 0,
          amount: 0,
        };
      }

      throw error;
    }
  }

  async refundPayment(
    bookingId: string,
    userIdOrReason?: string,
    maybeReason?: string,
    maybeAmount?: number,
  ): Promise<{ refundId: string; status: string }> {
    const userId = maybeReason !== undefined ? userIdOrReason : undefined;
    const reason = maybeReason !== undefined ? maybeReason : userIdOrReason;
    const requestedAmount = maybeReason !== undefined ? maybeAmount : undefined;

    let booking: BookingRecord;
    try {
      booking = await this.assertBookingAccess(bookingId, userId);
    } catch (error) {
      if (error instanceof NotFoundException && !userId) {
        throw new BadRequestException('Booking not found');
      }

      throw error;
    }

    const paymentIntentIds = Array.isArray(booking.payment_intent_ids)
      ? booking.payment_intent_ids
      : [];
    const latestPaymentIntentId =
      booking.payment_intent_id ||
      paymentIntentIds[paymentIntentIds.length - 1] ||
      null;

    if (!latestPaymentIntentId) {
      throw new BadRequestException('No payment found for this booking');
    }

    if (
      booking.payment_status !== 'fully_paid' &&
      booking.payment_status !== 'deposit_paid'
    ) {
      throw new BadRequestException('Booking has not been paid yet');
    }

    if (
      booking.client_id !== userId &&
      booking.provider_id !== userId &&
      userId !== undefined
    ) {
      throw new ForbiddenException('You cannot refund this booking');
    }

    const refundableAmount = await this.resolveRefundAllowance(booking);
    if (refundableAmount <= 0) {
      throw new BadRequestException(
        'No refundable amount remains for this booking',
      );
    }

    const refundAmount = requestedAmount
      ? Number(requestedAmount.toFixed(2))
      : refundableAmount;

    if (refundAmount <= 0 || refundAmount > refundableAmount) {
      throw new BadRequestException(
        `Refund amount must be between 0 and ${refundableAmount}`,
      );
    }

    const intent = await this.stripe.paymentIntents.retrieve(
      latestPaymentIntentId,
    );
    const latestChargeId =
      typeof intent.latest_charge === 'string'
        ? intent.latest_charge
        : intent.latest_charge?.id;

    if (!latestChargeId) {
      throw new BadRequestException('No charge found for this payment');
    }

    const refund = await this.stripe.refunds.create({
      charge: latestChargeId,
      amount: Math.round(refundAmount * 100),
      reason:
        (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
    });

    const { totalPaid, totalRefunded } =
      await this.getCompletedPaymentTotals(bookingId);
    const fullyRefunded =
      Number((totalRefunded + refundAmount).toFixed(2)) >=
      Number(totalPaid.toFixed(2));

    await this.supabase
      .from('bookings')
      .update({
        payment_status: fullyRefunded ? 'refunded' : booking.payment_status,
        status: 'cancelled',
        cancellation_reason: reason || booking.cancellation_reason || null,
      })
      .eq('id', bookingId);

    await this.supabase.from('payment_records').insert({
      booking_id: bookingId,
      payment_intent_id: latestPaymentIntentId,
      payment_type: 'refund',
      amount: refundAmount,
      platform_fee: Number(booking.platform_fee || 0),
      net_amount: 0,
      refund_id: refund.id,
      refund_reason: reason || null,
      status: 'refunded',
      created_at: new Date().toISOString(),
    });

    const retainedRevenue = Math.max(
      totalPaid - totalRefunded - refundAmount,
      0,
    );
    const refundProviderUserId =
      await this.providerContext.resolveProviderUserId(booking.provider_id);
    await this.commissionService.upsert({
      bookingId,
      providerUserId: refundProviderUserId,
      grossAmount: Number(booking.amount || 0),
      paymentStatus: fullyRefunded ? 'refunded' : booking.payment_status,
      platformFee: Number(booking.platform_fee || 0),
      grossAmountOverride: retainedRevenue,
      metadata: {
        refund_id: refund.id,
        reason: reason || null,
        refund_amount: refundAmount,
        retained_revenue: retainedRevenue,
      },
    });

    await this.auditLogService.log(
      booking.client_id || userId || null,
      'booking_refund',
      'payments',
      refund.id,
      {
        booking_id: bookingId,
        payment_intent_id: latestPaymentIntentId,
        reason: reason || null,
        refund_amount: refundAmount,
        fully_refunded: fullyRefunded,
      },
    );

    return { refundId: refund.id, status: refund.status ?? 'pending' };
  }

  async refundPaymentAsAdmin(
    bookingId: string,
    adminId: string,
    reason?: string,
    amount?: number,
  ): Promise<{ refundId: string; status: string }> {
    const result = await this.refundPayment(
      bookingId,
      undefined,
      reason,
      amount,
    );

    await this.auditLogService.log(
      adminId,
      'booking_refund',
      'payments',
      result.refundId,
      {
        booking_id: bookingId,
        reason: reason || null,
        actor_role: 'admin',
      },
    );

    return result;
  }
}
