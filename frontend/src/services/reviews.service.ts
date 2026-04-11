import { apiService } from './api';

export interface Review {
  id: string;
  service_id: string;
  client_id: string;
  rating: number;
  comment?: string;
  user_profiles?: { id: string; full_name: string; avatar_url?: string };
  created_at: string;
}

export const reviewsService = {
  getByService: (serviceId: string) => apiService.get<Review[]>(`/reviews/service/${serviceId}`),
  getByProvider: (providerId: string) => apiService.get<Review[]>(`/reviews/provider/${providerId}`),
  getRating: (serviceId: string) => apiService.get<{ average: number; count: number }>(`/reviews/service/${serviceId}/rating`),
  create: (data: { service_id: string; rating: number; comment?: string }) => apiService.post<Review>('/reviews', data),
  remove: (id: string) => apiService.delete(`/reviews/id/${id}`),
};
