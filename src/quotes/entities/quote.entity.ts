export class Quote {
  id: string;
  conversation_id?: string;
  provider_id: string;
  client_id: string;
  quote_request_id?: string;
  items: {
    description: string;
    price: number;
    quantity: number;
    unit?: string;
  }[];
  subtotal: number;
  discount_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until?: Date;
  notes?: string;
  terms?: string;
  created_at: Date;
  updated_at: Date;
}
