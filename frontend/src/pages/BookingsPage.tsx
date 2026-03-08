import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingsService, type Booking } from '../services/bookings.service';
import { toastService } from '../services/toast.service';

const BookingsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [cancelling, setCancelling] = useState<string | null>(null);

    const statusMap: Record<string, { label: string; cls: string }> = {
        pending: { label: t('bookings.status.pending'), cls: 'bg-yellow-100 text-yellow-700' },
        confirmed: { label: t('bookings.status.confirmed'), cls: 'bg-green-100 text-green-700' },
        cancelled: { label: t('bookings.status.cancelled'), cls: 'bg-red-100 text-red-700' },
        completed: { label: t('bookings.status.completed'), cls: 'bg-blue-100 text-blue-700' },
    };

    useEffect(() => { setPage(0); }, [filter, search, sortOrder]);

    useEffect(() => {
        const timer = setTimeout(() => fetchBookings(filter), search ? 300 : 0);
        return () => clearTimeout(timer);
    }, [filter, page, search, sortOrder]); // eslint-disable-line

    const fetchBookings = async (status?: string) => {
        setLoading(true);
        try {
            const p = new URLSearchParams();
            if (status && status !== 'all') p.set('status', status);
            if (search.trim()) p.set('search', search.trim());
            p.set('sort_order', sortOrder);
            p.set('limit', String(10));
            p.set('offset', String(page * 10));
            const res: any = await bookingsService.getMyBookings(`?${p.toString()}`);
            const list = Array.isArray(res) ? res : res?.data || [];
            setBookings(list);
            setTotal((res as any)?.total ?? list.length);
        } catch {
            toastService.error(t('bookings.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm(t('bookings.confirm_cancel'))) return;
        setCancelling(id);
        try {
            await bookingsService.updateStatus(id, { status: 'cancelled' });
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
            toastService.success(t('bookings.cancel_success'));
        } catch {
            toastService.error(t('bookings.cancel_error'));
        } finally {
            setCancelling(null);
        }
    };

    const filtered = bookings;

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-24">
            <header className="bg-white sticky top-0 z-50 shadow-sm px-5 py-4">
                <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                        <i className="fa-solid fa-arrow-right text-gray-700"></i>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">حجوزاتي</h1>
                        <p className="text-xs text-gray-500">{total} {t('bookings.count_label')}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder={t('bookings.search_placeholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-10 bg-bglight rounded-xl px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <i className="fa-solid fa-search absolute right-3 top-3 text-gray-400 text-sm"></i>
                    </div>
                    <button
                        onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                        className="h-10 px-3 rounded-xl bg-bglight text-gray-600 text-sm font-bold flex items-center gap-1.5 hover:bg-gray-200 transition-colors flex-shrink-0"
                    >
                        <i className={`fa-solid fa-sort-${sortOrder === 'desc' ? 'down' : 'up'} text-xs`}></i>
                        {sortOrder === 'desc' ? t('service.listing.sort.newest') : t('bookings.sort.oldest')}
                    </button>
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(f => {
                    const count = f === 'all' ? bookings.length : bookings.filter(b => b.status === f).length;
                    const labels: Record<string, string> = {
                        all: t('common.all'),
                        pending: t('bookings.status.pending'),
                        confirmed: t('bookings.status.confirmed'),
                        completed: t('bookings.status.completed'),
                        cancelled: t('bookings.status.cancelled')
                    };
                    return (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 shadow-sm'
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
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <i className="fa-solid fa-calendar-xmark text-gray-400 text-3xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('bookings.no_bookings')}</h3>
                        <p className="text-sm text-gray-500 mb-6">{t('bookings.no_bookings_desc')}</p>
                        <Link to="/services" className="px-8 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg">
                            {t('bookings.explore_services')}
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map(booking => {
                            const st = statusMap[booking.status] || { label: booking.status, cls: 'bg-gray-100 text-gray-700' };
                            const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
                            const balanceAmount = Number(booking.balance_amount ?? booking.amount ?? 0);
                            const isPartiallyPaid = booking.payment_status === 'pending' && balanceAmount > 0 && balanceAmount < Number(booking.amount || 0);
                            return (
                                <div key={booking.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                        <i className="fa-solid fa-calendar text-primary text-sm"></i>
                                                    </div>
                                                    <div>
                                                        {(booking as any).services?.title && (
                                                            <p className="font-bold text-gray-900 text-sm">{(booking as any).services.title}</p>
                                                        )}
                                                        <p className={`${(booking as any).services?.title ? 'text-xs text-gray-400' : 'font-bold text-gray-900 text-sm'}`}>
                                                            {new Date(booking.booking_date).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            #{booking.id.substring(0, 8).toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2.5 py-1 rounded-xl font-bold flex-shrink-0 ${st.cls}`}>
                                                {st.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <div>
                                                <p className="text-xs text-gray-500">{t('bookings.amount')}</p>
                                                <p className="text-lg font-bold text-primary">{booking.amount.toLocaleString()} QR</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs text-gray-500">{t('bookings.payment_status')}</p>
                                                <p className={`text-sm font-bold ${booking.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                    {booking.payment_status === 'paid' ? t('bookings.paid') : isPartiallyPaid ? t('bookings.partially_paid') : t('bookings.unpaid')}
                                                </p>
                                                {booking.payment_status === 'pending' && balanceAmount > 0 && (
                                                    <p className="text-[11px] text-gray-500">{t('bookings.remaining')}: {balanceAmount.toLocaleString()} QR</p>
                                                )}
                                            </div>
                                        </div>

                                        {booking.notes && (
                                            <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-xl p-3">
                                                <i className="fa-solid fa-note-sticky mx-1 text-gray-400"></i>
                                                {booking.notes}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex border-t border-gray-100">
                                        <Link
                                            to={`/client/bookings/${booking.id}`}
                                            className="flex-1 py-3 text-center text-sm font-bold text-primary hover:bg-purple-50 transition-colors"
                                        >
                                            <i className="fa-solid fa-eye mx-1"></i>
                                            {t('bookings.details')}
                                        </Link>
                                        {canCancel && (
                                            <>
                                                <div className="w-px bg-gray-100"></div>
                                                <button
                                                    onClick={() => handleCancel(booking.id)}
                                                    disabled={cancelling === booking.id}
                                                    className="flex-1 py-3 text-center text-sm font-bold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                >
                                                    {cancelling === booking.id
                                                        ? <i className="fa-solid fa-spinner fa-spin mx-1"></i>
                                                        : <i className="fa-solid fa-times mx-1"></i>
                                                    }
                                                    {t('bookings.cancel')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {total > 10 && (
                    <div className="flex items-center justify-center gap-3 pt-4 pb-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            <i className="fa-solid fa-chevron-left text-sm"></i>
                        </button>
                        <span className="text-sm font-bold text-gray-700">{page + 1} / {Math.ceil(total / 10)}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={(page + 1) * 10 >= total}
                            className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            <i className="fa-solid fa-chevron-right text-sm"></i>
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BookingsPage;
