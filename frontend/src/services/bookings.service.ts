import { apiService } from './api';
import type { Booking } from './api';

// Re-export Booking so existing imports from this module still work
export type { Booking };

export const bookingsService = {
  create: (data: { service_id: string; provider_id: string; booking_date: string; amount: number; deposit_amount?: number; event_id?: string; notes?: string; promo_code_id?: string }) =>
    apiService.post<Booking>('/bookings', data),
  getMyBookings: (params = '') => apiService.get<Booking[]>(`/bookings/my-bookings${params}`),
  getByProvider: (providerId: string, params = '') => apiService.get<Booking[]>(`/bookings/provider/${providerId}${params}`),
  getStats: (providerId: string) => apiService.get<{ total_bookings: number; total_revenue: number; pending: number; confirmed: number }>(`/bookings/stats/${providerId}`),
  findOne: (id: string) => apiService.get<Booking>(`/bookings/id/${id}`),
  updateStatus: (id: string, data: { status: string; cancellation_reason?: string }) =>
    apiService.patch<Booking>(`/bookings/id/${id}/status`, data),
};
