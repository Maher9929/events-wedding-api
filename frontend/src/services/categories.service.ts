import { apiService, type Category, type PaginatedResponse } from './api';
import { unwrapList } from './response.utils';

export const categoriesService = {
  getAll: async () => unwrapList(await apiService.get<Category[] | PaginatedResponse<Category>>('/categories')),
  getRootCategories: async () => unwrapList(await apiService.get<Category[] | PaginatedResponse<Category>>('/categories/root')),
  findBySlug: (slug: string) => apiService.get<Category>(`/categories/slug/${slug}`),
  findById: (id: string) => apiService.get<Category>(`/categories/id/${id}`),
  getChildren: async (parentId: string) => unwrapList(await apiService.get<Category[] | PaginatedResponse<Category>>(`/categories/id/${parentId}/children`)),
  create: (data: Partial<Category>) => apiService.post<Category>('/categories', data),
  update: (id: string, data: Partial<Category>) => apiService.patch<Category>(`/categories/id/${id}`, data),
  remove: (id: string) => apiService.delete(`/categories/id/${id}`),
};
