import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const BookingSuccessPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get('booking_id');
    const serviceTitle = searchParams.get('service');
    const amount = searchParams.get('amount');
    const date = searchParams.get('date');
    const paymentType = (searchParams.get('paymentType') || 'none') as 'deposit' | 'balance' | 'full' | 'none';
    const paid = searchParams.get('paid') === 'true';
    const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

    const paymentTypeLabel: Record<'deposit' | 'balance' | 'full' | 'none', string> = {
        deposit: t('payments.deposit', 'Deposit'),
        balance: t('payments.balance', 'Remaining balance'),
        full: t('payments.full', 'Full payment'),
        none: t('common.unspecified', 'Unspecified'),
    };

    const title = paid ? t('bookings.success.payment_title', 'Payment completed successfully!') : t('bookings.success.title', 'Booking completed successfully!');
    const subtitle = paid
        ? paymentType === 'deposit'
            ? t('bookings.success.deposit_subtitle', 'Your deposit was received successfully. You can complete the remaining payment later from the booking details.')
            : t('bookings.success.payment_subtitle', 'Your payment was received successfully. The booking will now continue with the provider.')
        : t('bookings.success.subtitle', 'Thank you. Your booking request has been received and you will be contacted soon.');

    return (
        <div className="min-h-screen bg-bglight flex flex-col items-center justify-center p-8 font-tajawal text-center">
            <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center mb-6 shadow-lg">
                <i className="fa-solid fa-circle-check text-green-500 text-5xl"></i>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-500 mb-5 max-w-xs mx-auto leading-relaxed">{subtitle}</p>

            <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm w-full max-w-sm text-right space-y-3">
                <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">{t('bookings.success.summary', 'Booking summary')}</h3>
                {bookingId && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('bookings.success.booking_id', 'Booking ID')}</span>
                        <span className="font-bold text-gray-900">#{bookingId.substring(0, 8).toUpperCase()}</span>
                    </div>
                )}
                {serviceTitle && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('common.services', 'Service')}</span>
                        <span className="font-bold text-gray-900 truncate max-w-[180px]">{serviceTitle}</span>
                    </div>
                )}
                {date && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('bookings.event_date', 'Event date')}</span>
                        <span className="font-bold text-gray-900">{new Date(date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                )}
                {amount && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('bookings.amount', 'Amount')}</span>
                        <span className="font-bold text-primary text-base">{Number(amount).toLocaleString(locale)} {t('common.currency', 'QAR')}</span>
                    </div>
                )}
                {paid && paymentType !== 'none' && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('bookings.success.payment_type', 'Payment type')}</span>
                        <span className="font-bold text-gray-900">{paymentTypeLabel[paymentType]}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 bg-yellow-50 rounded-xl px-3 py-2">
                    <i className="fa-solid fa-clock text-yellow-500 text-xs"></i>
                    <p className="text-xs font-bold text-yellow-700">{t('bookings.success.pending_notice', 'Your booking is pending until the provider confirms it')}</p>
                </div>
            </div>

            <div className="space-y-3 w-full max-w-sm">
                <button onClick={() => navigate('/client/bookings')} className="w-full py-3.5 rounded-2xl gradient-purple text-white font-bold shadow-lg">
                    <i className="fa-solid fa-calendar-check ms-2"></i>
                    {t('bookings.success.view_bookings', 'View my bookings')}
                </button>
                {bookingId && (
                    <button onClick={() => navigate(`/client/bookings/${bookingId}`)} className="w-full py-3.5 rounded-2xl bg-white text-primary font-bold shadow-sm border-2 border-primary">
                        <i className="fa-solid fa-eye ms-2"></i>
                        {t('bookings.success.view_booking_details', 'View booking details')}
                    </button>
                )}
                <button onClick={() => navigate('/client/messages')} className="w-full py-3.5 rounded-2xl bg-white text-primary font-bold shadow-sm border-2 border-primary">
                    <i className="fa-solid fa-comment-dots ms-2"></i>
                    {t('bookings.success.contact_provider', 'Contact provider')}
                </button>
                <button onClick={() => navigate('/')} className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">
                    <i className="fa-solid fa-house ms-2"></i>
                    {t('bookings.success.back_home', 'Back to home')}
                </button>
            </div>
        </div>
    );
};

export default BookingSuccessPage;
