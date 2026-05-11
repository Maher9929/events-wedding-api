import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';

interface CreatedEventResponse {
  id?: string;
  data?: {
    id?: string;
  };
}

const CreateEventPage = () => {
  const { t, i18n } = useTranslation();
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

  const isArabic = i18n.language === 'ar';
  const today = new Date().toISOString().split('T')[0];

  const eventTypes = useMemo(
    () => [
      {
        value: 'wedding',
        label: t('events.type.wedding', 'حفل زفاف'),
        icon: 'fa-ring',
      },
      {
        value: 'birthday',
        label: t('events.type.birthday', 'عيد ميلاد'),
        icon: 'fa-cake-candles',
      },
      {
        value: 'party',
        label: t('events.type.party', 'حفلة / خطوبة'),
        icon: 'fa-champagne-glasses',
      },
      {
        value: 'corporate',
        label: t('events.type.corporate', 'فعالية شركات'),
        icon: 'fa-briefcase',
      },
      {
        value: 'conference',
        label: t('events.type.conference', 'مؤتمر'),
        icon: 'fa-microphone',
      },
      {
        value: 'other',
        label: t('events.type.other', 'أخرى'),
        icon: 'fa-star',
      },
    ],
    [t],
  );

  const budgetPresets = [5000, 10000, 25000, 50000, 100000];
  const selectedEventType =
    eventTypes.find((type) => type.value === formData.event_type) ??
    eventTypes[0];

  const completedFields = [
    formData.title,
    formData.event_type,
    formData.event_date,
    formData.guest_count,
    formData.budget,
    formData.venue_city,
  ].filter(Boolean).length;

  const completion = Math.round((completedFields / 6) * 100);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      void navigate('/auth/login');
      return;
    }
    if (!formData.title.trim()) {
      setError(t('events.errors.title_required', 'عنوان الفعالية مطلوب'));
      return;
    }
    if (formData.event_date && formData.event_date < today) {
      setError(
        t('events.errors.past_date', 'يجب أن يكون تاريخ الفعالية في المستقبل'),
      );
      return;
    }
    if (formData.guest_count && parseInt(formData.guest_count) < 1) {
      setError(
        t('events.errors.invalid_guests', 'عدد الضيوف يجب أن يكون أكبر من صفر'),
      );
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        guest_count: formData.guest_count
          ? parseInt(formData.guest_count)
          : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
      };
      const result = await apiService.post<CreatedEventResponse>(
        '/events',
        payload,
      );
      const eventId = result?.id || result?.data?.id;
      toastService.success(
        t('events.create.success', 'تم إنشاء الفعالية بنجاح!'),
      );
      if (eventId) {
        void navigate(`/client/events/${eventId}`);
      } else {
        void navigate('/client/dashboard');
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : t('events.create.error', 'فشل في إنشاء الفعالية');
      setError(errorMsg);
      toastService.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10';
  const labelClass = 'mb-2 block text-sm font-bold text-gray-800';

  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,#f7f7fb_0%,#ffffff_45%,#f8f9fb_100%)] px-4 py-6 sm:px-6 lg:px-0"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => void navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-primary/30 hover:text-primary"
              aria-label={t('common.back', 'العودة')}
            >
              <i
                className={`fa-solid ${isArabic ? 'fa-arrow-right' : 'fa-arrow-left'}`}
              ></i>
            </button>
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
                <Link to="/client/dashboard" className="hover:text-primary">
                  {t('common.dashboard', 'Dashboard')}
                </Link>
                <i
                  className={`fa-solid ${isArabic ? 'fa-chevron-left' : 'fa-chevron-right'} text-[10px]`}
                ></i>
                <span>{t('events.create_new', 'إنشاء فعالية جديدة')}</span>
              </div>
              <h1 className="text-2xl font-black text-gray-950 sm:text-3xl">
                {t('events.create.title', 'إنشاء فعالية جديدة')}
              </h1>
            </div>
          </div>

          <Link
            to="/services"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-sm transition hover:border-primary/30 hover:text-primary"
          >
            <i className="fa-solid fa-store"></i>
            {t('common.services', 'Services')}
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-[0_24px_80px_rgba(18,24,40,0.08)]"
          >
            <div className="border-b border-gray-100 bg-white px-5 py-5 sm:px-8">
              <p className="text-sm font-bold text-primary">
                {t('events.create.step_label', 'Event details')}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {t(
                  'events.create.subtitle',
                  'Start with the key details. You can complete budget, guests and timeline later.',
                )}
              </p>
            </div>

            <div className="space-y-8 px-5 py-6 sm:px-8">
              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                  <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                  <span>{error}</span>
                </div>
              )}

              <section className="space-y-4">
                <div>
                  <label className={labelClass}>
                    {t('events.create.event_title_label', 'عنوان الفعالية *')}
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t(
                      'events.create.event_title_placeholder',
                      'مثال: حفل زفاف أحمد وسارة',
                    )}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t('events.create.event_type', 'نوع الفعالية *')}
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {eventTypes.map((typeOption) => (
                      <button
                        key={typeOption.value}
                        type="button"
                        onClick={() =>
                          setFormData((current) => ({
                            ...current,
                            event_type: typeOption.value,
                          }))
                        }
                        className={`group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center text-xs font-black transition ${
                          formData.event_type === typeOption.value
                            ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                            : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-primary/20 hover:bg-white hover:text-primary'
                        }`}
                      >
                        <i
                          className={`fa-solid ${typeOption.icon} text-lg ${
                            formData.event_type === typeOption.value
                              ? 'text-white'
                              : 'text-gray-500 group-hover:text-primary'
                          }`}
                        ></i>
                        <span className="leading-tight">
                          {typeOption.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    {t('events.create.event_date', 'تاريخ الفعالية *')}
                  </label>
                  <input
                    type="date"
                    name="event_date"
                    value={formData.event_date}
                    onChange={handleChange}
                    min={today}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t('events.create.guest_count', 'عدد الضيوف')}
                  </label>
                  <input
                    type="number"
                    name="guest_count"
                    value={formData.guest_count}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="100"
                    min="1"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t('events.create.start_time', 'وقت البداية')}
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t('events.create.end_time', 'وقت النهاية')}
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <label className={labelClass}>
                    {t('events.create.budget', 'الميزانية')} (
                    {t('common.currency', 'ر.ق')})
                  </label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="50000"
                    min="0"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {budgetPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setFormData((current) => ({
                            ...current,
                            budget: String(preset),
                          }))
                        }
                        className={`rounded-full px-3.5 py-2 text-xs font-black transition ${
                          formData.budget === String(preset)
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {preset.toLocaleString()} {t('common.currency', 'ر.ق')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      {t('events.create.venue_name', 'اسم المكان')}
                    </label>
                    <input
                      type="text"
                      name="venue_name"
                      value={formData.venue_name}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder={t(
                        'events.create.venue_name_placeholder',
                        'قاعة اللؤلؤة',
                      )}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      {t('events.create.city', 'المدينة')}
                    </label>
                    <input
                      type="text"
                      name="venue_city"
                      value={formData.venue_city}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder={t(
                        'events.create.city_placeholder',
                        'الدوحة',
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t('events.create.venue_address', 'عنوان المكان')}
                  </label>
                  <input
                    type="text"
                    name="venue_address"
                    value={formData.venue_address}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t(
                      'events.create.venue_address_placeholder',
                      'شارع الكورنيش',
                    )}
                  />
                </div>
              </section>

              <section className="grid gap-4">
                <div>
                  <label className={labelClass}>
                    {t('events.create.description', 'الوصف')}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className={inputClass}
                    placeholder={t(
                      'events.create.description_placeholder',
                      'تفاصيل إضافية عن الفعالية...',
                    )}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {t('events.create.special_requests', 'طلبات خاصة')}
                  </label>
                  <textarea
                    name="special_requests"
                    value={formData.special_requests}
                    onChange={handleChange}
                    rows={3}
                    className={inputClass}
                    placeholder={t(
                      'events.create.special_requests_placeholder',
                      'أي متطلبات أو ملاحظات خاصة...',
                    )}
                  />
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => void navigate('/client/dashboard')}
                  className="h-12 rounded-2xl border border-gray-200 px-5 text-sm font-bold text-gray-600 transition hover:border-primary/30 hover:text-primary"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 rounded-2xl bg-primary px-8 text-sm font-black text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? t('common.sending', 'جاري الإنشاء...')
                    : t('events.create.submit', 'إنشاء الفعالية')}
                </button>
              </div>
            </div>
          </form>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-[0_24px_80px_rgba(18,24,40,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-primary">
                    {t('events.create.summary', 'Summary')}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-gray-950">
                    {formData.title ||
                      t('events.create.untitled', 'Nouvel evenement')}
                  </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <i className={`fa-solid ${selectedEventType.icon}`}></i>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>{t('events.create.completion', 'Completion')}</span>
                  <span>{completion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${completion}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                {[
                  {
                    icon: 'fa-calendar-day',
                    label: t('events.create.event_date', 'تاريخ الفعالية'),
                    value: formData.event_date || '-',
                  },
                  {
                    icon: 'fa-users',
                    label: t('events.create.guest_count', 'عدد الضيوف'),
                    value: formData.guest_count || '-',
                  },
                  {
                    icon: 'fa-wallet',
                    label: t('events.create.budget', 'الميزانية'),
                    value: formData.budget
                      ? `${Number(formData.budget).toLocaleString()} ${t('common.currency', 'ر.ق')}`
                      : '-',
                  },
                  {
                    icon: 'fa-location-dot',
                    label: t('events.create.city', 'المدينة'),
                    value: formData.venue_city || '-',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-500">
                      <i className={`fa-solid ${item.icon}`}></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-500">
                        {item.label}
                      </p>
                      <p className="truncate font-black text-gray-900">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-primary/5 p-4 text-sm text-gray-600">
                <p className="font-bold text-gray-900">
                  {t('events.create.next_step_title', 'Next step')}
                </p>
                <p className="mt-1 leading-relaxed">
                  {t(
                    'events.create.next_step_hint',
                    'After creating the event, you can add tasks, budget lines, guests and selected providers.',
                  )}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CreateEventPage;
