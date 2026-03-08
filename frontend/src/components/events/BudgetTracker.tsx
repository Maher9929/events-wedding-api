import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventsService } from '../../services/events.service';
import type { EventBudget } from '../../types/events';
import type { Event } from '../../services/api';

interface BudgetTrackerProps {
    event?: Event | null;
}

const BudgetTracker = ({ event }: BudgetTrackerProps) => {
    const { id: eventId } = useParams();
    const [items, setItems] = useState<EventBudget[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItem, setNewItem] = useState({
        category: 'Venue',
        item_name: '',
        estimated_cost: 0,
        actual_cost: 0,
        paid_amount: 0,
        notes: ''
    });

    useEffect(() => {
        if (eventId) loadBudget();
    }, [eventId]);

    const loadBudget = async () => {
        try {
            const data = await eventsService.getBudget(eventId!);
            setItems(data);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!eventId || !newItem.item_name?.trim()) return;
        try {
            const budgetItem = {
                category: newItem.category || 'Venue',
                item_name: newItem.item_name.trim(),
                estimated_cost: Number(newItem.estimated_cost) || 0,
                actual_cost: Number(newItem.actual_cost) || 0,
                paid_amount: Number(newItem.paid_amount) || 0,
                notes: newItem.notes?.trim() || ''
            };
            const added = await eventsService.addBudgetItem(eventId, budgetItem);
            setItems([...items, added]);
            setShowAddModal(false);
            setNewItem({ category: 'Venue', item_name: '', estimated_cost: 0, actual_cost: 0, paid_amount: 0, notes: '' });
        } catch (error) {
            console.error('Failed to add budget item:', error);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await eventsService.removeBudgetItem(itemId);
            setItems(items.filter(i => i.id !== itemId));
        } catch (error) {
        }
    }

    const totalEstimated = items.reduce((sum, item) => sum + item.estimated_cost, 0);
    const totalActual = items.reduce((sum, item) => sum + item.actual_cost, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paid_amount, 0);
    const goalBudget = event?.budget || 0;

    if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

    return (
        <div className="glass-effect rounded-3xl shadow-premium overflow-hidden relative animate-fade-in-up">
            <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900">الميزانية</h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary py-2 px-4 shadow-lg shadow-purple-200"
                >
                    <i className="fa-solid fa-plus ms-2"></i>
                    إضافة بند
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 p-6 bg-white/20 border-b border-gray-100/50">
                <div className="glass-effect p-4 rounded-2xl border-l-4 border-l-primary shadow-sm card-hover">
                    <span className="text-xs text-primary font-bold block mb-1">الميزانية المستهدفة</span>
                    <span className="text-xl font-bold text-gray-900">{goalBudget.toLocaleString()} ر.ق</span>
                </div>
                <div className="glass-effect p-4 rounded-2xl border-l-4 border-l-blue-500 shadow-sm card-hover">
                    <span className="text-xs text-blue-600 font-bold block mb-1">التقديري</span>
                    <span className="text-xl font-bold text-blue-900">{totalEstimated.toLocaleString()} ر.ق</span>
                </div>
                <div className="glass-effect p-4 rounded-2xl border-l-4 border-l-purple-500 shadow-sm card-hover">
                    <span className="text-xs text-purple-600 font-bold block mb-1">الفعلي</span>
                    <span className="text-xl font-bold text-purple-900">{totalActual.toLocaleString()} ر.ق</span>
                </div>
                <div className="glass-effect p-4 rounded-2xl border-l-4 border-l-green-500 shadow-sm card-hover">
                    <span className="text-xs text-green-600 font-bold block mb-1">المدفوع</span>
                    <span className="text-xl font-bold text-green-900">{totalPaid.toLocaleString()} ر.ق</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-white/30 text-gray-600 text-xs font-bold">
                        <tr>
                            <th className="px-6 py-4">البند</th>
                            <th className="px-6 py-4">التصنيف</th>
                            <th className="px-6 py-4">تقديري</th>
                            <th className="px-6 py-4">فعلي</th>
                            <th className="px-6 py-4">مدفوع</th>
                            <th className="px-6 py-4">ملاحظات</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                        {items.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-white/40 transition-colors animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                <td className="px-6 py-4 font-bold text-gray-900">{item.item_name}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <span className="bg-white/60 px-2 py-1 rounded-lg shadow-sm text-xs font-medium">{item.category}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{item.estimated_cost.toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 font-bold">{item.actual_cost > 0 ? item.actual_cost.toLocaleString() : '-'}</td>
                                <td className="px-6 py-4 text-sm text-green-600 font-bold">{item.paid_amount > 0 ? item.paid_amount.toLocaleString() : '-'}</td>
                                <td className="px-6 py-4 text-xs text-gray-400 truncate max-w-[150px]">{item.notes}</td>
                                <td className="px-6 py-4 text-left">
                                    <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 transition-colors me-3">
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="glass-effect rounded-3xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="font-bold text-lg mb-4">إضافة بند جديد</h3>
                        <div className="space-y-3">
                            <input
                                type="text" placeholder="اسم البند (مثلا: التصوير)"
                                className="w-full input-field"
                                value={newItem.item_name}
                                onChange={e => setNewItem({ ...newItem, item_name: e.target.value })}
                            />
                            <select
                                className="w-full input-field"
                                value={newItem.category}
                                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                            >
                                <option>Venue</option>
                                <option>Catering</option>
                                <option>Decoration</option>
                                <option>Photography</option>
                                <option>Entertainment</option>
                                <option>Other</option>
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number" placeholder="التكلفة التقديرية"
                                    className="w-full input-field"
                                    value={newItem.estimated_cost}
                                    onChange={e => setNewItem({ ...newItem, estimated_cost: Number(e.target.value) })}
                                />
                                <input
                                    type="number" placeholder="التكلفة الفعلية"
                                    className="w-full input-field"
                                    value={newItem.actual_cost}
                                    onChange={e => setNewItem({ ...newItem, actual_cost: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={handleAdd} className="flex-1 btn-primary">حفظ</button>
                            <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-bold hover:bg-gray-200">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetTracker;
