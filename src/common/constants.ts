/**
 * Shared platform-wide constants.
 * Single source of truth for values that are used in multiple services.
 */

/** Platform commission rate applied to each booking (10 %) */
export const COMMISSION_RATE = 0.1;

/** Default ISO-4217 currency code (configurable via DEFAULT_CURRENCY env var) */
export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'MAD';

/** All valid booking statuses */
export type BookingStatusType =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'rejected';

/** All valid payment statuses */
export type PaymentStatusType =
  | 'pending'
  | 'deposit_paid'
  | 'fully_paid'
  | 'refunded';

/** Payment intent types */
export type PaymentType = 'deposit' | 'balance' | 'full';
