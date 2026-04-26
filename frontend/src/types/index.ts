// ─────────────────────────────────────────────────────────────
// Centralized type definitions for the DOUSHA frontend
// ─────────────────────────────────────────────────────────────

/** Roles available in the platform */
export type UserRole = 'client' | 'provider' | 'admin';

/** Authenticated user profile */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  created_at: string;
}

/** Service category */
export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  slug: string;
  parent_id?: string;
  created_at: string;
}

/** Provider summary embedded in ServiceItem or Booking */
export interface ProviderSummary {
  id?: string;
  city?: string;
  company_name?: string;
  business_name?: string;
  is_verified?: boolean;
}

/** A service offered by a provider */
export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  price_type?: 'fixed' | 'hourly' | 'package' | 'custom';
  base_price: number;
  duration_minutes?: number;
  location_type?: 'onsite' | 'online' | 'both';
  images?: string[];
  provider_id: string;
  category_id: string;
  category?: Partial<Category>;
  provider?: Provider;
  providers?: ProviderSummary;
  availability_settings?: {
    advance_booking_days?: number;
    deposit_required?: boolean;
    deposit_percentage?: number;
  };
  cancellation_policy?: string | { notice_days?: number; refund_percentage?: number; description?: string };
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  is_active?: boolean;
  created_at: string;
}

/** Provider / business profile */
export interface Provider {
  id: string;
  business_name?: string;
  company_name?: string;
  description: string;
  user_id: string;
  category_id?: string;
  city?: string;
  region?: string;
  phone?: string;
  rating?: number;
  review_count?: number;
  is_verified?: boolean;
  min_price?: number;
  max_price?: number;
  max_capacity?: number;
  categories?: string[];
  event_styles?: string[];
  portfolio_images?: string[];
  video_url?: string;
  languages?: string[];
  years_experience?: number;
  response_time_hours?: number;
  total_requests?: number;
  total_responses?: number;
  response_rate?: number;
  avg_response_minutes?: number;
  website?: string;
  address?: string;
  created_at: string;
}

/** Client event */
export interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  event_date: string;
  location?: string;
  budget?: number;
  guest_count?: number;
  status: string;
  client_id: string;
  created_at: string;
  venue_city?: string;
  venue_name?: string;
  event_budgets?: { id: string; amount?: number }[];
  event_tasks?: { id: string; is_completed?: boolean }[];
}

/** Message conversation */
export interface Conversation {
  id: string;
  participant_ids: string[];
  last_message_at: string;
  created_at: string;
  updated_at: string;
  recipient_name?: string;
  recipient_avatar?: string;
  recipient_role?: string;
  unread_count?: number;
}

/** Attachment on a message */
export interface Attachment {
  url: string;
  name: string;
  type: string;
}

/** Chat message */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachments?: Attachment[];
  message_type?: string;
  created_at: string;
  sender?: { id: string; full_name?: string; avatar_url?: string };
  metadata?: { attachments?: Attachment[]; content_filtered?: boolean; filtered_types?: string[] };
}

/** Booking status */
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';

/** Payment status */
export type PaymentStatus = 'pending' | 'deposit_paid' | 'fully_paid' | 'refunded';

/** Service booking */
export interface Booking {
  id: string;
  event_id?: string;
  quote_id?: string;
  service_id?: string;
  client_id: string;
  provider_id: string;
  booking_date: string;
  start_time?: string;
  end_time?: string;
  status: BookingStatus;
  amount: number;
  locked_price?: number;
  deposit_amount?: number;
  balance_amount?: number;
  platform_fee?: number;
  receipt_url?: string;
  payment_status: PaymentStatus;
  notes?: string;
  cancellation_reason?: string;
  cancellation_deadline?: Date;
  provider_notes?: string;
  client_notes?: string;
  requirements?: string[];
  location?: string;
  guest_count?: number;
  created_at: string;
  updated_at: string;
  services?: { id: string; title: string };
  providers?: ProviderSummary;
}

/** Auth login/register response */
export interface AuthResponse {
  access_token: string;
  user: User;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  statusCode?: number;
  message?: string;
}
