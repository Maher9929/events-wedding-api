import { useTranslation } from 'react-i18next';
import type { BookingStats } from '../../hooks/useAdminDashboard';

interface Props {
  bookingStats: BookingStats;
}

const AdminBookingBreakdown = ({ bookingStats }: Props) => {
  const { t } = useTranslation();

  const items = [
    { label: t('bookings.status.pending', 'قيد الانتظار'), value: bookingStats.pending, color: 'bg-yellow-100 text-yellow-700', icon: 'fa-clock' },
    { label: t('bookings.status.confirmed', 'مؤكدة'), value: bookingStats.confirmed, color: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
    { label: t('bookings.status.completed', 'مكتملة'), value: bookingStats.completed, color: 'bg-blue-100 text-blue-700', icon: 'fa-flag-checkered' },
    { label: t('bookings.status.cancelled', 'ملغاة'), value: bookingStats.cancelled, color: 'bg-red-100 text-red-700', icon: 'fa-times-circle' },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        {t('admin.dashboard.bookings_breakdown', 'توزيع الحجوزات')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((s, i) => (
          <div key={i} className={`rounded-xl p-4 ${s.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <i className={`fa-solid ${s.icon} text-sm`}></i>
              <span className="text-xs font-bold">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBookingBreakdown;
