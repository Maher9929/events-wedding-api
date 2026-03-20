import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { ServiceItem } from '../services/api';
import { toastService } from '../services/toast.service';

const AdminServicesPage = () => {
    const { t } = useTranslation();
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        setLoading(true);
        try {
            const data = await apiService.get<{ data?: ServiceItem[] } | ServiceItem[]>('/services');
            const list = Array.isArray(data) ? data : data?.data || [];
            setServices(list);
        } catch (error) {
            toastService.error(t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    const handleFeatureToggle = async (serviceId: string, currentStatus: boolean) => {
        try {
            await apiService.patch(`/services/${serviceId}/featured`, { isFeatured: !currentStatus });
            setServices(prev => prev.map(s => s.id === serviceId ? { ...s, is_featured: !currentStatus } : s));
            toastService.success(t('common.admin.success_update'));
        } catch (error) {
            toastService.error(t('common.error_updating'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('common.admin.confirm_delete'))) return;
        try {
            await apiService.delete(`/services/${id}`);
            setServices(prev => prev.filter(s => s.id !== id));
            toastService.success(t('common.admin.success_delete'));
        } catch (error) {
            toastService.error(t('common.error_deleting'));
        }
    };

    const filteredServices = services.filter(s =>
        s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('common.admin.services')}</h1>
                    <p className="text-gray-500">{t('common.admin.manage_services_desc') || 'Manage all service listings on the marketplace.'}</p>
                </div>
                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                            <tr>
                                <th className="px-6 py-4">{t('common.service')}</th>
                                <th className="px-6 py-4">{t('common.price')}</th>
                                <th className="px-6 py-4">{t('common.category')}</th>
                                <th className="px-6 py-4 text-center">{t('common.featured')}</th>
                                <th className="px-6 py-4 text-center">{t('common.admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-40"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-12 mx-auto"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded w-16 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredServices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">{t('common.no_results')}</td>
                                </tr>
                            ) : (
                                filteredServices.map(service => (
                                    <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{service.title}</div>
                                            <div className="text-xs text-gray-400">#{(service as any).id.substring(0, 8).toUpperCase()}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-primary">{service.base_price?.toLocaleString()} QR</td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {service.category?.name || service.category_id}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleFeatureToggle(service.id, !!service.is_featured)}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-colors ${service.is_featured ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-300 hover:text-amber-400'
                                                    }`}
                                            >
                                                <i className="fa-solid fa-star"></i>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="text-red-400 hover:text-red-600 p-2"
                                            >
                                                <i className="fa-solid fa-trash-can"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminServicesPage;
