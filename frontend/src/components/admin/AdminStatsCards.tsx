import { useTranslation } from 'react-i18next';
import type { ProviderStats } from '../../hooks/useAdminDashboard';

interface Props {
  totalUsers: number;
  providersCount: number;
  clientsCount: number;
  eventsCount: number;
  totalBookings: number;
  totalRevenue: number;
  providerStats: ProviderStats | null;
}

const AdminStatsCards = ({
  totalUsers,
  providersCount,
  clientsCount,
  eventsCount,
  totalBookings,
  totalRevenue,
  providerStats,
}: Props) => {
  const { t } = useTranslation();

  const stats = [
    { label: t('admin.dashboard.total_users', 'إجمالي المستخدمين'), value: providerStats?.total_users ?? totalUsers, icon: 'fa-users', color: 'bg-purple-100 text-primary' },
    { label: t('admin.dashboard.providers', 'مقدمو الخدمات'), value: providerStats?.total ?? providersCount, icon: 'fa-store', color: 'bg-green-100 text-green-600' },
    { label: t('admin.dashboard.clients', 'العملاء'), value: clientsCount, icon: 'fa-user-group', color: 'bg-blue-100 text-blue-600' },
    { label: t('admin.dashboard.events', 'الفعاليات'), value: eventsCount, icon: 'fa-calendar', color: 'bg-amber-100 text-amber-600' },
    { label: t('admin.dashboard.bookings', 'الحجوزات'), value: totalBookings, icon: 'fa-calendar-check', color: 'bg-pink-100 text-pink-600' },
    { label: t('admin.dashboard.revenue', 'الإيرادات'), value: `${totalRevenue.toLocaleString()} ${t('common.currency', 'ر.ق')}`, icon: 'fa-coins', color: 'bg-yellow-100 text-yellow-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
              <i className={`fa-solid ${stat.icon} text-sm`}></i>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
          <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

export default AdminStatsCards;
