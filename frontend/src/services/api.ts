// Configuration API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'client' | 'provider' | 'admin';
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  slug: string;
  parent_id?: string;
  created_at: string;
}

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
  provider?: any;
  availability_settings?: {
    advance_booking_days?: number;
    deposit_required?: boolean;
    deposit_percentage?: number;
  };
  cancellation_policy?: string;
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  is_active?: boolean;
  created_at: string;
}

export interface Provider {
  id: string;
  business_name?: string;
  company_name?: string; // Alias for business_name
  description: string;
  user_id: string;
  category_id?: string;
  city?: string;
  region?: string;
  phone?: string;
  rating?: number;
  review_count?: number;
  is_verified?: boolean;
  // Enhanced fields
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
  website?: string;
  address?: string;
  created_at: string;
}

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
}

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

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachments?: any[];
  message_type?: string;
  created_at: string;
}

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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';
  amount: number;
  deposit_amount?: number;
  balance_amount?: number;
  platform_fee?: number;
  receipt_url?: string;
  payment_status: 'pending' | 'deposit_paid' | 'fully_paid' | 'refunded';
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
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// Backend wraps responses in { statusCode, message, data }
interface BackendResponse<T = any> {
  statusCode?: number;
  message?: string;
  data?: T;
  total?: number;
  // Auth endpoints return flat { access_token, user }
  access_token?: string;
  user?: User;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('access_token');

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 204) {
        return undefined as T;
      }

      let json: BackendResponse<T> = {};
      try {
        json = await response.json();
      } catch (e) {
        // Not a JSON response, maybe a raw error string or HTML
        json = { message: response.statusText } as any;
      }

      if (!response.ok) {
        // If token is expired or invalid, clear auth state and redirect to login
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          if (!window.location.pathname.startsWith('/auth/')) {
            window.location.href = '/auth/login';
          }
        }
        const errorMessage = this.getErrorMessage(response.status, json.message);
        throw new Error(errorMessage);
      }

      // Backend wraps in { data: ... } for most endpoints
      // Auth endpoints return flat { access_token, user }
      // If response has both data and total, return full object to preserve pagination info
      if (json.data !== undefined && json.total !== undefined) {
        return json as T;
      }

      if (json.data !== undefined) {
        return json.data as T;
      }

      return json as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('حدث خطأ في الاتصال بالخادم');
    }
  }

  private getErrorMessage(status: number, message?: string): string {
    if (message) return message;

    const errorMessages: Record<number, string> = {
      400: 'طلب غير صحيح',
      401: 'يجب تسجيل الدخول أولاً',
      403: 'ليس لديك صلاحية للوصول',
      404: 'المورد المطلوب غير موجود',
      409: 'البيانات موجودة مسبقاً',
      500: 'خطأ في الخادم',
      503: 'الخدمة غير متاحة حالياً',
    };

    return errorMessages[status] || `خطأ: ${status}`;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();
export default apiService;
