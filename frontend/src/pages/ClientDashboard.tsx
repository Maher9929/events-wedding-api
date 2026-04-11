import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type Event } from '../services/api';
import { bookingsService, type Booking } from '../services/bookings.service';
import { eventsService } from '../services/events.service';
import { quotesService } from '../services/quotes.service';
import { messagesService } from '../services/messages.service';
import { type Conversation } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toastService } from '../services/toast.service';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ClientDashboard = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, isAuthenticated } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [recentMessages, setRecentMessages] = useState<Conversation[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [eventsData, bookingsData, quotesData, convosData] = await Promise.all([
                eventsService.getMyEvents().catch(() => ({ data: [], total: 0 })),
                bookingsService.getMyBookings().catch(() => ({ data: [], total: 0 })),
                quotesService.getMyQuotes().catch(() => ({ data: [], total: 0 })),
                messagesService.getConversations().catch(() => [])
            ]);
            void quotesData;

            const eventsList = Array.isArray(eventsData) ? eventsData : (eventsData as { data?: Event[] })?.data || [];
            setEvents(eventsList);
            setAllEvents(eventsList);

            const bookingsList = Array.isArray(bookingsData) ? bookingsData : (bookingsData as { data?: Booking[] })?.data || [];
            setBookings(bookingsList.slice(0, 5));
            setAllBookings(bookingsList);

            setRecentMessages(convosData.slice(0, 3));

        } catch (_error) {
            toastService.error(t('common.error_loading', 'فشل تحميل البيانات'));        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (isAuthenticated) {
            void fetchAllData();
        } else {
            setLoading(false);
        }
    }, [fetchAllData, isAuthenticated]);

    const sortedEvents = [...events].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    const nextEvent = sortedEvents.length > 0
        ? sortedEvents.find(e => new Date(e.event_date) >= new Date()) || sortedEvents[0]
        : null;
    const completedBookings = allBookings.filter(b => b.status === 'completed').length;
    const pendingBookings = allBookings.filter(b => b.status === 'pending').length;
    const totalSpent = allBookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.amount || 0), 0);

    if (loading) {
        return <LoadingSpinner fullScreen message={t('dashboard.loading', 'جاري تحميل لوحة التحكم...')} />;
    }

    return (
        <div className="space-y-6 px-5 py-6 animate-fade-in-up">
            {/* Premium Hero Section */}
            <div className="relative w-full overflow-hidden bg-gray-900 rounded-3xl mb-6 shadow-2xl animate-scale-in">
                <div className="absolute inset-0">
                    <img loading="lazy" 
                        src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=40&fm=webp" 
                        alt="Client Dashboard" 
                        className="w-full h-full object-cover opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
                </div>
                
                <div className="relative z-10 px-8 py-10 flex flex-col md:flex-row items-center justify-between">
                    <div className="text-right">
                        <span className="inline-block py-1 px-3 rounded-full bg-accent/20 text-accent text-xs font-bold mb-3 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <i className="fa-solid fa-crown me-1"></i>
                            {t('client_dashboard.title', 'لوحة تحكم العميل')}
                        </span>
                        <h2 className="text-3xl font-bold text-white mb-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            {t('client_dashboard.welcome', 'مرحباً،')} <span className="text-accent text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-200">{user?.full_name || t('user.default_name', 'مستخدم')}</span>
                        </h2>
                        <p className="text-gray-300 text-sm max-w-md animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            {t('client_dashboard.description', 'نظم فعالياتك وتتبع حجوزاتك بسهولة في مكان واحد. جميع أدواتك الإدارية جاهزة.')}
                        </p>
                    </div>

                    <div className="mt-6 md:mt-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        {nextEvent ? (
                            <Link to={`/client/events/${nextEvent.id}`} className="glass-effect rounded-2xl p-5 inline-block hover-scale shadow-premium border border-white/10 w-full md:min-w-[280px]">
                                <p className="text-accent text-xs font-bold mb-1 flex items-center justify-between">
                                    <span>{t('client_dashboard.next_event', 'الفعالية القادمة')}</span>
                                    <i className="fa-solid fa-bell animate-pulse"></i>
                                </p>
                                <h3 className="font-bold text-xl text-white mb-2">{nextEvent.title}</h3>
                                <p className="text-sm text-gray-300 mb-3">
                                    <i className="fa-solid fa-calendar-day ms-1"></i>
                                    {new Date(nextEvent.event_date).toLocaleDateString(t('common.date_locale', 'ar-EG'), { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <div className="flex items-center gap-2 text-xs font-bold bg-white/10 rounded-lg py-2 px-3 w-fit text-white hover:bg-white/20 transition-colors">
                                    <span>{t('client_dashboard.manage_event', 'إدارة الفعالية')}</span>
                                    <i className="fa-solid fa-arrow-left"></i>
                                </div>
                            </Link>
                        ) : (
                            <div className="glass-effect rounded-2xl p-6 shadow-premium border border-white/10 text-center w-full md:min-w-[280px]">
                                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <i className="fa-solid fa-calendar-plus text-white text-xl"></i>
                                </div>
                                <p className="text-gray-300 mb-4 text-sm">{t('client_dashboard.no_upcoming_events', 'لا توجد فعاليات قادمة')}</p>
                                <button onClick={() => navigate('/client/events/new')} className="w-full bg-accent text-gray-900 px-4 py-2.5 rounded-xl font-bold hover:bg-yellow-400 transition-colors shadow-lg">
                                    <i className="fa-solid fa-plus ms-1"></i> {t('client_dashboard.create_new', 'إنشاء فعالية جديدة')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm text-center card-hover animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-primary flex items-center justify-center mx-auto mb-3">
                        <i className="fa-solid fa-briefcase text-xl"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{allEvents.length}</p>
                    <p className="text-xs text-gray-500 font-bold">{t('client_dashboard.stats.my_events', 'فعالياتي')}</p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm text-center card-hover animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
                        <i className="fa-solid fa-check-circle text-xl"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{completedBookings}</p>
                    <p className="text-xs text-gray-500 font-bold">{t('client_dashboard.stats.completed_bookings', 'حجوزات مكتملة')}</p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm text-center card-hover animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <div className="w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto mb-3">
                        <i className="fa-solid fa-clock text-xl"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{pendingBookings}</p>
                    <p className="text-xs text-gray-500 font-bold">{t('client_dashboard.stats.pending_bookings', 'بانتظار التأكيد')}</p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm text-center card-hover animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                        <i className="fa-solid fa-coins text-xl"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900 mb-1">{totalSpent.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 font-bold">{t('client_dashboard.stats.spent', 'ر.ق مصروف')}</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { to: '/client/events', icon: 'fa-calendar-days', label: t('client_dashboard.actions.events', 'فعالياتي'), color: 'bg-purple-100 text-primary' },
                    { to: '/client/bookings', icon: 'fa-calendar-check', label: t('client_dashboard.actions.bookings', 'حجوزاتي'), color: 'bg-green-100 text-green-600' },
                    { to: '/client/messages', icon: 'fa-comment-dots', label: t('client_dashboard.actions.messages', 'الرسائل'), color: 'bg-pink-100 text-pink-600' },
                    { to: '/client/notifications', icon: 'fa-bell', label: t('client_dashboard.actions.notifications', 'الإشعارات'), color: 'bg-yellow-100 text-yellow-600' },
                    { to: '/client/quotes', icon: 'fa-file-invoice', label: t('client_dashboard.actions.quotes', 'عروض'), color: 'bg-blue-100 text-blue-600' },
                    { to: '/services', icon: 'fa-store', label: t('client_dashboard.actions.explore', 'استكشف'), color: 'bg-amber-100 text-amber-600' },
                ].map(item => (
                    <Link key={item.to} to={item.to} className="glass-effect rounded-2xl p-3 shadow-premium flex flex-col items-center gap-2 card-hover">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                            <i className={`fa-solid ${item.icon} text-sm`}></i>
                        </div>
                        <span className="text-xs font-bold text-gray-700">{item.label}</span>
                    </Link>
                ))}
            </div>

            {/* Recent Messages */}
            <div className="flex items-center justify-between mt-2">
                <h3 className="text-lg font-bold text-gray-900">{t('client_dashboard.recent.messages', 'آخر المحادثات')}</h3>
                <button onClick={() => navigate('/client/messages')} className="text-sm font-bold text-primary hover:underline">{t('common.view_all', 'عرض الكل')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentMessages.length === 0 ? (
                    <div className="md:col-span-3 text-center text-gray-400 py-4 glass-effect rounded-2xl text-sm">{t('client_dashboard.recent.no_messages', 'لا توجد رسائل بعد')}</div>
                ) : (
                    recentMessages.map(convo => (
                        <div
                            key={convo.id}
                            onClick={() => navigate(`/client/messages?id=${convo.id}`)}
                            className="glass-effect rounded-2xl p-4 shadow-premium flex items-center gap-3 card-hover cursor-pointer"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0 overflow-hidden">
                                {convo.recipient_avatar ? (
                                    <img loading="lazy" src={convo.recipient_avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    convo.recipient_name?.charAt(0)
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                                <p className="text-sm font-bold text-gray-900 truncate">{convo.recipient_name}</p>
                                <p className="text-[10px] text-gray-500">{new Date(convo.last_message_at).toLocaleDateString(t('common.date_locale', 'ar-EG'))}</p>
                            </div>
                            {(convo.unread_count || 0) > 0 && (
                                <span className="w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                    {convo.unread_count}
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Recent Bookings */}
            <div className="flex items-center justify-between mt-2">
                <h3 className="text-lg font-bold text-gray-900">{t('client_dashboard.recent.bookings', 'آخر الحجوزات')}</h3>
                <Link to="/client/bookings" className="text-sm font-bold text-primary hover:underline">{t('common.view_all', 'عرض الكل')}</Link>
            </div>
            <div className="space-y-3">
                {bookings.length === 0 ? (
                    <p className="text-center text-gray-400 py-4 text-sm">{t('client_dashboard.recent.no_bookings', 'لا توجد حجوزات بعد')}</p>
                ) : (
                    bookings.map((booking) => {
                        const statusMap: Record<string, { text: string; cls: string }> = {
                            confirmed: { text: t('bookings.status.confirmed', 'مؤكد'), cls: 'bg-green-100 text-green-700' },
                            pending: { text: t('bookings.status.pending', 'قيد الانتظار'), cls: 'bg-yellow-100 text-yellow-700' },
                            cancelled: { text: t('bookings.status.cancelled', 'ملغي'), cls: 'bg-red-100 text-red-700' },
                            completed: { text: t('bookings.status.completed', 'مكتمل'), cls: 'bg-blue-100 text-blue-700' },
                        };
                        const st = statusMap[booking.status] || { text: booking.status, cls: 'bg-gray-100 text-gray-700' };
                        const serviceTitle = booking.services?.title;
                        return (
                            <Link key={booking.id} to={`/client/bookings/${booking.id}`} className="glass-effect rounded-2xl p-4 shadow-premium flex items-center gap-4 card-hover">
                                <div className="w-12 h-12 rounded-xl bg-bglight flex items-center justify-center text-primary flex-shrink-0">
                                    <i className="fa-solid fa-calendar text-lg"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm truncate">
                                        {serviceTitle || new Date(booking.booking_date).toLocaleDateString(t('common.date_locale', 'ar-EG'))}
                                    </h4>
                                    {serviceTitle && (
                                        <p className="text-xs text-gray-400">{new Date(booking.booking_date).toLocaleDateString(t('common.date_locale', 'ar-EG'))}</p>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${st.cls}`}>{st.text}</span>
                                </div>
                                <p className="font-bold text-primary text-sm flex-shrink-0">{booking.amount.toLocaleString()} {t('common.currency', 'ر.ق')}</p>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ClientDashboard;
