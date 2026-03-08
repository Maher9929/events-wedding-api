import { apiService, type ServiceItem } from './api';

export const servicesService = {
  getAll: (params?: { city?: string; min_price?: number; max_price?: number; min_rating?: number }) => {
    const q = new URLSearchParams();
    if (params?.city) q.set('city', params.city);
    if (params?.min_price !== undefined) q.set('min_price', String(params.min_price));
    if (params?.max_price !== undefined) q.set('max_price', String(params.max_price));
    if (params?.min_rating !== undefined) q.set('min_rating', String(params.min_rating));
    const qs = q.toString();
    return apiService.get<ServiceItem[]>(qs ? `/services?${qs}` : '/services');
  },
  getFeatured: (limit = 10) => apiService.get<ServiceItem[]>(`/services/featured?limit=${limit}`),
  getByCategory: (categoryId: string, params?: { min_price?: number; max_price?: number; min_rating?: number }) => {
    const q = new URLSearchParams();
    if (params?.min_price !== undefined) q.set('min_price', String(params.min_price));
    if (params?.max_price !== undefined) q.set('max_price', String(params.max_price));
    if (params?.min_rating !== undefined) q.set('min_rating', String(params.min_rating));
    const qs = q.toString();
    return apiService.get<ServiceItem[]>(qs ? `/services/category/${categoryId}?${qs}` : `/services/category/${categoryId}`);
  },
  getMyServices: (params = '') => apiService.get<ServiceItem[]>(`/services/my-services${params}`),
  findById: (id: string) => apiService.get<ServiceItem>(`/services/${id}`),
  create: (data: Partial<ServiceItem>) => apiService.post<ServiceItem>('/services', data),
  update: (id: string, data: Partial<ServiceItem>) => apiService.patch<ServiceItem>(`/services/${id}`, data),
  remove: (id: string) => apiService.delete(`/services/${id}`),
};
