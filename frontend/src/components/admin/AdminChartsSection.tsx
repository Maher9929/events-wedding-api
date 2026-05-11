import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import type { User } from '../../services/api';
import type { BookingStats } from '../../hooks/useAdminDashboard';

interface Props {
  users: User[];
  bookingStats: BookingStats;
}

const AdminChartsSection = ({ users, bookingStats }: Props) => {
  return (
    <>
      {/* Monthly Registrations */}
      {users.length > 0 && <RegistrationsChart users={users} />}

      {/* Monthly Revenue */}
      {bookingStats.monthly_revenue && bookingStats.monthly_revenue.length > 0 && (
        <RevenueChart monthlyRevenue={bookingStats.monthly_revenue} />
      )}
    </>
  );
};

// ─── Sub-components ─────────────────────────────────────────

function RegistrationsChart({ users }: { users: User[] }) {
  const { t } = useTranslation();
  const MONTHS = [
    t('months.jan', 'يناير'), t('months.feb', 'فبراير'), t('months.mar', 'مارس'),
    t('months.apr', 'أبريل'), t('months.may', 'مايو'), t('months.jun', 'يونيو'),
    t('months.jul', 'يوليو'), t('months.aug', 'أغسطس'), t('months.sep', 'سبتمبر'),
    t('months.oct', 'أكتوبر'), t('months.nov', 'نوفمبر'), t('months.dec', 'ديسمبر'),
  ];

  const now = new Date();
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: MONTHS[d.getMonth()].substring(0, 3), m: d.getMonth(), y: d.getFullYear() };
  });

  const clientLabel = t('roles.client', 'مستخدمون');
  const providerLabel = t('roles.provider', 'موردون');

  const data = last6.map(({ month, m, y }) => ({
    month,
    [clientLabel]: users.filter((u) => {
      const d = new Date(u.created_at);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length,
    [providerLabel]: users
      .filter((u) => u.role === 'provider')
      .filter((u) => {
        const d = new Date(u.created_at);
        return d.getMonth() === m && d.getFullYear() === y;
      }).length,
  }));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        {t('admin.dashboard.monthly_registrations', 'التسجيلات الشهرية')}
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey={clientLabel} fill="#7c3aed" radius={[4, 4, 0, 0]} />
          <Bar dataKey={providerLabel} fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RevenueChart({ monthlyRevenue }: { monthlyRevenue: { month: string; revenue: number }[] }) {
  const { t } = useTranslation();
  const revenueLabel = t('admin.dashboard.revenue', 'الإيراد');

  const data = monthlyRevenue.map((d) => ({
    month: d.month.substring(0, 3),
    [revenueLabel]: d.revenue,
  }));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          {t('admin.dashboard.monthly_revenue', 'الإيرادات الشهرية')}
        </h3>
        <span className="text-xs text-gray-400">
          {t('admin.dashboard.last_6_months', 'آخر 6 أشهر')}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v > 0 ? `${(v / 1000).toFixed(0)}k` : '0')} />
          <Tooltip
            formatter={(v: string | number | undefined) => [`${Number(v).toLocaleString()} ${t('common.currency', 'ر.ق')}`, revenueLabel]}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
          />
          <Line type="monotone" dataKey={revenueLabel} stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AdminChartsSection;
