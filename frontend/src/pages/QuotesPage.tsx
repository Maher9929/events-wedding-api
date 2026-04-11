import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { quotesService, type Quote } from '../services/quotes.service';
import { toastService } from '../services/toast.service';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';

const PAGE_SIZE = 10;

const QuotesPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'sent' | 'accepted' | 'rejected' | 'expired'>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [updating, setUpdating] = useState<string | null>(null);
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();

    const statusMap: Record<string, { label: string; cls: string; icon: string }> = {
        draft:    { label: t('quotes.status.draft', 'مسودة'),       cls: 'bg-gray-100 text-gray-600',   icon: 'fa-file' },
        sent:     { label: t('quotes.status.sent', 'مرسل'),        cls: 'bg-blue-100 text-blue-700',   icon: 'fa-paper-plane' },
        accepted: { label: t('quotes.status.accepted', 'مقبول'),       cls: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
        rejected: { label: t('quotes.status.rejected', 'مرفوض'),       cls: 'bg-red-100 text-red-700',     icon: 'fa-times-circle' },
        expired:  { label: t('quotes.status.expired', 'منتهي الصلاحية'), cls: 'bg-orange-100 text-orange-700', icon: 'fa-clock' },
    };

    useEffect(() => { setPage(0); }, [filter, search]);

    useEffect(() => {
        const timer = setTimeout(() => fetchQuotes(), search ? 300 : 0);
        return () => clearTimeout(timer);
    }, [filter, page, search]); // eslint-disable-line

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams();
            if (filter !== 'all') p.set('status', filter);
            if (search.trim()) p.set('search', search.trim());
            p.set('limit', String(PAGE_SIZE));
            p.set('offset', String(page * PAGE_SIZE));
            const res = await quotesService.getMyQuotes(`?${p.toString()}`) as Quote[] | { data?: Quote[]; total?: number };
            const list = Array.isArray(res) ? res : res?.data || [];
            const tot = !Array.isArray(res) && typeof res?.total === 'number' ? res.total : list.length;
            setQuotes(list);
            setTotal(tot);
        } catch (_error) {
            toastService.error(t('quotes.fetch_failed', 'فشل تحميل عروض الأسعار'));
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (id: string) => {
        setUpdating(id);
        try {
            await quotesService.updateStatus(id, 'accepted');
            setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'accepted' } : q));
            toastService.success(t('quotes.accept_success', 'تم قبول عرض السعر'));
        } catch (_error) {
            toastService.error(t('quotes.accept_failed', 'فشل قبول عرض السعر'));
        } finally {
            setUpdating(null);
        }
    };

    const handleReject = async (id: string) => {
        const ok = await confirm({
            title: t('quotes.confirm_reject_title', 'Reject Quote'),
            message: t('quotes.confirm_reject', 'Are you sure you want to reject this quote?'),
            variant: 'warning',
            confirmLabel: t('common.reject', 'Reject'),
            cancelLabel: t('common.cancel', 'Cancel'),
        });
        if (!ok) return;
        setUpdating(id);
        try {
            await quotesService.updateStatus(id, 'rejected');
            setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'rejected' } : q));
            toastService.success(t('quotes.reject_success', 'تم رفض عرض السعر'));
        } catch (_error) {
            toastService.error(t('quotes.reject_failed', 'فشل رفض عرض السعر'));
        } finally {
            setUpdating(null);
        }
    };

    const handleBookFromQuote = (quote: Quote) => {
        const params = new URLSearchParams({
            provider: quote.provider_id,
            amount: String(quote.total_amount || 0),
            ...(quote.service_id ? { service: quote.service_id } : {}),
            ...(quote.event_id ? { event: quote.event_id } : {}),
        });
        navigate(`/client/checkout?${params.toString()}`);
    };

    const paginated = quotes;

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return t('common.today', 'اليوم');
        if (days === 1) return t('common.yesterday', 'أمس');
        return t('common.days_ago', 'منذ {{count}} يوم', { count: days });
    };

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-24" dir={i18n.language === 'en' ? 'ltr' : 'rtl'}>
            <header className="bg-white sticky top-0 z-50 shadow-sm px-5 py-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                        <i className={`fa-solid ${i18n.language === 'en' ? 'fa-arrow-left' : 'fa-arrow-right'} text-gray-700`}></i>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{t('quotes.title', 'عروض الأسعار')}</h1>
                        <p className="text-xs text-gray-500">{total} {t('quotes.offers_count', 'عرض')}</p>
                    </div>
                </div>
                <div className="relative mt-3">
                    <input
                        type="text"
                        placeholder={t('quotes.search_placeholder', 'بحث في عروض الأسعار...')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={`w-full h-10 bg-bglight rounded-xl ${i18n.language === 'en' ? 'ps-10 pe-4' : 'pe-10 ps-4'} text-sm focus:outline-none focus:ring-2 focus:ring-primary/20`}
                    />
                    <i className={`fa-solid fa-search absolute ${i18n.language === 'en' ? 'left-3' : 'right-3'} top-3 text-gray-400 text-sm`}></i>
                </div>
            </header>

            {/* Stats */}
            {!loading && total > 0 && (
                <div className="px-5 pt-3 grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
                        <p className="text-xl font-bold text-gray-900">{total}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t('quotes.stats.total', 'إجمالي')}</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl p-3 shadow-sm text-center">
                        <p className="text-xl font-bold text-green-700">{quotes.filter(q => q.status === 'accepted').length}</p>
                        <p className="text-xs text-green-600 mt-0.5">{t('quotes.stats.accepted', 'مقبول')}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-3 shadow-sm text-center">
                        <p className="text-sm font-bold text-primary">{quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total_amount || 0), 0).toLocaleString()}</p>
                        <p className="text-xs text-primary/70 mt-0.5">{t('quotes.stats.qr_accepted', 'ر.ق مقبول')}</p>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                {(['all', 'sent', 'accepted', 'rejected', 'expired'] as const).map(f => {
                    const count = f === 'all' ? quotes.length : quotes.filter(q => q.status === f).length;
                    const labels: Record<string, string> = { 
                        all: t('common.all', 'الكل'), 
                        sent: t('quotes.status.sent', 'مرسل'), 
                        accepted: t('quotes.status.accepted', 'مقبول'), 
                        rejected: t('quotes.status.rejected', 'مرفوض'), 
                        expired: t('quotes.status.expired', 'منتهي') 
                    };
                    return (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                                filter === f ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 shadow-sm'
                            }`}
                        >
                            {labels[f]}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <main className="px-5 py-2">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
                                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <i className="fa-solid fa-file-invoice text-gray-400 text-3xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('quotes.empty_state.title', 'لا توجد عروض أسعار')}</h3>
                        <p className="text-sm text-gray-500">{t('quotes.empty_state.desc', 'ستظهر هنا عروض الأسعار التي تتلقاها من مقدمي الخدمات')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {paginated.map(quote => {
                            const st = statusMap[quote.status] || statusMap.draft;
                            const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
                            const canRespond = quote.status === 'sent' && !isExpired;
                            return (
                                <div key={quote.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                                    <i className="fa-solid fa-file-invoice text-primary"></i>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">
                                                        {t('quotes.card.quote_number', 'عرض سعر')} #{quote.id.substring(0, 8).toUpperCase()}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{timeAgo(quote.created_at)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {isExpired && quote.status === 'sent' && (
                                                    <span className="text-xs px-2 py-1 rounded-xl font-bold bg-red-100 text-red-600 flex items-center gap-1">
                                                        <i className="fa-solid fa-clock text-[10px]"></i>
                                                        {t('quotes.status.expired_short', 'منتهي')}
                                                    </span>
                                                )}
                                                <span className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 ${st.cls}`}>
                                                    <i className={`fa-solid ${st.icon} text-[10px]`}></i>
                                                    {st.label}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between py-3 border-t border-gray-100">
                                            <div>
                                                <p className="text-xs text-gray-500">{t('quotes.card.total_amount', 'المبلغ الإجمالي')}</p>
                                                <p className="text-xl font-bold text-primary">{(quote.total_amount || 0).toLocaleString()} {t('common.currency', 'ر.ق')}</p>
                                            </div>
                                            {quote.valid_until && (
                                                <div className={i18n.language === 'en' ? 'text-right' : 'text-left'}>
                                                    <p className="text-xs text-gray-500">{t('quotes.card.valid_until', 'صالح حتى')}</p>
                                                    <p className="text-sm font-bold text-gray-700">
                                                        {new Date(quote.valid_until).toLocaleDateString(t('common.date_locale', 'ar-EG'))}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Items breakdown */}
                                        {quote.items && quote.items.length > 0 && (
                                            <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-1.5">
                                                <p className="text-xs font-bold text-gray-700 mb-2">{t('quotes.card.offer_details', 'تفاصيل العرض:')}</p>
                                                {quote.items.map((item: { name?: string; description?: string; amount?: number; price?: number; quantity?: number }, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-600 flex items-center gap-1">
                                                            <i className="fa-solid fa-circle text-primary text-[6px]"></i>
                                                            {item.name || item.description}
                                                            {(item.quantity || 0) > 1 && <span className="text-gray-400">×{item.quantity}</span>}
                                                        </span>
                                                        <span className="font-bold text-gray-900">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} {t('common.currency', 'ر.ق')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {quote.notes && (
                                            <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 mt-2">
                                                <i className="fa-solid fa-note-sticky ms-1 text-gray-400"></i>
                                                {quote.notes}
                                            </p>
                                        )}
                                    </div>

                                    {canRespond && (
                                        <div className="flex border-t border-gray-100">
                                            <button
                                                onClick={() => handleAccept(quote.id)}
                                                disabled={updating === quote.id}
                                                className="flex-1 py-3 text-center text-sm font-bold text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                                            >
                                                {updating === quote.id
                                                    ? <i className="fa-solid fa-spinner fa-spin"></i>
                                                    : <><i className={`fa-solid fa-check ${i18n.language === 'en' ? 'me-1' : 'ms-1'}`}></i>{t('common.accept', 'قبول')}</>
                                                }
                                            </button>
                                            <div className="w-px bg-gray-100"></div>
                                            <button
                                                onClick={() => handleReject(quote.id)}
                                                disabled={updating === quote.id}
                                                className="flex-1 py-3 text-center text-sm font-bold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                            >
                                                <i className={`fa-solid fa-times ${i18n.language === 'en' ? 'me-1' : 'ms-1'}`}></i>{t('common.reject', 'رفض')}
                                            </button>
                                        </div>
                                    )}
                                    {quote.status === 'accepted' && (
                                        <div className="border-t border-gray-100">
                                            <button
                                                onClick={() => handleBookFromQuote(quote)}
                                                className="w-full py-3 text-center text-sm font-bold text-white gradient-purple hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                            >
                                                <i className="fa-solid fa-calendar-check"></i>
                                                {t('quotes.card.create_booking', 'إنشاء حجز من هذا العرض')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <Pagination
                    page={page}
                    total={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                />
            </main>
            <ConfirmDialogComponent />
        </div>
    );
};

export default QuotesPage;
