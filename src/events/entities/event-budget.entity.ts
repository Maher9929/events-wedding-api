export class EventBudget {
  id: string;
  event_id: string;
  category: string; // e.g., 'Venue', 'Catering', 'Decoration'
  item_name: string;
  estimated_cost: number;
  actual_cost: number;
  paid_amount: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
