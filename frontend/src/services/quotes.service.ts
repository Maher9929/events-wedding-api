import { apiService } from './api';

export interface Quote {
    id: string;
    client_id: string;
    provider_id: string;
    service_id?: string;
    event_id?: string;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
    total_amount: number;
    valid_until?: string;
    notes?: string;
    items?: QuoteItem[];
    created_at: string;
}

export interface QuoteItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

export const quotesService = {
    getMyQuotes: (params = '') => apiService.get<Quote[]>(`/quotes/my-quotes${params}`),
    findOne: (id: string) => apiService.get<Quote>(`/quotes/id/${id}`),
    create: (data: Partial<Quote>) => apiService.post<Quote>('/quotes', data),
    send: (id: string) => apiService.patch<Quote>(`/quotes/id/${id}/send`, {}),
    updateStatus: (id: string, status: 'accepted' | 'rejected') =>
        apiService.patch<Quote>(`/quotes/id/${id}/status`, { status }),
};
