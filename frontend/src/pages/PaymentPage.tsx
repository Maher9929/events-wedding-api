import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';
import type { Booking } from '../services/api';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

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
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [, setBooking] = useState<Booking | null>(null);

    useEffect(() => {
        // Load booking details for professional display
        apiService.get<Booking>(`/bookings/id/${bookingId}`)
            .then(data => setBooking(data))
            .catch(() => { });
    }, [bookingId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        setError('');

        try {
            const res = await apiService.post<{ clientSecret: string, paymentIntentId?: string, data?: { clientSecret: string } }>(`/payments/create-intent/${bookingId}`, { amount, paymentType });
            const clientSecret = res?.clientSecret || res?.data?.clientSecret;

            if (!clientSecret) throw new Error(t('payment.failed_create_session', 'فشل إنشاء جلسة الدفع'));

            const cardElement = elements.getElement(CardElement);
            if (!cardElement) throw new Error(t('payment.card_error', 'خطأ في عنصر البطاقة'));

            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: { card: cardElement },
            });

            if (stripeError) {
                setError(stripeError.message || t('payment.failed', 'فشل الدفع'));
            } else if (paymentIntent?.status === 'succeeded') {
                try {
                    await apiService.post(`/payments/confirm/${bookingId}`, { paymentIntentId: paymentIntent.id });
                } catch (_error) { /* silent - status will be updated via webhook if available */ }
                toastService.success(t('payment.success', 'تم الدفع بنجاح!'));
                onSuccess();
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err) || t('payment.failed_general', 'حدث خطأ أثناء الدفع');
            setError(message);
            toastService.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass-effect border border-white/50 rounded-2xl p-5 shadow-sm">
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i className="fa-regular fa-credit-card text-primary"></i>
                    {t('payment.card_info', 'معلومات البطاقة')}
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
                        {t('payment.processing', 'جاري المعالجة...')}
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-lock"></i>
                        {t('payment.pay', 'دفع')} {amount.toLocaleString()} ر.ق
                    </span>
                )}
            </button>

            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <i className="fa-solid fa-shield-halved text-green-500"></i>
                {t('payment.secure_stripe', 'مدفوعات آمنة بواسطة Stripe')}
            </p>
        </form>
    );
};

const PaymentPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
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
        apiService.get<{ payment_status?: string; balance_amount?: number; amount?: number }>(`/payments/status/${bookingId}`)
            .then((data) => {
                setPaymentStatus(data?.payment_status || null);
                if (typeof data?.balance_amount === 'number') setRemainingAmount(data.balance_amount);
                if (typeof data?.amount === 'number') setBookingAmount(data.amount);
            })
            .catch(() => { })
            .finally(() => setLoadingStatus(false));
    }, [bookingId]);

    const effectiveRemaining = remainingAmount ?? bookingAmount ?? requestedAmount;
    const payableAmount = Math.max(
        0,
        remainingAmount !== null
            ? Math.min(requestedAmount || remainingAmount, remainingAmount)
            : effectiveRemaining,
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

    if (!stripeKey) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="text-center">
                    <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i>
                    <p className="text-gray-600 font-bold">{t('payment.stripe_missing', 'خدمة الدفع غير متوفرة حالياً')}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 btn-primary px-6 py-2 rounded-xl">
                        {t('common.back', 'رجوع')}
                    </button>
                </div>
            </div>
        );
    }

    if (!bookingId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="text-center">
                    <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i>
                    <p className="text-gray-600">{t('payment.invalid_data', 'بيانات الدفع غير صحيحة')}</p>
                </div>
            </div>
        );
    }

    if (loadingStatus) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal">
                <p className="text-gray-400">{t('common.loading', 'جاري التحميل...')}</p>
            </div>
        );
    }

    if (paymentStatus === 'fully_paid' || effectiveRemaining <= 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="text-center bg-white rounded-3xl p-10 shadow-sm max-w-sm mx-4">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-check text-green-500 text-3xl"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t('payment.already_paid_title', 'تم الدفع مسبقاً')}</h2>
                    <p className="text-gray-500 text-sm mb-6">{t('payment.already_paid_desc', 'هذا الحجز مدفوع بالفعل')}</p>
                    <button onClick={() => navigate('/client/bookings')} className="btn-primary w-full py-3">
                        {t('payment.view_my_bookings', 'عرض حجوزاتي')}
                    </button>
                </div>
            </div>
        );
    }

    if (payableAmount <= 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="text-center">
                    <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i>
                    <p className="text-gray-600">{t('payment.invalid_data', 'بيانات الدفع غير صحيحة')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-10" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="max-w-md mx-auto px-4 pt-8">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                        <i className="fa-solid fa-arrow-right text-gray-600"></i>
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">{t('payment.complete_payment', 'إتمام الدفع')}</h1>
                </div>

                {/* Order Summary */}
                <div className="glass-effect rounded-3xl p-6 shadow-premium mb-6 animate-fade-in-up">
                    <h2 className="font-bold text-gray-900 mb-4">{t('payment.order_summary', 'ملخص الطلب')}</h2>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">{t('payment.service', 'الخدمة')}</span>
                        <span className="font-bold text-gray-900 text-sm">{serviceName || t('payment.service_default', 'خدمة')}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">{t('payment.booking_id', 'رقم الحجز')}</span>
                        <span className="font-mono text-xs text-gray-500">{bookingId.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">{t('payment.payment_type', 'نوع الدفعة')}</span>
                        <span className="font-bold text-gray-900 text-sm">
                            {paymentType === 'deposit' ? t('payment.deposit', 'عربون') : paymentType === 'balance' ? t('payment.balance', 'المبلغ المتبقي') : t('payment.full', 'دفع كامل')}
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-3">
                        <span className="font-bold text-gray-900">{t('payment.total', 'الإجمالي')}</span>
                        <span className="text-xl font-bold text-primary">{payableAmount.toLocaleString()} ر.ق</span>
                    </div>
                    {typeof bookingAmount === 'number' && bookingAmount > payableAmount && (
                        <p className="text-xs text-gray-500 mt-2">{t('payment.total_booking', 'الإجمالي الكلي للحجز:')} {bookingAmount.toLocaleString()} ر.ق</p>
                    )}
                </div>

                {/* Payment Form */}
                <div className="glass-effect rounded-3xl p-6 shadow-premium animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-credit-card text-primary"></i>
                        {t('payment.payment_details', 'بيانات الدفع')}
                    </h2>
                    {stripePromise ? (
                        <Elements stripe={stripePromise}>
                            <CheckoutForm bookingId={bookingId} amount={payableAmount} paymentType={paymentType} onSuccess={handleSuccess} />
                        </Elements>
                    ) : (
                        <div className="text-center p-4 bg-red-50 text-red-600 rounded-xl">
                            {t('payment.stripe_missing', 'خدمة الدفع غير متوفرة حالياً')}
                        </div>
                    )}
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
