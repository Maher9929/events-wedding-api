import { useTranslation } from 'react-i18next';

type StatusType =
  | 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected'
  | 'planning' | 'in_progress' | 'active' | 'inactive' | 'draft'
  | 'deposit_paid' | 'fully_paid' | 'refunded'
  | 'resolved' | 'dismissed' | 'approved' | 'suspended';

const statusConfig: Record<string, { cls: string; labelKey: string; fallback: string }> = {
  // Booking / Event statuses
  pending:       { cls: 'bg-yellow-100 text-yellow-700', labelKey: 'status.pending',    fallback: 'قيد الانتظار' },
  confirmed:     { cls: 'bg-green-100 text-green-700',   labelKey: 'status.confirmed',  fallback: 'مؤكد' },
  cancelled:     { cls: 'bg-red-100 text-red-700',       labelKey: 'status.cancelled',  fallback: 'ملغي' },
  completed:     { cls: 'bg-blue-100 text-blue-700',     labelKey: 'status.completed',  fallback: 'مكتمل' },
  rejected:      { cls: 'bg-red-100 text-red-600',       labelKey: 'status.rejected',   fallback: 'مرفوض' },
  // Event planning
  planning:      { cls: 'bg-purple-100 text-purple-700', labelKey: 'status.planning',   fallback: 'تخطيط' },
  in_progress:   { cls: 'bg-blue-100 text-blue-700',     labelKey: 'status.in_progress', fallback: 'قيد التنفيذ' },
  // Service / Provider
  active:        { cls: 'bg-green-100 text-green-700',   labelKey: 'status.active',     fallback: 'نشط' },
  inactive:      { cls: 'bg-gray-100 text-gray-600',     labelKey: 'status.inactive',   fallback: 'غير نشط' },
  draft:         { cls: 'bg-gray-100 text-gray-500',     labelKey: 'status.draft',      fallback: 'مسودة' },
  // Payment
  deposit_paid:  { cls: 'bg-blue-100 text-blue-700',     labelKey: 'status.deposit_paid', fallback: 'تم دفع العربون' },
  fully_paid:    { cls: 'bg-green-100 text-green-700',   labelKey: 'status.fully_paid', fallback: 'مدفوع بالكامل' },
  refunded:      { cls: 'bg-orange-100 text-orange-700', labelKey: 'status.refunded',   fallback: 'مسترجع' },
  // Moderation
  resolved:      { cls: 'bg-green-100 text-green-700',   labelKey: 'status.resolved',   fallback: 'تم الحل' },
  dismissed:     { cls: 'bg-gray-100 text-gray-600',     labelKey: 'status.dismissed',  fallback: 'مرفوض' },
  approved:      { cls: 'bg-green-100 text-green-700',   labelKey: 'status.approved',   fallback: 'معتمد' },
  suspended:     { cls: 'bg-red-100 text-red-700',       labelKey: 'status.suspended',  fallback: 'معلق' },
};

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Reusable status badge component used across booking, event, service, and admin pages.
 * Centralizes status → color mapping to prevent duplication.
 */
const StatusBadge = ({ status, size = 'sm', className = '' }: StatusBadgeProps) => {
  const { t } = useTranslation();
  const config = statusConfig[status] || { cls: 'bg-gray-100 text-gray-600', labelKey: '', fallback: status };
  const label = config.labelKey ? t(config.labelKey, config.fallback) : config.fallback;
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-bold rounded-full ${sizeClasses} ${config.cls} ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
