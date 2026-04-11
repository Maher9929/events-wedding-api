import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Event } from '../services/api';
import { toastService } from '../services/toast.service';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';

const AdminEventsPage = () => {
    const { t } = useTranslation();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const PAGE_SIZE = 10;

    const loadEvents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.get<{ data?: Event[] } | Event[]>('/events');
            const list = Array.isArray(data) ? data : data?.data || [];
            setEvents(list);
        } catch (_error) {
            toastService.error(t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadEvents();
    }, [loadEvents]);

    useEffect(() => {
        setPage(0);
    }, [searchTerm]);

    const handleDeleteEvent = async (eventId: string) => {
        const ok = await confirm({
            title: t('common.admin.confirm_delete_event', 'Delete Event'),
            message: t('common.admin.confirm_delete_event_msg', 'Are you sure you want to delete this event? This action cannot be undone.'),
            confirmLabel: t('common.delete', 'Delete'),
            cancelLabel: t('common.cancel', 'Cancel'),
        });
        if (!ok) return;
        setDeletingId(eventId);
        try {
            await apiService.delete(`/events/id/${eventId}`);
            setEvents(prev => prev.filter(e => e.id !== eventId));
            toastService.success(t('common.admin.success_delete'));
        } catch (_error) {
            toastService.error(t('common.error_deleting'));
        } finally {
            setDeletingId(null);
        }
    };

    const filteredEvents = events.filter(e =>
        e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.event_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const paginatedEvents = filteredEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('common.admin.events')}</h1>
                    <p className="text-gray-500">{t('common.admin.manage_events_desc') || 'Overview of all events created by clients.'}</p>
                </div>
                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                            <tr>
                                <th className="px-6 py-4">{t('common.admin.event')}</th>
                                <th className="px-6 py-4">{t('common.admin.type')}</th>
                                <th className="px-6 py-4">{t('common.status')}</th>
                                <th className="px-6 py-4">{t('common.admin.date')}</th>
                                <th className="px-6 py-4 text-center">{t('common.admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded w-16 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredEvents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">{t('common.no_results')}</td>
                                </tr>
                            ) : (
                                paginatedEvents.map(event => (
                                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{event.title}</div>
                                            <div className="text-xs text-gray-400">#{event.id.substring(0, 8).toUpperCase()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{event.event_type}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={event.status} />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(event.event_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                disabled={deletingId === event.id}
                                                className="text-red-400 hover:text-red-600 transition-colors p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={t('common.delete')}
                                            >
                                                <i className={`fa-solid ${deletingId === event.id ? 'fa-spinner fa-spin' : 'fa-trash-can'}`}></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination
                page={page}
                total={filteredEvents.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
            />
            <ConfirmDialogComponent />
        </div>
    );
};

export default AdminEventsPage;
