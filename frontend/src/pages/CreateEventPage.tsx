import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';

const CreateEventPage = () => {
    const { t } = useTranslation();
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
        { value: 'wedding',    label: t('events.type.wedding', 'حفل زفاف'),      icon: 'fa-ring' },
        { value: 'birthday',   label: t('events.type.birthday', 'عيد ميلاد'),     icon: 'fa-cake-candles' },
        { value: 'party',      label: t('events.type.party', 'حفلة / خطوبة'),   icon: 'fa-champagne-glasses' },
        { value: 'corporate',  label: t('events.type.corporate', 'فعالية شركات'),  icon: 'fa-briefcase' },
        { value: 'conference', label: t('events.type.conference', 'مؤتمر'),          icon: 'fa-microphone' },
        { value: 'other',      label: t('events.type.other', 'أخرى'),           icon: 'fa-star' },
    ];

    const BUDGET_PRESETS = [5000, 10000, 25000, 50000, 100000];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            navigate('/auth/login');
            return;
        }
        if (!formData.title.trim()) {
            setError(t('events.errors.title_required', 'عنوان الفعالية مطلوب'));
            return;
        }
        if (formData.event_date < today) {
            setError(t('events.errors.past_date', 'يجب أن يكون تاريخ الفعالية في المستقبل'));
            return;
        }
        if (formData.guest_count && parseInt(formData.guest_count) < 1) {
            setError(t('events.errors.invalid_guests', 'عدد الضيوف يجب أن يكون أكبر من صفر'));
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
            const result = await apiService.post<any>('/events', payload);
            const eventId = result?.id || result?.data?.id;
            toastService.success(t('events.create.success', 'تم إنشاء الفعالية بنجاح!'));
            if (eventId) {
                navigate(`/client/events/${eventId}`);
            } else {
                navigate('/client/dashboard');
            }
        } catch (err: any) {
            const errorMsg = err?.message || t('events.create.error', 'فشل في إنشاء الفعالية');
            setError(errorMsg);
            toastService.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bglight p-5" dir="rtl">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-500 hover:text-primary mb-4 flex items-center gap-2 transition-colors"
                >
                    <i className="fa-solid fa-arrow-right"></i>
                    {t('common.back', 'العودة')}
                </button>

                <div className="bg-white rounded-3xl p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('events.create.title', 'إنشاء فعالية جديدة')}</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.event_title_label', 'عنوان الفعالية *')}</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t('events.create.event_title_placeholder', 'مثال: حفل زفاف أحمد وسارة')}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.event_type', 'نوع الفعالية *')}</label>
                            <div className="grid grid-cols-4 gap-2">
                                {EVENT_TYPES.map(tOption => (
                                    <button
                                        key={tOption.value}
                                        type="button"
                                        onClick={() => setFormData(f => ({ ...f, event_type: tOption.value }))}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-bold transition-all ${
                                            formData.event_type === tOption.value
                                                ? 'gradient-purple text-white shadow-md'
                                                : 'bg-bglight text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <i className={`fa-solid ${tOption.icon} text-base`}></i>
                                        <span className="text-[10px] leading-tight text-center">{tOption.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.event_date', 'تاريخ الفعالية *')}</label>
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
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.guest_count', 'عدد الضيوف')}</label>
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
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.start_time', 'وقت البداية')}</label>
                                <input
                                    type="time"
                                    name="start_time"
                                    value={formData.start_time}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.end_time', 'وقت النهاية')}</label>
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
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.budget', 'الميزانية')} ({t('common.currency', 'ر.ق')})</label>
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
                                        {p.toLocaleString()} {t('common.currency', 'ر.ق')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.venue_name', 'اسم المكان')}</label>
                            <input
                                type="text"
                                name="venue_name"
                                value={formData.venue_name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t('events.create.venue_name_placeholder', 'قاعة اللؤلؤة')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.venue_address', 'عنوان المكان')}</label>
                            <input
                                type="text"
                                name="venue_address"
                                value={formData.venue_address}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t('events.create.venue_address_placeholder', 'شارع الكورنيش')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.city', 'المدينة')}</label>
                            <input
                                type="text"
                                name="venue_city"
                                value={formData.venue_city}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t('events.create.city_placeholder', 'الدوحة')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.description', 'الوصف')}</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t('events.create.description_placeholder', 'تفاصيل إضافية عن الفعالية...')}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('events.create.special_requests', 'طلبات خاصة')}</label>
                            <textarea
                                name="special_requests"
                                value={formData.special_requests}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t('events.create.special_requests_placeholder', 'أي متطلبات أو ملاحظات خاصة...')}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl gradient-purple text-white font-bold shadow-lg card-hover disabled:opacity-50"
                        >
                            {loading ? t('common.sending', 'جاري الإنشاء...') : t('events.create.submit', 'إنشاء الفعالية')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateEventPage;
