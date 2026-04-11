import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventsService } from '../../services/events.service';
import type { EventBudget } from '../../types/events';
import type { Event } from '../../services/api';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { toastService } from '../../services/toast.service';

interface BudgetTrackerProps {
    event?: Event | null;
}

const BudgetTracker = ({ event }: BudgetTrackerProps) => {
    const { id: eventId } = useParams();
    const { t, i18n } = useTranslation();
    const [items, setItems] = useState<EventBudget[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItem, setNewItem] = useState({
        category: 'Venue',
        item_name: '',
        estimated_cost: 0,
        actual_cost: 0,
        paid_amount: 0,
        notes: '',
    });
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

    const formatMoney = (value: number) => value.toLocaleString(locale);

    const categoryOptions = ['Venue', 'Catering', 'Decor', 'Photography', 'Entertainment', 'Other'];

    const loadBudget = useCallback(async () => {
        try {
            const data = await eventsService.getBudget(eventId!);
            setItems(data);
        } catch {
            toastService.error(t('events.budget.errors.load', 'Failed to load budget'));
        } finally {
            setLoading(false);
        }
    }, [eventId, t]);

    useEffect(() => {
        if (eventId) {
            void loadBudget();
        }
    }, [eventId, loadBudget]);

    const handleAdd = async () => {
        if (!eventId || !newItem.item_name.trim()) return;

        try {
            const budgetItem = {
                category: newItem.category || 'Venue',
                item_name: newItem.item_name.trim(),
                estimated_cost: Number(newItem.estimated_cost) || 0,
                actual_cost: Number(newItem.actual_cost) || 0,
                paid_amount: Number(newItem.paid_amount) || 0,
                notes: newItem.notes?.trim() || '',
            };

            const added = await eventsService.addBudgetItem(eventId, budgetItem);
            setItems((prev) => [...prev, added]);
            setShowAddModal(false);
            setNewItem({
                category: 'Venue',
                item_name: '',
                estimated_cost: 0,
                actual_cost: 0,
                paid_amount: 0,
                notes: '',
            });
        } catch {
            toastService.error(t('events.budget.errors.add', 'Failed to add budget item'));
        }
    };

    const handleDelete = async (itemId: string) => {
        const ok = await confirm({
            title: t('events.budget.delete_title', 'Delete budget item'),
            message: t('events.budget.delete_message', 'Are you sure you want to delete this budget item?'),
        });
        if (!ok) return;

        try {
            await eventsService.removeBudgetItem(itemId);
            setItems((prev) => prev.filter((item) => item.id !== itemId));
        } catch {
            toastService.error(t('events.budget.errors.delete', 'Failed to delete budget item'));
        }
    };

    const totalEstimated = items.reduce((sum, item) => sum + item.estimated_cost, 0);
    const totalActual = items.reduce((sum, item) => sum + item.actual_cost, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paid_amount, 0);
    const goalBudget = Number(event?.budget || 0);

    if (loading) return <div className="p-10 text-center">{t('common.loading', 'Loading...')}</div>;

    return (
        <>
            <div className="glass-effect rounded-3xl shadow-premium overflow-hidden relative animate-fade-in-up">
                <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">{t('events.budget.title', 'Budget')}</h3>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary py-2 px-4 shadow-lg shadow-purple-200">
                        <i className="fa-solid fa-plus ms-2"></i>
                        {t('events.budget.add_item', 'Add item')}
                    </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white/20 border-b border-gray-100/50">
                    <div className="glass-effect p-4 rounded-2xl border-l-4 border-l-primary shadow-sm card-hover">
                        <span className="text-xs text-primary font-bold block mb-1">{t('events.budget.target_budget', 'Target budget')}</span>
                        <span className="text-xl font-bold text-gray-900">{formatMoney(goalBudget)} {t('common.currency', 'QAR')}</span>
                    </div>
                    <div className="glass-effect p-4 rounded-2xl border-l-4 border-l-blue-500 shadow-sm card-hover">
                        <span className="text-xs text-blue-600 font-bold block mb-1">{t('events.budget.estimated_total', 'Estimated')}</span>
                        <span className="text-xl font-bold text-blue-900">{formatMoney(totalEstimated)} {t('common.currency', 'QAR')}</span>
                    </div>
                    <div className="glass-effect p-4 rounded-2xl border-l-4 border-l-purple-500 shadow-sm card-hover">
                        <span className="text-xs text-purple-600 font-bold block mb-1">{t('events.budget.actual_total', 'Actual')}</span>
                        <span className="text-xl font-bold text-purple-900">{formatMoney(totalActual)} {t('common.currency', 'QAR')}</span>
                    </div>
                    <div className="glass-effect p-4 rounded-2xl border-l-4 border-l-green-500 shadow-sm card-hover">
                        <span className="text-xs text-green-600 font-bold block mb-1">{t('events.budget.paid_total', 'Paid')}</span>
                        <span className="text-xl font-bold text-green-900">{formatMoney(totalPaid)} {t('common.currency', 'QAR')}</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-white/30 text-gray-600 text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4">{t('events.budget.item', 'Item')}</th>
                                <th className="px-6 py-4">{t('events.budget.category', 'Category')}</th>
                                <th className="px-6 py-4">{t('events.budget.estimated', 'Estimated')}</th>
                                <th className="px-6 py-4">{t('events.budget.actual', 'Actual')}</th>
                                <th className="px-6 py-4">{t('events.budget.paid', 'Paid')}</th>
                                <th className="px-6 py-4">{t('events.budget.notes', 'Notes')}</th>
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
                                    <td className="px-6 py-4 text-sm text-gray-600">{formatMoney(item.estimated_cost)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-bold">{item.actual_cost > 0 ? formatMoney(item.actual_cost) : '-'}</td>
                                    <td className="px-6 py-4 text-sm text-green-600 font-bold">{item.paid_amount > 0 ? formatMoney(item.paid_amount) : '-'}</td>
                                    <td className="px-6 py-4 text-xs text-gray-400 truncate max-w-[150px]">{item.notes || '-'}</td>
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

                {showAddModal && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="glass-effect rounded-3xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="font-bold text-lg mb-4">{t('events.budget.add_modal_title', 'Add budget item')}</h3>
                            <div className="space-y-3">
                                <input type="text" placeholder={t('events.budget.item_placeholder', 'Item name')} className="w-full input-field" value={newItem.item_name} onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })} />
                                <select className="w-full input-field" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
                                    {categoryOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="number" placeholder={t('events.budget.estimated_placeholder', 'Estimated cost')} className="w-full input-field" value={newItem.estimated_cost} onChange={(e) => setNewItem({ ...newItem, estimated_cost: Number(e.target.value) })} />
                                    <input type="number" placeholder={t('events.budget.actual_placeholder', 'Actual cost')} className="w-full input-field" value={newItem.actual_cost} onChange={(e) => setNewItem({ ...newItem, actual_cost: Number(e.target.value) })} />
                                </div>
                                <input type="number" placeholder={t('events.budget.paid_placeholder', 'Paid amount')} className="w-full input-field" value={newItem.paid_amount} onChange={(e) => setNewItem({ ...newItem, paid_amount: Number(e.target.value) })} />
                                <textarea placeholder={t('events.budget.notes_placeholder', 'Optional notes')} className="w-full input-field min-h-24" value={newItem.notes} onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })} />
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button onClick={handleAdd} className="flex-1 btn-primary">{t('common.save', 'Save')}</button>
                                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-bold hover:bg-gray-200">{t('common.cancel', 'Cancel')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <ConfirmDialogComponent />
        </>
    );
};

export default BudgetTracker;
