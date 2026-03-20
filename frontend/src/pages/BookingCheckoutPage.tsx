import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingsService } from '../services/bookings.service';
import { servicesService } from '../services/services.service';
import { useAuth } from '../hooks/useAuth';
import type { ServiceItem, Booking } from '../services/api';

interface PromoResult {
    id: string;
    discount_type: string;
    discount_value: number;
}

const BookingCheckoutPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useAuth();
    const [step] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bookingDate, setBookingDate] = useState('');
    const [notes, setNotes] = useState('');
    const [service, setService] = useState<ServiceItem | null>(null);
    const [promoCode, setPromoCode] = useState('');
    const [promoValidating, setPromoValidating] = useState(false);
    const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
    const [promoError, setPromoError] = useState('');

    const serviceId = searchParams.get('service') || '';
    const providerId = searchParams.get('provider') || '';
    const amount = Number(searchParams.get('amount')) || 0;

    useEffect(() => {
        const dateParam = searchParams.get('date');
        const notesParam = searchParams.get('notes');
        if (dateParam) setBookingDate(dateParam);
        if (notesParam) setNotes(notesParam);
        if (serviceId) {
            servicesService.findById(serviceId)
                .then((data) => setService((data as { data?: ServiceItem }).data || (data as ServiceItem)))
                .catch(() => { });
        }
    }, [serviceId]);

    const today = new Date().toISOString().split('T')[0];

    const discountAmount = promoResult
        ? promoResult.discount_type === 'percentage'
            ? Math.round(amount * promoResult.discount_value / 100)
            : Math.min(promoResult.discount_value, amount)
        : 0;
    const finalAmount = Math.max(0, amount - discountAmount);

    const depositPercentage = service?.availability_settings?.deposit_percentage || 20;
    const requireDeposit = service?.availability_settings?.deposit_required ?? true;
    const depositAmount = requireDeposit ? Math.round(finalAmount * (depositPercentage / 100)) : 0;

    const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('full');

    useEffect(() => {
        setPaymentOption(requireDeposit ? 'deposit' : 'full');
    }, [requireDeposit]);

    const handleValidatePromo = async () => {
        if (!promoCode.trim()) return;
        setPromoValidating(true);
        setPromoError('');
        setPromoResult(null);
        try {
            setPromoError(t('bookings.checkout.promo_disabled', 'أكواد الخصم غير مفعلة مؤقتاً'));
        } catch (err: any) {
            setPromoError(err?.message || t('bookings.checkout.invalid_promo', 'كود الخصم غير صالح'));
        } finally {
            setPromoValidating(false);
        }
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            navigate('/auth/login');
            return;
        }
        if (bookingDate < today) {
            setError(t('bookings.errors.past_date', 'يجب أن يكون تاريخ الحجز في المستقبل'));
            return;
        }
        setLoading(true);
        setError('');
        try {
            const effectivePaymentType: 'deposit' | 'full' = requireDeposit && paymentOption === 'deposit' ? 'deposit' : 'full';
            const amountToPay = effectivePaymentType === 'deposit' ? depositAmount : finalAmount;

            const result = await bookingsService.create({
                service_id: serviceId,
                provider_id: providerId,
                booking_date: bookingDate,
                amount: amount, 
                deposit_amount: depositAmount,
                notes: notes,
                promo_code_id: promoResult?.id || undefined,
            });
            const bookingId = (result as { id?: string; data?: Booking }).id || (result as { data?: Booking }).data?.id || '';
            const params = new URLSearchParams({
                ...(bookingId && { booking_id: bookingId }),
                ...(service?.title && { service: service.title }),
                ...(bookingDate && { date: bookingDate }),
                ...(amountToPay && { amount: String(amountToPay) }),
                ...(effectivePaymentType && { paymentType: effectivePaymentType })
            });
            if (amountToPay > 0 && bookingId) {
                navigate(`/client/payment/${bookingId}?${params.toString()}`);
            } else {
                navigate(`/client/booking-success/${bookingId}?${params.toString()}`);
            }
        } catch (err: any) {
            setError(err.message || t('bookings.errors.create_failed', 'حدث خطأ أثناء الحجز'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-20" dir="rtl">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                        <i className="fa-solid fa-arrow-right"></i>
                    </button>
                    <h1 className="font-bold text-lg">{t('bookings.checkout.title', 'إتمام الحجز')}</h1>
                </div>
            </header>

            <main className="p-5">
                <div className="flex items-center justify-center mb-8">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'}`}>1</div>
                    <div className={`w-16 h-1 bg-gray-200 mx-2 ${step >= 2 ? 'bg-primary' : ''}`}></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'}`}>2</div>
                </div>

                <div className="glass-effect border border-white/50 rounded-3xl p-6 shadow-premium mb-4 animate-fade-in-up">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <i className="fa-regular fa-calendar-check text-primary"></i>
                        {t('bookings.checkout.details', 'تفاصيل الحجز')}
                    </h3>
                    {service ? (
                        <>
                            <div className="mb-4 pb-4 border-b border-gray-100">
                                <div className="flex gap-4 mb-3">
                                    <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                        <img src={service.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200'} className="w-full h-full object-cover" alt={service.title} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-gray-900">{service.title}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.description}</p>
                                        <p className="text-primary font-bold text-base mt-1">{amount.toLocaleString()} {t('common.currency', 'ر.ق')}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {service.duration_minutes && (
                                        <span className="flex items-center gap-1 text-xs bg-bglight px-2.5 py-1 rounded-lg text-gray-600">
                                            <i className="fa-solid fa-clock text-primary"></i>
                                            {service.duration_minutes} {t('common.minute', 'دقيقة')}
                                        </span>
                                    )}
                                    {(service as any).providers?.company_name && (
                                        <span className="flex items-center gap-1 text-xs bg-bglight px-2.5 py-1 rounded-lg text-gray-600">
                                            <i className="fa-solid fa-store text-primary"></i>
                                            {(service as any).providers.company_name}
                                        </span>
                                    )}
                                    {(service as any).providers?.city && (
                                        <span className="flex items-center gap-1 text-xs bg-bglight px-2.5 py-1 rounded-lg text-gray-600">
                                            <i className="fa-solid fa-location-dot text-primary"></i>
                                            {(service as any).providers.city}
                                        </span>
                                    )}
                                    {(service as any).providers?.is_verified && (
                                        <span className="flex items-center gap-1 text-xs bg-green-100 px-2.5 py-1 rounded-lg text-green-700 font-bold">
                                            <i className="fa-solid fa-circle-check"></i>
                                            {t('common.verified', 'موثق')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {requireDeposit && depositAmount > 0 && (
                                <div className="mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <h4 className="font-bold text-blue-900 mb-2">{t('bookings.checkout.payment_options', 'خيارات الدفع')}</h4>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-white cursor-pointer hover:border-primary transition-colors">
                                            <input
                                                type="radio"
                                                name="paymentOption"
                                                value="deposit"
                                                checked={paymentOption === 'deposit'}
                                                onChange={() => setPaymentOption('deposit')}
                                                className="w-4 h-4 text-primary"
                                            />
                                            <div className="flex-1">
                                                <span className="block font-bold">{t('bookings.checkout.deposit_only', 'دفع العربون فقط')} ({depositPercentage}%)</span>
                                                <span className="block text-sm text-gray-500">{t('bookings.checkout.deposit_rest', 'الباقي يُدفع لاحقاً')}</span>
                                            </div>
                                            <span className="font-bold text-primary">{depositAmount.toLocaleString()} {t('common.currency', 'ر.ق')}</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border bg-white cursor-pointer hover:border-primary transition-colors">
                                            <input
                                                type="radio"
                                                name="paymentOption"
                                                value="full"
                                                checked={paymentOption === 'full'}
                                                onChange={() => setPaymentOption('full')}
                                                className="w-4 h-4 text-primary"
                                            />
                                            <div className="flex-1">
                                                <span className="block font-bold">{t('bookings.checkout.pay_full', 'دفع المبلغ كاملاً')}</span>
                                            </div>
                                            <span className="font-bold text-primary">{finalAmount.toLocaleString()} {t('common.currency', 'ر.ق')}</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex gap-4 mb-4 pb-4 border-b border-gray-100">
                            <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleBooking} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t('bookings.event_date', 'تاريخ المناسبة')}</label>
                            <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} min={today} className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t('bookings.notes', 'ملاحظات إضافية')} ({t('common.optional', 'اختياري')})</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 h-24" placeholder={t('bookings.notes_placeholder', 'أي تفاصيل إضافية تود إخبارنا بها...')}></textarea>
                        </div>

                        <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-inner">
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('bookings.checkout.promo_code', 'كود الخصم (اختياري)')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={promoCode}
                                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); setPromoError(''); }}
                                    placeholder={t('bookings.checkout.promo_placeholder', 'أدخل كود الخصم')}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-100 outline-none focus:ring-2 focus:ring-primary/20 font-mono uppercase text-sm shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleValidatePromo}
                                    disabled={promoValidating || !promoCode.trim()}
                                    className="px-5 py-3 rounded-xl gradient-purple border border-white/20 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                    {promoValidating ? (
                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                    ) : (
                                        t('bookings.checkout.apply', 'تطبيق')
                                    )}
                                </button>
                            </div>
                            {promoResult && (
                                <div className="mt-2 flex items-center gap-2 text-green-600 text-sm bg-green-50 px-3 py-2 rounded-xl">
                                    <i className="fa-solid fa-circle-check"></i>
                                    {t('bookings.checkout.discount_applied', 'خصم {{amount}} مطبق!', { amount: promoResult.discount_type === 'percentage' ? `${promoResult.discount_value}%` : `${promoResult.discount_value} ر.ق` })}
                                </div>
                            )}
                            {promoError && (
                                <p className="mt-1 text-red-500 text-xs">{promoError}</p>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100 mt-4">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-600">{t('bookings.checkout.subtotal', 'المجموع الفرعي')}</span>
                                <span className="text-sm font-bold">{amount.toLocaleString()} {t('common.currency', 'ر.ق')}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-green-600">{t('bookings.checkout.discount', 'الخصم')} ({promoCode})</span>
                                    <span className="text-sm font-bold text-green-600">- {discountAmount.toLocaleString()} {t('common.currency', 'ر.ق')}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-primary">
                                <span>{t('bookings.checkout.total', 'الإجمالي')}</span>
                                <span>{finalAmount.toLocaleString()} {t('common.currency', 'ر.ق')}</span>
                            </div>
                        </div>

                        <button disabled={loading} className="w-full py-4 rounded-2xl gradient-purple text-white text-lg font-bold shadow-premium hover:shadow-lg transition-all mt-6 disabled:opacity-50">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    {t('common.sending', 'جاري الإرسال...')}
                                </span>
                            ) : (
                                t('bookings.checkout.confirm', 'تأكيد الحجز والدفع')
                            )}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default BookingCheckoutPage;
