import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import AdminStatsCards from '../components/admin/AdminStatsCards';
import AdminBookingBreakdown from '../components/admin/AdminBookingBreakdown';
import AdminChartsSection from '../components/admin/AdminChartsSection';
import AdminTopLists from '../components/admin/AdminTopLists';

const NAV_ITEMS = [
  { to: '/admin/users', icon: 'fa-users', labelKey: 'admin.nav.users', fallback: 'المستخدمين', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { to: '/admin/providers', icon: 'fa-store', labelKey: 'admin.nav.providers', fallback: 'الموردون', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { to: '/admin/bookings', icon: 'fa-calendar-check', labelKey: 'admin.nav.bookings', fallback: 'الحجوزات', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  { to: '/admin/events', icon: 'fa-calendar-days', labelKey: 'admin.nav.events', fallback: 'الفعاليات', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { to: '/admin/services', icon: 'fa-box', labelKey: 'admin.nav.services', fallback: 'الخدمات', color: 'bg-pink-100 text-pink-700 hover:bg-pink-200' },
  { to: '/admin/reviews', icon: 'fa-star', labelKey: 'admin.nav.reviews', fallback: 'التقييمات', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  { to: '/admin/quotes', icon: 'fa-file-invoice', labelKey: 'admin.nav.quotes', fallback: 'عروض الأسعار', color: 'bg-teal-100 text-teal-700 hover:bg-teal-200' },
  { to: '/admin/categories', icon: 'fa-border-all', labelKey: 'admin.nav.categories', fallback: 'الفئات', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  { to: '/admin/moderation', icon: 'fa-shield-halved', labelKey: 'admin.nav.moderation', fallback: 'الإشراف', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { to: '/admin/messages', icon: 'fa-comments', labelKey: 'admin.nav.messages', fallback: 'الرسائل', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
  { to: '/admin/commissions', icon: 'fa-percent', labelKey: 'admin.nav.commissions', fallback: 'العمولات', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  { to: '/admin/audit-logs', icon: 'fa-clipboard-list', labelKey: 'admin.nav.audit_logs', fallback: 'سجل التدقيق', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
];

const AdminDashboard = () => {
  const { t } = useTranslation();
  const data = useAdminDashboard();

  const providers = data.users.filter((u) => u.role === 'provider');
  const clients = data.users.filter((u) => u.role === 'client');

  return (
    <div className="space-y-6">
      {/* Header + Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('admin.dashboard.title', 'لوحة تحكم المنصة')}
        </h2>
        <div className="flex gap-2 flex-wrap">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${item.color}`}
            >
              <i className={`fa-solid ${item.icon} ms-1`}></i>
              {t(item.labelKey, item.fallback)}
            </Link>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {data.errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation"></i>
          {data.errorMessage}
        </div>
      )}

      {/* Content */}
      {data.loading ? (
        <p className="text-center text-gray-400 py-8">
          {t('common.loading', 'جاري التحميل...')}
        </p>
      ) : (
        <>
          <AdminStatsCards
            totalUsers={data.totalUsers}
            providersCount={providers.length}
            clientsCount={clients.length}
            eventsCount={data.eventStats?.total ?? data.totalEvents}
            totalBookings={data.bookingStats.total_bookings}
            totalRevenue={data.bookingStats.total_revenue}
            providerStats={data.providerStats}
          />

          <AdminChartsSection
            users={data.users}
            bookingStats={data.bookingStats}
          />

          <AdminBookingBreakdown bookingStats={data.bookingStats} />

          <AdminTopLists
            allBookings={data.allBookings}
            categories={data.categories}
          />
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
