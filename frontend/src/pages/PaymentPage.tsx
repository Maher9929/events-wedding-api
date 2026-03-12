import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';
import type { Booking } from '../services/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            fontSize: '16px',
            color: '#374151',
            fontFamily: 'Arial, sans-serif',
            '::placeholder': { color: '#9ca3af' },
        },
        invalid: { color: '#ef4444' },
    },
};

const CheckoutForm = ({ bookingId, amount, paymentType, onSuccess }: { bookingId: string; amount: number; paymentType: 'deposit' | 'balance' | 'full'; onSuccess: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [, setBooking] = useState<Booking | null>(null);

    useEffect(() => {
        // Load booking details for professional display
        apiService.get<Booking>(`/bookings/${bookingId}`)
            .then(data => setBooking(data))
            .catch(() => { });
    }, [bookingId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        setError('');

        try {
            const res: any = await apiService.post(`/payments/create-intent/${bookingId}`, { amount, paymentType });
            const clientSecret = res?.clientSecret || res?.data?.clientSecret;

            if (!clientSecret) throw new Error('فشل إنشاء جلسة الدفع');

            const cardElement = elements.getElement(CardElement);
            if (!cardElement) throw new Error('خطأ في عنصر البطاقة');

            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: { card: cardElement },
            });

            if (stripeError) {
                setError(stripeError.message || 'فشل الدفع');
            } else if (paymentIntent?.status === 'succeeded') {
                try {
                    await apiService.post(`/payments/confirm/${bookingId}`, { paymentIntentId: paymentIntent.id });
                } catch { /* silent - status will be updated via webhook if available */ }
                toastService.success('تم الدفع بنجاح!');
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء الدفع');
            toastService.error(err.message || 'فشل الدفع');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass-effect border border-white/50 rounded-2xl p-5 shadow-sm">
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i className="fa-regular fa-credit-card text-primary"></i>
                    معلومات البطاقة
                </label>
                <div className="bg-white/60 p-3 rounded-xl border border-white/80 shadow-inner">
                    <CardElement options={CARD_ELEMENT_OPTIONS} />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || loading}
                className="w-full gradient-purple py-4 rounded-2xl text-white text-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        جاري المعالجة...
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-lock"></i>
                        دفع {amount.toLocaleString()} ر.ق
                    </span>
                )}
            </button>

            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <i className="fa-solid fa-shield-halved text-green-500"></i>
                مدفوعات آمنة بواسطة Stripe
            </p>
        </form>
    );
};

const PaymentPage = () => {
    const navigate = useNavigate();
    const { bookingId: paramBookingId } = useParams();
    const [searchParams] = useSearchParams();
    const bookingId = paramBookingId || searchParams.get('booking_id') || '';
    const requestedAmount = Number(searchParams.get('amount')) || 0;
    const serviceName = searchParams.get('service') || '';
    const paymentType = (['deposit', 'balance', 'full'].includes(searchParams.get('paymentType') || '')
        ? searchParams.get('paymentType')
        : 'full') as 'deposit' | 'balance' | 'full';
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
    const [remainingAmount, setRemainingAmount] = useState<number | null>(null);
    const [bookingAmount, setBookingAmount] = useState<number | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);

    useEffect(() => {
        if (!bookingId) return;
        apiService.get<any>(`/payments/status/${bookingId}`)
            .then((data: any) => {
                const payload = data?.data || data;
                const status = payload?.payment_status;
                setPaymentStatus(status);
                if (typeof payload?.balance_amount === 'number') setRemainingAmount(payload.balance_amount);
                if (typeof payload?.amount === 'number') setBookingAmount(payload.amount);
            })
            .catch(() => { })
            .finally(() => setLoadingStatus(false));
    }, [bookingId]);

    const effectiveRemaining = remainingAmount ?? requestedAmount;
    const payableAmount = Math.max(
        0,
        remainingAmount !== null
            ? Math.min(requestedAmount || remainingAmount, remainingAmount)
            : requestedAmount,
    );

    const handleSuccess = () => {
        navigate(
            `/client/booking-success/${bookingId}?` +
            `service=${encodeURIComponent(serviceName)}` +
            `&amount=${payableAmount}` +
            `&paymentType=${paymentType}` +
            `&paid=true`,
        );
    };

    if (!bookingId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal" dir="rtl">
                <div className="text-center">
                    <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i>
                    <p className="text-gray-600">بيانات الدفع غير صحيحة</p>
                </div>
            </div>
        );
    }

    if (loadingStatus) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal">
                <p className="text-gray-400">جاري التحميل...</p>
            </div>
        );
    }

    if (paymentStatus === 'fully_paid' || effectiveRemaining <= 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal" dir="rtl">
                <div className="text-center bg-white rounded-3xl p-10 shadow-sm max-w-sm mx-4">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-check text-green-500 text-3xl"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">تم الدفع مسبقاً</h2>
                    <p className="text-gray-500 text-sm mb-6">هذا الحجز مدفوع بالفعل</p>
                    <button onClick={() => navigate('/client/bookings')} className="btn-primary w-full py-3">
                        عرض حجوزاتي
                    </button>
                </div>
            </div>
        );
    }

    if (payableAmount <= 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal" dir="rtl">
                <div className="text-center">
                    <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i>
                    <p className="text-gray-600">بيانات الدفع غير صحيحة</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-10" dir="rtl">
            <div className="max-w-md mx-auto px-4 pt-8">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                        <i className="fa-solid fa-arrow-right text-gray-600"></i>
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">إتمام الدفع</h1>
                </div>

                {/* Order Summary */}
                <div className="glass-effect rounded-3xl p-6 shadow-premium mb-6 animate-fade-in-up">
                    <h2 className="font-bold text-gray-900 mb-4">ملخص الطلب</h2>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">الخدمة</span>
                        <span className="font-bold text-gray-900 text-sm">{serviceName || 'خدمة'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">رقم الحجز</span>
                        <span className="font-mono text-xs text-gray-500">{bookingId.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">نوع الدفعة</span>
                        <span className="font-bold text-gray-900 text-sm">
                            {paymentType === 'deposit' ? 'عربون' : paymentType === 'balance' ? 'المبلغ المتبقي' : 'دفع كامل'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-3">
                        <span className="font-bold text-gray-900">الإجمالي</span>
                        <span className="text-xl font-bold text-primary">{payableAmount.toLocaleString()} ر.ق</span>
                    </div>
                    {typeof bookingAmount === 'number' && bookingAmount > payableAmount && (
                        <p className="text-xs text-gray-500 mt-2">الإجمالي الكلي للحجز: {bookingAmount.toLocaleString()} ر.ق</p>
                    )}
                </div>

                {/* Payment Form */}
                <div className="glass-effect rounded-3xl p-6 shadow-premium animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-credit-card text-primary"></i>
                        بيانات الدفع
                    </h2>
                    <Elements stripe={stripePromise}>
                        <CheckoutForm bookingId={bookingId} amount={payableAmount} paymentType={paymentType} onSuccess={handleSuccess} />
                    </Elements>
                </div>

                {/* Accepted Cards */}
                <div className="flex items-center justify-center gap-3 mt-4 opacity-60">
                    <i className="fa-brands fa-cc-visa text-2xl text-gray-600"></i>
                    <i className="fa-brands fa-cc-mastercard text-2xl text-gray-600"></i>
                    <i className="fa-brands fa-cc-amex text-2xl text-gray-600"></i>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
