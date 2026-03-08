import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';

const CreateEventPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        event_type: 'wedding',
        event_date: '',
        start_time: '',
        end_time: '',
        guest_count: '',
        budget: '',
        venue_name: '',
        venue_address: '',
        venue_city: '',
        special_requests: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const today = new Date().toISOString().split('T')[0];

    const EVENT_TYPES = [
        { value: 'wedding',    label: 'حفل زفاف',      icon: 'fa-ring' },
        { value: 'birthday',   label: 'عيد ميلاد',     icon: 'fa-cake-candles' },
        { value: 'party',      label: 'حفلة / خطوبة',   icon: 'fa-champagne-glasses' },
        { value: 'corporate',  label: 'فعالية شركات',  icon: 'fa-briefcase' },
        { value: 'conference', label: 'مؤتمر',          icon: 'fa-microphone' },
        { value: 'other',      label: 'أخرى',           icon: 'fa-star' },
    ];

    const BUDGET_PRESETS = [5000, 10000, 25000, 50000, 100000];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            navigate('/auth/login');
            return;
        }
        if (!formData.title.trim()) {
            setError('عنوان الفعالية مطلوب');
            return;
        }
        if (formData.event_date < today) {
            setError('يجب أن يكون تاريخ الفعالية في المستقبل');
            return;
        }
        if (formData.guest_count && parseInt(formData.guest_count) < 1) {
            setError('عدد الضيوف يجب أن يكون أكبر من صفر');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const payload = {
                ...formData,
                guest_count: formData.guest_count ? parseInt(formData.guest_count) : undefined,
                budget: formData.budget ? parseFloat(formData.budget) : undefined,
            };
            const result: any = await apiService.post('/events', payload);
            const eventId = result?.id || result?.data?.id;
            toastService.success('تم إنشاء الفعالية بنجاح!');
            if (eventId) {
                navigate(`/client/events/${eventId}`);
            } else {
                navigate('/client/dashboard');
            }
        } catch (err: any) {
            const errorMsg = err?.message || 'فشل في إنشاء الفعالية';
            setError(errorMsg);
            toastService.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bglight p-5">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-500 hover:text-primary mb-4 flex items-center gap-2 transition-colors"
                >
                    <i className="fa-solid fa-arrow-right"></i>
                    العودة
                </button>

                <div className="bg-white rounded-3xl p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">إنشاء فعالية جديدة</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">عنوان الفعالية *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="مثال: حفل زفاف أحمد وسارة"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">نوع الفعالية *</label>
                            <div className="grid grid-cols-4 gap-2">
                                {EVENT_TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setFormData(f => ({ ...f, event_type: t.value }))}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-bold transition-all ${
                                            formData.event_type === t.value
                                                ? 'gradient-purple text-white shadow-md'
                                                : 'bg-bglight text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <i className={`fa-solid ${t.icon} text-base`}></i>
                                        <span className="text-[10px] leading-tight text-center">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الفعالية *</label>
                                <input
                                    type="date"
                                    name="event_date"
                                    value={formData.event_date}
                                    onChange={handleChange}
                                    min={today}
                                    className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">عدد الضيوف</label>
                                <input
                                    type="number"
                                    name="guest_count"
                                    value={formData.guest_count}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">وقت البداية</label>
                                <input
                                    type="time"
                                    name="start_time"
                                    value={formData.start_time}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">وقت النهاية</label>
                                <input
                                    type="time"
                                    name="end_time"
                                    value={formData.end_time}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الميزانية (ر.ق)</label>
                            <input
                                type="number"
                                name="budget"
                                value={formData.budget}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 mb-2"
                                placeholder="50000"
                            />
                            <div className="flex gap-2 flex-wrap">
                                {BUDGET_PRESETS.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setFormData(f => ({ ...f, budget: String(p) }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            formData.budget === String(p)
                                                ? 'bg-primary text-white'
                                                : 'bg-bglight text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {p.toLocaleString()} ر.ق
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">اسم المكان</label>
                            <input
                                type="text"
                                name="venue_name"
                                value={formData.venue_name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="قاعة اللؤلؤة"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">عنوان المكان</label>
                            <input
                                type="text"
                                name="venue_address"
                                value={formData.venue_address}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="شارع الكورنيش"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">المدينة</label>
                            <input
                                type="text"
                                name="venue_city"
                                value={formData.venue_city}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="الدوحة"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الوصف</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="تفاصيل إضافية عن الفعالية..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">طلبات خاصة</label>
                            <textarea
                                name="special_requests"
                                value={formData.special_requests}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="أي متطلبات أو ملاحظات خاصة..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl gradient-purple text-white font-bold shadow-lg card-hover disabled:opacity-50"
                        >
                            {loading ? 'جاري الإنشاء...' : 'إنشاء الفعالية'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateEventPage;
