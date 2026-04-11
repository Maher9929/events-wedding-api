// ── Configuration ───────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const E2E_MODE = import.meta.env.VITE_E2E_MODE === 'true';
import i18n from '../i18n';

// ── Public types (re-exported from central module) ──────────
export type {
  User,
  UserRole,
  Category,
  ServiceItem,
  Provider,
  ProviderSummary,
  Event,
  Conversation,
  Message,
  Attachment,
  Booking,
  BookingStatus,
  PaymentStatus,
  AuthResponse,
  PaginatedResponse,
} from '../types';

import type { User } from '../types';

// ── Private types (internal to API layer) ───────────────────

/** Backend wraps responses in { statusCode, message, data } */
interface BackendResponse<T = unknown> {
  statusCode?: number;
  message?: string;
  data?: T;
  total?: number;
  access_token?: string;
  user?: User;
}

// ── API Service ─────────────────────────────────────────────

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
      if (!import.meta.env.PROD && E2E_MODE) {
        const { handleE2ERequest } = await import('./e2eMock');
        return await handleE2ERequest<T>(endpoint, config);
      }

      const response = await fetch(url, config);

      if (response.status === 204) {
        return undefined as T;
      }

      let json: BackendResponse<T> = {};
      try {
        json = await response.json();
      } catch {
        json = { message: response.statusText } as BackendResponse<T>;
      }

      if (!response.ok) {
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

      // Preserve pagination info when both data and total are present
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
      throw new Error(i18n.t('errors.connection', 'Connection error'));
    }
  }

  private getErrorMessage(status: number, message?: string): string {
    if (message) return message;

    const errorMessages: Record<number, string> = {
      400: i18n.t('errors.bad_request', 'Bad request'),
      401: i18n.t('errors.unauthorized', 'Please log in first'),
      403: i18n.t('errors.forbidden', 'Access denied'),
      404: i18n.t('errors.not_found', 'Resource not found'),
      409: i18n.t('errors.conflict', 'Data already exists'),
      500: i18n.t('errors.server', 'Server error'),
      503: i18n.t('errors.unavailable', 'Service unavailable'),
    };

    return errorMessages[status] || `${i18n.t('errors.generic', 'Error')}: ${status}`;
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
