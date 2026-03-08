export class EventTask {
  id: string;
  event_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: Date;
  assigned_to?: string; // Could be a name or user_id
  created_at: Date;
  updated_at: Date;
}
