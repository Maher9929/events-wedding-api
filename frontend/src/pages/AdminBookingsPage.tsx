import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Booking } from '../services/api';
import { toastService } from '../services/toast.service';

const AdminBookingsPage = () => {
    const { t } = useTranslation();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        loadBookings();
    }, [statusFilter]);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const endpoint = statusFilter === 'all' ? '/bookings' : `/bookings?status=${statusFilter}`;
            const data: any = await apiService.get(endpoint);
            const list = Array.isArray(data) ? data : data?.data || [];
            setBookings(list);
        } catch (error) {
            toastService.error(t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
        try {
            await apiService.patch(`/bookings/${bookingId}/status`, { status: newStatus });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus as any } : b));
            toastService.success(t('common.admin.success_update'));
        } catch (error) {
            toastService.error(t('common.error_updating'));
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'إجمالي الحجوزات', value: bookings.length, icon: 'fa-calendar-check', color: 'bg-blue-50 text-blue-600' },
                    { label: 'قيد الانتظار', value: bookings.filter(b => b.status === 'pending').length, icon: 'fa-clock', color: 'bg-yellow-50 text-yellow-600' },
                    { label: 'مؤكدة', value: bookings.filter(b => b.status === 'confirmed').length, icon: 'fa-check-circle', color: 'bg-green-50 text-green-600' },
                    { label: 'مكتملة', value: bookings.filter(b => b.status === 'completed').length, icon: 'fa-flag-checkered', color: 'bg-purple-50 text-purple-600' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                                <i className={`fa-solid ${s.icon}`}></i>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                                <p className="text-xs text-gray-500">{s.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('common.admin.bookings')}</h1>
                    <p className="text-gray-500">{t('common.admin.manage_bookings_desc') || 'Overview of all platform bookings and their states.'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-500">{t('common.filter')}:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                        <option value="all">{t('common.all')}</option>
                        <option value="pending">{t('bookings.status.pending')}</option>
                        <option value="confirmed">{t('bookings.status.confirmed')}</option>
                        <option value="completed">{t('bookings.status.completed')}</option>
                        <option value="cancelled">{t('bookings.status.cancelled')}</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                            <tr>
                                <th className="px-6 py-4">{t('bookings.details')}</th>
                                <th className="px-6 py-4">{t('bookings.amount')}</th>
                                <th className="px-6 py-4">{t('common.status')}</th>
                                <th className="px-6 py-4">{t('common.admin.created_at')}</th>
                                <th className="px-6 py-4 text-center">{t('common.admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-40"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded w-24 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">{t('common.no_results')}</td>
                                </tr>
                            ) : (
                                bookings.map(booking => (
                                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">#{(booking as any).id.substring(0, 8).toUpperCase()}</div>
                                            <div className="text-xs text-gray-400">{(booking as any).services?.title || 'Service ID: ' + (booking as any).service_id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-primary">{booking.amount.toLocaleString()} QR</div>
                                            <div className="text-[10px] text-gray-400">{t('bookings.' + booking.payment_status)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-red-100 text-red-700'
                                                }`}>
                                                {t('bookings.status.' + booking.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(booking.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <select
                                                    value={booking.status}
                                                    onChange={(e) => handleStatusUpdate(booking.id, e.target.value)}
                                                    className="text-xs p-1 rounded-lg border border-gray-200 outline-none"
                                                >
                                                    <option value="pending">قيد الانتظار</option>
                                                    <option value="confirmed">مؤكد</option>
                                                    <option value="completed">مكتمل</option>
                                                    <option value="cancelled">ملغي</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminBookingsPage;
