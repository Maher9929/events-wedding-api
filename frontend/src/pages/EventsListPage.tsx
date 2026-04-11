import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Event } from '../services/api';
import { toastService } from '../services/toast.service';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';

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
    const PAGE_SIZE = 10;
    const { confirm: confirmDialog, ConfirmDialogComponent } = useConfirmDialog();

    const statusMap = {
        planning: { label: t('events.status.planning', 'جاري التخطيط'), cls: 'bg-blue-100 text-blue-700' },
        confirmed: { label: t('events.status.confirmed', 'مؤكد'), cls: 'bg-green-100 text-green-700' },
        in_progress: { label: t('events.status.in_progress', 'قيد التنفيذ'), cls: 'bg-yellow-100 text-yellow-700' },
        completed: { label: t('events.status.completed', 'مكتمل'), cls: 'bg-purple-100 text-purple-700' },
        cancelled: { label: t('events.status.cancelled', 'ملغي'), cls: 'bg-red-100 text-red-700' },
    };

    const eventTypeMap: Record<string, string> = {
        wedding: t('events.type.wedding', 'حفل زفاف'),
        birthday: t('events.type.birthday', 'عيد ميلاد'),
        party: t('events.type.party', 'حفلة / خطوبة'),
        corporate: t('events.type.corporate', 'فعالية شركة'),
        conference: t('events.type.conference', 'مؤتمر'),
        other: t('events.type.other', 'أخرى'),
    };

    useEffect(() => { setPage(0); }, [filterStatus, filterType, sortOrder]);

    useEffect(() => {
        fetchEvents();
    }, [filterStatus, filterType, sortOrder, page]); // eslint-disable-line

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams();
            if (filterStatus && filterStatus !== 'all') p.set('status', filterStatus);
            if (filterType && filterType !== 'all') p.set('event_type', filterType);
            p.set('sort_order', sortOrder);
            p.set('limit', String(PAGE_SIZE));
            p.set('offset', String(page * PAGE_SIZE));
            
            interface EventResponse {
                data?: Event[];
                total?: number;
            }
            const res = await apiService.get<EventResponse | Event[]>(`/events/my-events?${p.toString()}`);
            const list = Array.isArray(res) ? res : res?.data || [];
            const returnedTotal = !Array.isArray(res) && res?.total !== undefined ? res.total : list.length;
            
            setEvents(list);
            setTotal(returnedTotal);
        } catch (_error) {
            toastService.error(t('events.error_loading', 'فشل تحميل الفعاليات'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirmDialog({
            title: t('events.confirm_delete_title', 'Delete Event'),
            message: t('events.confirm_delete', 'Are you sure you want to delete this event?'),
            confirmLabel: t('common.delete', 'Delete'),
            cancelLabel: t('common.cancel', 'Cancel'),
        });
        if (!ok) return;
        try {
            await apiService.delete(`/events/id/${id}`);
            setEvents(prev => prev.filter(e => e.id !== id));
            toastService.success(t('events.delete_success', 'تم حذف الفعالية'));
        } catch (_error) {
            toastService.error(t('events.error_deleting', 'فشل حذف الفعالية'));
        }
    };

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-24" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 shadow-sm px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                            <i className="fa-solid fa-arrow-right text-gray-700"></i>
                        </button>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{t('events.title', 'فعالياتي')}</h1>
                                <p className="text-xs text-gray-500">{t('events.total_events', '{{count}} فعالية', { count: total })}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                                    className="h-9 px-3 rounded-xl bg-bglight text-gray-600 text-xs font-bold flex items-center gap-1 hover:bg-gray-200 transition-colors"
                                >
                                    <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} text-xs`}></i>
                                    {sortOrder === 'asc' ? t('events.sort.closest', 'الأقرب') : t('events.sort.furthest', 'الأبعد')}
                                </button>
                                <Link
                                    to="/client/events/new"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-purple text-white text-sm font-bold shadow-md"
                                >
                                    <i className="fa-solid fa-plus"></i>
                                    {t('events.new_event', 'جديدة')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${filterType === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-600 shadow-sm'}`}>{t('common.all', 'الكل')}</button>
                {Object.entries(eventTypeMap).map(([k, v]) => (
                    <button key={k} onClick={() => setFilterType(filterType === k ? 'all' : k)} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${filterType === k ? 'bg-primary text-white' : 'bg-white text-gray-600 shadow-sm'}`}>{v}</button>
                ))}
            </div>
            <div className="px-5 pb-2 flex gap-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                {(['all', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${filterStatus === s ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 shadow-sm'}`}>
                        {s === 'all' ? t('events.all_statuses', 'كل الحالات') : statusMap[s as keyof typeof statusMap]?.label || s}
                    </button>
                ))}
            </div>

            <main className="px-5 py-5">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
                                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                            <i className="fa-solid fa-calendar-days text-primary text-3xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('events.no_events', 'لا توجد فعاليات بعد')}</h3>
                        <p className="text-sm text-gray-500 mb-6">{t('events.start_creating', 'ابدأ بإنشاء فعاليتك الأولى الآن')}</p>
                        <Link
                            to="/client/events/new"
                            className="px-8 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg"
                        >
                            {t('events.create_new', 'إنشاء فعالية جديدة')}
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events
                            .map(event => {
                                const daysLeft = Math.ceil((new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={event.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                        <Link to={`/client/events/${event.id}`} className="block p-5">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 text-base truncate">{event.title}</h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {eventTypeMap[event.event_type] || event.event_type}
                                                    </p>
                                                </div>
                                                <StatusBadge status={event.status} />
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <i className="fa-solid fa-calendar text-primary"></i>
                                                    {new Date(event.event_date).toLocaleDateString(t('common.date_locale', 'ar-EG'), { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </span>
                                                {event.guest_count && (
                                                    <span className="flex items-center gap-1">
                                                        <i className="fa-solid fa-users text-primary"></i>
                                                        {t('events.guests_count', '{{count}} ضيف', { count: event.guest_count })}
                                                    </span>
                                                )}
                                                {event.budget && (
                                                    <span className="flex items-center gap-1">
                                                        <i className="fa-solid fa-wallet text-primary"></i>
                                                        {event.budget.toLocaleString()} {t('common.currency', 'ر.ق')}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Budget + Tasks stats */}
                                            {(() => {
                                                const budgets = (event.event_budgets || []) as { amount?: number }[];
                                                const tasks = (event.event_tasks || []) as { is_completed?: boolean }[];
                                                const spent = budgets.reduce((s, b) => s + (b.amount || 0), 0);
                                                const completedTasks = tasks.filter((t) => t.is_completed).length;
                                                if (budgets.length === 0 && tasks.length === 0) return null;
                                                return (
                                                    <div className="mt-3 flex items-center gap-3 text-xs">
                                                        {budgets.length > 0 && (
                                                            <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg font-bold">
                                                                <i className="fa-solid fa-coins text-[10px]"></i>
                                                                {spent.toLocaleString()} {t('events.spent', 'ر.ق مصروف')}
                                                            </span>
                                                        )}
                                                        {tasks.length > 0 && (
                                                            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold">
                                                                <i className="fa-solid fa-check-square text-[10px]"></i>
                                                                {completedTasks}/{tasks.length} {t('events.tasks', 'مهام')}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {daysLeft > 0 && daysLeft <= 30 && (
                                                <div className="mt-3 flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
                                                    <i className="fa-solid fa-clock text-amber-500 text-xs"></i>
                                                    <span className="text-xs font-bold text-amber-700">
                                                        {t('events.days_left', '{{count}} يوم متبقي', { count: daysLeft })}
                                                    </span>
                                                </div>
                                            )}
                                            {daysLeft <= 0 && event.status !== 'completed' && event.status !== 'cancelled' && (
                                                <div className="mt-3 flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2">
                                                    <i className="fa-solid fa-exclamation-circle text-red-500 text-xs"></i>
                                                    <span className="text-xs font-bold text-red-700">{t('events.date_passed', 'انتهى التاريخ')}</span>
                                                </div>
                                            )}
                                        </Link>

                                        <div className="flex border-t border-gray-100">
                                            <Link
                                                to={`/client/events/${event.id}`}
                                                className="flex-1 py-3 text-center text-sm font-bold text-primary hover:bg-purple-50 transition-colors"
                                            >
                                                <i className="fa-solid fa-eye ms-1"></i>
                                                {t('common.manage', 'إدارة')}
                                            </Link>
                                            <div className="w-px bg-gray-100"></div>
                                            <Link
                                                to="/services"
                                                className="flex-1 py-3 text-center text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                            >
                                                <i className="fa-solid fa-plus ms-1"></i>
                                                {t('events.add_service', 'إضافة خدمة')}
                                            </Link>
                                            <div className="w-px bg-gray-100"></div>
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="flex-1 py-3 text-center text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <i className="fa-solid fa-trash ms-1"></i>
                                                {t('common.delete', 'حذف')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}

                <Pagination
                    page={page}
                    total={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                />
            </main>
            <ConfirmDialogComponent />
        </div>
    );
};

export default EventsListPage;
