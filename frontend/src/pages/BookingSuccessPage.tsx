import { useNavigate, useSearchParams } from 'react-router-dom';

const BookingSuccessPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const bookingId = searchParams.get('booking_id');
    const serviceTitle = searchParams.get('service');
    const amount = searchParams.get('amount');
    const date = searchParams.get('date');
    const paymentType = (searchParams.get('paymentType') || 'none') as 'deposit' | 'balance' | 'full' | 'none';
    const paid = searchParams.get('paid') === 'true';

    const paymentTypeLabel: Record<'deposit' | 'balance' | 'full' | 'none', string> = {
        deposit: 'عربون',
        balance: 'المبلغ المتبقي',
        full: 'دفع كامل',
        none: 'غير محدد',
    };

    const title = paid ? 'تم الدفع بنجاح!' : 'تم الحجز بنجاح!';
    const subtitle = paid
        ? paymentType === 'deposit'
            ? 'تم استلام العربون بنجاح. يمكنك إكمال الدفعة لاحقاً من تفاصيل الحجز.'
            : 'تم استلام الدفعة بنجاح. سيتم متابعة الحجز مع المورد.'
        : 'شكراً لك! تم استلام طلب الحجز وسيتم التواصل معك قريباً.';

    return (
        <div className="min-h-screen bg-bglight flex flex-col items-center justify-center p-8 font-tajawal text-center" dir="rtl">
            <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center mb-6 shadow-lg">
                <i className="fa-solid fa-circle-check text-green-500 text-5xl"></i>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-500 mb-5 max-w-xs mx-auto leading-relaxed">{subtitle}</p>

            {/* Booking Summary */}
            <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm w-full max-w-sm text-right space-y-3">
                <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">ملخص الحجز</h3>
                {bookingId && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">رقم الحجز</span>
                        <span className="font-bold text-gray-900">#{bookingId.substring(0, 8).toUpperCase()}</span>
                    </div>
                )}
                {serviceTitle && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">الخدمة</span>
                        <span className="font-bold text-gray-900 truncate max-w-[180px]">{serviceTitle}</span>
                    </div>
                )}
                {date && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">تاريخ الحجز</span>
                        <span className="font-bold text-gray-900">{new Date(date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                )}
                {amount && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">المبلغ</span>
                        <span className="font-bold text-primary text-base">{Number(amount).toLocaleString()} ر.ق</span>
                    </div>
                )}
                {paid && paymentType !== 'none' && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">نوع الدفعة</span>
                        <span className="font-bold text-gray-900">{paymentTypeLabel[paymentType]}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 bg-yellow-50 rounded-xl px-3 py-2">
                    <i className="fa-solid fa-clock text-yellow-500 text-xs"></i>
                    <p className="text-xs font-bold text-yellow-700">حجزك <strong>قيد الانتظار</strong> حتى يؤكده المورد</p>
                </div>
            </div>

            <div className="space-y-3 w-full max-w-sm">
                <button
                    onClick={() => navigate('/client/bookings')}
                    className="w-full py-3.5 rounded-2xl gradient-purple text-white font-bold shadow-lg"
                >
                    <i className="fa-solid fa-calendar-check ms-2"></i>
                    عرض حجوزاتي
                </button>
                {bookingId && (
                    <button
                        onClick={() => navigate(`/client/bookings/${bookingId}`)}
                        className="w-full py-3.5 rounded-2xl bg-white text-primary font-bold shadow-sm border-2 border-primary"
                    >
                        <i className="fa-solid fa-eye ms-2"></i>
                        عرض تفاصيل الحجز
                    </button>
                )}
                <button
                    onClick={() => navigate('/client/messages')}
                    className="w-full py-3.5 rounded-2xl bg-white text-primary font-bold shadow-sm border-2 border-primary"
                >
                    <i className="fa-solid fa-comment-dots ms-2"></i>
                    التواصل مع المورد
                </button>
                <button
                    onClick={() => navigate('/')}
                    className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                >
                    <i className="fa-solid fa-house ms-2"></i>
                    العودة للرئيسية
                </button>
            </div>
        </div>
    );
};

export default BookingSuccessPage;
