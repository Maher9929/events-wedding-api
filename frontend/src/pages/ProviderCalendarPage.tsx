import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Booking } from '../services/api';

const ProviderCalendarPage = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

    useEffect(() => {
        loadBookings();
    }, [currentMonth]);

    const loadBookings = async () => {
        try {
            const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

            const data = await apiService.get<Booking[]>(`/bookings/provider/me?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`);
            setBookings(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load bookings:', error);
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
        switch (status) {
            case 'confirmed': return 'مؤكد';
            case 'pending': return 'قيد الانتظار';
            case 'cancelled': return 'ملغي';
            case 'completed': return 'مكتمل';
            case 'rejected': return 'مرفوض';
            default: return status;
        }
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
        <div className="min-h-screen bg-bglight p-5" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">تقويم الحجوزات</h1>
                        <p className="text-gray-600 mt-1">
                            {currentMonth.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
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
                                    {mode === 'month' ? 'شهر' : mode === 'week' ? 'أسبوع' : 'يوم'}
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

                {/* Calendar Grid */}
                <div className="bg-white rounded-3xl shadow-sm p-6">
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(day => (
                            <div key={day} className="text-center text-sm font-bold text-gray-600 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
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
                                                {booking.start_time || 'طوال اليوم'}
                                            </div>
                                        ))}
                                        {dayBookings.length > 2 && (
                                            <div className="text-xs text-gray-500 font-bold">
                                                +{dayBookings.length - 2} أخرى
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Date Details */}
                {selectedDate && (
                    <div className="bg-white rounded-3xl shadow-sm p-6 mt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            حجوزات {selectedDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
                                                        {booking.start_time || 'طوال اليوم'} {booking.end_time ? `- ${booking.end_time}` : ''}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-gray-900 mb-1">
                                                    {booking.location || 'المكان غير محدد'}
                                                </p>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {booking.guest_count ? `${booking.guest_count} ضيف` : ''}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="font-bold text-primary">
                                                        {booking.amount.toLocaleString('ar-EG')} ر.ق
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {booking.payment_status === 'fully_paid' ? 'مدفوع بالكامل' :
                                                            booking.payment_status === 'deposit_paid' ? 'تم دفع العربون' :
                                                                'بانتظار الدفع'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/bookings/${booking.id}`)}
                                                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold"
                                            >
                                                عرض التفاصيل
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-8">
                                    لا توجد حجوزات لهذا التاريخ
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                <i className="fa-solid fa-check text-green-600"></i>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">مؤكدة</p>
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
                                <p className="text-xs text-gray-500">قيد الانتظار</p>
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
                                <p className="text-xs text-gray-500">هذا الشهر</p>
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
                                <p className="text-xs text-gray-500">الإيرادات</p>
                                <p className="font-bold text-gray-900">
                                    {bookings
                                        .filter(b => b.payment_status === 'fully_paid')
                                        .reduce((sum, b) => sum + b.amount, 0)
                                        .toLocaleString('ar-EG')} ر.ق
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
