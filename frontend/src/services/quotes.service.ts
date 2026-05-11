import { apiService } from './api';

export interface Quote {
  id: string;
  client_id: string;
  provider_id: string;
  service_id?: string;
  event_id?: string;
  quote_request_id?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  total_amount: number;
  valid_until?: string;
  notes?: string;
  items?: QuoteItem[];
  created_at: string;
}

export interface QuoteItem {
  id?: string;
  name?: string;
  description: string;
  quantity: number;
  price?: number;
  unit_price?: number;
  total?: number;
  amount?: number;
}

export interface QuoteRequestItem {
  category_id: string;
  description: string;
  estimated_budget?: number;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface QuoteRequest {
  id: string;
  event_id: string;
  client_id: string;
  title: string;
  description: string;
  items: QuoteRequestItem[];
  provider_ids: string[];
  deadline?: string;
  max_budget?: number;
  event_type?: string;
  event_date?: string;
  location?: string;
  guest_count?: number;
  status: 'open' | 'closed' | 'draft';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateQuotePayload {
  client_id: string;
  quote_request_id: string;
  items: Array<{
    description: string;
    price: number;
    quantity: number;
    unit?: string;
  }>;
  discount_amount?: number;
  tax_rate?: number;
  valid_until?: string;
  notes?: string;
  terms?: string;
  status?: 'draft' | 'sent';
}

export const quotesService = {
  getMyQuotes: (params = '') =>
    apiService.get<Quote[]>(`/quotes/my-quotes${params}`),
  getQuoteRequests: (params = '') =>
    apiService.get<QuoteRequest[]>(`/quotes/request${params}`),
  findOne: (id: string) => apiService.get<Quote>(`/quotes/id/${id}`),
  create: (data: CreateQuotePayload) => apiService.post<Quote>('/quotes', data),
  send: (id: string) => apiService.patch<Quote>(`/quotes/id/${id}/send`, {}),
  updateStatus: (id: string, status: 'accepted' | 'rejected') =>
    apiService.patch<Quote>(`/quotes/id/${id}/status`, { status }),
};
