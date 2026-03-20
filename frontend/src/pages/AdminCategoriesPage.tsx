import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Category } from '../services/api';
import { toastService } from '../services/toast.service';

const AdminCategoriesPage = () => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', slug: '', description: '' });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await apiService.get<{ data?: Category[] } | Category[]>('/categories');
            const list = Array.isArray(data) ? data : data?.data || [];
            setCategories(list);
        } catch (error) {
            toastService.error(t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await apiService.patch(`/categories/${editingCategory.id}`, formData);
                toastService.success(t('common.admin.success_update'));
            } else {
                await apiService.post('/categories', formData);
                toastService.success(t('common.admin.success_create'));
            }
            setShowModal(false);
            setEditingCategory(null);
            setFormData({ name: '', slug: '', description: '' });
            loadCategories();
        } catch (error) {
            toastService.error(t('common.error_saving'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('common.admin.confirm_delete'))) return;
        try {
            await apiService.delete(`/categories/${id}`);
            setCategories(prev => prev.filter(c => c.id !== id));
            toastService.success(t('common.admin.success_delete'));
        } catch (error) {
            toastService.error(t('common.error_deleting'));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('common.admin.categories')}</h1>
                    <p className="text-gray-500">{t('common.admin.manage_categories_desc') || 'Manage service categories for the platform.'}</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setFormData({ name: '', slug: '', description: '' });
                        setShowModal(true);
                    }}
                    className="px-4 py-2 rounded-xl gradient-purple text-white font-bold shadow-lg shadow-purple-200 hover:scale-105 transition-transform"
                >
                    <i className="fa-solid fa-plus ms-1"></i>
                    {t('common.add')}
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                            <tr>
                                <th className="px-6 py-4">{t('common.name')}</th>
                                <th className="px-6 py-4">{t('common.slug')}</th>
                                <th className="px-6 py-4">{t('common.description')}</th>
                                <th className="px-6 py-4 text-center">{t('common.admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-40"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded w-16 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">{t('common.no_results')}</td>
                                </tr>
                            ) : (
                                categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{cat.name}</td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{cat.slug}</td>
                                        <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{cat.description}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingCategory(cat);
                                                        setFormData({ name: cat.name, slug: cat.slug, description: cat.description || '' });
                                                        setShowModal(true);
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700 p-2"
                                                >
                                                    <i className="fa-solid fa-edit"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="text-red-400 hover:text-red-700 p-2"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-5 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full animate-scale-in shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            {editingCategory ? t('common.edit') : t('common.add')} {t('common.category')}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('common.name')}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('common.slug')}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('common.description')}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg"
                                >
                                    {t('common.save')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold"
                                >
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCategoriesPage;
