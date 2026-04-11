import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { Provider } from '../services/api';
import { toastService } from '../services/toast.service';
import Pagination from '../components/common/Pagination';

const AdminProvidersPage = () => {
    const { t } = useTranslation();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;

    const loadProviders = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.get<{ data?: Provider[] } | Provider[]>('/providers');
            const list = Array.isArray(data) ? data : data?.data || [];
            setProviders(list);
        } catch (_error) {
            toastService.error(t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadProviders();
    }, [loadProviders]);

    useEffect(() => {
        setPage(0);
    }, [searchTerm]);

    const handleVerificationToggle = async (providerId: string, currentStatus: boolean) => {
        try {
            await apiService.patch(`/providers/id/${providerId}/verify`, { isVerified: !currentStatus });
            setProviders(prev => prev.map(p => p.id === providerId ? { ...p, is_verified: !currentStatus } : p));
            toastService.success(t('common.admin.success_update'));
        } catch (_error) {
            toastService.error(t('common.error_updating'));
        }
    };

    const filteredProviders = providers.filter(p =>
        p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const paginatedProviders = filteredProviders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('common.admin.providers')}</h1>
                    <p className="text-gray-500">{t('common.admin.manage_providers_desc') || 'Manage service providers and their verification status.'}</p>
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
                                <th className="px-6 py-4">{t('common.admin.company')}</th>
                                <th className="px-6 py-4">{t('common.admin.rating')}</th>
                                <th className="px-6 py-4">{t('common.admin.verification')}</th>
                                <th className="px-6 py-4">{t('common.admin.created_at')}</th>
                                <th className="px-6 py-4 text-center">{t('common.admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-12"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded w-16 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredProviders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">{t('common.no_results')}</td>
                                </tr>
                            ) : (
                                paginatedProviders.map(provider => (
                                    <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{provider.company_name || provider.business_name}</div>
                                            <div className="text-xs text-gray-400">{provider.phone || 'No phone'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                                                <i className="fa-solid fa-star text-[10px]"></i>
                                                {provider.rating || 'N/A'}
                                            </div>
                                            <div className="text-xs text-gray-400">{provider.review_count} {t('common.reviews')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${provider.is_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {provider.is_verified ? t('common.verified') : t('common.unverified')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(provider.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleVerificationToggle(provider.id, !!provider.is_verified)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${provider.is_verified ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-primary text-white hover:opacity-90'
                                                    }`}
                                            >
                                                {provider.is_verified ? t('common.admin.unverify') : t('common.admin.verify')}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination
                page={page}
                total={filteredProviders.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
            />
        </div>
    );
};

export default AdminProvidersPage;
