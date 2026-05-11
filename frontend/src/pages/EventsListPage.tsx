import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Event } from '../services/api';
import { toastService } from '../services/toast.service';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';

interface EventResponse {
  data?: Event[];
  total?: number;
}

const EventsListPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const { confirm: confirmDialog, ConfirmDialogComponent } = useConfirmDialog();
  const isArabic = i18n.language === 'ar';

  const statusMap = {
    planning: {
      label: t('events.status.planning', 'جاري التخطيط'),
      cls: 'bg-blue-100 text-blue-700',
    },
    confirmed: {
      label: t('events.status.confirmed', 'مؤكد'),
      cls: 'bg-green-100 text-green-700',
    },
    in_progress: {
      label: t('events.status.in_progress', 'قيد التنفيذ'),
      cls: 'bg-yellow-100 text-yellow-700',
    },
    completed: {
      label: t('events.status.completed', 'مكتمل'),
      cls: 'bg-purple-100 text-purple-700',
    },
    cancelled: {
      label: t('events.status.cancelled', 'ملغي'),
      cls: 'bg-red-100 text-red-700',
    },
  };

  const eventTypeMap: Record<string, string> = {
    wedding: t('events.type.wedding', 'حفل زفاف'),
    birthday: t('events.type.birthday', 'عيد ميلاد'),
    party: t('events.type.party', 'حفلة / خطوبة'),
    corporate: t('events.type.corporate', 'فعالية شركة'),
    conference: t('events.type.conference', 'مؤتمر'),
    other: t('events.type.other', 'أخرى'),
  };

  useEffect(() => {
    setPage(0);
  }, [filterStatus, filterType, sortOrder]);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterStatus && filterStatus !== 'all') {
          params.set('status', filterStatus);
        }
        if (filterType && filterType !== 'all') {
          params.set('event_type', filterType);
        }
        params.set('sort_order', sortOrder);
        params.set('limit', String(pageSize));
        params.set('offset', String(page * pageSize));

        const res = await apiService.get<EventResponse | Event[]>(
          `/events/my-events?${params.toString()}`,
        );
        const list = Array.isArray(res) ? res : res?.data || [];
        const returnedTotal =
          !Array.isArray(res) && res?.total !== undefined
            ? res.total
            : list.length;

        setEvents(list);
        setTotal(returnedTotal);
      } catch {
        toastService.error(t('events.error_loading', 'فشل تحميل الفعاليات'));
      } finally {
        setLoading(false);
      }
    };

    void fetchEvents();
  }, [filterStatus, filterType, sortOrder, page, t]);

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({
      title: t('events.confirm_delete_title', 'Delete Event'),
      message: t(
        'events.confirm_delete',
        'Are you sure you want to delete this event?',
      ),
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
    });
    if (!ok) return;
    try {
      await apiService.delete(`/events/id/${id}`);
      setEvents((prev) => prev.filter((event) => event.id !== id));
      toastService.success(t('events.delete_success', 'تم حذف الفعالية'));
    } catch {
      toastService.error(t('events.error_deleting', 'فشل حذف الفعالية'));
    }
  };

  const upcomingEvents = events.filter(
    (event) => new Date(event.event_date).getTime() >= Date.now(),
  ).length;

  const filters = [
    { value: 'all', label: t('common.all', 'الكل') },
    ...Object.entries(eventTypeMap).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,#f7f7fb_0%,#ffffff_46%,#f8f9fb_100%)] px-4 py-6 pb-24 sm:px-6 lg:px-0"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-[0_24px_80px_rgba(18,24,40,0.08)]">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex items-start gap-3">
              <button
                onClick={() => void navigate(-1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-primary/30 hover:text-primary"
                aria-label={t('common.back', 'Back')}
              >
                <i
                  className={`fa-solid ${isArabic ? 'fa-arrow-right' : 'fa-arrow-left'}`}
                ></i>
              </button>
              <div>
                <p className="text-sm font-black text-primary">
                  {t('events.total_events', '{{count}} فعالية', {
                    count: total,
                  })}
                </p>
                <h1 className="mt-1 text-2xl font-black text-gray-950 sm:text-3xl">
                  {t('events.title', 'فعالياتي')}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
                  {t(
                    'events.list_subtitle',
                    'Manage event planning, budgets, tasks and selected providers from one place.',
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold text-gray-500">
                  {t('events.upcoming', 'Upcoming')}
                </p>
                <p className="text-xl font-black text-gray-950">
                  {upcomingEvents}
                </p>
              </div>
              <Link
                to="/client/events/new"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
              >
                <i className="fa-solid fa-plus"></i>
                {t('events.create_new', 'إنشاء فعالية جديدة')}
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-5 rounded-[1.5rem] border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black transition ${
                    filterType === filter.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {(
                [
                  'all',
                  'planning',
                  'confirmed',
                  'in_progress',
                  'completed',
                  'cancelled',
                ] as const
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black transition ${
                    filterStatus === status
                      ? 'bg-gray-950 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status === 'all'
                    ? t('events.all_statuses', 'كل الحالات')
                    : statusMap[status]?.label || status}
                </button>
              ))}
              <button
                onClick={() =>
                  setSortOrder((current) =>
                    current === 'asc' ? 'desc' : 'asc',
                  )
                }
                className="shrink-0 rounded-2xl border border-gray-100 bg-white px-4 py-2 text-xs font-black text-gray-700 shadow-sm transition hover:text-primary"
              >
                <i
                  className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} me-1`}
                ></i>
                {sortOrder === 'asc'
                  ? t('events.sort.closest', 'الأقرب')
                  : t('events.sort.furthest', 'الأبعد')}
              </button>
            </div>
          </div>
        </section>

        <main>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-[2rem] bg-white shadow-sm"
                ></div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-gray-100 bg-white px-6 py-20 text-center shadow-sm">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <i className="fa-solid fa-calendar-days text-3xl"></i>
              </div>
              <h3 className="mb-2 text-xl font-black text-gray-950">
                {t('events.no_events', 'لا توجد فعاليات بعد')}
              </h3>
              <p className="mb-6 max-w-md text-sm text-gray-500">
                {t('events.start_creating', 'ابدأ بإنشاء فعاليتك الأولى الآن')}
              </p>
              <Link
                to="/client/events/new"
                className="rounded-2xl bg-primary px-8 py-3 text-sm font-black text-white shadow-lg shadow-primary/20"
              >
                {t('events.create_new', 'إنشاء فعالية جديدة')}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {events.map((event) => {
                const daysLeft = Math.ceil(
                  (new Date(event.event_date).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                );
                const budgets = (event.event_budgets || []) as {
                  amount?: number;
                }[];
                const tasks = (event.event_tasks || []) as {
                  is_completed?: boolean;
                }[];
                const spent = budgets.reduce(
                  (sum, budget) => sum + (budget.amount || 0),
                  0,
                );
                const completedTasks = tasks.filter(
                  (task) => task.is_completed,
                ).length;

                return (
                  <article
                    key={event.id}
                    className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(18,24,40,0.10)]"
                  >
                    <Link
                      to={`/client/events/${event.id}`}
                      className="block p-5"
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="mb-1 text-xs font-black text-primary">
                            {eventTypeMap[event.event_type] || event.event_type}
                          </p>
                          <h3 className="truncate text-lg font-black text-gray-950">
                            {event.title}
                          </h3>
                        </div>
                        <StatusBadge status={event.status} />
                      </div>

                      <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <i className="fa-solid fa-calendar text-primary"></i>
                          <p className="mt-2 font-bold text-gray-900">
                            {new Date(event.event_date).toLocaleDateString(
                              t('common.date_locale', 'ar-EG'),
                              { month: 'short', day: 'numeric' },
                            )}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <i className="fa-solid fa-users text-primary"></i>
                          <p className="mt-2 font-bold text-gray-900">
                            {event.guest_count
                              ? t('events.guests_count', '{{count}} ضيف', {
                                  count: event.guest_count,
                                })
                              : '-'}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <i className="fa-solid fa-wallet text-primary"></i>
                          <p className="mt-2 font-bold text-gray-900">
                            {event.budget
                              ? `${event.budget.toLocaleString()} ${t('common.currency', 'ر.ق')}`
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {(budgets.length > 0 || tasks.length > 0) && (
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                          {budgets.length > 0 && (
                            <span className="rounded-full bg-green-50 px-3 py-1.5 text-green-700">
                              <i className="fa-solid fa-coins me-1"></i>
                              {spent.toLocaleString()}{' '}
                              {t('events.spent', 'ر.ق مصروف')}
                            </span>
                          )}
                          {tasks.length > 0 && (
                            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                              <i className="fa-solid fa-check-square me-1"></i>
                              {completedTasks}/{tasks.length}{' '}
                              {t('events.tasks', 'مهام')}
                            </span>
                          )}
                        </div>
                      )}

                      {daysLeft > 0 && daysLeft <= 30 && (
                        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black text-amber-700">
                          <i className="fa-solid fa-clock me-2"></i>
                          {t('events.days_left', '{{count}} يوم متبقي', {
                            count: daysLeft,
                          })}
                        </div>
                      )}
                      {daysLeft <= 0 &&
                        event.status !== 'completed' &&
                        event.status !== 'cancelled' && (
                          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black text-red-700">
                            <i className="fa-solid fa-exclamation-circle me-2"></i>
                            {t('events.date_passed', 'انتهى التاريخ')}
                          </div>
                        )}
                    </Link>

                    <div className="grid grid-cols-3 border-t border-gray-100 text-sm font-black">
                      <Link
                        to={`/client/events/${event.id}`}
                        className="py-3 text-center text-primary transition hover:bg-primary/5"
                      >
                        <i className="fa-solid fa-eye me-1"></i>
                        {t('common.manage', 'إدارة')}
                      </Link>
                      <Link
                        to="/services"
                        className="border-x border-gray-100 py-3 text-center text-gray-600 transition hover:bg-gray-50"
                      >
                        <i className="fa-solid fa-plus me-1"></i>
                        {t('events.add_service', 'إضافة خدمة')}
                      </Link>
                      <button
                        onClick={() => void handleDelete(event.id)}
                        className="py-3 text-center text-red-500 transition hover:bg-red-50"
                      >
                        <i className="fa-solid fa-trash me-1"></i>
                        {t('common.delete', 'حذف')}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-6">
            <Pagination
              page={page}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </main>
      </div>
      <ConfirmDialogComponent />
    </div>
  );
};

export default EventsListPage;
