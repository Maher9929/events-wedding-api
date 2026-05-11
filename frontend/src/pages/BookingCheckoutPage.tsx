import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingsService } from '../services/bookings.service';
import { servicesService } from '../services/services.service';
import { useAuth } from '../hooks/useAuth';
import type { ServiceItem, Booking } from '../services/api';
import { getThumbnailUrl } from '../utils/image.utils';

interface PromoResult {
  id: string;
  discount_type: string;
  discount_value: number;
}

const BookingCheckoutPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [service, setService] = useState<ServiceItem | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState('');
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>(
    'full',
  );

  const serviceId = searchParams.get('service') || '';
  const providerId = searchParams.get('provider') || '';
  const quoteId = searchParams.get('quote') || '';
  const eventId = searchParams.get('event') || '';
  const amount = Number(searchParams.get('amount')) || 0;
  const isArabic = i18n.language === 'ar';
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const dateParam = searchParams.get('date');
    const notesParam = searchParams.get('notes');
    if (dateParam) setBookingDate(dateParam);
    if (notesParam) setNotes(notesParam);
    if (serviceId) {
      servicesService
        .findById(serviceId)
        .then((data) =>
          setService((data as { data?: ServiceItem }).data || data),
        )
        .catch(() => {
          /* service info is supplementary, checkout still works */
        });
    }
  }, [searchParams, serviceId]);

  const discountAmount = promoResult
    ? promoResult.discount_type === 'percentage'
      ? Math.round((amount * promoResult.discount_value) / 100)
      : Math.min(promoResult.discount_value, amount)
    : 0;
  const finalAmount = Math.max(0, amount - discountAmount);

  const depositPercentage =
    service?.availability_settings?.deposit_percentage || 20;
  const requireDeposit =
    service?.availability_settings?.deposit_required ?? true;
  const depositAmount = requireDeposit
    ? Math.round(finalAmount * (depositPercentage / 100))
    : 0;
  const effectivePaymentType: 'deposit' | 'full' =
    requireDeposit && paymentOption === 'deposit' ? 'deposit' : 'full';
  const amountToPay =
    effectivePaymentType === 'deposit' ? depositAmount : finalAmount;

  useEffect(() => {
    setPaymentOption(requireDeposit ? 'deposit' : 'full');
  }, [requireDeposit]);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoValidating(true);
    setPromoError('');
    setPromoResult(null);
    try {
      setPromoError(
        t('bookings.checkout.promo_disabled', 'أكواد الخصم غير مفعلة مؤقتاً'),
      );
    } catch (err) {
      setPromoError(
        err instanceof Error
          ? err.message
          : t('bookings.checkout.invalid_promo', 'كود الخصم غير صالح'),
      );
    } finally {
      setPromoValidating(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      void navigate('/auth/login');
      return;
    }
    if (bookingDate < today) {
      setError(
        t('bookings.errors.past_date', 'يجب أن يكون تاريخ الحجز في المستقبل'),
      );
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await bookingsService.create({
        event_id: eventId || undefined,
        quote_id: quoteId || undefined,
        service_id: serviceId,
        provider_id: providerId,
        booking_date: bookingDate,
        amount,
        deposit_amount: depositAmount,
        notes,
        promo_code_id: promoResult?.id || undefined,
      });
      const bookingId =
        (result as { id?: string; data?: Booking }).id ||
        (result as { data?: Booking }).data?.id ||
        '';
      const params = new URLSearchParams({
        ...(bookingId && { booking_id: bookingId }),
        ...(service?.title && { service: service.title }),
        ...(bookingDate && { date: bookingDate }),
        ...(amountToPay && { amount: String(amountToPay) }),
        ...(effectivePaymentType && { paymentType: effectivePaymentType }),
      });
      if (amountToPay > 0 && bookingId) {
        void navigate(`/client/payment/${bookingId}?${params.toString()}`);
      } else {
        void navigate(
          `/client/booking-success/${bookingId}?${params.toString()}`,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('bookings.errors.create_failed', 'حدث خطأ أثناء الحجز'),
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10';

  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,#f7f7fb_0%,#ffffff_46%,#f8f9fb_100%)] px-4 py-6 pb-28 sm:px-6 lg:px-0"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => void navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-primary/30 hover:text-primary"
              aria-label={t('common.back', 'Back')}
            >
              <i
                className={`fa-solid ${isArabic ? 'fa-arrow-right' : 'fa-arrow-left'}`}
              ></i>
            </button>
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
                <Link to="/services" className="hover:text-primary">
                  {t('common.services', 'Services')}
                </Link>
                <i
                  className={`fa-solid ${isArabic ? 'fa-chevron-left' : 'fa-chevron-right'} text-[10px]`}
                ></i>
                <span>{t('bookings.checkout.title', 'إتمام الحجز')}</span>
              </div>
              <h1 className="text-2xl font-black text-gray-950 sm:text-3xl">
                {t('bookings.checkout.title', 'إتمام الحجز')}
              </h1>
            </div>
          </div>
        </div>

        <form
          onSubmit={(event) => void handleBooking(event)}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          <div className="space-y-5">
            <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-[0_24px_80px_rgba(18,24,40,0.08)] sm:p-7">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <i className="fa-regular fa-calendar-check text-lg"></i>
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-950">
                    {t('bookings.checkout.details', 'تفاصيل الحجز')}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {t(
                      'bookings.checkout.details_hint',
                      'Confirm the event date and add any useful notes for the provider.',
                    )}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                  <i className="fa-solid fa-circle-exclamation me-2"></i>
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-800">
                    {t('bookings.event_date', 'تاريخ المناسبة')}
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={today}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-800">
                    {t('bookings.checkout.payment_due', 'Payment due now')}
                  </label>
                  <div className="flex min-h-[52px] items-center rounded-2xl border border-primary/10 bg-primary/5 px-4 font-black text-primary">
                    {amountToPay.toLocaleString()} {t('common.currency', 'ر.ق')}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-gray-800">
                  {t('bookings.notes', 'ملاحظات إضافية')} (
                  {t('common.optional', 'اختياري')})
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} min-h-28 resize-none`}
                  placeholder={t(
                    'bookings.notes_placeholder',
                    'أي تفاصيل إضافية تود إخبارنا بها...',
                  )}
                ></textarea>
              </div>
            </section>

            {requireDeposit && depositAmount > 0 && (
              <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-[0_24px_80px_rgba(18,24,40,0.08)] sm:p-7">
                <h2 className="mb-4 text-lg font-black text-gray-950">
                  {t('bookings.checkout.payment_options', 'خيارات الدفع')}
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    {
                      value: 'deposit' as const,
                      title: t(
                        'bookings.checkout.deposit_only',
                        'دفع العربون فقط',
                      ),
                      subtitle: t(
                        'bookings.checkout.deposit_rest',
                        'الباقي يُدفع لاحقاً',
                      ),
                      amount: depositAmount,
                    },
                    {
                      value: 'full' as const,
                      title: t(
                        'bookings.checkout.pay_full',
                        'دفع المبلغ كاملاً',
                      ),
                      subtitle: t(
                        'bookings.checkout.pay_full_hint',
                        'Close the payment now in one step.',
                      ),
                      amount: finalAmount,
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        paymentOption === option.value
                          ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                          : 'border-gray-100 bg-gray-50 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentOption"
                          value={option.value}
                          checked={paymentOption === option.value}
                          onChange={() => setPaymentOption(option.value)}
                          className="mt-1 h-4 w-4 text-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-gray-950">
                            {option.title}
                            {option.value === 'deposit' &&
                              ` (${depositPercentage}%)`}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {option.subtitle}
                          </p>
                          <p className="mt-3 text-lg font-black text-primary">
                            {option.amount.toLocaleString()}{' '}
                            {t('common.currency', 'ر.ق')}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-[0_24px_80px_rgba(18,24,40,0.08)] sm:p-7">
              <h2 className="mb-4 text-lg font-black text-gray-950">
                {t('bookings.checkout.promo_code', 'كود الخصم (اختياري)')}
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoResult(null);
                    setPromoError('');
                  }}
                  placeholder={t(
                    'bookings.checkout.promo_placeholder',
                    'أدخل كود الخصم',
                  )}
                  className={`${inputClass} font-mono uppercase`}
                />
                <button
                  type="button"
                  onClick={() => void handleValidatePromo()}
                  disabled={promoValidating || !promoCode.trim()}
                  className="rounded-2xl bg-gray-950 px-5 text-sm font-black text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {promoValidating ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    t('bookings.checkout.apply', 'تطبيق')
                  )}
                </button>
              </div>
              {promoResult && (
                <div className="mt-3 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-600">
                  <i className="fa-solid fa-circle-check me-2"></i>
                  {t(
                    'bookings.checkout.discount_applied',
                    'خصم {{amount}} مطبق!',
                    {
                      amount:
                        promoResult.discount_type === 'percentage'
                          ? `${promoResult.discount_value}%`
                          : `${promoResult.discount_value} ر.ق`,
                    },
                  )}
                </div>
              )}
              {promoError && (
                <p className="mt-2 text-sm font-bold text-red-500">
                  {promoError}
                </p>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-[0_24px_80px_rgba(18,24,40,0.08)]">
              {service ? (
                <div className="p-5">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                      <img
                        loading="lazy"
                        src={getThumbnailUrl(
                          service.images?.[0] ||
                            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&q=80',
                        )}
                        className="h-full w-full object-cover"
                        alt={service.title}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-gray-950">
                        {service.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {service.providers?.company_name && (
                      <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
                        <i className="fa-solid fa-store me-1 text-primary"></i>
                        {service.providers.company_name}
                      </span>
                    )}
                    {service.providers?.city && (
                      <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
                        <i className="fa-solid fa-location-dot me-1 text-primary"></i>
                        {service.providers.city}
                      </span>
                    )}
                    {service.providers?.is_verified && (
                      <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                        <i className="fa-solid fa-circle-check me-1"></i>
                        {t('common.verified', 'موثق')}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 animate-pulse rounded-2xl bg-gray-200"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-full animate-pulse rounded bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 p-5">
                <h3 className="mb-4 text-lg font-black text-gray-950">
                  {t('bookings.checkout.summary', 'Order summary')}
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      {t('bookings.checkout.subtotal', 'المجموع الفرعي')}
                    </span>
                    <span className="font-bold text-gray-900">
                      {amount.toLocaleString()} {t('common.currency', 'ر.ق')}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-green-600">
                        {t('bookings.checkout.discount', 'الخصم')} ({promoCode})
                      </span>
                      <span className="font-bold text-green-600">
                        - {discountAmount.toLocaleString()}{' '}
                        {t('common.currency', 'ر.ق')}
                      </span>
                    </div>
                  )}
                  {requireDeposit && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">
                        {t('bookings.checkout.payment_type', 'Payment type')}
                      </span>
                      <span className="font-bold text-gray-900">
                        {effectivePaymentType === 'deposit'
                          ? t(
                              'bookings.checkout.deposit_only',
                              'دفع العربون فقط',
                            )
                          : t(
                              'bookings.checkout.pay_full',
                              'دفع المبلغ كاملاً',
                            )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-5 rounded-2xl bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-gray-700">
                      {t('bookings.checkout.total', 'الإجمالي')}
                    </span>
                    <span className="text-2xl font-black text-primary">
                      {amountToPay.toLocaleString()}{' '}
                      {t('common.currency', 'ر.ق')}
                    </span>
                  </div>
                  {effectivePaymentType === 'deposit' && (
                    <p className="mt-2 text-xs text-gray-500">
                      {t(
                        'bookings.checkout.balance_due_later',
                        'The remaining balance will be handled later.',
                      )}
                    </p>
                  )}
                </div>

                <button
                  disabled={loading}
                  className="mt-5 hidden h-13 w-full rounded-2xl bg-primary px-6 py-4 text-base font-black text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 lg:block"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      {t('common.sending', 'جاري الإرسال...')}
                    </span>
                  ) : (
                    t('bookings.checkout.confirm', 'تأكيد الحجز والدفع')
                  )}
                </button>
              </div>
            </div>
          </aside>

          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 p-4 shadow-[0_-12px_30px_rgba(18,24,40,0.08)] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-6xl items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-500">
                  {t('bookings.checkout.payment_due', 'Payment due now')}
                </p>
                <p className="truncate text-lg font-black text-primary">
                  {amountToPay.toLocaleString()} {t('common.currency', 'ر.ق')}
                </p>
              </div>
              <button
                disabled={loading}
                className="h-12 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  t('bookings.checkout.confirm', 'تأكيد الحجز والدفع')
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingCheckoutPage;
