import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';
import type { Booking } from '../services/api';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const CheckoutForm = ({
  bookingId,
  amount,
  paymentType,
  onSuccess,
}: {
  bookingId: string;
  amount: number;
  paymentType: 'deposit' | 'balance' | 'full';
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    // Load booking details for professional display
    apiService
      .get<Booking>(`/bookings/id/${bookingId}`)
      .then((data) => setBooking(data))
      .catch(() => {});
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || t('payment.failed', 'فشل الدفع'));
        setLoading(false);
        return;
      }

      const { error: stripeError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/client/booking-success/${bookingId}?amount=${amount}&paymentType=${paymentType}&paid=true`,
          },
          redirect: 'if_required',
        });

      if (stripeError) {
        setError(stripeError.message || t('payment.failed', 'فشل الدفع'));
      } else if (paymentIntent?.status === 'succeeded') {
        try {
          await apiService.post(`/payments/confirm/${bookingId}`, {
            paymentIntentId: paymentIntent.id,
          });
        } catch (_error) {
          /* silent - status will be updated via webhook if available */
        }
        toastService.success(t('payment.success', 'تم الدفع بنجاح!'));
        onSuccess();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : String(err) || t('payment.failed_general', 'حدث خطأ أثناء الدفع');
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
          {t('payment.card_info', 'معلومات الدفع')}
        </label>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
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
  const paymentType = (
    ['deposit', 'balance', 'full'].includes(
      searchParams.get('paymentType') || '',
    )
      ? searchParams.get('paymentType')
      : 'full'
  ) as 'deposit' | 'balance' | 'full';
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [remainingAmount, setRemainingAmount] = useState<number | null>(null);
  const [bookingAmount, setBookingAmount] = useState<number | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState('');

  useEffect(() => {
    if (!bookingId) return;
    apiService
      .get<{
        payment_status?: string;
        deposit_amount?: number;
        balance_amount?: number;
        amount?: number;
      }>(`/payments/status/${bookingId}`)
      .then((data) => {
        setPaymentStatus(data?.payment_status || null);
        if (typeof data?.deposit_amount === 'number')
          setDepositAmount(data.deposit_amount);
        if (typeof data?.balance_amount === 'number')
          setRemainingAmount(data.balance_amount);
        if (typeof data?.amount === 'number') setBookingAmount(data.amount);
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, [bookingId]);

  const totalBookingAmount = bookingAmount ?? requestedAmount;
  const expectedAmountByType =
    paymentType === 'deposit'
      ? (depositAmount ?? requestedAmount)
      : paymentType === 'balance'
        ? (remainingAmount ?? requestedAmount)
        : totalBookingAmount;
  const payableAmount = Math.max(
    0,
    expectedAmountByType || requestedAmount || 0,
  );

  // Create PaymentIntent once we know the payable amount
  useEffect(() => {
    if (!bookingId || payableAmount <= 0 || loadingStatus || clientSecret) return;
    apiService
      .post<{
        clientSecret: string;
        data?: { clientSecret: string };
      }>(`/payments/create-intent/${bookingId}`, {
        amount: payableAmount,
        paymentType,
      })
      .then((res) => {
        const secret = res?.clientSecret || res?.data?.clientSecret;
        if (secret) {
          setClientSecret(secret);
        } else {
          setIntentError(t('payment.failed_create_session', 'فشل إنشاء جلسة الدفع'));
        }
      })
      .catch((err) => {
        setIntentError(
          err instanceof Error ? err.message : t('payment.failed_general', 'حدث خطأ'),
        );
      });
  }, [bookingId, payableAmount, loadingStatus, paymentType, clientSecret, t]);

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
      <div
        className="min-h-screen flex items-center justify-center bg-bglight font-tajawal"
        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="text-center">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i>
          <p className="text-gray-600 font-bold">
            {t('payment.stripe_missing', 'خدمة الدفع غير متوفرة حالياً')}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 btn-primary px-6 py-2 rounded-xl"
          >
            {t('common.back', 'رجوع')}
          </button>
        </div>
      </div>
    );
  }

  if (!bookingId) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-bglight font-tajawal"
        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="text-center">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i>
          <p className="text-gray-600">
            {t('payment.invalid_data', 'بيانات الدفع غير صحيحة')}
          </p>
        </div>
      </div>
    );
  }

  if (loadingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal">
        <p className="text-gray-400">
          {t('common.loading', 'جاري التحميل...')}
        </p>
      </div>
    );
  }

  if (
    paymentStatus === 'fully_paid' ||
    (paymentType === 'balance' && (remainingAmount ?? 0) <= 0)
  ) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-bglight font-tajawal"
        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="text-center bg-white rounded-3xl p-10 shadow-sm max-w-sm mx-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-check text-green-500 text-3xl"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('payment.already_paid_title', 'تم الدفع مسبقاً')}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {t('payment.already_paid_desc', 'هذا الحجز مدفوع بالفعل')}
          </p>
          <button
            onClick={() => navigate('/client/bookings')}
            className="btn-primary w-full py-3"
          >
            {t('payment.view_my_bookings', 'عرض حجوزاتي')}
          </button>
        </div>
      </div>
    );
  }

  if (payableAmount <= 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-bglight font-tajawal"
        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="text-center">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i>
          <p className="text-gray-600">
            {t('payment.invalid_data', 'بيانات الدفع غير صحيحة')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-bglight font-tajawal pb-10"
      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="max-w-md mx-auto px-4 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center"
          >
            <i className="fa-solid fa-arrow-right text-gray-600"></i>
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {t('payment.complete_payment', 'إتمام الدفع')}
          </h1>
        </div>

        {/* Order Summary */}
        <div className="glass-effect rounded-3xl p-6 shadow-premium mb-6 animate-fade-in-up">
          <h2 className="font-bold text-gray-900 mb-4">
            {t('payment.order_summary', 'ملخص الطلب')}
          </h2>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600 text-sm">
              {t('payment.service', 'الخدمة')}
            </span>
            <span className="font-bold text-gray-900 text-sm">
              {serviceName || t('payment.service_default', 'خدمة')}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600 text-sm">
              {t('payment.booking_id', 'رقم الحجز')}
            </span>
            <span className="font-mono text-xs text-gray-500">
              {bookingId.substring(0, 8)}...
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600 text-sm">
              {t('payment.payment_type', 'نوع الدفعة')}
            </span>
            <span className="font-bold text-gray-900 text-sm">
              {paymentType === 'deposit'
                ? t('payment.deposit', 'عربون')
                : paymentType === 'balance'
                  ? t('payment.balance', 'المبلغ المتبقي')
                  : t('payment.full', 'دفع كامل')}
            </span>
          </div>
          <div className="flex justify-between items-center pt-3">
            <span className="font-bold text-gray-900">
              {t('payment.total', 'الإجمالي')}
            </span>
            <span className="text-xl font-bold text-primary">
              {payableAmount.toLocaleString()} ر.ق
            </span>
          </div>
          {typeof bookingAmount === 'number' &&
            bookingAmount > payableAmount && (
              <p className="text-xs text-gray-500 mt-2">
                {t('payment.total_booking', 'الإجمالي الكلي للحجز:')}{' '}
                {bookingAmount.toLocaleString()} ر.ق
              </p>
            )}
        </div>

        {/* Payment Form */}
        <div
          className="glass-effect rounded-3xl p-6 shadow-premium animate-fade-in-up"
          style={{ animationDelay: '100ms' }}
        >
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-credit-card text-primary"></i>
            {t('payment.payment_details', 'بيانات الدفع')}
          </h2>
          {intentError ? (
            <div className="text-center p-4 bg-red-50 text-red-600 rounded-xl">
              {intentError}
            </div>
          ) : stripePromise && clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#7c3aed',
                    borderRadius: '12px',
                  },
                },
              }}
            >
              <CheckoutForm
                bookingId={bookingId}
                amount={payableAmount}
                paymentType={paymentType}
                onSuccess={handleSuccess}
              />
            </Elements>
          ) : (
            <div className="text-center p-4 text-gray-400">
              <i className="fa-solid fa-spinner fa-spin text-xl mb-2"></i>
              <p>{t('payment.loading_payment', 'تحميل نموذج الدفع...')}</p>
            </div>
          )}
        </div>

        {/* Accepted Cards */}
        <div className="flex items-center justify-center gap-3 mt-4 opacity-60">
          <i className="fa-brands fa-cc-visa text-2xl text-gray-600"></i>
          <i className="fa-brands fa-cc-mastercard text-2xl text-gray-600"></i>
          <i className="fa-brands fa-cc-amex text-2xl text-gray-600"></i>
          <i className="fa-brands fa-cc-apple-pay text-2xl text-gray-600"></i>
          <i className="fa-brands fa-google-pay text-2xl text-gray-600"></i>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;

