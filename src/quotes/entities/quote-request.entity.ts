export class QuoteRequest {
  id: string;
  event_id: string;
  client_id: string;
  title: string;
  description: string;
  items: {
    category_id: string;
    description: string;
    estimated_budget?: number;
    quantity?: number;
    unit?: string;
    notes?: string;
  }[];
  provider_ids: string[];
  deadline?: Date;
  max_budget?: number;
  event_type?: string;
  event_date?: string;
  location?: string;
  guest_count?: number;
  status: 'open' | 'closed' | 'draft';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
