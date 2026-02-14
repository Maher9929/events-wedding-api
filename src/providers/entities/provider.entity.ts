export class Provider {
  id: string;
  user_id: string;
  company_name?: string;
  description?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  social_media?: Record<string, string>;
  is_verified: boolean;
  verification_date?: Date;
  rating_avg: number;
  review_count: number;
  created_at: Date;
  updated_at: Date;
}
