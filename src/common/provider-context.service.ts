import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

/** Resolved context for a user who may or may not be a provider. */
export interface ProviderContext {
  userId: string;
  providerId: string | null;
}

/**
 * Shared service that resolves provider ↔ user relationships.
 *
 * Previously this logic was duplicated word-for-word in both
 * BookingsService and PaymentsService. Centralising it here
 * eliminates duplication and keeps the mapping logic consistent.
 */
@Injectable()
export class ProviderContextService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  /** Look up the provider table row linked to `userId` (if any). */
  async getProviderContext(userId: string): Promise<ProviderContext> {
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

  /**
   * Throw if `userId` is not the owner of `providerId`.
   * Accepts both `providers.id` and `providers.user_id`.
   */
  async assertProviderScope(providerId: string, userId: string): Promise<void> {
    const context = await this.getProviderContext(userId);
    if (providerId !== context.userId && providerId !== context.providerId) {
      throw new ForbiddenException(
        'You can only access bookings for your own provider profile',
      );
    }
  }

  /**
   * Check whether `userId` is either the client or the provider
   * on a booking-like record.
   */
  async canAccessBooking(
    booking: { client_id: string; provider_id: string },
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

  /**
   * Resolve the user_id behind a `providers.id` row.
   * Falls back to `providerId` itself when no row is found
   * (handles cases where provider_id IS the user_id).
   */
  async resolveProviderUserId(providerId: string): Promise<string> {
    const { data: provider } = await this.supabase
      .from('providers')
      .select('user_id')
      .eq('id', providerId)
      .maybeSingle();

    return provider?.user_id || providerId;
  }
}
