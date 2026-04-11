import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Booking } from '../services/api';
import { toastService } from '../services/toast.service';

const ProviderCalendarPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

    useEffect(() => {
        loadBookings();
    }, [currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadBookings = async () => {
        try {
            const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

            const data = await apiService.get<Booking[] | { data: Booking[] }>(`/bookings/provider/me?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`);
            const payload = Array.isArray(data) ? data : data?.data || [];
            setBookings(payload);
        } catch (_error) {
            toastService.error(t('provider.calendar.error_loading', 'فشل تحميل الحجوزات'));
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const getBookingsForDate = (date: Date) => {
        if (!date) return [];
        return bookings.filter(booking => {
            const bookingDate = new Date(booking.booking_date);
            return bookingDate.toDateString() === date.toDateString();
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'rejected': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        return t(`bookings.status.${status}`, status);
    };

    const navigateMonth = (direction: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bglight p-5">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded-3xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bglight p-5" dir={i18n.language === 'en' ? 'ltr' : 'rtl'}>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('provider.calendar.title', 'تقويم الحجوزات')}</h1>
                        <p className="text-gray-600 mt-1">
                            {currentMonth.toLocaleDateString(t('common.date_locale', 'ar-EG'), { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white rounded-xl p-1 shadow-sm">
                            {(['month', 'week', 'day'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === mode
                                            ? 'bg-primary text-white'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    {t(`provider.calendar.modes.${mode}`, mode === 'month' ? 'شهر' : mode === 'week' ? 'أسبوع' : 'يوم')}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => navigateMonth(-1)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <i className="fa-solid fa-chevron-left text-gray-600"></i>
                        </button>
                        <button onClick={() => navigateMonth(1)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <i className="fa-solid fa-chevron-right text-gray-600"></i>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm p-6">
                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {[
                            t('provider.calendar.days.sun', 'أحد'), 
                            t('provider.calendar.days.mon', 'اثنين'), 
                            t('provider.calendar.days.tue', 'ثلاثاء'), 
                            t('provider.calendar.days.wed', 'أربعاء'), 
                            t('provider.calendar.days.thu', 'خميس'), 
                            t('provider.calendar.days.fri', 'جمعة'), 
                            t('provider.calendar.days.sat', 'سبت')
                        ].map(day => (
                            <div key={day} className="text-center text-sm font-bold text-gray-600 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {getDaysInMonth().map((date, index) => {
                            const dayBookings = date ? getBookingsForDate(date) : [];
                            const isToday = date?.toDateString() === new Date().toDateString();
                            const isSelected = selectedDate?.toDateString() === date?.toDateString();

                            if (!date) {
                                return <div key={`empty-${index}`} className="h-24"></div>;
                            }

                            return (
                                <div
                                    key={date.toISOString()}
                                    onClick={() => setSelectedDate(date)}
                                    className={`h-24 border rounded-xl p-2 cursor-pointer transition-all ${isToday ? 'border-primary bg-primary/5' : 'border-gray-200'
                                        } ${isSelected ? 'ring-2 ring-primary' : ''} hover:border-primary`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                                            {date.getDate()}
                                        </span>
                                        {dayBookings.length > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                                        )}
                                    </div>
                                    <div className="space-y-1 overflow-hidden">
                                        {dayBookings.slice(0, 2).map((booking) => (
                                            <div
                                                key={booking.id}
                                                className={`text-xs px-1 py-0.5 rounded border truncate ${getStatusColor(booking.status)}`}
                                                title={`${booking.booking_date} - ${getStatusText(booking.status)}`}
                                            >
                                                {booking.start_time || t('provider.calendar.all_day', 'طوال اليوم')}
                                            </div>
                                        ))}
                                        {dayBookings.length > 2 && (
                                            <div className="text-xs text-gray-500 font-bold">
                                                +{dayBookings.length - 2} {t('provider.calendar.others', 'أخرى')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {selectedDate && (
                    <div className="bg-white rounded-3xl shadow-sm p-6 mt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {t('provider.calendar.bookings_on', 'حجوزات')} {selectedDate.toLocaleDateString(t('common.date_locale', 'ar-EG'), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </h3>
                        <div className="space-y-3">
                            {getBookingsForDate(selectedDate).length > 0 ? (
                                getBookingsForDate(selectedDate).map(booking => (
                                    <div key={booking.id} className="border border-gray-200 rounded-xl p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                                                        {getStatusText(booking.status)}
                                                    </span>
                                                    <span className="text-sm text-gray-600">
                                                        {booking.start_time || t('provider.calendar.all_day', 'طوال اليوم')} {booking.end_time ? `- ${booking.end_time}` : ''}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-gray-900 mb-1">
                                                    {booking.location || t('provider.calendar.no_location', 'المكان غير محدد')}
                                                </p>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {booking.guest_count ? `${booking.guest_count} ${t('provider.calendar.guest', 'ضيف')}` : ''}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="font-bold text-primary">
                                                        {booking.amount.toLocaleString(t('common.date_locale', 'ar-EG'))} {t('common.currency', 'ر.ق')}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {booking.payment_status === 'fully_paid' ? t('provider.calendar.payment.fully_paid', 'مدفوع بالكامل') :
                                                            booking.payment_status === 'deposit_paid' ? t('provider.calendar.payment.deposit_paid', 'تم دفع العربون') :
                                                                t('provider.calendar.payment.pending', 'بانتظار الدفع')}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/bookings/${booking.id}`)}
                                                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold"
                                            >
                                                {t('provider.calendar.view_details', 'عرض التفاصيل')}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-8">
                                    {t('provider.calendar.no_bookings', 'لا توجد حجوزات لهذا التاريخ')}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                <i className="fa-solid fa-check text-green-600"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('provider.calendar.stats.confirmed', 'مؤكدة')}</p>
                                <p className="font-bold text-gray-900">
                                    {bookings.filter(b => b.status === 'confirmed').length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                                <i className="fa-solid fa-clock text-yellow-600"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('provider.calendar.stats.pending', 'قيد الانتظار')}</p>
                                <p className="font-bold text-gray-900">
                                    {bookings.filter(b => b.status === 'pending').length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <i className="fa-solid fa-calendar-check text-blue-600"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('provider.calendar.stats.this_month', 'هذا الشهر')}</p>
                                <p className="font-bold text-gray-900">
                                    {bookings.length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                <i className="fa-solid fa-money-bill text-purple-600"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('provider.calendar.stats.revenue', 'الإيرادات')}</p>
                                <p className="font-bold text-gray-900">
                                    {bookings
                                        .filter(b => b.payment_status === 'fully_paid')
                                        .reduce((sum, b) => sum + b.amount, 0)
                                        .toLocaleString(t('common.date_locale', 'ar-EG'))} {t('common.currency', 'ر.ق')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProviderCalendarPage;
