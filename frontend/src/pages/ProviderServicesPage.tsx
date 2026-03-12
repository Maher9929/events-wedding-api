import { useState, useEffect } from 'react';
import { servicesService } from '../services/services.service';
import { categoriesService } from '../services/categories.service';
import { toastService } from '../services/toast.service';
import type { ServiceItem, Category } from '../services/api';
import { getThumbnailUrl } from '../utils/image.utils';

const ProviderServicesPage = () => {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState<ServiceItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        base_price: 0,
        category_id: '',
        is_active: true,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [servicesData, catsData] = await Promise.all([
                servicesService.getMyServices(),
                categoriesService.getAll(),
            ]);
            const servicesList = Array.isArray(servicesData) ? servicesData : (servicesData as any)?.data || [];
            setServices(servicesList);
            const catsList = Array.isArray(catsData) ? catsData : (catsData as any)?.data || [];
            setCategories(catsList);
        } catch {
            toastService.error('فشل تحميل الخدمات');
        } finally {
            setLoading(false);
        }
    };

    const openNewForm = () => {
        setEditingService(null);
        setFormData({ title: '', description: '', base_price: 0, category_id: '', is_active: true });
        setShowForm(true);
    };

    const openEditForm = (service: ServiceItem) => {
        setEditingService(service);
        setFormData({
            title: service.title,
            description: service.description || '',
            base_price: service.base_price,
            category_id: service.category_id || '',
            is_active: service.is_active !== false,
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formData.title.trim() || formData.base_price <= 0) {
            toastService.error('الرجاء ملء جميع الحقول المطلوبة');
            return;
        }
        setSaving(true);
        try {
            if (editingService) {
                const updated = await servicesService.update(editingService.id, formData);
                const updatedData = (updated as any)?.data || updated;
                setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, ...updatedData, ...formData } : s));
                toastService.success('تم تحديث الخدمة بنجاح');
            } else {
                const created = await servicesService.create(formData);
                const createdData = (created as any)?.data || created;
                if (createdData?.id) setServices(prev => [createdData, ...prev]);
                toastService.success('تم إنشاء الخدمة بنجاح');
            }
            setShowForm(false);
        } catch {
            toastService.error(editingService ? 'فشل تحديث الخدمة' : 'فشل إنشاء الخدمة');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
        try {
            await servicesService.remove(id);
            setServices(prev => prev.filter(s => s.id !== id));
            toastService.success('تم حذف الخدمة');
        } catch {
            toastService.error('فشل حذف الخدمة');
        }
    };

    const toggleActive = async (service: ServiceItem) => {
        try {
            await servicesService.update(service.id, { is_active: !service.is_active });
            setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s));
            toastService.success(service.is_active ? 'تم إيقاف الخدمة' : 'تم تفعيل الخدمة');
        } catch {
            toastService.error('فشل تحديث حالة الخدمة');
        }
    };

    const activeCount = services.filter(s => s.is_active !== false).length;
    const totalRevenue = services.reduce((sum, s) => sum + (s.base_price || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">خدماتي</h1>
                    <p className="text-gray-500">إدارة الخدمات التي تقدمها للعملاء</p>
                </div>
                <button
                    onClick={openNewForm}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-md"
                >
                    <i className="fa-solid fa-plus"></i>
                    إضافة خدمة جديدة
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <i className="fa-solid fa-box text-blue-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{services.length}</p>
                            <p className="text-xs text-gray-500">إجمالي الخدمات</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <i className="fa-solid fa-check-circle text-green-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                            <p className="text-xs text-gray-500">خدمات نشطة</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <i className="fa-solid fa-coins text-purple-600"></i>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{totalRevenue.toLocaleString()} ر.ق</p>
                            <p className="text-xs text-gray-500">إجمالي الأسعار</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Services Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
                            <div className="h-40 bg-gray-100 rounded-xl mb-3"></div>
                            <div className="h-5 bg-gray-100 rounded w-2/3 mb-2"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : services.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-box-open text-gray-400 text-3xl"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">لم تضف أي خدمات بعد</h3>
                    <p className="text-sm text-gray-500 mb-6">ابدأ بإضافة خدمتك الأولى لجذب العملاء</p>
                    <button onClick={openNewForm} className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-md hover:bg-primary/90 transition-colors">
                        <i className="fa-solid fa-plus me-2"></i>
                        إضافة خدمة
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map(service => (
                        <div key={service.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${service.is_active === false ? 'opacity-60 border-gray-200' : 'border-gray-100'}`}>
                            {/* Image */}
                            <div className="h-40 bg-gray-100 relative overflow-hidden">
                                {service.images?.[0] ? (
                                    <img src={getThumbnailUrl(service.images[0])} alt={service.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <i className="fa-solid fa-image text-gray-300 text-4xl"></i>
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${service.is_active !== false ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                        {service.is_active !== false ? 'نشط' : 'متوقف'}
                                    </span>
                                </div>
                                {service.is_featured && (
                                    <div className="absolute top-3 left-3">
                                        <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-accent text-gray-900">
                                            <i className="fa-solid fa-star me-1"></i>مميز
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-bold text-gray-900 mb-1 truncate">{service.title}</h3>
                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{service.description}</p>

                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-lg font-bold text-primary">{service.base_price.toLocaleString()} ر.ق</span>
                                    <div className="flex items-center gap-1">
                                        <i className="fa-solid fa-star text-accent text-xs"></i>
                                        <span className="text-sm font-bold">{service.rating || '0'}</span>
                                        <span className="text-xs text-gray-400">({service.review_count || 0})</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditForm(service)}
                                        className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
                                    >
                                        <i className="fa-solid fa-pen me-1"></i>تعديل
                                    </button>
                                    <button
                                        onClick={() => toggleActive(service)}
                                        className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${service.is_active !== false
                                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                            }`}
                                        title={service.is_active !== false ? 'إيقاف' : 'تفعيل'}
                                    >
                                        <i className={`fa-solid ${service.is_active !== false ? 'fa-pause' : 'fa-play'}`}></i>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(service.id)}
                                        className="px-3 py-2 rounded-xl bg-red-100 text-red-600 text-sm font-bold hover:bg-red-200 transition-colors"
                                        title="حذف"
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-lg text-gray-900">
                                {editingService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <i className="fa-solid fa-times text-sm"></i>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-1.5">اسم الخدمة *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="مثال: تصوير حفلات زواج"
                                    className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-1.5">الوصف</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="وصف تفصيلي للخدمة..."
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-1.5">السعر الأساسي (ر.ق) *</label>
                                    <input
                                        type="number"
                                        value={formData.base_price || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, base_price: Number(e.target.value) }))}
                                        placeholder="0"
                                        min="0"
                                        className="w-full h-11 border border-gray-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-1.5">الفئة</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={e => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                                        className="w-full h-11 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                    >
                                        <option value="">اختر الفئة</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="w-4 h-4 rounded accent-primary"
                                />
                                <label htmlFor="is_active" className="text-sm text-gray-700 font-bold cursor-pointer">نشر الخدمة فوراً</label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 h-11 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <><i className="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...</>
                                ) : (
                                    <><i className="fa-solid fa-check"></i> {editingService ? 'تحديث' : 'إنشاء'}</>
                                )}
                            </button>
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 h-11 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProviderServicesPage;
