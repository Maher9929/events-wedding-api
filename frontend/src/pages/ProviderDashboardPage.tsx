import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService, type Conversation } from '../services/api';
import { messagesService } from '../services/messages.service';
import { toastService } from '../services/toast.service';

interface RecentActivity {
    id: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected' | string;
    created_at: string;
    amount?: number;
}

interface ProviderStats {
    overview: {
        totalBookings: number;
        confirmedBookings: number;
        completedBookings: number;
        totalRevenue: number;
        averageRating: number;
        totalServices: number;
        featuredServices: number;
        pendingQuotes: number;
        acceptedQuotes: number;
    };
    trends: {
        monthlyRevenue: { month: string; revenue: number }[];
        bookingStatusDistribution: {
            pending: number;
            confirmed: number;
            cancelled: number;
            completed: number;
            rejected: number;
        };
    };
    recentActivity: RecentActivity[];
    period: string;
}

interface PerformanceMetrics {
    conversionRates: {
        quoteConversionRate: number;
        bookingConversionRate: number;
    };
    performance: {
        averageResponseTime: number;
        totalEarnings: number;
        clientSatisfaction: number;
    };
    growth: {
        newClients: number;
        repeatClients: number;
    };
}

const ProviderDashboardPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [stats, setStats] = useState<ProviderStats | null>(null);
    const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
    const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

    const loadDashboardData = useCallback(async () => {
        try {
            const [statsData, performanceData, convosData] = await Promise.all([
                apiService.get<ProviderStats>(`/providers/stats?period=${period}`),
                apiService.get<PerformanceMetrics>('/providers/performance'),
                messagesService.getConversations().catch(() => [])
            ]);
            setStats(statsData);
            setPerformance(performanceData);
            setRecentConversations(convosData.slice(0, 3));
        } catch (_error) {
            toastService.error(t('provider_dashboard.error_loading', '\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645'));
        } finally {
            setLoading(false);
        }
    }, [period, t]);

    useEffect(() => {
        void loadDashboardData();
    }, [loadDashboardData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bglight p-5">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded-3xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!stats || !performance) {
        return (
            <div className="min-h-screen bg-bglight flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-3xl shadow-sm">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-circle-exclamation text-red-500 text-2xl"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t('provider_dashboard.data_unavailable', 'البيانات غير متاحة')}</h2>
                    <p className="text-gray-500 mb-6">{t('provider_dashboard.error_stats', 'لم نتمكن من تحميل الإحصائيات الخاصة بك.')}</p>
                    <button
                        onClick={() => { setLoading(true); void loadDashboardData(); }}
                        className="px-6 py-2 bg-primary text-white rounded-xl shadow-sm font-bold hover:bg-primary-dark transition-colors"
                    >
                        {t('common.retry', 'إعادة المحاولة')}
                    </button>
                </div>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString(t('common.date_locale')) + ' ' + t('common.currency', 'ر.ق');
    };

    const getPeriodLabel = () => {
        switch (period) {
            case 'week': return t('provider_dashboard.last_7_days', 'آخر 7 أيام');
            case 'month': return t('provider_dashboard.this_month', 'هذا الشهر');
            case 'year': return t('provider_dashboard.this_year', 'هذه السنة');
            default: return t('provider_dashboard.this_month', 'هذا الشهر');
        }
    };

    return (
        <div className="min-h-screen bg-bglight p-5" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('provider_dashboard.title', 'لوحة التحكم')}</h1>
                        <p className="text-gray-600 mt-1">{t('provider_dashboard.subtitle', 'نظرة عامة على نشاطك')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white rounded-xl p-1 shadow-sm">
                            {(['week', 'month', 'year'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === p
                                        ? 'bg-primary text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    {p === 'week' ? t('common.week', 'أسبوع') : p === 'month' ? t('common.month', 'شهر') : t('common.year', 'سنة')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <i className="fa-solid fa-calendar-check text-blue-600 text-lg"></i>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {getPeriodLabel()}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.overview.totalBookings}</h3>
                        <p className="text-sm text-gray-600">{t('provider_dashboard.total_bookings', 'إجمالي الحجوزات')}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <span className="text-green-600 font-bold">+{stats.overview.confirmedBookings} {t('provider_dashboard.confirmed', 'مؤكدة')}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-blue-600 font-bold">+{stats.overview.completedBookings} {t('provider_dashboard.completed', 'مكتملة')}</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <i className="fa-solid fa-money-bill text-green-600 text-lg"></i>
                            </div>
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-bold">
                                +12%
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(stats.overview.totalRevenue)}</h3>
                        <p className="text-sm text-gray-600">{t('provider_dashboard.total_revenue', 'الإيرادات المحققة')}</p>
                        <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">75% {t('provider_dashboard.monthly_goal_progress', 'من الهدف الشهري')}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                                <i className="fa-solid fa-star text-yellow-600 text-lg"></i>
                            </div>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <i
                                        key={star}
                                        className={`fa-solid fa-star text-sm ${star <= Math.round(stats.overview.averageRating)
                                            ? 'text-yellow-400'
                                            : 'text-gray-300'
                                            }`}
                                    ></i>
                                ))}
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.overview.averageRating.toFixed(1)}</h3>
                        <p className="text-sm text-gray-600">{t('provider_dashboard.average_rating', 'متوسط التقييم')}</p>
                        <div className="mt-3 text-xs text-gray-500">
                            {t('provider_dashboard.based_on_reviews', 'بناءً على {{count}} تقييم', { count: stats.overview.totalBookings })}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                <i className="fa-solid fa-briefcase text-purple-600 text-lg"></i>
                            </div>
                            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-bold">
                                {t('common.active', 'نشط')}
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.overview.totalServices}</h3>
                        <p className="text-sm text-gray-600">{t('provider_dashboard.published_services', 'الخدمات المنشورة')}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <span className="text-purple-600 font-bold">{stats.overview.featuredServices} {t('provider_dashboard.featured', 'مميزة')}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-orange-600 font-bold">{stats.overview.pendingQuotes} {t('provider_dashboard.pending_quotes', 'عرض سعر معلق')}</span>
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('provider_dashboard.conversion_rates', 'معدلات التحويل')}</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-600">{t('provider_dashboard.quote_to_booking', 'عرض سعر ← حجز')}</span>
                                    <span className="text-sm font-bold text-primary">{performance.conversionRates.quoteConversionRate}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{ width: `${performance.conversionRates.quoteConversionRate}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-600">{t('provider_dashboard.request_to_confirm', 'طلب ← تأكيد')}</span>
                                    <span className="text-sm font-bold text-green-600">{performance.conversionRates.bookingConversionRate}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full transition-all"
                                        style={{ width: `${performance.conversionRates.bookingConversionRate}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('provider_dashboard.performance', 'الأداء')}</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{t('provider_dashboard.average_response_time', 'متوسط وقت الاستجابة')}</span>
                                <span className="text-sm font-bold text-blue-600">{performance.performance.averageResponseTime} {t('common.hour', 'ساعة')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{t('provider_dashboard.client_satisfaction', 'رضا العملاء')}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-bold text-yellow-600">{performance.performance.clientSatisfaction.toFixed(1)}</span>
                                    <i className="fa-solid fa-star text-yellow-400 text-xs"></i>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{t('provider_dashboard.revenue_30_days', 'الإيرادات (30 يوم)')}</span>
                                <span className="text-sm font-bold text-green-600">{formatCurrency(performance.performance.totalEarnings)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('provider_dashboard.growth', 'النمو')}</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{t('provider_dashboard.new_clients', 'عملاء جدد')}</span>
                                <span className="text-sm font-bold text-purple-600">{performance.growth.newClients}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{t('provider_dashboard.repeat_clients', 'عملاء عائدون')}</span>
                                <span className="text-sm font-bold text-orange-600">{performance.growth.repeatClients}</span>
                            </div>
                            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                                <p className="text-xs text-blue-700 font-bold">
                                    {t('provider_dashboard.retention_rate', 'معدل الاحتفاظ:')} {performance.growth.repeatClients > 0
                                        ? Math.round((performance.growth.repeatClients / (performance.growth.newClients + performance.growth.repeatClients)) * 100)
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Row: Revenue & Recent Messages */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="md:col-span-2 bg-white rounded-3xl shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('provider_dashboard.monthly_revenue', 'الإيرادات الشهرية')}</h3>
                        <div className="h-64 flex items-end justify-between gap-2">
                            {stats.trends.monthlyRevenue.slice(-6).map((data) => (
                                <div key={data.month} className="flex-1 flex flex-col items-center">
                                    <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: `${(data.revenue / Math.max(1, ...stats.trends.monthlyRevenue.map(d => d.revenue))) * 100}%` }}>
                                        <div className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all"></div>
                                    </div>
                                    <span className="text-xs text-gray-600 mt-2">
                                        {new Date(data.month + '-01').toLocaleDateString(t('common.date_locale'), { month: 'short' })}
                                    </span>
                                    <span className="text-xs font-bold text-gray-900">
                                        {formatCurrency(data.revenue)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm p-6 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">{t('provider_dashboard.recent_messages', 'الرسائل الأخيرة')}</h3>
                            <button
                                onClick={() => navigate('/provider/messages')}
                                className="text-sm font-bold text-primary hover:underline"
                            >
                                {t('common.view_all', 'عرض الكل')}
                            </button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {recentConversations.length > 0 ? (
                                recentConversations.map(convo => (
                                    <div
                                        key={convo.id}
                                        onClick={() => navigate(`/provider/messages?id=${convo.id}`)}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0 overflow-hidden">
                                            {convo.recipient_avatar ? (
                                                <img loading="lazy" src={convo.recipient_avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                convo.recipient_name?.charAt(0)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{convo.recipient_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{new Date(convo.last_message_at).toLocaleDateString(t('common.date_locale'))}</p>
                                        </div>
                                        {(convo.unread_count || 0) > 0 && (
                                            <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                {convo.unread_count}
                                            </span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-2xl">
                                    <i className="fa-solid fa-comment-slash text-gray-300 text-3xl mb-2"></i>
                                    <p className="text-sm text-gray-400">{t('provider_dashboard.no_messages', 'لا توجد رسائل')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{t('provider_dashboard.recent_activity', 'النشاط الأخير')}</h3>
                    <div className="space-y-3">
                        {stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((activity, index) => (
                                <div key={activity.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${activity.status === 'confirmed' ? 'bg-green-500' :
                                            activity.status === 'pending' ? 'bg-yellow-500' :
                                                activity.status === 'cancelled' ? 'bg-red-500' :
                                                    activity.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'
                                            }`}></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">
                                                {activity.status === 'confirmed' ? t('provider_dashboard.activity_new_booking', 'حجز جديد مؤكد') :
                                                    activity.status === 'pending' ? t('provider_dashboard.activity_pending', 'قيد الانتظار') :
                                                        activity.status === 'cancelled' ? t('provider_dashboard.activity_cancelled', 'إلغاء') :
                                                            activity.status === 'completed' ? t('provider_dashboard.activity_completed', 'مكتمل') : t('provider_dashboard.activity_unknown', 'حالة غير معروفة')}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(activity.created_at).toLocaleDateString(t('common.date_locale'))}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-primary">
                                        {formatCurrency(activity.amount || 0)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">{t('provider_dashboard.no_recent_activity', 'لا يوجد نشاط حديث')}</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => navigate('/provider/calendar')}
                        className="p-4 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all text-center"
                    >
                        <i className="fa-solid fa-calendar text-primary text-xl mb-2"></i>
                        <p className="text-sm font-bold text-gray-900">{t('provider_dashboard.calendar', 'التقويم')}</p>
                    </button>
                    <button
                        onClick={() => navigate('/provider/services')}
                        className="p-4 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all text-center"
                    >
                        <i className="fa-solid fa-briefcase text-purple-600 text-xl mb-2"></i>
                        <p className="text-sm font-bold text-gray-900">{t('provider_dashboard.my_services', 'خدماتي')}</p>
                    </button>
                    <button
                        onClick={() => navigate('/provider/quotes')}
                        className="p-4 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all text-center"
                    >
                        <i className="fa-solid fa-file-invoice text-orange-600 text-xl mb-2"></i>
                        <p className="text-sm font-bold text-gray-900">{t('provider_dashboard.quotes', 'عروض الأسعار')}</p>
                    </button>
                    <button
                        onClick={() => navigate('/provider/reviews')}
                        className="p-4 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all text-center"
                    >
                        <i className="fa-solid fa-star text-yellow-500 text-xl mb-2"></i>
                        <p className="text-sm font-bold text-gray-900">{t('provider_dashboard.reviews', 'التقييمات')}</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProviderDashboardPage;
