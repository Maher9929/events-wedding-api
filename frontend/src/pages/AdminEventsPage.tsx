import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Event } from '../services/api';
import { toastService } from '../services/toast.service';

const AdminEventsPage = () => {
    const { t } = useTranslation();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const data: any = await apiService.get('/events');
            const list = Array.isArray(data) ? data : data?.data || [];
            setEvents(list);
        } catch (error) {
            toastService.error(t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!window.confirm(t('common.admin.confirm_delete_event') || 'Are you sure you want to delete this event?')) return;
        try {
            await apiService.delete(`/events/${eventId}`);
            setEvents(prev => prev.filter(e => e.id !== eventId));
            toastService.success(t('common.admin.success_delete'));
        } catch (error) {
            toastService.error(t('common.error_deleting'));
        }
    };

    const filteredEvents = events.filter(e =>
        e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.event_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                                filteredEvents.map(event => (
                                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{event.title}</div>
                                            <div className="text-xs text-gray-400">#{(event as any).id.substring(0, 8).toUpperCase()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{event.event_type}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${event.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                    event.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                                                        event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(event.event_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="text-red-400 hover:text-red-600 transition-colors p-2"
                                                title={t('common.delete')}
                                            >
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
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

export default AdminEventsPage;
