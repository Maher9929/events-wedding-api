import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
    const { user, isAuthenticated } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [recentMessages, setRecentMessages] = useState<Conversation[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            fetchAllData();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [eventsData, bookingsData, _quotesData, convosData] = await Promise.all([
                eventsService.getMyEvents().catch(() => ({ data: [], total: 0 })),
                bookingsService.getMyBookings().catch(() => ({ data: [], total: 0 })),
                quotesService.getMyQuotes().catch(() => ({ data: [], total: 0 })),
                messagesService.getConversations().catch(() => [])
            ]);

            const eventsList = Array.isArray(eventsData) ? eventsData : (eventsData as any)?.data || [];
            setEvents(eventsList);
            setAllEvents(eventsList);

            const bookingsList = Array.isArray(bookingsData) ? bookingsData : (bookingsData as any)?.data || [];
            setBookings(bookingsList.slice(0, 5));
            setAllBookings(bookingsList);

            setRecentMessages(convosData.slice(0, 3));

            // const quotesList = Array.isArray(quotesData) ? quotesData : (quotesData as any)?.data || [];
            // setQuotes(quotesList); // Not used currently
        } catch (error: any) {
            toastService.error('فشل تحميل البيانات');
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const sortedEvents = [...events].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    const nextEvent = sortedEvents.length > 0
        ? sortedEvents.find(e => new Date(e.event_date) >= new Date()) || sortedEvents[0]
        : null;
    const completedBookings = allBookings.filter(b => b.status === 'completed').length;
    const pendingBookings = allBookings.filter(b => b.status === 'pending').length;
    const totalSpent = allBookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.amount || 0), 0);

    if (loading) {
        return <LoadingSpinner fullScreen message="جاري تحميل لوحة التحكم..." />;
    }

    return (
        <div className="space-y-6 px-5 py-6 animate-fade-in-up">
            {/* Header Card */}
            <div className="gradient-purple rounded-3xl p-6 text-white shadow-premium relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2">مرحباً، {user?.full_name || 'مستخدم'}</h2>

                    {nextEvent ? (
                        <>
                            <p className="opacity-90 mb-4">لديك حدث قادم قريباً</p>
                            <Link to={`/client/events/${nextEvent.id}`} className="bg-white/20 backdrop-blur-sm rounded-xl p-4 inline-block hover:bg-white/30 transition-colors cursor-pointer min-w-[250px]">
                                <h3 className="font-bold text-lg">{nextEvent.title}</h3>
                                <p className="text-sm opacity-90">
                                    <i className="fa-solid fa-calendar-day ms-1"></i>
                                    {new Date(nextEvent.event_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <div className="mt-2 flex items-center gap-2 text-xs font-bold bg-white/20 rounded-lg py-1 px-2 w-fit">
                                    <span>إدارة الفعالية</span>
                                    <i className="fa-solid fa-arrow-left"></i>
                                </div>
                            </Link>
                        </>
                    ) : (
                        <div>
                            <p className="opacity-90 mb-4">لا توجد فعاليات قادمة</p>
                            <button onClick={() => navigate('/client/events/new')} className="bg-white text-purple-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                                إنشاء فعالية جديدة
                            </button>
                        </div>
                    )}
                </div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-3xl shadow-sm text-center card-hover">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-primary flex items-center justify-center mx-auto mb-3">
                        <i className="fa-solid fa-briefcase text-xl"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{allEvents.length}</p>
                    <p className="text-xs text-gray-500 font-bold">فعالياتي</p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm text-center card-hover">
                    <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
                        <i className="fa-solid fa-check-circle text-xl"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{completedBookings}</p>
                    <p className="text-xs text-gray-500 font-bold">حجوزات مكتملة</p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm text-center card-hover">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto mb-3">
                        <i className="fa-solid fa-clock text-xl"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{pendingBookings}</p>
                    <p className="text-xs text-gray-500 font-bold">بانتظار التأكيد</p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm text-center card-hover">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                        <i className="fa-solid fa-coins text-xl"></i>
                    </div>
                    <p className="text-xl font-bold text-gray-900 mb-1">{totalSpent.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 font-bold">ر.ق مصروف</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { to: '/client/events', icon: 'fa-calendar-days', label: 'فعالياتي', color: 'bg-purple-100 text-primary' },
                    { to: '/client/bookings', icon: 'fa-calendar-check', label: 'حجوزاتي', color: 'bg-green-100 text-green-600' },
                    { to: '/client/messages', icon: 'fa-comment-dots', label: 'الرسائل', color: 'bg-pink-100 text-pink-600' },
                    { to: '/client/notifications', icon: 'fa-bell', label: 'الإشعارات', color: 'bg-yellow-100 text-yellow-600' },
                    { to: '/client/quotes', icon: 'fa-file-invoice', label: 'عروض', color: 'bg-blue-100 text-blue-600' },
                    { to: '/services', icon: 'fa-store', label: 'استكشف', color: 'bg-amber-100 text-amber-600' },
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
                <h3 className="text-lg font-bold text-gray-900">آخر المحادثات</h3>
                <button onClick={() => navigate('/client/messages')} className="text-sm font-bold text-primary hover:underline">عرض الكل</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentMessages.length === 0 ? (
                    <div className="md:col-span-3 text-center text-gray-400 py-4 glass-effect rounded-2xl text-sm">لا توجد رسائل بعد</div>
                ) : (
                    recentMessages.map(convo => (
                        <div
                            key={convo.id}
                            onClick={() => navigate(`/client/messages?id=${convo.id}`)}
                            className="glass-effect rounded-2xl p-4 shadow-premium flex items-center gap-3 card-hover cursor-pointer"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0 overflow-hidden">
                                {convo.recipient_avatar ? (
                                    <img src={convo.recipient_avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    convo.recipient_name?.charAt(0)
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                                <p className="text-sm font-bold text-gray-900 truncate">{convo.recipient_name}</p>
                                <p className="text-[10px] text-gray-500">{new Date(convo.last_message_at).toLocaleDateString('ar-EG')}</p>
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
                <h3 className="text-lg font-bold text-gray-900">آخر الحجوزات</h3>
                <Link to="/client/bookings" className="text-sm font-bold text-primary hover:underline">عرض الكل</Link>
            </div>
            <div className="space-y-3">
                {bookings.length === 0 ? (
                    <p className="text-center text-gray-400 py-4 text-sm">لا توجد حجوزات بعد</p>
                ) : (
                    bookings.map((booking) => {
                        const statusMap: Record<string, { text: string; cls: string }> = {
                            confirmed: { text: 'مؤكد', cls: 'bg-green-100 text-green-700' },
                            pending: { text: 'قيد الانتظار', cls: 'bg-yellow-100 text-yellow-700' },
                            cancelled: { text: 'ملغي', cls: 'bg-red-100 text-red-700' },
                            completed: { text: 'مكتمل', cls: 'bg-blue-100 text-blue-700' },
                        };
                        const st = statusMap[booking.status] || { text: booking.status, cls: 'bg-gray-100 text-gray-700' };
                        const serviceTitle = (booking as any).services?.title;
                        return (
                            <Link key={booking.id} to={`/client/bookings/${booking.id}`} className="glass-effect rounded-2xl p-4 shadow-premium flex items-center gap-4 card-hover">
                                <div className="w-12 h-12 rounded-xl bg-bglight flex items-center justify-center text-primary flex-shrink-0">
                                    <i className="fa-solid fa-calendar text-lg"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm truncate">
                                        {serviceTitle || new Date(booking.booking_date).toLocaleDateString('ar-EG')}
                                    </h4>
                                    {serviceTitle && (
                                        <p className="text-xs text-gray-400">{new Date(booking.booking_date).toLocaleDateString('ar-EG')}</p>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${st.cls}`}>{st.text}</span>
                                </div>
                                <p className="font-bold text-primary text-sm flex-shrink-0">{booking.amount.toLocaleString()} ر.ق</p>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ClientDashboard;
