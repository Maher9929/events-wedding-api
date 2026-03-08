export class EventTimelineItem {
  id: string;
  event_id: string;
  start_time: string; // HH:mm format
  end_time?: string; // HH:mm format
  activity: string;
  description?: string;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}
