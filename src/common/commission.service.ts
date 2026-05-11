import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { COMMISSION_RATE } from './constants';

/** Parameters for creating / updating a commission record. */
export interface UpsertCommissionParams {
  bookingId: string;
  providerUserId: string;
  grossAmount: number;
  paymentStatus?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  grossAmountOverride?: number;
  platformFee?: number;
}

/**
 * Centralised commission calculation and persistence.
 *
 * Previously duplicated as `upsertCommissionRecord` in BookingsService
 * and `syncCommissionForBooking` in PaymentsService.
 */
@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);
  private readonly commissionRate = COMMISSION_RATE;

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Upsert the `commissions` row tied to a booking.
   * Idempotent — safe to call multiple times for the same booking.
   */
  async upsert(params: UpsertCommissionParams): Promise<void> {
    try {
      const grossAmount = Number(
        params.grossAmountOverride ?? params.grossAmount ?? 0,
      );
      const explicitFee = Number(params.platformFee || 0);
      const commissionAmount =
        explicitFee > 0
          ? explicitFee
          : Number((grossAmount * this.commissionRate).toFixed(2));
      const netPayout = Number((grossAmount - commissionAmount).toFixed(2));

      const status =
        params.paymentStatus === 'fully_paid'
          ? 'paid'
          : params.paymentStatus === 'refunded'
            ? 'cancelled'
            : 'pending';

      await this.supabase.from('commissions').upsert(
        {
          booking_id: params.bookingId,
          provider_id: params.providerUserId,
          gross_amount: grossAmount,
          commission_rate:
            grossAmount > 0
              ? Number((commissionAmount / grossAmount).toFixed(4))
              : this.commissionRate,
          commission_amount: commissionAmount,
          net_payout: netPayout,
          status,
          paid_at: status === 'paid' ? new Date().toISOString() : null,
          notes: params.metadata
            ? JSON.stringify(params.metadata)
            : params.notes || null,
        },
        { onConflict: 'booking_id' },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to upsert commission for booking ${params.bookingId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  /** Cancel commission for a booking (e.g. when booking is cancelled). */
  async cancel(bookingId: string, reason?: string): Promise<void> {
    try {
      await this.supabase
        .from('commissions')
        .update({ status: 'cancelled', notes: reason || null })
        .eq('booking_id', bookingId);
    } catch (error) {
      this.logger.warn(
        `Failed to cancel commission for booking ${bookingId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
