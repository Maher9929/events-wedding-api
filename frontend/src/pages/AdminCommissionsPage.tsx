import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Booking } from '../services/api';

const COMMISSION_RATE = 0.10; // 10% platform commission

const AdminCommissionsPage = () => {
    const { t } = useTranslation();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const data = await apiService.get<{ data?: Booking[] }>('/bookings');
            const list = Array.isArray(data) ? data : data?.data || [];
            setBookings(list);
        } catch (error) {
            console.error(t('admin_commissions.error_loading', 'Failed to load bookings:'), error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBookings = bookings.filter(b => {
        if (filterStatus === 'all') return true;
        return b.payment_status === filterStatus;
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const paidBookings = bookings.filter(b => b.payment_status === 'fully_paid' || b.payment_status === 'deposit_paid');
    const paidRevenue = paidBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalCommissions = paidRevenue * COMMISSION_RATE;
    const pendingCommissions = bookings
        .filter(b => b.payment_status === 'pending')
        .reduce((sum, b) => sum + ((b.amount || 0) * COMMISSION_RATE), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('admin_commissions.title', 'إدارة العمولات')}</h1>
                    <p className="text-gray-500">{t('admin_commissions.subtitle', 'إدارة ومتابعة عمولات المنصة على الحجوزات')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{t('admin_commissions.commission_rate', 'نسبة العمولة:')}</span>
                    <span className="px-3 py-1.5 rounded-xl bg-primary text-white text-sm font-bold">{(COMMISSION_RATE * 100).toFixed(0)}%</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <i className="fa-solid fa-coins text-green-600"></i>
                        </div>
                        <span className="text-sm text-gray-500">{t('admin_commissions.collected_commissions', 'العمولات المحصّلة')}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-green-600">{totalCommissions.toLocaleString()} {t('common.currency', 'ر.ق')}</h3>
                    <p className="text-xs text-gray-400 mt-1">{t('admin_commissions.from_paid_bookings', 'من {{count}} حجز مدفوع', { count: paidBookings.length })}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                            <i className="fa-solid fa-clock text-yellow-600"></i>
                        </div>
                        <span className="text-sm text-gray-500">{t('admin_commissions.pending_commissions', 'عمولات معلّقة')}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-yellow-600">{pendingCommissions.toLocaleString()} {t('common.currency', 'ر.ق')}</h3>
                    <p className="text-xs text-gray-400 mt-1">{t('admin_commissions.waiting_payment', 'بانتظار الدفع')}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <i className="fa-solid fa-money-bill-trend-up text-blue-600"></i>
                        </div>
                        <span className="text-sm text-gray-500">{t('admin_commissions.total_transactions', 'إجمالي المعاملات')}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-blue-600">{totalRevenue.toLocaleString()} {t('common.currency', 'ر.ق')}</h3>
                    <p className="text-xs text-gray-400 mt-1">{t('admin_commissions.transactions_count', '{{count}} معاملة', { count: bookings.length })}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <i className="fa-solid fa-chart-pie text-purple-600"></i>
                        </div>
                        <span className="text-sm text-gray-500">{t('admin_commissions.provider_revenue', 'إيرادات الموردين')}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-purple-600">{(paidRevenue - totalCommissions).toLocaleString()} {t('common.currency', 'ر.ق')}</h3>
                    <p className="text-xs text-gray-400 mt-1">{t('admin_commissions.after_commission', 'بعد خصم العمولات')}</p>
                </div>
            </div>

            {/* Commission Progress */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('admin_commissions.revenue_distribution', 'توزيع الإيرادات')}</h3>
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">{t('admin_commissions.platform_commission_label', 'عمولة المنصة ({{rate}}%)', { rate: (COMMISSION_RATE * 100).toFixed(0) })}</span>
                            <span className="text-sm font-bold text-primary">{totalCommissions.toLocaleString()} {t('common.currency', 'ر.ق')}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                            <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${COMMISSION_RATE * 100}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">{t('admin_commissions.provider_share_label', 'حصة الموردين ({{rate}}%)', { rate: ((1 - COMMISSION_RATE) * 100).toFixed(0) })}</span>
                            <span className="text-sm font-bold text-green-600">{(paidRevenue - totalCommissions).toLocaleString()} {t('common.currency', 'ر.ق')}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                            <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${(1 - COMMISSION_RATE) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">{t('admin_commissions.transaction_details', 'تفاصيل المعاملات')}</h3>
                    <div className="flex gap-2">
                        {['all', 'fully_paid', 'deposit_paid', 'pending', 'refunded'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {s === 'all' ? t('common.all', 'الكل') : s === 'fully_paid' ? t('payment.statuses.fully_paid', 'مدفوع') : s === 'deposit_paid' ? t('payment.statuses.deposit_paid', 'عربون') : s === 'pending' ? t('payment.statuses.pending', 'معلّق') : t('payment.statuses.refunded', 'مسترد')}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                            <tr>
                                <th className="px-6 py-3">{t('admin_commissions.table.booking', 'الحجز')}</th>
                                <th className="px-6 py-3">{t('admin_commissions.table.amount', 'المبلغ')}</th>
                                <th className="px-6 py-3">{t('admin_commissions.table.commission', 'العمولة')}</th>
                                <th className="px-6 py-3">{t('admin_commissions.table.provider_share', 'حصة المورد')}</th>
                                <th className="px-6 py-3">{t('admin_commissions.table.payment_status', 'حالة الدفع')}</th>
                                <th className="px-6 py-3">{t('admin_commissions.table.date', 'التاريخ')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                    </tr>
                                ))
                            ) : filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">{t('common.no_results', 'لا توجد نتائج')}</td>
                                </tr>
                            ) : (
                                filteredBookings.map(booking => {
                                    const commission = (booking.amount || 0) * COMMISSION_RATE;
                                    const providerShare = (booking.amount || 0) - commission;
                                    return (
                                        <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs text-gray-600">{booking.id.substring(0, 8)}...</span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {(booking.amount || 0).toLocaleString()} {t('common.currency', 'ر.ق')}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-primary">
                                                {commission.toLocaleString()} {t('common.currency', 'ر.ق')}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-green-600">
                                                {providerShare.toLocaleString()} {t('common.currency', 'ر.ق')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${booking.payment_status === 'fully_paid' ? 'bg-green-100 text-green-700' :
                                                        booking.payment_status === 'deposit_paid' ? 'bg-blue-100 text-blue-700' :
                                                            booking.payment_status === 'refunded' ? 'bg-red-100 text-red-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {booking.payment_status === 'fully_paid' ? t('payment.statuses.fully_paid_full', 'مدفوع بالكامل') :
                                                        booking.payment_status === 'deposit_paid' ? t('payment.statuses.deposit_paid_full', 'عربون مدفوع') :
                                                            booking.payment_status === 'refunded' ? t('payment.statuses.refunded', 'مسترد') : t('payment.statuses.pending', 'معلّق')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(booking.created_at).toLocaleDateString('ar-EG')}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminCommissionsPage;
