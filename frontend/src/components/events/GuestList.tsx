import { useState, useEffect } from 'react';
import { eventsService } from '../../services/events.service';
import type { EventGuest } from '../../types/events';
import { toastService } from '../../services/toast.service';

interface Props { eventId: string; }

const statusConfig: Record<string, { label: string; cls: string }> = {
    invited: { label: 'مدعو', cls: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'مؤكد', cls: 'bg-green-100 text-green-700' },
    declined: { label: 'اعتذر', cls: 'bg-red-100 text-red-700' },
    maybe: { label: 'ربما', cls: 'bg-yellow-100 text-yellow-700' },
};

const GuestList = ({ eventId }: Props) => {
    const [guests, setGuests] = useState<EventGuest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', status: 'invited' as EventGuest['status'], notes: '' });

    useEffect(() => {
        eventsService.getGuests(eventId)
            .then((data: any) => setGuests(data?.data || data || []))
            .catch(() => toastService.error('فشل تحميل قائمة الضيوف'))
            .finally(() => setLoading(false));
    }, [eventId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        try {
            setSubmitting(true);
            const guest: any = await eventsService.addGuest(eventId, form);
            setGuests(prev => [...prev, guest?.data || guest]);
            setForm({ name: '', email: '', phone: '', status: 'invited', notes: '' });
            setShowForm(false);
            toastService.success('تم إضافة الضيف');
        } catch {
            toastService.error('فشل إضافة الضيف');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (id: string, status: EventGuest['status']) => {
        try {
            await eventsService.updateGuest(id, { status });
            setGuests(prev => prev.map(g => g.id === id ? { ...g, status } : g));
        } catch {
            toastService.error('فشل تحديث الحالة');
        }
    };

    const handleRemove = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الضيف؟')) return;
        try {
            await eventsService.removeGuest(id);
            setGuests(prev => prev.filter(g => g.id !== id));
            toastService.success('تم حذف الضيف');
        } catch {
            toastService.error('فشل حذف الضيف');
        }
    };

    const stats = {
        total: guests.length,
        confirmed: guests.filter(g => g.status === 'confirmed').length,
        invited: guests.filter(g => g.status === 'invited').length,
        declined: guests.filter(g => g.status === 'declined').length,
    };

    if (loading) return <div className="p-8 text-center text-gray-400">جاري التحميل...</div>;

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'الإجمالي', value: stats.total, cls: 'text-gray-700' },
                    { label: 'مؤكد', value: stats.confirmed, cls: 'text-green-600' },
                    { label: 'مدعو', value: stats.invited, cls: 'text-blue-600' },
                    { label: 'اعتذر', value: stats.declined, cls: 'text-red-600' },
                ].map((s, i) => (
                    <div key={s.label} className="glass-effect rounded-2xl p-3 text-center shadow-premium card-hover animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Add Button */}
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">قائمة الضيوف</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                    <i className="fa-solid fa-plus"></i>
                    إضافة ضيف
                </button>
            </div>

            {/* Add Form */}
            {showForm && (
                <form onSubmit={handleAdd} className="glass-effect rounded-3xl p-5 shadow-premium space-y-3 animate-fade-in-up">
                    <h4 className="font-bold text-gray-800 mb-2">ضيف جديد</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">الاسم *</label>
                            <input
                                required
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="اسم الضيف"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">البريد الإلكتروني</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="email@example.com"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">رقم الهاتف</label>
                            <input
                                value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                placeholder="+974 XXXX XXXX"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">الحالة</label>
                            <select
                                value={form.status}
                                onChange={e => setForm(f => ({ ...f, status: e.target.value as EventGuest['status'] }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="invited">مدعو</option>
                                <option value="confirmed">مؤكد</option>
                                <option value="declined">اعتذر</option>
                                <option value="maybe">ربما</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظات</label>
                        <input
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="ملاحظات اختيارية..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                        <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-sm text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-bold">إلغاء</button>
                        <button type="submit" disabled={submitting} className="px-6 py-2.5 text-sm gradient-purple text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                            {submitting ? 'جاري الإضافة...' : 'إضافة'}
                        </button>
                    </div>
                </form>
            )}

            {/* Guest List */}
            {guests.length === 0 ? (
                <div className="glass-effect rounded-3xl p-10 text-center shadow-premium animate-fade-in-up delay-300">
                    <i className="fa-solid fa-users text-4xl text-gray-300 mb-3"></i>
                    <p className="text-gray-500">لم تتم إضافة أي ضيوف بعد</p>
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
                                        <p className="text-xs text-gray-400 truncate">{guest.email || guest.phone || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <select
                                        value={guest.status}
                                        onChange={e => handleStatusChange(guest.id, e.target.value as EventGuest['status'])}
                                        className={`text-xs px-2 py-1 rounded-lg border-0 font-bold cursor-pointer ${statusConfig[guest.status]?.cls}`}
                                    >
                                        <option value="invited">مدعو</option>
                                        <option value="confirmed">مؤكد</option>
                                        <option value="declined">اعتذر</option>
                                        <option value="maybe">ربما</option>
                                    </select>
                                    <button
                                        onClick={() => handleRemove(guest.id)}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <i className="fa-solid fa-trash text-xs"></i>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default GuestList;
