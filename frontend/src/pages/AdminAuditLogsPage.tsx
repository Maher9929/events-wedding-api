import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Booking } from '../services/api';

interface AuditEntry {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    user_email?: string;
    user_name?: string;
    details: string;
    created_at: string;
    severity: 'info' | 'warning' | 'critical';
}

const AdminAuditLogsPage = () => {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            // Try to load from audit-logs endpoint, fallback to constructing from bookings
            let auditData: AuditEntry[] = [];
            try {
                const data: any = await apiService.get('/audit-logs');
                const list = Array.isArray(data) ? data : data?.data || [];
                auditData = list;
            } catch {
                // If no audit-logs endpoint, build audit trail from bookings activity
            }

            // Also construct audit entries from bookings as supplementary data
            try {
                const bookingsData: any = await apiService.get('/bookings');
                const bookings: Booking[] = Array.isArray(bookingsData) ? bookingsData : bookingsData?.data || [];

                const bookingAuditEntries: AuditEntry[] = bookings.map(b => ({
                    id: `booking-${b.id}`,
                    action: b.status === 'cancelled' ? 'booking_cancelled' :
                        b.status === 'confirmed' ? 'booking_confirmed' :
                            b.status === 'completed' ? 'booking_completed' :
                                'booking_created',
                    entity_type: 'booking',
                    entity_id: b.id,
                    user_email: b.client_id?.substring(0, 8),
                    details: `حجز ${b.status === 'cancelled' ? 'ملغي' : b.status === 'confirmed' ? 'مؤكد' : b.status === 'completed' ? 'مكتمل' : 'جديد'} — ${(b.amount || 0).toLocaleString()} ر.ق`,
                    created_at: b.updated_at || b.created_at,
                    severity: b.status === 'cancelled' ? 'warning' as const : 'info' as const,
                }));

                // Merge and deduplicate
                const existingIds = new Set(auditData.map(a => a.id));
                const newEntries = bookingAuditEntries.filter(e => !existingIds.has(e.id));
                auditData = [...auditData, ...newEntries];
            } catch {
                // silently ignore if bookings fail
            }

            // Sort by date descending
            auditData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setLogs(auditData);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesType = filterType === 'all' || log.entity_type === filterType || log.action.includes(filterType);
        const matchesSearch = !searchTerm ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const getActionIcon = (action: string) => {
        if (action.includes('cancel')) return { icon: 'fa-ban', color: 'text-red-500 bg-red-100' };
        if (action.includes('confirm')) return { icon: 'fa-check-circle', color: 'text-green-500 bg-green-100' };
        if (action.includes('complet')) return { icon: 'fa-flag-checkered', color: 'text-blue-500 bg-blue-100' };
        if (action.includes('create')) return { icon: 'fa-plus-circle', color: 'text-purple-500 bg-purple-100' };
        if (action.includes('payment')) return { icon: 'fa-credit-card', color: 'text-emerald-500 bg-emerald-100' };
        if (action.includes('delete')) return { icon: 'fa-trash', color: 'text-red-500 bg-red-100' };
        if (action.includes('update')) return { icon: 'fa-pen', color: 'text-amber-500 bg-amber-100' };
        return { icon: 'fa-circle-info', color: 'text-gray-500 bg-gray-100' };
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            'booking_created': 'إنشاء حجز',
            'booking_confirmed': 'تأكيد حجز',
            'booking_cancelled': 'إلغاء حجز',
            'booking_completed': 'إكمال حجز',
            'payment_received': 'استلام دفعة',
            'user_created': 'تسجيل مستخدم',
            'user_deleted': 'حذف مستخدم',
            'provider_verified': 'توثيق مورد',
            'review_created': 'إضافة تقييم',
        };
        return labels[action] || action;
    };

    const entityTypes = ['all', 'booking', 'payment', 'user', 'provider'];

    const totalInfo = logs.filter(l => l.severity === 'info').length;
    const totalWarning = logs.filter(l => l.severity === 'warning').length;
    const totalCritical = logs.filter(l => l.severity === 'critical').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">سجل التدقيق</h1>
                    <p className="text-gray-500">تتبع جميع الإجراءات والعمليات على المنصة</p>
                </div>
                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="بحث في السجلات..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <i className="fa-solid fa-list text-blue-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
                            <p className="text-xs text-gray-500">إجمالي السجلات</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <i className="fa-solid fa-circle-info text-green-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{totalInfo}</p>
                            <p className="text-xs text-gray-500">معلومات</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                            <i className="fa-solid fa-triangle-exclamation text-yellow-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-600">{totalWarning}</p>
                            <p className="text-xs text-gray-500">تحذيرات</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <i className="fa-solid fa-circle-exclamation text-red-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{totalCritical}</p>
                            <p className="text-xs text-gray-500">حرجة</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {entityTypes.map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterType === type
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                    >
                        {type === 'all' ? 'الكل' :
                            type === 'booking' ? 'الحجوزات' :
                                type === 'payment' ? 'المدفوعات' :
                                    type === 'user' ? 'المستخدمين' : 'الموردين'}
                    </button>
                ))}
            </div>

            {/* Audit Log Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-xl"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-100 rounded w-1/3 mb-2"></div>
                                    <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                                </div>
                                <div className="h-3 bg-gray-100 rounded w-20"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-10 text-center">
                        <i className="fa-solid fa-clipboard-list text-gray-300 text-4xl mb-3"></i>
                        <p className="text-gray-500">{t('common.no_results')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredLogs.slice(0, 50).map(log => {
                            const { icon, color } = getActionIcon(log.action);
                            return (
                                <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                                        <i className={`fa-solid ${icon} text-sm`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-bold text-gray-900">{getActionLabel(log.action)}</span>
                                            {log.severity === 'warning' && (
                                                <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 text-[10px] font-bold">تحذير</span>
                                            )}
                                            {log.severity === 'critical' && (
                                                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">حرج</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{log.details}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleDateString('ar-EG')}</p>
                                        <p className="text-[10px] text-gray-300">{new Date(log.created_at).toLocaleTimeString('ar-EG')}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAuditLogsPage;
