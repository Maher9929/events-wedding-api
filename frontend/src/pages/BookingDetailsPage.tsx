import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingsService, type Booking } from '../services/bookings.service';
import { disputesService } from '../services/disputes.service';
import { toastService } from '../services/toast.service';

const BookingDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('service_not_delivered');
    const [disputeDesc, setDisputeDesc] = useState('');
    const [submittingDispute, setSubmittingDispute] = useState(false);

    const handleOpenDispute = async () => {
        if (!id || !disputeDesc.trim()) {
            toastService.error(t('disputes.desc_required', 'يرجى وصف المشكلة'));
            return;
        }
        setSubmittingDispute(true);
        try {
            await disputesService.create({ booking_id: id, reason: disputeReason, description: disputeDesc });
            setShowDisputeModal(false);
            setDisputeDesc('');
            toastService.success(t('disputes.created', 'تم فتح النزاع — سيراجعه فريق الإدارة'));
        } catch (_error) {
            toastService.error(t('disputes.create_failed', 'فشل فتح النزاع'));
        } finally {
            setSubmittingDispute(false);
        }
    };

    const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
    const currency = t('common.currency', 'QAR');

    useEffect(() => {
        if (!id) return;
        bookingsService.findOne(id)
            .then((data) => setBooking((data as { data?: Booking })?.data || data))
            .catch(() => toastService.error(t('bookings.error_loading', 'Failed to load booking details')))
            .finally(() => setLoading(false));
    }, [id, t]);

    const handleCancel = async () => {
        if (!id) return;
        setCancelling(true);
        try {
            await bookingsService.updateStatus(id, { status: 'cancelled', cancellation_reason: cancelReason });
            setBooking((prev) => prev ? { ...prev, status: 'cancelled', cancellation_reason: cancelReason } : prev);
            setShowCancelModal(false);
            toastService.success(t('bookings.cancel_success', 'Booking cancelled'));
        } catch (_error) {
            toastService.error(t('bookings.cancel_error', 'Failed to cancel booking'));
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bglight font-tajawal flex items-center justify-center">
                <div className="text-center">
                    <i className="fa-solid fa-spinner fa-spin text-primary text-3xl mb-3"></i>
                    <p className="text-gray-500">{t('common.loading', 'Loading...')}</p>
                </div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen bg-bglight font-tajawal flex flex-col items-center justify-center">
                <i className="fa-solid fa-calendar-xmark text-gray-300 text-5xl mb-4"></i>
                <p className="text-gray-500 mb-4">{t('bookings.not_found', 'Booking not found')}</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary text-white rounded-xl">
                    {t('common.back', 'Back')}
                </button>
            </div>
        );
    }

    const statusMap: Record<string, { label: string; cls: string; icon: string }> = {
        pending: { label: t('bookings.status.pending', 'Pending'), cls: 'bg-yellow-100 text-yellow-700', icon: 'fa-clock' },
        confirmed: { label: t('bookings.status.confirmed', 'Confirmed'), cls: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
        cancelled: { label: t('bookings.status.cancelled', 'Cancelled'), cls: 'bg-red-100 text-red-700', icon: 'fa-times-circle' },
        completed: { label: t('bookings.status.completed', 'Completed'), cls: 'bg-blue-100 text-blue-700', icon: 'fa-flag-checkered' },
    };

    const paymentStatusLabel = (status?: string, partial?: boolean) => {
        if (status === 'fully_paid') return t('status.fully_paid', 'Fully paid');
        if (status === 'deposit_paid') return t('status.deposit_paid', 'Deposit paid');
        if (status === 'refunded') return t('status.refunded', 'Refunded');
        if (partial) return t('bookings.partially_paid', 'Partially paid');
        return t('bookings.unpaid', 'Unpaid');
    };

    const st = statusMap[booking.status] || { label: booking.status, cls: 'bg-gray-100 text-gray-700', icon: 'fa-circle' };
    const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
    const payableAmount = Number(booking.balance_amount ?? booking.amount ?? 0);
    const totalAmount = Number(booking.amount || 0);
    const isPartiallyPaid = booking.payment_status === 'pending' && payableAmount > 0 && payableAmount < totalAmount;
    const paymentType: 'balance' | 'full' = isPartiallyPaid ? 'balance' : 'full';

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-24">
            <header className="bg-white sticky top-0 z-50 shadow-sm px-5 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                        <i className="fa-solid fa-arrow-right text-gray-700"></i>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{t('bookings.details', 'Booking details')}</h1>
                        <p className="text-xs text-gray-400">#{booking.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                </div>
            </header>

            <main className="px-5 py-5 space-y-4">
                <div className={`rounded-2xl p-5 flex items-center gap-4 ${st.cls}`}>
                    <div className="w-14 h-14 rounded-2xl bg-white/50 flex items-center justify-center">
                        <i className={`fa-solid ${st.icon} text-2xl`}></i>
                    </div>
                    <div>
                        <p className="text-sm font-bold opacity-70">{t('bookings.status_label', 'Booking status')}</p>
                        <p className="text-2xl font-bold">{st.label}</p>
                    </div>
                </div>

                {booking.services && (
                    <div
                        className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/services/${booking.services?.id}`)}
                    >
                        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-box text-primary text-xl"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">{t('common.services', 'Service')}</p>
                            <p className="font-bold text-gray-900 truncate">{booking.services.title}</p>
                            {booking.providers?.company_name && (
                                <p className="text-xs text-gray-500">
                                    <i className="fa-solid fa-store ms-1 text-primary"></i>
                                    {booking.providers.company_name}
                                    {booking.providers.city && (
                                        <span className="me-2">
                                            <i className="fa-solid fa-location-dot ms-1 text-primary"></i>
                                            {booking.providers.city}
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
                            {t('bookings.receipt', 'Receipt')}
                        </h3>
                        <a
                            href={booking.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square"></i>
                            {t('bookings.view_receipt', 'View receipt')}
                        </a>
                    </div>
                )}

                <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3">{t('bookings.booking_info', 'Booking information')}</h3>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-calendar text-primary w-4"></i>
                                {t('bookings.event_date', 'Event date')}
                            </span>
                            <span className="font-bold text-sm text-gray-900">
                                {new Date(booking.booking_date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>

                        {booking.locked_price && booking.locked_price !== totalAmount && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 flex items-center gap-2">
                                    <i className="fa-solid fa-lock text-primary w-4"></i>
                                    {t('bookings.locked_price', 'Service price at booking')}
                                </span>
                                <span className="text-sm text-gray-400 line-through">{booking.locked_price.toLocaleString(locale)} {currency}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-coins text-primary w-4"></i>
                                {t('bookings.total_amount', 'Total amount')}
                            </span>
                            <span className="font-bold text-lg text-primary">{totalAmount.toLocaleString(locale)} {currency}</span>
                        </div>

                        {typeof booking.platform_fee === 'number' && booking.platform_fee > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 flex items-center gap-2">
                                    <i className="fa-solid fa-percent text-primary w-4"></i>
                                    {t('bookings.platform_fee', 'Platform fee')}
                                </span>
                                <span className="font-bold text-sm text-gray-900">{booking.platform_fee.toLocaleString(locale)} {currency}</span>
                            </div>
                        )}

                        {booking.deposit_amount ? (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 flex items-center gap-2">
                                    <i className="fa-solid fa-hand-holding-dollar text-primary w-4"></i>
                                    {t('payments.deposit', 'Deposit')}
                                </span>
                                <span className="font-bold text-sm text-gray-900">{Number(booking.deposit_amount).toLocaleString(locale)} {currency}</span>
                            </div>
                        ) : null}

                        {payableAmount > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 flex items-center gap-2">
                                    <i className="fa-solid fa-money-bill-wave text-primary w-4"></i>
                                    {t('bookings.remaining', 'Remaining')}
                                </span>
                                <span className="font-bold text-sm text-orange-600">{payableAmount.toLocaleString(locale)} {currency}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-credit-card text-primary w-4"></i>
                                {t('bookings.payment_status', 'Payment status')}
                            </span>
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                                booking.payment_status === 'fully_paid'
                                    ? 'bg-green-100 text-green-700'
                                    : booking.payment_status === 'deposit_paid'
                                        ? 'bg-blue-100 text-blue-700'
                                        : booking.payment_status === 'refunded'
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {paymentStatusLabel(booking.payment_status, isPartiallyPaid)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <i className="fa-solid fa-clock text-primary w-4"></i>
                                {t('bookings.created_at', 'Created at')}
                            </span>
                            <span className="text-sm text-gray-700">{new Date(booking.created_at).toLocaleDateString(locale)}</span>
                        </div>
                    </div>
                </div>

                {booking.notes && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="fa-solid fa-note-sticky text-primary"></i>
                            {t('bookings.notes', 'Notes')}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{booking.notes}</p>
                    </div>
                )}

                {booking.cancellation_reason && (
                    <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                        <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {t('bookings.cancellation_reason', 'Cancellation reason')}
                        </h3>
                        <p className="text-sm text-red-600">{booking.cancellation_reason}</p>
                    </div>
                )}

                <div className="space-y-3 pt-2">
                    {booking.payment_status === 'pending' && booking.status !== 'cancelled' && payableAmount > 0 && (
                        <button
                            onClick={() => navigate(`/client/payment/${booking.id}?amount=${payableAmount}&paymentType=${paymentType}&service=${encodeURIComponent(booking.services?.title || '')}`)}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-opacity"
                        >
                            <i className="fa-solid fa-credit-card"></i>
                            {paymentType === 'balance' ? t('payments.pay_remaining', 'Pay remaining') : t('payments.pay_now', 'Pay now')} - {payableAmount.toLocaleString(locale)} {currency}
                        </button>
                    )}

                    {booking.status === 'completed' && booking.services?.id && (
                        <button
                            onClick={() => navigate(`/services/${booking.services?.id}`)}
                            className="w-full py-3.5 rounded-2xl gradient-purple text-white font-bold flex items-center justify-center gap-2 shadow-lg"
                        >
                            <i className="fa-solid fa-star"></i>
                            {t('service.details.add_review', 'Review service')}
                        </button>
                    )}

                    <button
                        onClick={() => navigate(`/client/messages?providerId=${booking.provider_id}&autoStart=true`)}
                        className="w-full py-3.5 rounded-2xl bg-white border-2 border-primary text-primary font-bold flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors shadow-sm"
                    >
                        <i className="fa-solid fa-comment-dots"></i>
                        {t('bookings.contact_provider', 'Contact provider')}
                    </button>

                    {canCancel && (
                        <button
                            onClick={() => setShowCancelModal(true)}
                            className="w-full py-3.5 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                        >
                            <i className="fa-solid fa-times-circle"></i>
                            {t('bookings.cancel', 'Cancel booking')}
                        </button>
                    )}

                    {['confirmed', 'completed'].includes(booking.status) && (
                        <button
                            onClick={() => setShowDisputeModal(true)}
                            className="w-full py-3.5 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-700 font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors"
                        >
                            <i className="fa-solid fa-flag"></i>
                            {t('disputes.report_problem', 'الإبلاغ عن مشكلة')}
                        </button>
                    )}
                </div>
            </main>

            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{t('bookings.cancel_modal_title', 'Cancel booking')}</h3>
                        <p className="text-sm text-gray-500 mb-4">{t('bookings.cancel_modal_body', 'Are you sure? This action cannot be undone.')}</p>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                {t('bookings.cancel_reason_optional', 'Cancellation reason (optional)')}
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                rows={3}
                                placeholder={t('bookings.cancel_reason_placeholder', 'Enter a cancellation reason...')}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-red-200 resize-none text-sm"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {cancelling ? t('bookings.cancelling', 'Cancelling...') : t('bookings.confirm_cancel', 'Confirm cancellation')}
                            </button>
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDisputeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                            <i className="fa-solid fa-flag text-amber-500 me-2"></i>
                            {t('disputes.open_title', 'الإبلاغ عن مشكلة')}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">{t('disputes.open_desc', 'صف المشكلة وسيراجعها فريق الإدارة ويتخذ القرار المناسب.')}</p>

                        <div className="mb-3">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('disputes.reason', 'سبب النزاع')} *</label>
                            <select
                                value={disputeReason}
                                onChange={e => setDisputeReason(e.target.value)}
                                className="w-full h-11 bg-bglight rounded-xl px-3 text-sm border-none focus:ring-2 focus:ring-amber-200"
                            >
                                <option value="service_not_delivered">{t('disputes.reasons.not_delivered', 'لم يتم تقديم الخدمة')}</option>
                                <option value="quality_issue">{t('disputes.reasons.quality', 'مشكلة في الجودة')}</option>
                                <option value="late_arrival">{t('disputes.reasons.late', 'تأخر في الوصول')}</option>
                                <option value="wrong_service">{t('disputes.reasons.wrong', 'خدمة مختلفة عن المتفق عليها')}</option>
                                <option value="overcharged">{t('disputes.reasons.overcharged', 'مبلغ زائد')}</option>
                                <option value="provider_no_show">{t('disputes.reasons.no_show', 'المزود لم يحضر')}</option>
                                <option value="other">{t('disputes.reasons.other', 'سبب آخر')}</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('disputes.description', 'وصف المشكلة')} *</label>
                            <textarea
                                value={disputeDesc}
                                onChange={e => setDisputeDesc(e.target.value)}
                                rows={4}
                                placeholder={t('disputes.desc_placeholder', 'اشرح المشكلة بالتفصيل...')}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-amber-200 resize-none text-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleOpenDispute}
                                disabled={submittingDispute}
                                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                            >
                                {submittingDispute ? <i className="fa-solid fa-spinner fa-spin me-1"></i> : <i className="fa-solid fa-paper-plane me-1"></i>}
                                {t('disputes.submit', 'إرسال النزاع')}
                            </button>
                            <button
                                onClick={() => setShowDisputeModal(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                            >
                                {t('common.cancel', 'إلغاء')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingDetailsPage;
