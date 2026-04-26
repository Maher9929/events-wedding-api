import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { disputesService, type Dispute } from '../services/disputes.service';
import { toastService } from '../services/toast.service';

const AdminDisputesPage = () => {
    const { t, i18n } = useTranslation();
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [resolveModal, setResolveModal] = useState<Dispute | null>(null);
    const [resolution, setResolution] = useState('refund_full');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolving, setResolving] = useState(false);

    useEffect(() => {
        loadDisputes();
    }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadDisputes = async () => {
        setLoading(true);
        try {
            const data = await disputesService.getAllDisputes(filter || undefined);
            setDisputes(Array.isArray(data) ? data : []);
        } catch {
            toastService.error(t('disputes.load_failed', 'فشل تحميل النزاعات'));
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!resolveModal) return;
        setResolving(true);
        try {
            await disputesService.resolve(resolveModal.id, { resolution, resolution_notes: resolutionNotes });
            setResolveModal(null);
            setResolutionNotes('');
            toastService.success(t('disputes.resolved', 'تم حل النزاع'));
            loadDisputes();
        } catch {
            toastService.error(t('disputes.resolve_failed', 'فشل حل النزاع'));
        } finally {
            setResolving(false);
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            open: 'bg-red-100 text-red-700',
            under_review: 'bg-amber-100 text-amber-700',
            resolved: 'bg-green-100 text-green-700',
            closed: 'bg-gray-100 text-gray-600',
        };
        return map[status] || 'bg-gray-100 text-gray-600';
    };

    const reasonLabel = (reason: string) => {
        const map: Record<string, string> = {
            service_not_delivered: t('disputes.reasons.not_delivered', 'لم يتم تقديم الخدمة'),
            quality_issue: t('disputes.reasons.quality', 'مشكلة في الجودة'),
            late_arrival: t('disputes.reasons.late', 'تأخر في الوصول'),
            wrong_service: t('disputes.reasons.wrong', 'خدمة مختلفة'),
            overcharged: t('disputes.reasons.overcharged', 'مبلغ زائد'),
            provider_no_show: t('disputes.reasons.no_show', 'المزود لم يحضر'),
            other: t('disputes.reasons.other', 'سبب آخر'),
        };
        return map[reason] || reason;
    };

    return (
        <div className="space-y-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('disputes.admin_title', 'إدارة النزاعات')}</h1>
                    <p className="text-gray-500 text-sm">{t('disputes.admin_desc', 'مراجعة وحل النزاعات بين العملاء والمزودين')}</p>
                </div>
                <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="h-10 bg-white border border-gray-200 rounded-xl px-3 text-sm"
                >
                    <option value="">{t('common.all', 'الكل')}</option>
                    <option value="open">{t('disputes.status.open', 'مفتوح')}</option>
                    <option value="under_review">{t('disputes.status.under_review', 'قيد المراجعة')}</option>
                    <option value="resolved">{t('disputes.status.resolved', 'تم الحل')}</option>
                </select>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                            <div className="h-5 bg-gray-100 rounded w-1/3 mb-3"></div>
                            <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                        </div>
                    ))}
                </div>
            ) : disputes.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                    <i className="fa-solid fa-check-circle text-green-400 text-4xl mb-3"></i>
                    <p className="text-gray-500 font-bold">{t('disputes.none', 'لا توجد نزاعات')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {disputes.map(d => (
                        <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusBadge(d.status)}`}>
                                            {d.status}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            #{d.id.substring(0, 8)}
                                        </span>
                                    </div>
                                    <p className="font-bold text-gray-900">
                                        {d.bookings?.services?.title || t('disputes.unknown_service', 'خدمة')}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {t('disputes.opened_by', 'فتح بواسطة')}: {(d as Dispute & { opener?: { full_name: string } }).opener?.full_name || '-'}
                                        {' · '}
                                        {new Date(d.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {d.bookings?.amount && (
                                    <span className="text-lg font-bold text-primary">{d.bookings.amount} {t('common.currency', 'MAD')}</span>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3 mb-3">
                                <p className="text-xs font-bold text-gray-500 mb-1">{reasonLabel(d.reason)}</p>
                                <p className="text-sm text-gray-700">{d.description}</p>
                            </div>

                            {d.provider_response && (
                                <div className="bg-blue-50 rounded-xl p-3 mb-3">
                                    <p className="text-xs font-bold text-blue-600 mb-1">{t('disputes.provider_response', 'رد المزود')}</p>
                                    <p className="text-sm text-blue-800">{d.provider_response}</p>
                                </div>
                            )}

                            {d.resolution && (
                                <div className="bg-green-50 rounded-xl p-3 mb-3">
                                    <p className="text-xs font-bold text-green-600 mb-1">{t('disputes.resolution', 'القرار')}: {d.resolution}</p>
                                    {d.resolution_notes && <p className="text-sm text-green-800">{d.resolution_notes}</p>}
                                </div>
                            )}

                            {['open', 'under_review'].includes(d.status) && (
                                <button
                                    onClick={() => { setResolveModal(d); setResolution('refund_full'); setResolutionNotes(''); }}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                                >
                                    <i className="fa-solid fa-gavel me-1"></i>
                                    {t('disputes.resolve_btn', 'حل النزاع')}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {resolveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                            <i className="fa-solid fa-gavel text-primary me-2"></i>
                            {t('disputes.resolve_title', 'حل النزاع')}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">#{resolveModal.id.substring(0, 8)}</p>

                        <div className="mb-3">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('disputes.decision', 'القرار')} *</label>
                            <select
                                value={resolution}
                                onChange={e => setResolution(e.target.value)}
                                className="w-full h-11 bg-bglight rounded-xl px-3 text-sm border-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="refund_full">{t('disputes.resolutions.refund_full', 'استرداد كامل')}</option>
                                <option value="refund_partial">{t('disputes.resolutions.refund_partial', 'استرداد جزئي (50%)')}</option>
                                <option value="no_refund">{t('disputes.resolutions.no_refund', 'لا استرداد')}</option>
                                <option value="redo_service">{t('disputes.resolutions.redo', 'إعادة الخدمة')}</option>
                                <option value="dismissed">{t('disputes.resolutions.dismissed', 'رفض النزاع')}</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('disputes.notes', 'ملاحظات')}</label>
                            <textarea
                                value={resolutionNotes}
                                onChange={e => setResolutionNotes(e.target.value)}
                                rows={3}
                                placeholder={t('disputes.notes_placeholder', 'سبب القرار...')}
                                className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleResolve}
                                disabled={resolving}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
                            >
                                {resolving ? <i className="fa-solid fa-spinner fa-spin me-1"></i> : <i className="fa-solid fa-check me-1"></i>}
                                {t('disputes.confirm_resolve', 'تأكيد القرار')}
                            </button>
                            <button
                                onClick={() => setResolveModal(null)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                            >
                                {t('common.cancel', 'إلغاء')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDisputesPage;
