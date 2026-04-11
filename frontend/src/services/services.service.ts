import { apiService, type ServiceItem } from './api';

type ServiceQueryParams = {
  city?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  available_date?: string;
  max_budget?: number;
  category?: string;
  min_capacity?: number;
  max_capacity?: number;
  event_style?: string;
  provider_id?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

const buildQueryString = (params?: ServiceQueryParams) => {
  const q = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      q.set(key, String(value));
    }
  });

  return q.toString();
};

export const servicesService = {
  getAll: (params?: ServiceQueryParams) => {
    const qs = buildQueryString(params);
    return apiService.get<ServiceItem[]>(qs ? `/services?${qs}` : '/services');
  },
  getFeatured: (limit = 10) => apiService.get<ServiceItem[]>(`/services/featured?limit=${limit}`),
  getByCategory: (categoryId: string, params?: ServiceQueryParams) => {
    const qs = buildQueryString(params);
    return apiService.get<ServiceItem[]>(qs ? `/services/category/${categoryId}?${qs}` : `/services/category/${categoryId}`);
  },
  getMyServices: (params = '') => apiService.get<ServiceItem[]>(`/services/my-services${params}`),
  findById: (id: string) => apiService.get<ServiceItem>(`/services/id/${id}`),
  create: (data: Partial<ServiceItem>) => apiService.post<ServiceItem>('/services', data),
  update: (id: string, data: Partial<ServiceItem>) => apiService.patch<ServiceItem>(`/services/id/${id}`, data),
  remove: (id: string) => apiService.delete(`/services/id/${id}`),
};
