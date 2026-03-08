export class Event {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  event_type:
    | 'wedding'
    | 'birthday'
    | 'corporate'
    | 'conference'
    | 'party'
    | 'other';
  event_date: Date;
  start_time: string;
  end_time: string;
  guest_count: number;
  budget?: number;
  currency?: string;
  venue_name?: string;
  venue_address?: string;
  venue_city?: string;
  venue_region?: string;
  venue_coordinates?: {
    latitude: number;
    longitude: number;
  };
  requirements?: string[];
  special_requests?: string;
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  visibility: 'private' | 'public';
  is_template: boolean;
  template_name?: string;
  created_at: Date;
  updated_at: Date;
}
