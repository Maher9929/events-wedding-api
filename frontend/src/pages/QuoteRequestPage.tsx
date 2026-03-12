import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { categoriesService } from '../services/categories.service';
import { toastService } from '../services/toast.service';
import type { Category, Event } from '../services/api';

const QuoteRequestPage = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [selectedProviders] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState([{
        category_id: '',
        description: '',
        estimated_budget: '',
        quantity: '1',
        unit: '',
        notes: ''
    }]);
    const [maxBudget, setMaxBudget] = useState('');
    const [deadline, setDeadline] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        apiService.get<Event[]>('/events/my-events')
            .then(data => setEvents(Array.isArray(data) ? data : []))
            .catch(() => { });

        categoriesService.getAll()
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(() => { });
    }, []);

    const addItem = () => {
        setItems([...items, {
            category_id: '',
            description: '',
            estimated_budget: '',
            quantity: '1',
            unit: '',
            notes: ''
        }]);
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
            toastService.error('يرجى تعبئة جميع الحقول الإلزامية');
            return;
        }

        setLoading(true);
        try {
            const selectedEventData = events.find(e => e.id === selectedEvent);
            const payload = {
                event_id: selectedEvent,
                title,
                description,
                items: items.map(item => ({
                    ...item,
                    estimated_budget: item.estimated_budget ? parseFloat(item.estimated_budget) : undefined,
                    quantity: parseInt(item.quantity) || 1
                })),
                provider_ids: selectedProviders,
                max_budget: maxBudget ? parseFloat(maxBudget) : undefined,
                deadline: deadline || undefined,
                event_type: selectedEventData?.event_type,
                event_date: selectedEventData?.event_date,
                location: selectedEventData?.location,
                guest_count: selectedEventData?.guest_count,
                notes
            };

            await apiService.post('/quotes/request', payload);
            toastService.success('تم إرسال طلب عرض السعر بنجاح');
            navigate('/client/quotes');
        } catch {
            toastService.error('حدث خطأ في إرسال الطلب');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bglight p-5" dir="rtl">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-bold mb-5">
                    <i className="fa-solid fa-arrow-right"></i>
                    رجوع
                </button>

                <div className="bg-white rounded-3xl shadow-sm p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">طلب عروض أسعار متعددة</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Event Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الفعالية *</label>
                            <select
                                value={selectedEvent}
                                onChange={e => setSelectedEvent(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            >
                                <option value="">اختر فعالية</option>
                                {events.map(event => (
                                    <option key={event.id} value={event.id}>
                                        {event.title} - {new Date(event.event_date).toLocaleDateString('ar-EG')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">عنوان الطلب *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="مثال: طلب عرض سعر زفاف فاخر"
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">وصف تفصيلي *</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="صف احتياجاتك وتفضيلاتك..."
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                required
                            />
                        </div>

                        {/* Items */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-sm font-bold text-gray-700">الخدمات المطلوبة</label>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                                >
                                    <i className="fa-solid fa-plus me-2"></i>
                                    إضافة خدمة
                                </button>
                            </div>

                            <div className="space-y-4">
                                {items.map((item, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-xl">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">الفئة *</label>
                                                <select
                                                    value={item.category_id}
                                                    onChange={e => updateItem(index, 'category_id', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg bg-white border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                                    required
                                                >
                                                    <option value="">اختر</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">الوصف *</label>
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={e => updateItem(index, 'description', e.target.value)}
                                                    placeholder="مثال: خدمة تصوير كاملة"
                                                    className="w-full px-3 py-2 rounded-lg bg-white border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">الميزانية التقديرية (ر.ق)</label>
                                                <input
                                                    type="number"
                                                    value={item.estimated_budget}
                                                    onChange={e => updateItem(index, 'estimated_budget', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-3 py-2 rounded-lg bg-white border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">الكمية</label>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                                                    min="1"
                                                    className="w-full px-3 py-2 rounded-lg bg-white border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <label className="block text-xs font-bold text-gray-600 mb-1">ملاحظات</label>
                                            <input
                                                type="text"
                                                value={item.notes}
                                                onChange={e => updateItem(index, 'notes', e.target.value)}
                                                placeholder="تفاصيل إضافية..."
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
                                                حذف
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Budget and Deadline */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">أقصى ميزانية (ر.ق)</label>
                                <input
                                    type="number"
                                    value={maxBudget}
                                    onChange={e => setMaxBudget(e.target.value)}
                                    placeholder="أقصى ميزانية"
                                    className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">آخر موعد للرد</label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات إضافية</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="معلومات تكميلية..."
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
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading
                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري الإرسال...</>
                                    : <><i className="fa-solid fa-paper-plane"></i> إرسال الطلب</>
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default QuoteRequestPage;
