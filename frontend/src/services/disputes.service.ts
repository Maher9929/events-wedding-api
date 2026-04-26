import { apiService } from './api';

export interface Dispute {
  id: string;
  booking_id: string;
  opened_by: string;
  reason: string;
  description: string;
  evidence_urls: string[];
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  resolution?: string;
  resolution_notes?: string;
  provider_response?: string;
  provider_responded_at?: string;
  resolved_at?: string;
  created_at: string;
  bookings?: {
    id: string;
    booking_date: string;
    amount: number;
    status: string;
    services?: { title: string };
  };
  opener?: { id: string; full_name: string; email: string };
}

export const disputesService = {
  create: (data: {
    booking_id: string;
    reason: string;
    description: string;
    evidence_urls?: string[];
  }) => apiService.post<Dispute>('/disputes', data),

  getMyDisputes: () =>
    apiService.get<Dispute[]>('/disputes/my-disputes'),

  getProviderDisputes: () =>
    apiService.get<Dispute[]>('/disputes/provider'),

  getAllDisputes: (status?: string) =>
    apiService.get<Dispute[]>(`/disputes/admin${status ? `?status=${status}` : ''}`),

  providerRespond: (id: string, response: string) =>
    apiService.patch<Dispute>(`/disputes/${id}/respond`, { response }),

  resolve: (id: string, data: { resolution: string; resolution_notes?: string }) =>
    apiService.patch<Dispute>(`/disputes/${id}/resolve`, data),
};
