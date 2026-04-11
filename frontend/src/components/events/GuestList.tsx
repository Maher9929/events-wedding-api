import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { eventsService } from '../../services/events.service';
import type { EventGuest } from '../../types/events';
import { toastService } from '../../services/toast.service';
import { useConfirmDialog } from '../common/ConfirmDialog';

interface Props {
    eventId: string;
}

const GuestList = ({ eventId }: Props) => {
    const { t } = useTranslation();
    const [guests, setGuests] = useState<EventGuest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        status: 'invited' as EventGuest['status'],
        notes: '',
    });
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    const statusConfig: Record<EventGuest['status'], { label: string; cls: string }> = {
        invited: { label: t('events.guests.status.invited', 'Invited'), cls: 'bg-blue-100 text-blue-700' },
        confirmed: { label: t('events.guests.status.confirmed', 'Confirmed'), cls: 'bg-green-100 text-green-700' },
        declined: { label: t('events.guests.status.declined', 'Declined'), cls: 'bg-red-100 text-red-700' },
        maybe: { label: t('events.guests.status.maybe', 'Maybe'), cls: 'bg-yellow-100 text-yellow-700' },
    };

    useEffect(() => {
        eventsService.getGuests(eventId)
            .then((data) => setGuests(Array.isArray(data) ? data : (data as { data?: EventGuest[] })?.data || []))
            .catch(() => toastService.error(t('events.guests.errors.load', 'Failed to load guests')))
            .finally(() => setLoading(false));
    }, [eventId, t]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        try {
            setSubmitting(true);
            const result = await eventsService.addGuest(eventId, form);
            const guest = (result as { data?: EventGuest })?.data || result;
            setGuests((prev) => [...prev, guest as EventGuest]);
            setForm({ name: '', email: '', phone: '', status: 'invited', notes: '' });
            setShowForm(false);
            toastService.success(t('events.guests.success.add', 'Guest added'));
        } catch {
            toastService.error(t('events.guests.errors.add', 'Failed to add guest'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (currentEventId: string, guestId: string, status: EventGuest['status']) => {
        try {
            await eventsService.updateGuest(currentEventId, guestId, { status });
            setGuests((prev) => prev.map((guest) => (guest.id === guestId ? { ...guest, status } : guest)));
        } catch {
            toastService.error(t('events.guests.errors.status', 'Failed to update guest status'));
        }
    };

    const handleRemove = async (id: string) => {
        const ok = await confirm({
            title: t('events.guests.delete_title', 'Remove guest'),
            message: t('events.guests.delete_message', 'Are you sure you want to remove this guest?'),
        });
        if (!ok) return;

        try {
            await eventsService.removeGuest(eventId, id);
            setGuests((prev) => prev.filter((guest) => guest.id !== id));
            toastService.success(t('events.guests.success.delete', 'Guest removed'));
        } catch {
            toastService.error(t('events.guests.errors.delete', 'Failed to remove guest'));
        }
    };

    const stats = {
        total: guests.length,
        confirmed: guests.filter((guest) => guest.status === 'confirmed').length,
        invited: guests.filter((guest) => guest.status === 'invited').length,
        declined: guests.filter((guest) => guest.status === 'declined').length,
    };

    if (loading) return <div className="p-8 text-center text-gray-400">{t('common.loading', 'Loading...')}</div>;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: t('events.guests.stats.total', 'Total'), value: stats.total, cls: 'text-gray-700' },
                    { label: t('events.guests.stats.confirmed', 'Confirmed'), value: stats.confirmed, cls: 'text-green-600' },
                    { label: t('events.guests.stats.invited', 'Invited'), value: stats.invited, cls: 'text-blue-600' },
                    { label: t('events.guests.stats.declined', 'Declined'), value: stats.declined, cls: 'text-red-600' },
                ].map((stat, i) => (
                    <div key={stat.label} className="glass-effect rounded-2xl p-3 text-center shadow-premium card-hover animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className={`text-2xl font-bold ${stat.cls}`}>{stat.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">{t('events.guests.title', 'Guest list')}</h3>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                    <i className="fa-solid fa-plus"></i>
                    {t('events.guests.add_guest', 'Add guest')}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleAdd} className="glass-effect rounded-3xl p-5 shadow-premium space-y-3 animate-fade-in-up">
                    <h4 className="font-bold text-gray-800 mb-2">{t('events.guests.form.title', 'New guest')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('events.guests.form.name', 'Name')} *</label>
                            <input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder={t('events.guests.form.name_placeholder', 'Guest name')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('events.guests.form.email', 'Email')}</label>
                            <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('events.guests.form.phone', 'Phone')}</label>
                            <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+974 XXXX XXXX" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t('events.guests.form.status', 'Status')}</label>
                            <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as EventGuest['status'] }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                                {Object.entries(statusConfig).map(([value, config]) => (
                                    <option key={value} value={value}>
                                        {config.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('events.guests.form.notes', 'Notes')}</label>
                        <input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder={t('events.guests.form.notes_placeholder', 'Optional notes')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                        <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-bold">{t('common.cancel', 'Cancel')}</button>
                        <button type="submit" disabled={submitting} className="px-6 py-2.5 text-sm gradient-purple text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                            {submitting ? t('events.guests.form.submitting', 'Adding...') : t('common.add', 'Add')}
                        </button>
                    </div>
                </form>
            )}

            {guests.length === 0 ? (
                <div className="glass-effect rounded-3xl p-10 text-center shadow-premium animate-fade-in-up delay-300">
                    <i className="fa-solid fa-users text-4xl text-gray-300 mb-3"></i>
                    <p className="text-gray-500">{t('events.guests.empty', 'No guests have been added yet')}</p>
                </div>
            ) : (
                <div className="glass-effect rounded-3xl shadow-premium overflow-hidden animate-fade-in-up delay-300">
                    <ul className="divide-y divide-gray-100/50">
                        {guests.map((guest, idx) => (
                            <li key={guest.id} className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/40 transition-colors" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-primary font-bold text-sm">{guest.name.charAt(0)}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-gray-900 truncate">{guest.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{guest.email || guest.phone || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <select value={guest.status} onChange={(e) => handleStatusChange(guest.event_id, guest.id, e.target.value as EventGuest['status'])} className={`text-xs px-2 py-1 rounded-lg border-0 font-bold cursor-pointer ${statusConfig[guest.status]?.cls}`}>
                                        {Object.entries(statusConfig).map(([value, config]) => (
                                            <option key={value} value={value}>
                                                {config.label}
                                            </option>
                                        ))}
                                    </select>
                                    <button onClick={() => handleRemove(guest.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <i className="fa-solid fa-trash text-xs"></i>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <ConfirmDialogComponent />
        </div>
    );
};

export default GuestList;
