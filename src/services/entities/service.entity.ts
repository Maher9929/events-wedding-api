export class Service {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  description: string;
  short_description?: string;
  price_type: 'fixed' | 'hourly' | 'package' | 'custom';
  base_price: number;
  currency: string;
  duration_minutes?: number;
  min_capacity?: number;
  max_capacity?: number;
  location_type: 'onsite' | 'online' | 'both';
  service_area?: string;
  requirements?: string[];
  inclusions?: string[];
  exclusions?: string[];
  additional_info?: string;
  images?: string[];
  video_url?: string;
  availability_settings?: {
    advance_booking_days: number;
    cancellation_policy: string;
    deposit_required: boolean;
    deposit_percentage?: number;
  };
  is_active: boolean;
  is_featured: boolean;
  featured_until?: Date;
  created_at: Date;
  updated_at: Date;
}
