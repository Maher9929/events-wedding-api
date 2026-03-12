import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingsService, type Booking } from '../services/bookings.service';
import { toastService } from '../services/toast.service';

const statusMap: Record<string, { label: string; cls: string; icon: string }> = {
    pending: { label: 'قيد الانتظار', cls: 'bg-yellow-100 text-yellow-700', icon: 'fa-clock' },
    confirmed: { label: 'مؤكد', cls: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
    cancelled: { label: 'ملغي', cls: 'bg-red-100 text-red-700', icon: 'fa-times-circle' },
    completed: { label: 'مكتمل', cls: 'bg-blue-100 text-blue-700', icon: 'fa-flag-checkered' },
};

const BookingDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);

    useEffect(() => {
        if (!id) return;
        bookingsService.findOne(id)
            .then((data: any) => setBooking(data?.data || data))
            .catch(() => toastService.error('فشل تحميل تفاصيل الحجز'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleCancel = async () => {
        if (!id) return;
        setCancelling(true);
        try {
            await bookingsService.updateStatus(id, { status: 'cancelled', cancellation_reason: cancelReason });
            setBooking(prev => prev ? { ...prev, status: 'cancelled', cancellation_reason: cancelReason } : prev);
            setShowCancelModal(false);
            toastService.success('تم إلغاء الحجز');
        } catch {
            toastService.error('فشل إلغاء الحجز');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bglight font-tajawal flex items-center justify-center">
                <div className="text-center">
                    <i className="fa-solid fa-spinner fa-spin text-primary text-3xl mb-3"></i>
                    <p className="text-gray-500">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen bg-bglight font-tajawal flex flex-col items-center justify-center" dir="rtl">
                <i className="fa-solid fa-calendar-xmark text-gray-300 text-5xl mb-4"></i>
                <p className="text-gray-500 mb-4">الحجز غير موجود</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary text-white rounded-xl">العودة</button>
            </div>
        );
    }

    const st = statusMap[booking.status] || { label: booking.status, cls: 'bg-gray-100 text-gray-700', icon: 'fa-circle' };
    const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
    const payableAmount = Number(booking.balance_amount ?? booking.amount ?? 0);
    const isPartiallyPaid = booking.payment_status === 'pending' && payableAmount > 0 && payableAmount < Number(booking.amount || 0);
    const paymentType: 'balance' | 'full' = isPartiallyPaid ? 'balance' : 'full';

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-24" dir="rtl">
            <header className="bg-white sticky top-0 z-50 shadow-sm px-5 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                        <i className="fa-solid fa-arrow-right text-gray-700"></i>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">تفاصيل الحجز</h1>
                        <p className="text-xs text-gray-400">#{booking.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                </div>
            </header>

            <main className="px-5 py-5 space-y-4">
                {/* Status Card */}
                <div className={`rounded-2xl p-5 flex items-center gap-4 ${st.cls}`}>
                    <div className="w-14 h-14 rounded-2xl bg-white/50 flex items-center justify-center">
                        <i className={`fa-solid ${st.icon} text-2xl`}></i>
                    </div>
                    <div>
                        <p className="text-sm font-bold opacity-70">حالة الحجز</p>
                        <p className="text-2xl font-bold">{st.label}</p>
                    </div>
                </div>

                {/* Service Info */}
                {(booking as any).services && (
                    <div
                        className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/services/${(booking as any).services.id}`)}
                    >
                        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-box text-primary text-xl"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">الخدمة</p>
                            <p className="font-bold text-gray-900 truncate">{(booking as any).services.title}</p>
                            {(booking as any).providers?.company_name && (
                                <p className="text-xs text-gray-500">
                                    <i className="fa-solid fa-store ms-1 text-primary"></i>
                                    {(booking as any).providers.company_name}
                                    {(booking as any).providers.city && (
                                        <span className="me-2">
                                            <i className="fa-solid fa-location-dot ms-1 text-primary"></i>
                                            {(booking as any).providers.city}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                        <i className="fa-solid fa-chevron-left text-gray-400 text-sm flex-shrink-0"></i>
                    </div>
                )}

                {booking.receipt_url && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="fa-solid fa-file-invoice text-primary"></i>
                            الإيصال
                        </h3>
                        <a
                            href={booking.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square"></i>
                            عرض الإيصال
                        </a>
                    </div>
                )}

                {/* Details Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3">معلومات الحجز</h3>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-calendar text-primary w-4"></i>
                                تاريخ الحجز
                            </span>
                            <span className="font-bold text-sm text-gray-900">
                                {new Date(booking.booking_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-coins text-primary w-4"></i>
                                المبلغ الإجمالي
                            </span>
                            <span className="font-bold text-lg text-primary">{booking.amount.toLocaleString()} ر.ق</span>
                        </div>

                        {typeof booking.platform_fee === 'number' && booking.platform_fee > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 flex items-center gap-2">
                                    <i className="fa-solid fa-percent text-primary w-4"></i>
                                    عمولة المنصة
                                </span>
                                <span className="font-bold text-sm text-gray-900">{booking.platform_fee.toLocaleString()} ر.ق</span>
                            </div>
                        )}

                        {booking.deposit_amount && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 flex items-center gap-2">
                                    <i className="fa-solid fa-hand-holding-dollar text-primary w-4"></i>
                                    العربون
                                </span>
                                <span className="font-bold text-sm text-gray-900">{booking.deposit_amount.toLocaleString()} ر.ق</span>
                            </div>
                        )}

                        {payableAmount > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 flex items-center gap-2">
                                    <i className="fa-solid fa-money-bill-wave text-primary w-4"></i>
                                    المبلغ المتبقي
                                </span>
                                <span className="font-bold text-sm text-orange-600">{payableAmount.toLocaleString()} ر.ق</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-credit-card text-primary w-4"></i>
                                حالة الدفع
                            </span>
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${booking.payment_status === 'fully_paid' ? 'bg-green-100 text-green-700' :
                                booking.payment_status === 'deposit_paid' ? 'bg-blue-100 text-blue-700' :
                                    booking.payment_status === 'refunded' ? 'bg-orange-100 text-orange-700' :
                                        'bg-yellow-100 text-yellow-700'
                                }`}>
                                {booking.payment_status === 'fully_paid'
                                    ? 'مدفوع بالكامل'
                                    : booking.payment_status === 'deposit_paid'
                                        ? 'عربون مدفوع'
                                        : booking.payment_status === 'refunded'
                                            ? 'مسترجع'
                                            : isPartiallyPaid
                                                ? 'مدفوع جزئياً'
                                                : 'غير مدفوع'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-clock text-primary w-4"></i>
                                تاريخ الإنشاء
                            </span>
                            <span className="text-sm text-gray-700">
                                {new Date(booking.created_at).toLocaleDateString('ar-EG')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {booking.notes && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="fa-solid fa-note-sticky text-primary"></i>
                            ملاحظات
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{booking.notes}</p>
                    </div>
                )}

                {/* Cancellation Reason */}
                {booking.cancellation_reason && (
                    <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                        <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            سبب الإلغاء
                        </h3>
                        <p className="text-sm text-red-600">{booking.cancellation_reason}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3 pt-2">
                    {booking.payment_status === 'pending' && booking.status !== 'cancelled' && payableAmount > 0 && (
                        <button
                            onClick={() => navigate(`/booking/payment?booking_id=${booking.id}&amount=${payableAmount}&paymentType=${paymentType}&service=${encodeURIComponent((booking as any).services?.title || '')}`)}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-opacity"
                        >
                            <i className="fa-solid fa-credit-card"></i>
                            {paymentType === 'balance' ? 'دفع المتبقي' : 'دفع الآن'} — {payableAmount.toLocaleString()} ر.ق
                        </button>
                    )}

                    {booking.status === 'completed' && (booking as any).services?.id && (
                        <button
                            onClick={() => navigate(`/services/${(booking as any).services.id}`)}
                            className="w-full py-3.5 rounded-2xl gradient-purple text-white font-bold flex items-center justify-center gap-2 shadow-lg"
                        >
                            <i className="fa-solid fa-star"></i>
                            تقييم الخدمة
                        </button>
                    )}

                    <button
                        onClick={() => navigate(`/client/messages?providerId=${booking.provider_id}&autoStart=true`)}
                        className="w-full py-3.5 rounded-2xl bg-white border-2 border-primary text-primary font-bold flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors shadow-sm"
                    >
                        <i className="fa-solid fa-comment-dots"></i>
                        التواصل مع المورد
                    </button>

                    {canCancel && (
                        <button
                            onClick={() => setShowCancelModal(true)}
                            className="w-full py-3.5 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                        >
                            <i className="fa-solid fa-times-circle"></i>
                            إلغاء الحجز
                        </button>
                    )}
                </div>
            </main>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">إلغاء الحجز</h3>
                        <p className="text-sm text-gray-500 mb-4">هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">سبب الإلغاء (اختياري)</label>
                            <textarea
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                rows={3}
                                placeholder="أدخل سبب الإلغاء..."
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-red-200 resize-none text-sm"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {cancelling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                            </button>
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                            >
                                تراجع
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingDetailsPage;
