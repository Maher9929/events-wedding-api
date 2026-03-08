import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

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
    recentActivity: any[];
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
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [stats, setStats] = useState<ProviderStats | null>(null);
    const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

    useEffect(() => {
        loadDashboardData();
    }, [period]);

    const loadDashboardData = async () => {
        try {
            const [statsData, performanceData] = await Promise.all([
                apiService.get<ProviderStats>(`/providers/stats?period=${period}`),
                apiService.get<PerformanceMetrics>('/providers/performance')
            ]);
            setStats(statsData);
            setPerformance(performanceData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

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
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Données indisponibles</h2>
                    <p className="text-gray-500 mb-6">Nous n'avons pas pu charger vos statistiques.</p>
                    <button
                        onClick={() => { setLoading(true); loadDashboardData(); }}
                        className="px-6 py-2 bg-primary text-white rounded-xl shadow-sm font-bold hover:bg-primary-dark transition-colors"
                    >
                        {t('common.retry') || 'Réessayer'}
                    </button>
                </div>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('fr-FR') + ' ر.ق';
    };

    const getPeriodLabel = () => {
        switch (period) {
            case 'week': return '7 derniers jours';
            case 'month': return 'Ce mois';
            case 'year': return 'Cette année';
            default: return 'Ce mois';
        }
    };

    return (
        <div className="min-h-screen bg-bglight p-5">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
                        <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité</p>
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
                                    {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
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
                        <p className="text-sm text-gray-600">Réservations totales</p>
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <span className="text-green-600 font-bold">+{stats.overview.confirmedBookings} confirmées</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-blue-600 font-bold">+{stats.overview.completedBookings} terminées</span>
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
                        <p className="text-sm text-gray-600">Revenus générés</p>
                        <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">75% de l'objectif mensuel</p>
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
                        <p className="text-sm text-gray-600">Note moyenne</p>
                        <div className="mt-3 text-xs text-gray-500">
                            Basée sur {stats.overview.totalBookings} évaluations
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                <i className="fa-solid fa-briefcase text-purple-600 text-lg"></i>
                            </div>
                            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-bold">
                                Actif
                            </span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.overview.totalServices}</h3>
                        <p className="text-sm text-gray-600">Services publiés</p>
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <span className="text-purple-600 font-bold">{stats.overview.featuredServices} en vedette</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-orange-600 font-bold">{stats.overview.pendingQuotes} devis en attente</span>
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Taux de conversion</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-600">Devis → Réservation</span>
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
                                    <span className="text-sm text-gray-600">Demande → Confirmation</span>
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
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Performance</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Temps de réponse moyen</span>
                                <span className="text-sm font-bold text-blue-600">{performance.performance.averageResponseTime}h</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Satisfaction client</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-bold text-yellow-600">{performance.performance.clientSatisfaction.toFixed(1)}</span>
                                    <i className="fa-solid fa-star text-yellow-400 text-xs"></i>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Revenus (30j)</span>
                                <span className="text-sm font-bold text-green-600">{formatCurrency(performance.performance.totalEarnings)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Croissance</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Nouveaux clients</span>
                                <span className="text-sm font-bold text-purple-600">{performance.growth.newClients}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Clients fidèles</span>
                                <span className="text-sm font-bold text-orange-600">{performance.growth.repeatClients}</span>
                            </div>
                            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                                <p className="text-xs text-blue-700 font-bold">
                                    Taux de rétention: {performance.growth.repeatClients > 0
                                        ? Math.round((performance.growth.repeatClients / (performance.growth.newClients + performance.growth.repeatClients)) * 100)
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Revenus mensuels</h3>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {stats.trends.monthlyRevenue.slice(-6).map((data) => (
                            <div key={data.month} className="flex-1 flex flex-col items-center">
                                <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: `${(data.revenue / Math.max(...stats.trends.monthlyRevenue.map(d => d.revenue))) * 100}%` }}>
                                    <div className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all"></div>
                                </div>
                                <span className="text-xs text-gray-600 mt-2">
                                    {new Date(data.month + '-01').toLocaleDateString('fr-FR', { month: 'short' })}
                                </span>
                                <span className="text-xs font-bold text-gray-900">
                                    {formatCurrency(data.revenue)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-3xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Activité récente</h3>
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
                                                {activity.status === 'confirmed' ? 'Nouvelle réservation' :
                                                    activity.status === 'pending' ? 'En attente' :
                                                        activity.status === 'cancelled' ? 'Annulation' :
                                                            activity.status === 'completed' ? 'Terminé' : 'Statut inconnu'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-primary">
                                        {formatCurrency(activity.amount || 0)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">Aucune activité récente</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => navigate('/provider/calendar')}
                        className="p-4 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all text-center"
                    >
                        <i className="fa-solid fa-calendar text-primary text-xl mb-2"></i>
                        <p className="text-sm font-bold text-gray-900">{t('common.calendar') || 'Calendrier'}</p>
                    </button>
                    <button
                        onClick={() => navigate('/provider/services')}
                        className="p-4 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all text-center"
                    >
                        <i className="fa-solid fa-briefcase text-purple-600 text-xl mb-2"></i>
                        <p className="text-sm font-bold text-gray-900">{t('common.services') || 'Services'}</p>
                    </button>
                    <button
                        onClick={() => navigate('/provider/quotes')}
                        className="p-4 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all text-center"
                    >
                        <i className="fa-solid fa-file-invoice text-orange-600 text-xl mb-2"></i>
                        <p className="text-sm font-bold text-gray-900">{t('common.quotes') || 'Devis'}</p>
                    </button>
                    <button
                        onClick={() => navigate('/provider/reviews')}
                        className="p-4 bg-white rounded-3xl shadow-sm hover:shadow-md transition-all text-center"
                    >
                        <i className="fa-solid fa-star text-yellow-500 text-xl mb-2"></i>
                        <p className="text-sm font-bold text-gray-900">{t('common.reviews') || 'Avis'}</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProviderDashboardPage;
