import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { User, Category, Event } from '../services/api';

// ─── Interfaces ─────────────────────────────────────────────

export interface BookingStats {
  total_bookings: number;
  total_revenue: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  monthly_revenue?: { month: string; revenue: number }[];
}

export interface EventStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface ProviderStats {
  total: number;
  verified: number;
  unverified: number;
  avg_rating: number;
  total_services?: number;
  total_users?: number;
}

export interface GenericBookingRow {
  status?: string;
  amount?: number;
  service_id?: string;
  client_id?: string;
  provider_id?: string;
  services?: { id: string; title: string; category_id?: string };
  users?: { email: string; full_name?: string };
  providers?: { company_name?: string };
}

export interface AdminDashboardData {
  users: User[];
  totalUsers: number;
  categories: Category[];
  events: Event[];
  totalEvents: number;
  bookingStats: BookingStats;
  eventStats: EventStats | null;
  providerStats: ProviderStats | null;
  allBookings: GenericBookingRow[];
  loading: boolean;
  errorMessage: string | null;
}

// ─── Hook ───────────────────────────────────────────────────

export function useAdminDashboard(): AdminDashboardData {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    total_bookings: 0,
    total_revenue: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
  const [allBookings, setAllBookings] = useState<GenericBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      apiService
        .get<{ data?: User[]; total?: number } | User[]>('/users')
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setUsers(list as User[]);
          setTotalUsers(
            (!Array.isArray(res) ? res?.total : list.length) || list.length,
          );
        }),
      apiService
        .get<{ data?: Category[] } | Category[]>('/categories')
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setCategories(list as Category[]);
        }),
      apiService
        .get<{ data?: Event[]; total?: number } | Event[]>('/events')
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setEvents(list as Event[]);
          setTotalEvents(
            (!Array.isArray(res) ? res?.total : list.length) || list.length,
          );
        }),
      apiService.get<BookingStats>('/bookings/admin/stats').then(setBookingStats),
      apiService.get<EventStats>('/events/stats').then(setEventStats),
      apiService.get<ProviderStats>('/providers/stats').then(setProviderStats),
      apiService
        .get<{ data?: GenericBookingRow[] } | GenericBookingRow[]>('/bookings')
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setAllBookings(list as GenericBookingRow[]);
        }),
    ])
      .then((results) => {
        setErrorMessage(null);
        const rejected = results.filter((r) => r.status === 'rejected');
        if (rejected.length > 0) {
          console.error('Some dashboard requests failed:', rejected);
          setErrorMessage(
            t(
              'admin.dashboard.error_loading',
              'تعذر تحميل بعض البيانات. يرجى التأكد من صلاحياتك.',
            ),
          );
        }
      })
      .finally(() => setLoading(false));
  }, [t]);

  return {
    users,
    totalUsers,
    categories,
    events,
    totalEvents,
    bookingStats,
    eventStats,
    providerStats,
    allBookings,
    loading,
    errorMessage,
  };
}
