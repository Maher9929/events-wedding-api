import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';

interface QuoteClient {
    id?: string;
    full_name?: string;
    email?: string;
}

interface QuoteService {
    id?: string;
    title?: string;
}

interface Quote {
    id: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired' | string;
    title?: string;
    amount?: number;
    max_budget?: number;
    client?: QuoteClient;
    service?: QuoteService;
    created_at: string;
    deadline?: string;
    description?: string;
    notes?: string;
}

const AdminQuotesPage = () => {
    const { t, i18n } = useTranslation();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Quote | null>(null);

    const statusMap: Record<string, { label: string; cls: string; icon: string }> = {
        pending:   { label: t('quotes.status.pending', 'معلق'),    cls: 'bg-yellow-100 text-yellow-700', icon: 'fa-clock' },
        accepted:  { label: t('quotes.status.accepted', 'مقبول'),   cls: 'bg-green-100 text-green-700',  icon: 'fa-check-circle' },
        rejected:  { label: t('quotes.status.rejected', 'مرفوض'),   cls: 'bg-red-100 text-red-700',     icon: 'fa-times-circle' },
        completed: { label: t('quotes.status.completed', 'مكتمل'),   cls: 'bg-blue-100 text-blue-700',   icon: 'fa-flag-checkered' },
        expired:   { label: t('quotes.status.expired', 'منتهي'),   cls: 'bg-gray-100 text-gray-600',   icon: 'fa-hourglass-end' },
    };

    const loadQuotes = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = statusFilter === 'all' ? '/quotes/admin' : `/quotes/admin?status=${statusFilter}`;
            const res = await apiService.get<{ data?: Quote[] } | Quote[]>(endpoint);
            const list = Array.isArray(res) ? res : res?.data || [];
            setQuotes(list);
        } catch (_error) {
            toastService.error(t('quotes.error_loading', 'فشل تحميل عروض الأسعار'));
        } finally {
            setLoading(false);
        }
    }, [statusFilter, t]);

    useEffect(() => { void loadQuotes(); }, [loadQuotes]);

    const handleStatusUpdate = async (quoteId: string, newStatus: string) => {
        try {
            await apiService.patch(`/quotes/id/${quoteId}/status`, { status: newStatus });
            setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
            if (selected?.id === quoteId) setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
            toastService.success(t('quotes.success_update', 'تم تحديث حالة العرض'));
        } catch (_error) {
            toastService.error(t('quotes.error_updating', 'فشل تحديث الحالة'));
        }
    };

    const filtered = quotes.filter(q => {
        if (!search) return true;
        const s = search.toLowerCase();
        return q.title?.toLowerCase().includes(s)
            || q.client?.full_name?.toLowerCase().includes(s)
            || q.client?.email?.toLowerCase().includes(s);
    });

    // Stats
    const stats = {
        total: quotes.length,
        pending: quotes.filter(q => q.status === 'pending').length,
        accepted: quotes.filter(q => q.status === 'accepted').length,
        totalValue: quotes.reduce((s, q) => s + (q.amount || q.max_budget || 0), 0),
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('admin_quotes.title', 'عروض الأسعار')}</h1>
                    <p className="text-gray-500">{t('admin_quotes.subtitle', 'إدارة طلبات وعروض الأسعار على المنصة')}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t('admin_quotes.stats.total', 'إجمالي العروض'), value: stats.total, icon: 'fa-file-invoice', color: 'bg-blue-50 text-blue-600' },
                    { label: t('admin_quotes.stats.pending', 'معلقة'), value: stats.pending, icon: 'fa-clock', color: 'bg-yellow-50 text-yellow-600' },
                    { label: t('admin_quotes.stats.accepted', 'مقبولة'), value: stats.accepted, icon: 'fa-check-circle', color: 'bg-green-50 text-green-600' },
                    { label: t('admin_quotes.stats.total_value', 'القيمة الإجمالية'), value: `${stats.totalValue.toLocaleString()} ${t('common.currency', 'ر.ق')}`, icon: 'fa-coins', color: 'bg-purple-50 text-purple-600' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                                <i className={`fa-solid ${s.icon}`}></i>
                            </div>
                            <div>
                                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                                <p className="text-xs text-gray-500">{s.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder={t('admin_quotes.search_placeholder', 'بحث بالعنوان أو اسم العميل...')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-10 bg-white border border-gray-200 rounded-xl px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <i className="fa-solid fa-search absolute right-3 top-3 text-gray-400 text-sm"></i>
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                    <option value="all">{t('common.all_statuses', 'جميع الحالات')}</option>
                    {Object.entries(statusMap).map(([val, { label }]) => (
                        <option key={val} value={val}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                        <thead className="bg-gray-50 border-b border-gray-100 text-sm font-bold text-gray-700">
                            <tr>
                                <th className="px-6 py-4">{t('admin_quotes.table.title_client', 'العنوان / العميل')}</th>
                                <th className="px-6 py-4">{t('admin_quotes.table.service', 'الخدمة')}</th>
                                <th className="px-6 py-4">{t('admin_quotes.table.amount', 'المبلغ')}</th>
                                <th className="px-6 py-4">{t('admin_quotes.table.status', 'الحالة')}</th>
                                <th className="px-6 py-4">{t('admin_quotes.table.date', 'التاريخ')}</th>
                                <th className="px-6 py-4 text-center">{t('common.actions', 'الإجراءات')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-gray-100 rounded w-24"></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <i className="fa-solid fa-file-circle-xmark text-3xl mb-2 block opacity-30"></i>
                                        {t('admin_quotes.no_quotes', 'لا توجد عروض أسعار')}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(quote => {
                                    const st = statusMap[quote.status] || statusMap.pending;
                                    return (
                                        <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900 text-sm">{quote.title || `${t('admin_quotes.quote_prefix', 'عرض')} #${quote.id?.substring(0, 8)}`}</p>
                                                <p className="text-xs text-gray-500">{quote.client?.full_name || quote.client?.email || '—'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{quote.service?.title || '—'}</td>
                                            <td className="px-6 py-4 font-bold text-primary text-sm">
                                                {(quote.amount || quote.max_budget || 0).toLocaleString()} {t('common.currency', 'ر.ق')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${st.cls}`}>
                                                    <i className={`fa-solid ${st.icon} text-[10px]`}></i>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(quote.created_at).toLocaleDateString(t('common.date_locale', 'ar-EG'))}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setSelected(quote)}
                                                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                                                    >
                                                        <i className="fa-solid fa-eye me-1"></i>{t('common.view', 'عرض')}
                                                    </button>
                                                    {quote.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusUpdate(quote.id, 'accepted')}
                                                                className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 transition-colors"
                                                            >
                                                                {t('common.accept', 'قبول')}
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(quote.id, 'rejected')}
                                                                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-colors"
                                                            >
                                                                {t('common.reject', 'رفض')}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-lg text-gray-900">{t('admin_quotes.details_title', 'تفاصيل عرض السعر')}</h3>
                            <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <i className="fa-solid fa-times text-sm"></i>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">{t('admin_quotes.details.title', 'العنوان')}</span>
                                    <span className="font-bold text-sm text-gray-900">{selected.title || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">{t('admin_quotes.details.client', 'العميل')}</span>
                                    <span className="font-bold text-sm text-gray-900">{selected.client?.full_name || selected.client?.email || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">{t('admin_quotes.details.service', 'الخدمة')}</span>
                                    <span className="font-bold text-sm text-gray-900">{selected.service?.title || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">{t('admin_quotes.details.amount', 'المبلغ')}</span>
                                    <span className="font-bold text-primary">{(selected.amount || selected.max_budget || 0).toLocaleString()} {t('common.currency', 'ر.ق')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">{t('admin_quotes.details.status', 'الحالة')}</span>
                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${(statusMap[selected.status] || statusMap.pending).cls}`}>
                                        {(statusMap[selected.status] || statusMap.pending).label}
                                    </span>
                                </div>
                                {selected.deadline && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-500">{t('admin_quotes.details.deadline', 'الموعد النهائي')}</span>
                                        <span className="text-sm text-orange-600 font-bold">{new Date(selected.deadline).toLocaleDateString(t('common.date_locale', 'ar-EG'))}</span>
                                    </div>
                                )}
                            </div>

                            {selected.description && (
                                <div>
                                    <p className="text-sm font-bold text-gray-700 mb-1">{t('admin_quotes.details.description', 'الوصف')}</p>
                                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{selected.description}</p>
                                </div>
                            )}

                            {selected.notes && (
                                <div>
                                    <p className="text-sm font-bold text-gray-700 mb-1">{t('admin_quotes.details.notes', 'ملاحظات')}</p>
                                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{selected.notes}</p>
                                </div>
                            )}
                        </div>

                        {selected.status === 'pending' && (
                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={() => { handleStatusUpdate(selected.id, 'accepted'); setSelected(null); }}
                                    className="flex-1 h-10 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors"
                                >
                                    <i className="fa-solid fa-check me-2"></i>{t('admin_quotes.actions.accept_quote', 'قبول العرض')}
                                </button>
                                <button
                                    onClick={() => { handleStatusUpdate(selected.id, 'rejected'); setSelected(null); }}
                                    className="flex-1 h-10 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors"
                                >
                                    <i className="fa-solid fa-times me-2"></i>{t('common.reject', 'رفض')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminQuotesPage;
