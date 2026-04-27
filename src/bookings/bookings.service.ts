import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
} from './dto/create-booking.dto';
import { Booking } from './entities/booking.entity';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AuditLogService } from '../common/audit-log.service';
import { sanitizeSearch } from '../common/sanitize';
import { COMMISSION_RATE } from '../common/constants';
import { addBookingAliases, mapArray } from '../common/response-compat';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  private readonly commissionRate = COMMISSION_RATE;

  private stripe: Stripe;

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2026-01-28.clover',
      },
    );
  }

  private async getProviderContext(userId: string): Promise<{
    userId: string;
    providerId: string | null;
  }> {
    const { data: provider } = await this.supabase
      .from('providers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      userId,
      providerId: provider?.id || null,
    };
  }

  private async assertProviderScope(
    providerId: string,
    userId: string,
  ): Promise<void> {
    const context = await this.getProviderContext(userId);
    if (providerId !== context.userId && providerId !== context.providerId) {
      throw new ForbiddenException(
        'You can only access bookings for your own provider profile',
      );
    }
  }

  private async canAccessBooking(
    booking: Booking,
    userId: string,
  ): Promise<boolean> {
    const context = await this.getProviderContext(userId);
    return (
      booking.client_id === context.userId ||
      booking.provider_id === context.userId ||
      (context.providerId !== null &&
        booking.provider_id === context.providerId)
    );
  }

  private async resolveProviderAndService(dto: CreateBookingDto) {
    const { data: providerRecord } = await this.supabase
      .from('providers')
      .select('id, user_id')
      .eq('id', dto.provider_id)
      .maybeSingle();

    if (!providerRecord) {
      throw new NotFoundException('Provider not found');
    }

    let serviceRecord: {
      id: string;
      provider_id: string;
      base_price: number | null;
      cancellation_policy?:
        | string
        | { notice_days?: number; refund_percentage?: number };
    } | null = null;

    if (dto.service_id) {
      const { data: service } = await this.supabase
        .from('services')
        .select('id, provider_id, base_price, cancellation_policy')
        .eq('id', dto.service_id)
        .maybeSingle();

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      if (service.provider_id !== providerRecord.id) {
        throw new BadRequestException(
          'The selected service does not belong to this provider',
        );
      }

      serviceRecord = service;
    }

    return {
      provider: providerRecord,
      service: serviceRecord,
    };
  }

  private buildDayRange(bookingDate: string) {
    const date = new Date(bookingDate);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      dayKey: start.toISOString().slice(0, 10),
    };
  }

  private normalizeTime(time?: string): number | null {
    if (!time) {
      return null;
    }

    const [hours, minutes] = time.split(':').map((part) => Number(part));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }

    return hours * 60 + minutes;
  }

  private hasTimeOverlap(
    requestedStart?: string,
    requestedEnd?: string,
    existingStart?: string,
    existingEnd?: string,
  ): boolean {
    const reqStart = this.normalizeTime(requestedStart);
    const reqEnd = this.normalizeTime(requestedEnd);
    const existingStartMinutes = this.normalizeTime(existingStart);
    const existingEndMinutes = this.normalizeTime(existingEnd);

    if (
      reqStart === null ||
      reqEnd === null ||
      existingStartMinutes === null ||
      existingEndMinutes === null
    ) {
      return true;
    }

    return reqStart < existingEndMinutes && existingStartMinutes < reqEnd;
  }

  private getCancellationNoticeDays(
    cancellationPolicy?: string | { notice_days?: number },
  ): number {
    if (
      cancellationPolicy &&
      typeof cancellationPolicy === 'object' &&
      Number.isFinite(cancellationPolicy.notice_days)
    ) {
      return Number(cancellationPolicy.notice_days);
    }

    return 7;
  }

  private async getDefaultRefundPolicyId(): Promise<string | null> {
    const { data: policy } = await this.supabase
      .from('refund_policies')
      .select('id')
      .eq('is_default', true)
      .maybeSingle();

    return policy?.id || null;
  }

  private async validateQuoteForBooking(
    clientId: string,
    dto: CreateBookingDto,
    providerUserId: string,
  ): Promise<void> {
    if (!dto.quote_id) {
      return;
    }

    const { data: quote } = await this.supabase
      .from('quotes')
      .select('id, client_id, provider_id, status, total_amount')
      .eq('id', dto.quote_id)
      .maybeSingle();

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.client_id !== clientId) {
      throw new ForbiddenException(
        'You can only convert your own quote into a booking',
      );
    }

    if (quote.provider_id !== providerUserId) {
      throw new BadRequestException(
        'The selected quote does not belong to this provider',
      );
    }

    if (quote.status !== 'accepted') {
      throw new BadRequestException(
        'Only accepted quotes can be converted into bookings',
      );
    }

    if (!dto.amount) {
      dto.amount = Number(quote.total_amount || 0);
    }
  }

  private async assertProviderAvailability(
    providerId: string,
    bookingDate: string,
    startTime?: string,
    endTime?: string,
  ): Promise<void> {
    const eventDate = new Date(bookingDate);
    if (Number.isNaN(eventDate.getTime())) {
      throw new BadRequestException('Invalid booking date');
    }

    if (eventDate <= new Date()) {
      throw new BadRequestException('Booking date must be in the future');
    }

    if (startTime && endTime) {
      const startMinutes = this.normalizeTime(startTime);
      const endMinutes = this.normalizeTime(endTime);
      if (
        startMinutes === null ||
        endMinutes === null ||
        startMinutes >= endMinutes
      ) {
        throw new BadRequestException('Invalid booking time range');
      }
    }

    const { dayKey, startIso, endIso } = this.buildDayRange(bookingDate);

    const { data: availabilities, error: availabilityError } =
      await this.supabase
        .from('provider_availabilities')
        .select('start_time, end_time, is_blocked, reason')
        .eq('provider_id', providerId)
        .eq('date', dayKey);

    if (availabilityError) {
      throw new BadRequestException(availabilityError.message);
    }

    const blockingSlot = (availabilities || []).find((slot) => {
      if (!slot.is_blocked) {
        return false;
      }

      return this.hasTimeOverlap(
        startTime,
        endTime,
        slot.start_time,
        slot.end_time,
      );
    });

    if (blockingSlot) {
      throw new ConflictException(
        blockingSlot.reason ||
          'Provider is not available for the selected date and time',
      );
    }

    const { data: existingBookings, error: bookingError } = await this.supabase
      .from('bookings')
      .select('id, start_time, end_time, status')
      .eq('provider_id', providerId)
      .gte('booking_date', startIso)
      .lt('booking_date', endIso)
      .in('status', ['pending', 'confirmed', 'completed']);

    if (bookingError) {
      throw new BadRequestException(bookingError.message);
    }

    const conflictingBooking = (existingBookings || []).find((booking) =>
      this.hasTimeOverlap(
        startTime,
        endTime,
        booking.start_time,
        booking.end_time,
      ),
    );

    if (conflictingBooking) {
      throw new ConflictException(
        'Provider already has another booking on this date/time',
      );
    }
  }

  async create(clientId: string, dto: CreateBookingDto): Promise<Booking> {
    const { provider, service } = await this.resolveProviderAndService(dto);
    const resolvedProviderId = provider.user_id;
    const providerTableId = provider.id;
    const providerNotificationUserId = provider.user_id;

    await this.validateQuoteForBooking(
      clientId,
      dto,
      providerNotificationUserId,
    );
    await this.assertProviderAvailability(
      providerTableId,
      dto.booking_date,
      dto.start_time,
      dto.end_time,
    );

    let finalAmount = dto.amount;
    if (!finalAmount && service?.base_price) {
      finalAmount = Number(service.base_price);
    }

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      throw new BadRequestException('Booking amount must be greater than zero');
    }
    // Apply promo code if provided
    if (dto.promo_code_id) {
      const { data: promo } = await this.supabase
        .from('promo_codes')
        .select('*')
        .eq('id', dto.promo_code_id)
        .eq('is_active', true)
        .single();

      if (promo) {
        if (promo.type === 'percentage') {
          finalAmount = finalAmount * (1 - promo.value / 100);
        } else {
          finalAmount = Math.max(0, finalAmount - promo.value);
        }
      }
    }

    const platformFee =
      dto.platform_fee !== undefined
        ? Number(dto.platform_fee)
        : Number((finalAmount * this.commissionRate).toFixed(2));
    const depositAmount =
      dto.deposit_amount !== undefined
        ? Number(dto.deposit_amount)
        : Number((finalAmount * 0.2).toFixed(2));
    const balanceAmount =
      dto.balance_amount !== undefined
        ? Number(dto.balance_amount)
        : Number((finalAmount - depositAmount).toFixed(2));

    if (depositAmount < 0 || balanceAmount < 0) {
      throw new BadRequestException('Booking payment amounts are invalid');
    }

    if (
      Number((depositAmount + balanceAmount).toFixed(2)) !==
      Number(finalAmount.toFixed(2))
    ) {
      throw new BadRequestException(
        'Deposit and balance amounts must match the total booking amount',
      );
    }

    const noticeDays = this.getCancellationNoticeDays(
      service?.cancellation_policy,
    );
    const cancellationDeadline = new Date(dto.booking_date);
    cancellationDeadline.setDate(cancellationDeadline.getDate() - noticeDays);

    const autoRefundDeadline = new Date(dto.booking_date);
    autoRefundDeadline.setDate(autoRefundDeadline.getDate() - 3);

    const refundPolicyId = await this.getDefaultRefundPolicyId();

    const lockedPrice = service?.base_price
      ? Number(service.base_price)
      : finalAmount;

    const { data, error } = await this.supabase
      .from('bookings')
      .insert({
        client_id: clientId,
        provider_id: resolvedProviderId,
        service_id: dto.service_id,
        amount: finalAmount,
        locked_price: lockedPrice,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        platform_fee: platformFee,
        status: 'pending',
        payment_status: 'pending',
        notes: dto.notes,
        requirements: dto.requirements,
        location: dto.location,
        guest_count: dto.guest_count,
        booking_date: dto.booking_date,
        start_time: dto.start_time,
        end_time: dto.end_time,
        cancellation_deadline: cancellationDeadline.toISOString(),
        auto_refund_deadline: autoRefundDeadline.toISOString(),
        refund_policy_id: refundPolicyId,
        deposit_percentage:
          finalAmount > 0
            ? Number(((depositAmount / finalAmount) * 100).toFixed(2))
            : 0,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(
        `Error creating booking for client ${clientId}: ${JSON.stringify(error)}`,
      );
      throw new BadRequestException(error.message);
    }

    await this.upsertCommissionRecord({
      bookingId: data.id,
      providerUserId: providerNotificationUserId,
      grossAmount: finalAmount,
      paymentStatus: 'pending',
    });

    await this.auditLogService.log(
      clientId,
      'booking_create',
      'bookings',
      data.id,
      {
        amount: finalAmount,
        provider_id: resolvedProviderId,
        provider_user_id: providerNotificationUserId,
        service_id: dto.service_id,
      },
    );

    // Create in-app notification for provider
    await this.createNotification(
      providerNotificationUserId,
      'booking_request',
      'New booking request',
      'You have a new booking request awaiting your approval',
      data.id,
    );
    // Create in-app notification for client
    await this.createNotification(
      clientId,
      'booking_created',
      'Booking request sent',
      'Your booking request has been sent successfully and is under review',
      data.id,
    );

    return addBookingAliases(data);
  }

  private async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    bookingId?: string,
  ): Promise<void> {
    const { error } = await this.supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      data: { booking_id: bookingId },
      is_read: false,
    });

    if (error) {
      this.logger.warn(
        `Failed to create notification for user ${userId}: ${error.message}`,
      );
    }
  }

  private async upsertCommissionRecord(params: {
    bookingId: string;
    providerUserId: string;
    grossAmount: number;
    paymentStatus?: string;
    notes?: string;
  }): Promise<void> {
    const commissionAmount = Number(
      (params.grossAmount * this.commissionRate).toFixed(2),
    );
    const netPayout = Number(
      (params.grossAmount - commissionAmount).toFixed(2),
    );
    const status =
      params.paymentStatus === 'fully_paid'
        ? 'paid'
        : params.paymentStatus === 'refunded'
          ? 'cancelled'
          : 'pending';

    try {
      await this.supabase.from('commissions').upsert(
        {
          booking_id: params.bookingId,
          provider_id: params.providerUserId,
          gross_amount: params.grossAmount,
          commission_rate: this.commissionRate,
          commission_amount: commissionAmount,
          net_payout: netPayout,
          status,
          paid_at: status === 'paid' ? new Date().toISOString() : null,
          notes: params.notes || null,
        },
        { onConflict: 'booking_id' },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to upsert commission for booking ${params.bookingId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async findOne(id: string, userId?: string): Promise<Booking> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Booking not found');
    }

    if (userId && !(await this.canAccessBooking(data, userId))) {
      throw new NotFoundException('Booking not found');
    }

    return addBookingAliases(data);
  }

  async updateStatus(
    id: string,
    userId: string,
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id, userId);

    const providerContext = await this.getProviderContext(userId);
    const isClient = booking.client_id === userId;
    const isProvider =
      booking.provider_id === userId ||
      booking.provider_id === providerContext.providerId;

    // Only provider can confirm/reject booking
    if (['confirmed', 'rejected'].includes(dto.status) && !isProvider) {
      throw new ForbiddenException(
        'Only provider can confirm or reject booking',
      );
    }

    // Only client can cancel booking
    if (dto.status === 'cancelled' && !isClient) {
      throw new ForbiddenException('Only client can cancel booking');
    }

    if (dto.status === 'completed' && !isProvider) {
      throw new ForbiddenException('Only provider can complete booking');
    }

    if (
      ['cancelled', 'completed', 'rejected'].includes(booking.status) &&
      booking.status !== dto.status
    ) {
      throw new BadRequestException(
        `Booking is already ${booking.status} and cannot be updated`,
      );
    }

    if (dto.status === 'confirmed' && booking.status !== 'pending') {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    if (dto.status === 'rejected' && booking.status !== 'pending') {
      throw new BadRequestException('Only pending bookings can be rejected');
    }

    if (dto.status === 'completed' && booking.status !== 'confirmed') {
      throw new BadRequestException('Only confirmed bookings can be completed');
    }

    if (dto.status === 'cancelled') {
      if (!dto.cancellation_reason?.trim()) {
        throw new BadRequestException(
          'Cancellation reason is required when cancelling a booking',
        );
      }

      if (new Date(booking.booking_date) <= new Date()) {
        throw new BadRequestException(
          'Past or ongoing bookings cannot be cancelled',
        );
      }
    }

    const updateData: Record<string, unknown> = {
      status: dto.status,
      updated_at: new Date().toISOString(),
    };

    if (dto.cancellation_reason) {
      updateData.cancellation_reason = dto.cancellation_reason;
      updateData.cancelled_at = new Date().toISOString();
    }

    // --- Automatic cancellation policy enforcement ---
    if (dto.status === 'cancelled' && booking.service_id) {
      const { data: svc } = await this.supabase
        .from('services')
        .select('cancellation_policy')
        .eq('id', booking.service_id)
        .maybeSingle();

      const raw = svc?.cancellation_policy;
      const policy =
        typeof raw === 'object' && raw
          ? (raw as { notice_days?: number; refund_percentage?: number })
          : null;
      const noticeDays = policy?.notice_days ?? 7;
      const refundPct = policy?.refund_percentage ?? 0;

      const now = new Date();
      const deadline = new Date(booking.booking_date);
      deadline.setDate(deadline.getDate() - noticeDays);

      const isPaidBooking =
        booking.payment_status === 'deposit_paid' ||
        booking.payment_status === 'fully_paid';

      if (isPaidBooking) {
        if (now <= deadline) {
          // Cancelled before deadline → apply refund percentage
          const refundAmount =
            Math.round((((booking.amount || 0) * refundPct) / 100) * 100) / 100;
          updateData.payment_status =
            refundPct > 0 ? 'refunded' : booking.payment_status;
          updateData.refund_amount = refundAmount;
          updateData.refund_percentage = refundPct;
        } else {
          // Cancelled after deadline → no refund
          updateData.refund_amount = 0;
          updateData.refund_percentage = 0;
        }
      }
    } else if ('refund' in dto && (dto as Record<string, unknown>).refund) {
      updateData.payment_status = 'refunded';
    }

    if (dto.provider_notes) {
      updateData.provider_notes = dto.provider_notes;
    }

    if (dto.client_notes) {
      updateData.client_notes = dto.client_notes;
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Notify the other party about status change
    const notifyUserId = isClient ? booking.provider_id : booking.client_id;
    const statusMessages: Record<string, { title: string; message: string }> = {
      confirmed: {
        title: 'Booking confirmed',
        message: 'The booking request has been confirmed successfully',
      },
      rejected: { title: 'Booking rejected', message: 'The booking request has been rejected' },
      cancelled: {
        title: 'Booking cancelled',
        message: updateData.refund_amount
          ? `Booking cancelled — refund ${Number(updateData.refund_percentage)}% (${Number(updateData.refund_amount)} MAD)`
          : 'Booking cancelled — no refund',
      },
      completed: { title: 'Booking completed', message: 'The service has been completed successfully' },
    };
    const notif = statusMessages[dto.status];
    if (notif && notifyUserId) {
      await this.createNotification(
        notifyUserId,
        `booking_${dto.status}`,
        notif.title,
        notif.message,
        id,
      );
    }

    if (dto.status === 'cancelled') {
      await this.supabase
        .from('commissions')
        .update({ status: 'cancelled', notes: dto.cancellation_reason || null })
        .eq('booking_id', id);
    }

    const auditAction =
      dto.status === 'confirmed'
        ? 'booking_confirm'
        : dto.status === 'cancelled'
          ? 'booking_cancel'
          : dto.status === 'completed'
            ? 'booking_complete'
            : null;
    if (auditAction) {
      await this.auditLogService.log(userId, auditAction, 'bookings', id, {
        status: dto.status,
        cancellation_reason: dto.cancellation_reason,
        refund_amount: updateData.refund_amount,
        refund_percentage: updateData.refund_percentage,
      });
    }

    // Update provider response stats when they confirm or reject
    if (['confirmed', 'rejected'].includes(dto.status) && isProvider) {
      try {
        const responseMinutes = Math.round(
          (Date.now() - new Date(booking.created_at).getTime()) / 60000,
        );
        const { data: provider } = await this.supabase
          .from('providers')
          .select('total_requests, total_responses, avg_response_minutes')
          .eq('id', booking.provider_id)
          .maybeSingle();

        if (provider) {
          const newResponses = (provider.total_responses || 0) + 1;
          const newRequests = Math.max(
            provider.total_requests || 0,
            newResponses,
          );
          const oldAvg = provider.avg_response_minutes || 0;
          const newAvg = Math.round(
            (oldAvg * (newResponses - 1) + responseMinutes) / newResponses,
          );
          const rate =
            newRequests > 0
              ? Math.round((newResponses / newRequests) * 10000) / 100
              : 0;

          await this.supabase
            .from('providers')
            .update({
              total_responses: newResponses,
              total_requests: newRequests,
              response_rate: rate,
              avg_response_minutes: newAvg,
            })
            .eq('id', booking.provider_id);
        }
      } catch (e) {
        this.logger.warn(`Failed to update response stats: ${e}`);
      }
    }

    return addBookingAliases(data);
  }

  async applyPaymentToBooking(
    bookingId: string,
    paymentIntentId: string,
    amount: number,
    paymentType: 'deposit' | 'balance' | 'full',
  ): Promise<Booking> {
    const { data: booking, error: fetchError } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if this payment intent was already processed
    const { data: existingPayment } = await this.supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (existingPayment) {
      this.logger.warn(`Payment intent ${paymentIntentId} already processed`);
      return addBookingAliases(booking);
    }

    // Record the payment
    const { error: paymentError } = await this.supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        amount,
        payment_type: paymentType,
        stripe_payment_intent_id: paymentIntentId,
        status: 'completed',
      });

    if (paymentError) {
      throw new BadRequestException('Failed to record payment');
    }

    // Update booking payment status
    let newPaymentStatus = booking.payment_status;
    if (paymentType === 'full') {
      newPaymentStatus = 'fully_paid';
    } else if (paymentType === 'deposit') {
      newPaymentStatus = 'deposit_paid';
    } else if (
      paymentType === 'balance' &&
      booking.payment_status === 'deposit_paid'
    ) {
      newPaymentStatus = 'fully_paid';
    }

    const { data: updatedBooking, error: updateError } = await this.supabase
      .from('bookings')
      .update({ payment_status: newPaymentStatus })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      throw new BadRequestException('Failed to update booking payment status');
    }

    // Create notification
    await this.createNotification(
      booking.client_id,
      'payment_received',
      'Payment received',
      `${paymentType === 'deposit' ? 'Deposit' : paymentType === 'balance' ? 'Balance' : 'Full'} payment received successfully`,
      bookingId,
    );

    const { data: providerRecord } = await this.supabase
      .from('providers')
      .select('user_id')
      .eq('id', booking.provider_id)
      .maybeSingle();

    await this.upsertCommissionRecord({
      bookingId,
      providerUserId: providerRecord?.user_id || booking.provider_id,
      grossAmount: Number(booking.amount || 0),
      paymentStatus: newPaymentStatus,
      notes: `Updated after ${paymentType} payment`,
    });

    await this.auditLogService.log(
      booking.client_id,
      'payment_confirmed',
      'payments',
      paymentIntentId,
      {
        booking_id: bookingId,
        payment_type: paymentType,
        amount,
        payment_status: newPaymentStatus,
      },
    );

    return updatedBooking;
  }

  async createPaymentIntent(
    bookingId: string,
    userId: string,
    paymentType: 'deposit' | 'balance' | 'full',
  ): Promise<{ client_secret: string; payment_intent_id: string }> {
    const booking = await this.findOne(bookingId, userId);

    if (booking.client_id !== userId) {
      throw new ForbiddenException(
        'Only client can create payment for booking',
      );
    }

    let amount = booking.amount;
    if (paymentType === 'deposit') {
      amount = Math.round(amount * 0.3); // 30% deposit
    } else if (paymentType === 'balance') {
      amount = Math.round(amount * 0.7); // 70% balance
    }

    const isMock =
      !this.configService.get<string>('STRIPE_SECRET_KEY') ||
      this.configService
        .get<string>('STRIPE_SECRET_KEY')
        ?.includes('YOUR_STRIPE_SECRET_KEY');

    if (isMock) {
      this.logger.log(`Creating MOCK payment intent for booking ${bookingId}`);
      return {
        client_secret: `pi_mock_${bookingId}_secret_${Date.now()}`,
        payment_intent_id: `pi_mock_${bookingId}`,
      };
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'qar',
      metadata: {
        booking_id: bookingId,
        payment_type: paymentType,
      },
    });

    return {
      client_secret: paymentIntent.client_secret || '',
      payment_intent_id: paymentIntent.id,
    };
  }

  async confirmMockPayment(
    bookingId: string,
    userId: string,
    paymentIntentId: string,
    paymentType: string,
  ): Promise<void> {
    const booking = await this.findOne(bookingId, userId);

    let amount = booking.amount;
    if (paymentType === 'deposit') amount *= 0.3;
    else if (paymentType === 'balance') amount *= 0.7;

    await this.applyPaymentToBooking(
      bookingId,
      paymentIntentId,
      amount,
      paymentType as 'deposit' | 'balance' | 'full',
    );
  }

  async confirmPayment(paymentIntentId: string): Promise<void> {
    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not successful');
    }

    const bookingId = paymentIntent.metadata.booking_id;
    const paymentType = paymentIntent.metadata.payment_type as
      | 'deposit'
      | 'balance'
      | 'full';
    const amount = paymentIntent.amount / 100;

    await this.applyPaymentToBooking(
      bookingId,
      paymentIntentId,
      amount,
      paymentType,
    );
  }

  // Additional methods for controller
  async findAll(
    status?: string,
    paymentStatus?: string,
    limit?: number,
    offset?: number,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<{ data: Booking[]; total: number }> {
    let query = this.supabase.from('bookings').select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }
    if (search) {
      query = query.or(
        `notes.ilike.%${search}%,requirements.ilike.%${search}%`,
      );
    }
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }
    if (sortBy && sortOrder) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }
    return { data: mapArray(data || [], addBookingAliases), total: count || 0 };
  }

  async findByClient(
    clientId: string,
    status?: string,
    limit?: number,
    offset?: number,
    search?: string,
    sortOrder?: string,
  ): Promise<{ data: Booking[]; total: number }> {
    let query = this.supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId);

    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      const term = sanitizeSearch(search);
      query = query.or(
        `notes.ilike.%${term}%,requirements.ilike.%${term}%`,
      );
    }
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }
    query = query.order('created_at', { ascending: sortOrder !== 'desc' });

    const { data, count, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }
    return { data: mapArray(data || [], addBookingAliases), total: count || 0 };
  }

  async findByProvider(
    providerId: string,
    userId?: string,
    status?: string,
    paymentStatus?: string,
    limit?: number,
    offset?: number,
    search?: string,
    sortOrder?: string,
  ): Promise<{ data: Booking[]; total: number }> {
    if (userId) {
      await this.assertProviderScope(providerId, userId);
    }

    let query = this.supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('provider_id', providerId);

    if (status) {
      query = query.eq('status', status);
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }
    if (search) {
      const term = sanitizeSearch(search);
      query = query.or(
        `notes.ilike.%${term}%,requirements.ilike.%${term}%`,
      );
    }
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }
    query = query.order('created_at', { ascending: sortOrder !== 'desc' });

    const { data, count, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }
    return { data: mapArray(data || [], addBookingAliases), total: count || 0 };
  }

  async getStats(
    providerId: string,
    userId?: string,
  ): Promise<{
    total_bookings: number;
    completed_bookings: number;
    pending_bookings: number;
    confirmed_bookings: number;
    cancelled_bookings: number;
    total_revenue: number;
  }> {
    if (userId) {
      await this.assertProviderScope(providerId, userId);
    }

    const { data, error } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', providerId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const bookings = data || [];
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const totalRevenue = bookings
      .filter((b) => b.payment_status === 'fully_paid')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    return {
      total_bookings: total,
      completed_bookings: completed,
      pending_bookings: pending,
      confirmed_bookings: confirmed,
      cancelled_bookings: cancelled,
      total_revenue: totalRevenue,
    };
  }

  async getAdminStats(): Promise<{
    total_bookings: number;
    completed: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    total_revenue: number;
    monthly_revenue: { month: string; revenue: number }[];
  }> {
    const { data, error } = await this.supabase.from('bookings').select('*');

    if (error) {
      throw new BadRequestException(error.message);
    }

    const bookings = data || [];
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const totalRevenue = bookings
      .filter(
        (b) => b.payment_status === 'fully_paid' || b.status === 'completed',
      )
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    // Calculate monthly revenue for last 6 months
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      const monthRevenue = bookings
        .filter((b) => {
          const bd = new Date(b.created_at);
          return (
            bd.getMonth() === d.getMonth() &&
            bd.getFullYear() === d.getFullYear() &&
            (b.payment_status === 'fully_paid' || b.status === 'completed')
          );
        })
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      monthlyRevenue.push({ month: monthLabel, revenue: monthRevenue });
    }

    return {
      total_bookings: total,
      completed,
      pending,
      confirmed,
      cancelled,
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
    };
  }

  /**
   * Returns dates where a provider is unavailable (booked or blocked).
   * Used by the frontend to disable dates in the booking calendar.
   */
  async getUnavailableDates(
    providerId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ unavailable_dates: string[]; partial_dates: string[] }> {
    // Dates with confirmed/pending bookings
    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('booking_date, start_time, end_time')
      .eq('provider_id', providerId)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .in('status', ['pending', 'confirmed']);

    // Dates explicitly blocked by the provider
    const { data: blocked } = await this.supabase
      .from('provider_availabilities')
      .select('date, start_time, end_time, is_blocked')
      .eq('provider_id', providerId)
      .eq('is_blocked', true)
      .gte('date', startDate)
      .lte('date', endDate);

    // Full-day bookings (no start/end time) = fully unavailable
    // Time-slot bookings = partial (others can still book different times)
    const fullDaySet = new Set<string>();
    const partialSet = new Set<string>();

    for (const b of bookings || []) {
      const day = new Date(b.booking_date).toISOString().slice(0, 10);
      if (!b.start_time && !b.end_time) {
        fullDaySet.add(day);
      } else {
        partialSet.add(day);
      }
    }

    for (const b of blocked || []) {
      const day = b.date;
      if (!b.start_time && !b.end_time) {
        fullDaySet.add(day);
      } else {
        partialSet.add(day);
      }
    }

    // Remove partial dates that are also full-day blocked
    for (const d of fullDaySet) {
      partialSet.delete(d);
    }

    return {
      unavailable_dates: [...fullDaySet].sort(),
      partial_dates: [...partialSet].sort(),
    };
  }
}
