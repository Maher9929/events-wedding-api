import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_CURRENCY } from './constants';

/** Payload for creating a booking/payment notification. */
export interface NotifyParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Centralised notification creation for booking & payment flows.
 *
 * Previously duplicated as `createNotification()` in BookingsService
 * and `createPaymentNotifications()` in PaymentsService.
 * Non-critical — failures are logged but never bubble up.
 */
@Injectable()
export class BookingNotificationService {
  private readonly logger = new Logger(BookingNotificationService.name);

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  /** Create a single in-app notification. */
  async notify(params: NotifyParams): Promise<void> {
    try {
      const { error } = await this.supabase.from('notifications').insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || {},
        is_read: false,
      });

      if (error) {
        this.logger.warn(
          `Failed to create notification for user ${params.userId}: ${error.message}`,
        );
      }
    } catch {
      // Notifications must never block business flows
    }
  }

  /** Create notifications for both parties in a booking. */
  async notifyBoth(
    clientParams: NotifyParams,
    providerParams: NotifyParams,
  ): Promise<void> {
    await Promise.all([this.notify(clientParams), this.notify(providerParams)]);
  }

  /** Notify both parties about a payment event. */
  async notifyPayment(
    booking: { id: string; client_id: string; provider_id: string },
    paidAmount: number,
    paymentType: 'deposit' | 'balance' | 'full',
    paymentStatus: string,
    currency: string,
  ): Promise<void> {
    const paymentLabel =
      paymentType === 'deposit'
        ? 'Deposit'
        : paymentType === 'balance'
          ? 'Balance'
          : 'Full payment';

    const sharedData: Record<string, unknown> = {
      booking_id: booking.id,
      payment_type: paymentType,
      amount: paidAmount,
      payment_status: paymentStatus,
    };

    await this.notifyBoth(
      {
        userId: booking.client_id,
        type: 'payment_confirmed',
        title: `${paymentLabel} confirmed`,
        message: `Your ${paymentLabel.toLowerCase()} of ${paidAmount} ${currency} was confirmed`,
        data: sharedData,
      },
      {
        userId: booking.provider_id,
        type: 'payment_received',
        title: `${paymentLabel} received`,
        message: `${paymentLabel} of ${paidAmount} ${currency} was paid for booking #${booking.id.slice(0, 8).toUpperCase()}`,
        data: sharedData,
      },
    );
  }

  /** Notify the other party about a booking status change. */
  async notifyStatusChange(
    notifyUserId: string,
    bookingId: string,
    status: string,
    extra?: { refundAmount?: number; refundPercentage?: number },
  ): Promise<void> {
    const statusMessages: Record<string, { title: string; message: string }> = {
      confirmed: {
        title: 'Booking confirmed',
        message: 'The booking request has been confirmed successfully',
      },
      rejected: {
        title: 'Booking rejected',
        message: 'The booking request has been rejected',
      },
      cancelled: {
        title: 'Booking cancelled',
        message: extra?.refundAmount
          ? `Booking cancelled — refund ${Number(extra.refundPercentage)}% (${Number(extra.refundAmount)} ${DEFAULT_CURRENCY})`
          : 'Booking cancelled — no refund',
      },
      completed: {
        title: 'Booking completed',
        message: 'The service has been completed successfully',
      },
    };

    const notif = statusMessages[status];
    if (notif) {
      await this.notify({
        userId: notifyUserId,
        type: `booking_${status}`,
        title: notif.title,
        message: notif.message,
        data: { booking_id: bookingId },
      });
    }
  }
}
