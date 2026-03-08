import { apiService, type Category } from './api';

export const categoriesService = {
  getAll: () => apiService.get<Category[]>('/categories'),
  getRootCategories: () => apiService.get<Category[]>('/categories/root'),
  findBySlug: (slug: string) => apiService.get<Category>(`/categories/slug/${slug}`),
  findById: (id: string) => apiService.get<Category>(`/categories/${id}`),
  getChildren: (parentId: string) => apiService.get<Category[]>(`/categories/${parentId}/children`),
  create: (data: Partial<Category>) => apiService.post<Category>('/categories', data),
  update: (id: string, data: Partial<Category>) => apiService.patch<Category>(`/categories/${id}`, data),
  remove: (id: string) => apiService.delete(`/categories/${id}`),
};
