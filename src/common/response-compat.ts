/**
 * Response compatibility layer — adds aliases expected by the mobile app
 * so both `booking_date` and `event_date` (etc.) are present in responses.
 *
 * This avoids breaking the web frontend while making the mobile work.
 */

export function addBookingAliases<T extends Record<string, unknown>>(
  booking: T,
): T {
  if (!booking) return booking;
  const extras: Record<string, unknown> = {};
  if (booking.booking_date && !booking.event_date) {
    extras.event_date = booking.booking_date;
  }
  if (!booking.currency) {
    extras.currency = 'QAR';
  }
  return Object.keys(extras).length ? { ...booking, ...extras } : booking;
}

export function addReviewAliases<T extends Record<string, unknown>>(
  review: T,
): T & { user_id?: string } {
  if (review && review.client_id && !review.user_id) {
    const clientId = review.client_id;
    if (typeof clientId === 'string' || typeof clientId === 'number') {
      return { ...review, user_id: String(clientId) };
    }
  }
  return review;
}

export function addNotificationAliases<T extends Record<string, unknown>>(
  notification: T,
): T & { metadata?: unknown } {
  if (
    notification &&
    notification.data !== undefined &&
    notification.metadata === undefined
  ) {
    return { ...notification, metadata: notification.data };
  }
  return notification;
}

/**
 * Normalize a review row: add `user_id` alias for `client_id` and
 * rename `user_profiles` join to `user` for mobile compatibility.
 */
export function normalizeReview<T extends Record<string, unknown>>(
  review: T,
): T {
  const out = addReviewAliases(review);
  if (out.user_profiles && !out.user) {
    return { ...out, user: out.user_profiles };
  }
  return out;
}

export function mapArray<T extends Record<string, unknown>>(
  items: T[],
  mapper: (item: T) => T,
): T[] {
  return (items || []).map(mapper);
}
