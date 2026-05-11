import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { categoriesService } from '../services/categories.service';
import { toastService } from '../services/toast.service';
import type { Category, Event, Provider } from '../services/api';

const QuoteRequestPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [providerSearch, setProviderSearch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([
    {
      category_id: '',
      description: '',
      estimated_budget: '',
      quantity: '1',
      unit: '',
      notes: '',
    },
  ]);
  const [maxBudget, setMaxBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiService
      .get<Event[] | { data?: Event[] }>('/events/my-events')
      .then((data) => setEvents(Array.isArray(data) ? data : data?.data || []))
      .catch(() => {
        /* events list is non-critical */
      });

    categoriesService
      .getAll()
      .then((data: Category[] | { data?: Category[] }) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setCategories(list);
      })
      .catch(() => {
        /* categories list is non-critical */
      });

    apiService
      .get<Provider[] | { data?: Provider[] }>('/providers?limit=100')
      .then((data) =>
        setProviders(Array.isArray(data) ? data : data?.data || []),
      )
      .catch(() => {
        /* providers list is non-critical */
      });
  }, []);

  const selectedCategoryIds = [
    ...new Set(items.map((item) => item.category_id).filter(Boolean)),
  ];
  const visibleProviders = providers.filter((provider) => {
    if (!provider.user_id) return false;

    const providerCategories = provider.categories || [];
    const matchesCategory =
      selectedCategoryIds.length === 0 ||
      selectedCategoryIds.some(
        (categoryId) =>
          provider.category_id === categoryId ||
          providerCategories.includes(categoryId),
      );

    const query = providerSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      provider.company_name?.toLowerCase().includes(query) ||
      provider.business_name?.toLowerCase().includes(query) ||
      provider.city?.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  const toggleProvider = (providerUserId: string) => {
    setSelectedProviders((prev) =>
      prev.includes(providerUserId)
        ? prev.filter((id) => id !== providerUserId)
        : [...prev, providerUserId],
    );
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        category_id: '',
        description: '',
        estimated_budget: '',
        quantity: '1',
        unit: '',
        notes: '',
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !title || !description) {
      toastService.error(
        t('quote_request.fill_required', 'يرجى تعبئة جميع الحقول الإلزامية'),
      );
      return;
    }

    if (selectedProviders.length === 0) {
      toastService.error(
        t(
          'quote_request.select_provider_required',
          'Veuillez sélectionner au moins un prestataire',
        ),
      );
      return;
    }

    setLoading(true);
    try {
      const selectedEventData = events.find((ev) => ev.id === selectedEvent);
      const payload = {
        event_id: selectedEvent,
        title,
        description,
        items: items.map((item) => ({
          ...item,
          estimated_budget: item.estimated_budget
            ? parseFloat(item.estimated_budget)
            : undefined,
          quantity: parseInt(item.quantity) || 1,
        })),
        provider_ids: selectedProviders,
        max_budget: maxBudget ? parseFloat(maxBudget) : undefined,
        deadline: deadline || undefined,
        event_type: selectedEventData?.event_type,
        event_date: selectedEventData?.event_date,
        location: selectedEventData?.location,
        guest_count: selectedEventData?.guest_count,
        notes,
      };

      await apiService.post('/quotes/request', payload);
      toastService.success(
        t('quote_request.success', 'تم إرسال طلب عرض السعر بنجاح'),
      );
      navigate('/client/quotes');
    } catch (_error) {
      toastService.error(t('quote_request.error', 'حدث خطأ في إرسال الطلب'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-bglight p-5"
      dir={i18n.language === 'en' ? 'ltr' : 'rtl'}
    >
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary font-bold mb-5"
        >
          <i
            className={`fa-solid ${i18n.language === 'en' ? 'fa-arrow-left' : 'fa-arrow-right'}`}
          ></i>
          {t('common.back', 'رجوع')}
        </button>

        <div className="bg-white rounded-3xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {t('quote_request.title', 'طلب عروض أسعار متعددة')}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('quote_request.event', 'الفعالية')} *
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">
                  {t('quote_request.select_event', 'اختر فعالية')}
                </option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} -{' '}
                    {new Date(ev.event_date).toLocaleDateString(
                      t('common.date_locale', 'ar-EG'),
                    )}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('quote_request.request_title', 'عنوان الطلب')} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t(
                  'quote_request.title_placeholder',
                  'مثال: طلب عرض سعر زفاف فاخر',
                )}
                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('quote_request.description', 'وصف تفصيلي')} *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  'quote_request.description_placeholder',
                  'صف احتياجاتك وتفضيلاتك...',
                )}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                required
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-gray-700">
                  {t('quote_request.required_services', 'الخدمات المطلوبة')}
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  <i className="fa-solid fa-plus me-2"></i>
                  {t('quote_request.add_service', 'إضافة خدمة')}
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          {t('quote_request.category', 'الفئة')} *
                        </label>
                        <select
                          value={item.category_id}
                          onChange={(e) =>
                            updateItem(index, 'category_id', e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                          required
                        >
                          <option value="">{t('common.select', 'اختر')}</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          {t('quote_request.item_description', 'الوصف')} *
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, 'description', e.target.value)
                          }
                          placeholder={t(
                            'quote_request.item_desc_placeholder',
                            'مثال: خدمة تصوير كاملة',
                          )}
                          className="w-full px-3 py-2 rounded-lg bg-white border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          {t(
                            'quote_request.estimated_budget',
                            'الميزانية التقديرية',
                          )}{' '}
                          ({t('common.currency', 'ر.ق')})
                        </label>
                        <input
                          type="number"
                          value={item.estimated_budget}
                          onChange={(e) =>
                            updateItem(
                              index,
                              'estimated_budget',
                              e.target.value,
                            )
                          }
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-lg bg-white border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          {t('quote_request.quantity', 'الكمية')}
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, 'quantity', e.target.value)
                          }
                          min="1"
                          className="w-full px-3 py-2 rounded-lg bg-white border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        {t('quote_request.item_notes', 'ملاحظات')}
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) =>
                          updateItem(index, 'notes', e.target.value)
                        }
                        placeholder={t(
                          'quote_request.notes_placeholder',
                          'تفاصيل إضافية...',
                        )}
                        className="w-full px-3 py-2 rounded-lg bg-white border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="mt-3 text-red-500 text-sm font-bold hover:text-red-700"
                      >
                        <i className="fa-solid fa-trash me-1"></i>
                        {t('common.delete', 'حذف')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Selection */}
            <div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    {t('quote_request.providers', 'Prestataires à contacter')} *
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    {t(
                      'quote_request.providers_hint',
                      'Sélectionnez les prestataires qui recevront cette demande.',
                    )}
                  </p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-3 py-1 w-fit">
                  {selectedProviders.length}{' '}
                  {t('quote_request.selected', 'sélectionné(s)')}
                </span>
              </div>

              <div className="relative mb-3">
                <input
                  type="text"
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  placeholder={t(
                    'quote_request.search_provider',
                    'Rechercher par nom ou ville...',
                  )}
                  className="w-full px-4 py-3 pe-10 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <i className="fa-solid fa-search absolute right-3 top-3.5 text-gray-400 text-sm"></i>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {visibleProviders.length === 0 ? (
                  <div className="md:col-span-2 rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
                    <i className="fa-solid fa-store-slash block text-2xl text-gray-300 mb-2"></i>
                    {t(
                      'quote_request.no_providers',
                      'Aucun prestataire disponible pour ces critères',
                    )}
                  </div>
                ) : (
                  visibleProviders.map((provider) => {
                    const providerUserId = provider.user_id;
                    const selected = selectedProviders.includes(providerUserId);
                    const name =
                      provider.company_name ||
                      provider.business_name ||
                      t('common.provider', 'Prestataire');

                    return (
                      <button
                        type="button"
                        key={provider.id}
                        onClick={() => toggleProvider(providerUserId)}
                        className={`text-start rounded-xl border p-4 transition-all ${
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-gray-100 bg-white hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}
                          >
                            <i
                              className={`fa-solid ${selected ? 'fa-check' : 'fa-store'}`}
                            ></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 truncate">
                                {name}
                              </p>
                              {provider.is_verified && (
                                <i
                                  className="fa-solid fa-circle-check text-green-500 text-xs"
                                  title={t('common.verified', 'Vérifié')}
                                ></i>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {[provider.city, provider.region]
                                .filter(Boolean)
                                .join(' · ') ||
                                t(
                                  'common.location_unknown',
                                  'Localisation non précisée',
                                )}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span>
                                <i className="fa-solid fa-star text-yellow-400 me-1"></i>
                                {(provider.rating || 0).toFixed(1)}
                              </span>
                              {(provider.min_price || provider.max_price) && (
                                <span>
                                  <i className="fa-solid fa-tag text-primary me-1"></i>
                                  {provider.min_price || 0}-
                                  {provider.max_price || 0}{' '}
                                  {t('common.currency', 'ر.ق')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Budget and Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('quote_request.max_budget', 'أقصى ميزانية')} (
                  {t('common.currency', 'ر.ق')})
                </label>
                <input
                  type="number"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  placeholder={t(
                    'quote_request.max_budget_placeholder',
                    'أقصى ميزانية',
                  )}
                  className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('quote_request.deadline', 'آخر موعد للرد')}
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t('quote_request.additional_notes', 'ملاحظات إضافية')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(
                  'quote_request.additional_notes_placeholder',
                  'معلومات تكميلية...',
                )}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel', 'إلغاء')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>{' '}
                    {t('common.sending', 'جاري الإرسال...')}
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>{' '}
                    {t('quote_request.submit', 'إرسال الطلب')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuoteRequestPage;
