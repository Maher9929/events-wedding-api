import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';

interface Report {
    id: string;
    reporter_id: string;
    reporter: { full_name: string; email: string };
    reported_type: string;
    reported_id: string;
    reason: string;
    description: string;
    evidence_urls: string[];
    status: 'pending' | 'approved' | 'rejected' | 'resolved';
    moderator_id?: string;
    moderator_notes?: string;
    moderated_at?: string;
    created_at: string;
}

interface KycDocument {
    id: string;
    provider_id: string;
    provider: { company_name: string; user_id: string };
    document_type: string;
    document_url: string;
    document_name: string;
    file_size: number;
    mime_type: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    submitted_at: string;
    reviewed_at?: string;
    reviewer_id?: string;
    reviewer_notes?: string;
    rejection_reason?: string;
    expires_at?: string;
}

interface ModerationStats {
    reports: {
        total: number;
        pending: number;
        resolved: number;
    };
    kyc: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
    enforcement: {
        banned: number;
        suspended: number;
    };
}

const ModerationPage = () => {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<'reports' | 'kyc' | 'stats'>('reports');
    const [reports, setReports] = useState<Report[]>([]);
    const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
    const [stats, setStats] = useState<ModerationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [selectedKyc, setSelectedKyc] = useState<KycDocument | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showKycModal, setShowKycModal] = useState(false);
    const [actionNotes, setActionNotes] = useState('');

    const loadModerationData = useCallback(async () => {
        try {
            const [reportsData, kycData, statsData] = await Promise.all([
                apiService.get<Report[]>('/moderation/reports'),
                apiService.get<KycDocument[]>('/moderation/kyc/pending'),
                apiService.get<ModerationStats>('/moderation/stats')
            ]);
            setReports(reportsData);
            setKycDocuments(kycData);
            setStats(statsData);
        } catch (_error) {
            toastService.error(t('moderation.error_loading', 'فشل تحميل بيانات الإشراف'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadModerationData();
    }, [loadModerationData]);

    const handleReportAction = async (reportId: string, action: string) => {
        if (!actionNotes.trim()) {
            toastService.warning(t('moderation.notes_required', 'يرجى إضافة ملاحظات لهذا الإجراء'));
            return;
        }

        try {
            await apiService.patch(`/moderation/reports/id/${reportId}`, {
                action,
                notes: actionNotes
            });
            setShowReportModal(false);
            setSelectedReport(null);
            setActionNotes('');
            void loadModerationData();
        } catch (_error) {
            toastService.error(t('moderation.report_update_error', 'خطأ في تحديث البلاغ'));
        }
    };

    const handleKycReview = async (documentId: string, status: 'approved' | 'rejected') => {
        if (!actionNotes.trim()) {
            toastService.warning(t('moderation.notes_required', 'يرجى إضافة ملاحظات لهذا القرار'));
            return;
        }

        try {
            await apiService.patch(`/moderation/kyc/id/${documentId}`, {
                status,
                notes: actionNotes
            });
            setShowKycModal(false);
            setSelectedKyc(null);
            setActionNotes('');
            void loadModerationData();
        } catch (_error) {
            toastService.error(t('moderation.kyc_review_error', 'خطأ في مراجعة مستند الـ KYC'));
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'resolved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'expired': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return t('moderation.status.pending', 'Pending');
            case 'approved': return t('moderation.status.approved', 'Approved');
            case 'rejected': return t('moderation.status.rejected', 'Rejected');
            case 'resolved': return t('moderation.status.resolved', 'Resolved');
            case 'expired': return t('moderation.status.expired', 'Expired');
            default: return status;
        }
    };

    const getDocumentTypeLabel = (type: string) => {
        switch (type) {
            case 'id_card': return t('moderation.doc_types.id_card', 'ID Card');
            case 'business_license': return t('moderation.doc_types.business_license', 'Business License');
            case 'tax_certificate': return t('moderation.doc_types.tax_certificate', 'Tax Certificate');
            case 'insurance': return t('moderation.doc_types.insurance', 'Insurance');
            case 'portfolio': return t('moderation.doc_types.portfolio', 'Portfolio');
            case 'other': return t('moderation.doc_types.other', 'Other');
            default: return type;
        }
    };

    return (
        <div className="min-h-screen bg-bglight p-5" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{t('moderation.page_title', 'Moderation & KYC')}</h1>
                    <p className="text-gray-600 mt-1">{t('moderation.page_subtitle', 'Manage reports and verify providers')}</p>
                </div>

                {/* Stats Overview */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-3xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{t('moderation.reports', 'Reports')}</h3>
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                    {stats.reports.total} {t('moderation.total', 'total')}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{t('moderation.status.pending', 'Pending')}</span>
                                    <span className="text-sm font-bold text-yellow-600">{stats.reports.pending}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{t('moderation.status.resolved', 'Resolved')}</span>
                                    <span className="text-sm font-bold text-green-600">{stats.reports.resolved}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{t('moderation.kyc_title', 'KYC Verification')}</h3>
                                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                    {stats.kyc.total} {t('moderation.documents', 'documents')}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{t('moderation.status.pending', 'Pending')}</span>
                                    <span className="text-sm font-bold text-yellow-600">{stats.kyc.pending}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{t('moderation.status.approved', 'Approved')}</span>
                                    <span className="text-sm font-bold text-green-600">{stats.kyc.approved}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{t('moderation.status.rejected_f', 'Rejected')}</span>
                                    <span className="text-sm font-bold text-red-600">{stats.kyc.rejected}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{t('moderation.enforcement', 'Enforcement')}</h3>
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                    {t('moderation.current', 'current')}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{t('moderation.banned', 'Banned')}</span>
                                    <span className="text-sm font-bold text-red-600">{stats.enforcement.banned}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{t('moderation.suspended', 'Suspended')}</span>
                                    <span className="text-sm font-bold text-orange-600">{stats.enforcement.suspended}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{t('moderation.quick_actions', 'Quick Actions')}</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setActiveTab('reports')}
                                    className={`p-3 rounded-xl text-center transition-all ${
                                        activeTab === 'reports'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <i className="fa-solid fa-flag text-lg mb-1"></i>
                                    <span className="text-sm font-bold">{t('moderation.reports', 'Reports')}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('kyc')}
                                    className={`p-3 rounded-xl text-center transition-all ${
                                        activeTab === 'kyc'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <i className="fa-solid fa-user-check text-lg mb-1"></i>
                                    <span className="text-sm font-bold">KYC</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('stats')}
                                    className={`p-3 rounded-xl text-center transition-all ${
                                        activeTab === 'stats'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <i className="fa-solid fa-chart-bar text-lg mb-1"></i>
                                    <span className="text-sm font-bold">{t('moderation.stats_tab', 'Statistics')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content based on active tab */}
                {activeTab === 'reports' && (
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('moderation.pending_reports', 'Pending Reports')}</h2>
                        {loading ? (
                            <div className="animate-pulse">
                                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
                                    ))}
                                </div>
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-12">
                                <i className="fa-solid fa-check-circle text-green-500 text-4xl mb-4"></i>
                                <p className="text-gray-500">{t('moderation.no_pending_reports', 'No pending reports')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reports.map((report) => (
                                    <div key={report.id} className="border border-gray-200 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(report.status)}`}>
                                                        {getStatusText(report.status)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(report.created_at).toLocaleDateString(t('common.date_locale', 'ar-EG'))}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-gray-900 mb-1">
                                                    {report.reason}
                                                </p>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {report.description}
                                                </p>
                                                {report.reporter && (
                                                    <p className="text-xs text-gray-500">
                                                        {t('moderation.reported_by', 'Reported by')} {report.reporter.full_name} ({report.reporter.email})
                                                    </p>
                                                )}
                                                {report.evidence_urls && report.evidence_urls.length > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-xs text-gray-500 mb-1">{t('moderation.evidence', 'Evidence')}:</p>
                                                        <div className="flex gap-2">
                                                            {report.evidence_urls.map((url, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline text-xs"
                                                                >
                                                                    {t('moderation.evidence_item', 'Evidence')} {idx + 1}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {report.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedReport(report);
                                                                setShowReportModal(true);
                                                            }}
                                                            className="px-4 py-2 rounded-xl bg-green-100 text-green-700 text-sm font-bold"
                                                        >
                                                            {t('moderation.approve', 'Approve')}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedReport(report);
                                                                setShowReportModal(true);
                                                            }}
                                                            className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-bold"
                                                        >
                                                            {t('moderation.reject', 'Reject')}
                                                        </button>
                                                    </>
                                                )}
                                                {report.status === 'approved' && (
                                                    <span className="px-4 py-2 rounded-xl bg-green-100 text-green-700 text-sm font-bold">
                                                        تمت {t('moderation.approve', 'Approve')}
                                                    </span>
                                                )}
                                                {report.status === 'rejected' && (
                                                    <span className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-bold">
                                                        {t('moderation.already_rejected', 'Already rejected')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'kyc' && (
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('moderation.pending_kyc', 'Pending KYC Documents')}</h2>
                        {loading ? (
                            <div className="animate-pulse">
                                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                                    ))}
                                </div>
                            </div>
                        ) : kycDocuments.length === 0 ? (
                            <div className="text-center py-12">
                                <i className="fa-solid fa-user-check text-green-500 text-4xl mb-4"></i>
                                <p className="text-gray-500">{t('moderation.no_pending_kyc', 'No pending KYC documents')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {kycDocuments.map((doc) => (
                                    <div key={doc.id} className="border border-gray-200 rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(doc.status)}`}>
                                                        {getStatusText(doc.status)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(doc.submitted_at).toLocaleDateString(t('common.date_locale', 'ar-EG'))}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-gray-900 mb-1">
                                                    {getDocumentTypeLabel(doc.document_type)}
                                                </p>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {doc.document_name}
                                                </p>
                                                {doc.provider && (
                                                    <p className="text-xs text-gray-500">
                                                        {t('moderation.provider_label', 'Provider')}: {doc.provider.company_name}
                                                    </p>
                                                )}
                                                <a
                                                    href={doc.document_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block mt-2 text-blue-600 hover:underline text-sm font-bold"
                                                >
                                                    {t('moderation.view_document', 'View Document')}
                                                </a>
                                            </div>
                                            <div className="flex gap-2">
                                                {doc.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedKyc(doc);
                                                                setShowKycModal(true);
                                                            }}
                                                            className="px-4 py-2 rounded-xl bg-green-100 text-green-700 text-sm font-bold"
                                                        >
                                                            {t('moderation.accept', 'Accept')}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedKyc(doc);
                                                                setShowKycModal(true);
                                                            }}
                                                            className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-bold"
                                                        >
                                                            {t('moderation.reject', 'Reject')}
                                                        </button>
                                                    </>
                                                )}
                                                {doc.status === 'approved' && (
                                                    <span className="px-4 py-2 rounded-xl bg-green-100 text-green-700 text-sm font-bold">
                                                        {t('moderation.verified', 'Verified')}
                                                    </span>
                                                )}
                                                {doc.status === 'rejected' && (
                                                    <span className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-bold">
                                                        {t('moderation.rejected_status', 'Rejected')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'stats' && stats && (
                    <div className="bg-white rounded-3xl shadow-sm p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('moderation.stats_title', 'Moderation Statistics')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('moderation.last_30_days', 'Last 30 Days Activity')}</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-bold text-gray-900 mb-2">{t('moderation.reports', 'Reports')}</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('moderation.total_label', 'Total')}</span>
                                                <span className="text-sm font-bold text-gray-900">{stats.reports.total}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('moderation.status.pending', 'Pending')}</span>
                                                <span className="text-sm font-bold text-yellow-600">{stats.reports.pending}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('moderation.status.resolved', 'Resolved')}</span>
                                                <span className="text-sm font-bold text-green-600">{stats.reports.resolved}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-bold text-gray-900 mb-2">KYC</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('moderation.total_label', 'Total')}</span>
                                                <span className="text-sm font-bold text-gray-900">{stats.kyc.total}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('moderation.status.approved', 'Approved')}</span>
                                                <span className="text-sm font-bold text-green-600">{stats.kyc.approved}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('moderation.status.rejected_f', 'Rejected')}</span>
                                                <span className="text-sm font-bold text-red-600">{stats.kyc.rejected}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('moderation.enforcement', 'Enforcement')}</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h4 className="font-bold text-gray-900 mb-2">{t('moderation.enforcement_label', 'Enforcement')}</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('moderation.active_bans', 'Active Bans')}</span>
                                                <span className="text-sm font-bold text-red-600">{stats.enforcement.banned}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('moderation.active_suspensions', 'Active Suspensions')}</span>
                                                <span className="text-sm font-bold text-orange-600">{stats.enforcement.suspended}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Report Modal */}
                {showReportModal && selectedReport && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{t('moderation.mod_action', 'Moderation Action')}</h3>
                                <button
                                    onClick={() => {
                                        setShowReportModal(false);
                                        setSelectedReport(null);
                                        setActionNotes('');
                                    }}
                                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"
                                >
                                    <i className="fa-solid fa-times"></i>
                                </button>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    {t('moderation.report_id', 'Report #')}{selectedReport.id.slice(0, 8)} - {selectedReport.reason}
                                </p>
                                <p className="text-sm text-gray-700">
                                    {selectedReport.description}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('moderation.mod_notes', 'Moderation Notes')}</label>
                                <textarea
                                    value={actionNotes}
                                    onChange={(e) => setActionNotes(e.target.value)}
                                    placeholder={t('moderation.explain_decision', 'Explain your decision...')}
                                    rows={4}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleReportAction(selectedReport.id, 'approve')}
                                    className="flex-1 py-3 rounded-xl bg-green-100 text-green-700 font-bold"
                                >
                                    {t('moderation.approve', 'Approve')}
                                </button>
                                <button
                                    onClick={() => handleReportAction(selectedReport.id, 'reject')}
                                    className="flex-1 py-3 rounded-xl bg-red-100 text-red-700 font-bold"
                                >
                                    {t('moderation.reject', 'Reject')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowReportModal(false);
                                        setSelectedReport(null);
                                        setActionNotes('');
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold"
                                >
                                    {t('common.cancel', 'Cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* KYC Modal */}
                {showKycModal && selectedKyc && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{t('moderation.kyc_review', 'KYC Review')}</h3>
                                <button
                                    onClick={() => {
                                        setShowKycModal(false);
                                        setSelectedKyc(null);
                                        setActionNotes('');
                                    }}
                                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"
                                >
                                    <i className="fa-solid fa-times"></i>
                                </button>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    {t('moderation.kyc_doc_id', 'KYC Doc #')}{selectedKyc.id.slice(0, 8)} - {getDocumentTypeLabel(selectedKyc.document_type)}
                                </p>
                                <p className="text-sm text-gray-700 mb-2">
                                    {selectedKyc.document_name}
                                </p>
                                {selectedKyc.provider && (
                                    <p className="text-xs text-gray-500 mb-2">
                                        {t('moderation.provider_label', 'Provider')}: {selectedKyc.provider.company_name}
                                    </p>
                                )}
                                <a
                                    href={selectedKyc.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block text-blue-600 hover:underline text-sm font-bold mb-2"
                                >
                                    {t('moderation.view_document', 'View Document')}
                                </a>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('moderation.review_notes', 'Review Notes')}</label>
                                <textarea
                                    value={actionNotes}
                                    onChange={(e) => setActionNotes(e.target.value)}
                                    placeholder={t('moderation.explain_decision', 'Explain your decision...')}
                                    rows={4}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleKycReview(selectedKyc.id, 'approved')}
                                    className="flex-1 py-3 rounded-xl bg-green-100 text-green-700 font-bold"
                                >
                                    {t('moderation.approve', 'Approve')}
                                </button>
                                <button
                                    onClick={() => handleKycReview(selectedKyc.id, 'rejected')}
                                    className="flex-1 py-3 rounded-xl bg-red-100 text-red-700 font-bold"
                                >
                                    {t('moderation.reject', 'Reject')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowKycModal(false);
                                        setSelectedKyc(null);
                                        setActionNotes('');
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold"
                                >
                                    {t('common.cancel', 'Cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModerationPage;
