import { apiService } from './api';

export interface Booking {
  id: string;
  event_id?: string;
  service_id: string;
  client_id: string;
  provider_id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  amount: number;
  deposit_amount?: number;
  balance_amount?: number;
  platform_fee?: number;
  receipt_url?: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  notes?: string;
  cancellation_reason?: string;
  created_at: string;
}

export const bookingsService = {
  create: (data: { service_id: string; provider_id: string; booking_date: string; amount: number; deposit_amount?: number; event_id?: string; notes?: string; promo_code_id?: string }) =>
    apiService.post<Booking>('/bookings', data),
  getMyBookings: (params = '') => apiService.get<Booking[]>(`/bookings/my-bookings${params}`),
  getByProvider: (providerId: string, params = '') => apiService.get<Booking[]>(`/bookings/provider/${providerId}${params}`),
  getStats: (providerId: string) => apiService.get<{ total_bookings: number; total_revenue: number; pending: number; confirmed: number }>(`/bookings/stats/${providerId}`),
  findOne: (id: string) => apiService.get<Booking>(`/bookings/${id}`),
  updateStatus: (id: string, data: { status: string; cancellation_reason?: string }) =>
    apiService.patch<Booking>(`/bookings/${id}/status`, data),
};
