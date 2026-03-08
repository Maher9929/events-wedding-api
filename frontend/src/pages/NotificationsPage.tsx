import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsService, type Notification } from '../services/notifications.service';
import { toastService } from '../services/toast.service';
import { authService } from '../services/auth.service';
import { useTranslation } from 'react-i18next';

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
    booking: { icon: 'fa-calendar-check', color: 'text-green-600', bg: 'bg-green-100' },
    booking_request: { icon: 'fa-calendar-plus', color: 'text-orange-600', bg: 'bg-orange-100' },
    booking_created: { icon: 'fa-calendar-check', color: 'text-blue-600', bg: 'bg-blue-100' },
    booking_confirmed: { icon: 'fa-circle-check', color: 'text-green-600', bg: 'bg-green-100' },
    booking_cancelled: { icon: 'fa-circle-xmark', color: 'text-red-600', bg: 'bg-red-100' },
    booking_completed: { icon: 'fa-trophy', color: 'text-purple-600', bg: 'bg-purple-100' },
    message: { icon: 'fa-comment-dots', color: 'text-blue-600', bg: 'bg-blue-100' },
    review: { icon: 'fa-star', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    quote: { icon: 'fa-file-invoice', color: 'text-purple-600', bg: 'bg-purple-100' },
    system: { icon: 'fa-bell', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const PAGE_SIZE = 20;

const NotificationsPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'booking' | 'message'>('all');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        document.title = `${t('common.notifications')} | DOUSHA`;
    }, [t]);

    useEffect(() => { setPage(0); }, [filter]);

    const loadNotifications = () => {
        setLoading(true);
        const p = new URLSearchParams();
        p.set('limit', String(PAGE_SIZE));
        p.set('offset', String(page * PAGE_SIZE));
        if (filter === 'unread') p.set('unread', 'true');
        else if (filter === 'booking') p.set('type', 'booking');
        else if (filter === 'message') p.set('type', 'message');

        notificationsService.getNotifications(p)
            .then((data: any) => {
                const list = Array.isArray(data) ? data : data?.data || [];
                setNotifications(list);
                setTotal((data as any)?.total ?? list.length);
            })
            .catch(() => toastService.error(t('notifications.error_loading') || 'فشل تحميل الإشعارات'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadNotifications();
    }, [page, filter]);

    useEffect(() => {
        if (!currentUser?.id) return;

        const subscription = notificationsService.subscribeToNotifications(currentUser.id, (newNotif: Notification) => {
            setNotifications(prev => [newNotif, ...prev]);
            setTotal(t => t + 1);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [currentUser?.id]);

    const markAsRead = async (id: string) => {
        try {
            await notificationsService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch { /* silent */ }
    };

    const markAllAsRead = async () => {
        setMarkingAll(true);
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            toastService.success(t('notifications.mark_all_success') || 'تم تحديد الكل كمقروء');
        } catch {
            toastService.error(t('notifications.mark_all_error') || 'فشل تحديث الإشعارات');
        } finally {
            setMarkingAll(false);
        }
    };

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationsService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setTotal(t => t - 1);
        } catch { /* silent */ }
    };

    const deleteAllRead = async () => {
        if (!confirm(t('notifications.confirm_delete_all') || 'حذف جميع الإشعارات المقروءة؟')) return;
        try {
            await notificationsService.deleteAllRead();
            setNotifications(prev => prev.filter(n => !n.is_read));
            toastService.success(t('notifications.delete_success') || 'تم حذف الإشعارات المقروءة');
        } catch {
            toastService.error(t('notifications.delete_error') || 'فشل حذف الإشعارات');
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const filtered = notifications.filter(n => {
        if (filter === 'unread') return !n.is_read;
        if (filter === 'booking') return n.type.startsWith('booking');
        if (filter === 'message') return n.type === 'message';
        return true;
    });

    const handleNotificationClick = (n: Notification) => {
        if (!n.is_read) markAsRead(n.id);
        if (n.data?.booking_id) navigate(`/client/bookings/${n.data.booking_id}`);
        else if (n.type === 'message') navigate('/client/messages');
        else if (n.type === 'review') navigate('/client/bookings');
    };

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('notifications.time.now');
        if (mins < 60) return t('notifications.time.mins_ago', { count: mins });
        const hours = Math.floor(mins / 60);
        if (hours < 24) return t('notifications.time.hours_ago', { count: hours });
        const days = Math.floor(hours / 24);
        return t('notifications.time.days_ago', { count: days });
    };

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-24">
            <header className="bg-white sticky top-0 z-50 shadow-sm px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                            <i className="fa-solid fa-arrow-right text-gray-700"></i>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{t('common.notifications') || 'الإشعارات'}</h1>
                            {unreadCount > 0 && (
                                <p className="text-xs text-primary font-bold">{unreadCount} {t('notifications.unread') || 'غير مقروء'}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                disabled={markingAll}
                                className="text-sm font-bold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                            >
                                {markingAll ? 'جاري...' : 'تحديد الكل'}
                            </button>
                        )}
                        {notifications.some(n => n.is_read) && (
                            <button
                                onClick={deleteAllRead}
                                className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
                            >
                                <i className="fa-solid fa-trash ms-1"></i>
                                حذف المقروءة
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-none">
                {([
                    { key: 'all', label: t('notifications.filters.all'), count: notifications.length },
                    { key: 'unread', label: t('notifications.filters.unread'), count: unreadCount },
                    { key: 'booking', label: t('notifications.filters.booking'), count: notifications.filter(n => n.type.startsWith('booking')).length },
                    { key: 'message', label: t('notifications.filters.message'), count: notifications.filter(n => n.type === 'message').length },
                ] as const).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all flex-shrink-0 ${filter === f.key ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 shadow-sm'
                            }`}
                    >
                        {f.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>{f.count}</span>
                    </button>
                ))}
            </div>

            <main className="px-5 py-4">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse flex gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <i className="fa-regular fa-bell text-gray-400 text-3xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('notifications.no_notifications')}</h3>
                        <p className="text-sm text-gray-500">{t('notifications.no_notifications_desc')}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <i className="fa-regular fa-bell text-gray-300 text-4xl mb-3"></i>
                        <p className="text-gray-400 text-sm">{t('notifications.no_category_match')}</p>
                    </div>
                ) : (() => {
                    const dateLabel = (date: string) => {
                        const d = new Date(date);
                        const today = new Date();
                        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                        if (d.toDateString() === today.toDateString()) return 'اليوم';
                        if (d.toDateString() === yesterday.toDateString()) return 'أمس';
                        return d.toLocaleDateString('ar-EG', { weekday: 'long', month: 'short', day: 'numeric' });
                    };
                    const groups: { label: string; items: Notification[] }[] = [];
                    filtered.forEach(n => {
                        const label = dateLabel(n.created_at);
                        const g = groups.find(g => g.label === label);
                        if (g) g.items.push(n);
                        else groups.push({ label, items: [n] });
                    });
                    return (
                        <div className="space-y-4">
                            {groups.map(group => (
                                <div key={group.label}>
                                    <p className="text-xs font-bold text-gray-400 mb-2 px-1">{group.label}</p>
                                    <div className="space-y-2">
                                        {group.items.map(n => {
                                            const cfg = typeConfig[n.type] || typeConfig.system;
                                            return (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`w-full text-right p-4 rounded-2xl shadow-sm flex items-start gap-3 transition-all hover:shadow-md cursor-pointer ${n.is_read ? 'bg-white' : 'bg-purple-50 border border-purple-100'
                                                        }`}
                                                >
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                                                        <i className={`fa-solid ${cfg.icon} ${cfg.color}`}></i>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className={`text-sm font-bold truncate ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                                                {n.title}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                {!n.is_read && (
                                                                    <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                                                                )}
                                                                <button
                                                                    onClick={(e) => deleteNotification(n.id, e)}
                                                                    className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <i className="fa-solid fa-times text-[10px]"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {/* Pagination */}
                {total > PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-3 pt-4 pb-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            <i className="fa-solid fa-chevron-right text-sm"></i>
                        </button>
                        <span className="text-sm font-bold text-gray-700">{page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={(page + 1) * PAGE_SIZE >= total}
                            className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            <i className="fa-solid fa-chevron-left text-sm"></i>
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default NotificationsPage;
