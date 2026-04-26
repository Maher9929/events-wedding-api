import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { uploadService } from '../services/upload.service';
import { toastService } from '../services/toast.service';

interface KycDocument {
    id: string;
    document_type: string;
    file_url: string;
    original_name?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewer_notes?: string;
    reviewed_at?: string;
    created_at: string;
}

const DOCUMENT_TYPES = [
    { value: 'id_card', icon: 'fa-id-card', labelKey: 'kyc.doc_type.id_card', fallback: 'بطاقة الهوية' },
    { value: 'business_license', icon: 'fa-file-certificate', labelKey: 'kyc.doc_type.business_license', fallback: 'رخصة تجارية' },
    { value: 'business_registration', icon: 'fa-file-invoice', labelKey: 'kyc.doc_type.business_registration', fallback: 'قيد المنشأة' },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; labelKey: string; fallback: string }> = {
    pending: { color: 'text-yellow-700', bg: 'bg-yellow-100', icon: 'fa-clock', labelKey: 'kyc.status.pending', fallback: 'قيد المراجعة' },
    approved: { color: 'text-green-700', bg: 'bg-green-100', icon: 'fa-circle-check', labelKey: 'kyc.status.approved', fallback: 'مقبول' },
    rejected: { color: 'text-red-700', bg: 'bg-red-100', icon: 'fa-circle-xmark', labelKey: 'kyc.status.rejected', fallback: 'مرفوض' },
};

const ProviderVerificationPage = () => {
    const { t } = useTranslation();
    const [documents, setDocuments] = useState<KycDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);

    const loadDocuments = useCallback(async () => {
        try {
            const data = await apiService.get<KycDocument[]>('/providers/kyc/my-documents');
            setDocuments(Array.isArray(data) ? data : []);
        } catch {
            toastService.error(t('kyc.load_error', 'فشل تحميل المستندات'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        document.title = `${t('kyc.page_title', 'التحقق')} | DOUSHA`;
        void loadDocuments();
    }, [t, loadDocuments]);

    const handleUpload = async (docType: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            if (file.size > 10 * 1024 * 1024) {
                toastService.error(t('kyc.file_too_large', 'الملف كبير جداً (الحد الأقصى 10 ميغابايت)'));
                return;
            }

            setUploading(docType);
            try {
                const urls = await uploadService.uploadMultiple([file], 'kyc-documents');
                if (urls.length === 0) throw new Error('Upload failed');

                await apiService.post('/providers/kyc', {
                    document_type: docType,
                    file_url: urls[0],
                    original_name: file.name,
                });

                toastService.success(t('kyc.upload_success', 'تم رفع المستند بنجاح'));
                await loadDocuments();
            } catch {
                toastService.error(t('kyc.upload_error', 'فشل رفع المستند'));
            } finally {
                setUploading(null);
            }
        };
        input.click();
    };

    const getDocForType = (type: string) => documents.find(d => d.document_type === type);

    const allApproved = DOCUMENT_TYPES.every(dt => getDocForType(dt.value)?.status === 'approved');
    const anyPending = documents.some(d => d.status === 'pending');
    const anyRejected = documents.some(d => d.status === 'rejected');

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    <i className="fa-solid fa-shield-check text-primary mx-2"></i>
                    {t('kyc.page_title', 'التحقق من الهوية')}
                </h1>
                <p className="text-gray-500 mt-1 text-sm">{t('kyc.page_subtitle', 'قم برفع المستندات المطلوبة للحصول على شارة التحقق')}</p>
            </div>

            {/* Status Banner */}
            {allApproved && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <i className="fa-solid fa-circle-check text-green-500 text-2xl"></i>
                    <div>
                        <p className="font-bold text-green-800">{t('kyc.verified_title', 'حسابك موثق!')}</p>
                        <p className="text-sm text-green-600">{t('kyc.verified_desc', 'تم التحقق من جميع مستنداتك. شارة التحقق الخضراء ظاهرة للعملاء.')}</p>
                    </div>
                </div>
            )}
            {anyPending && !allApproved && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <i className="fa-solid fa-clock text-yellow-500 text-2xl"></i>
                    <div>
                        <p className="font-bold text-yellow-800">{t('kyc.pending_title', 'قيد المراجعة')}</p>
                        <p className="text-sm text-yellow-600">{t('kyc.pending_desc', 'مستنداتك قيد المراجعة. عادة تستغرق المراجعة 24-48 ساعة.')}</p>
                    </div>
                </div>
            )}
            {anyRejected && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <i className="fa-solid fa-circle-exclamation text-red-500 text-2xl"></i>
                    <div>
                        <p className="font-bold text-red-800">{t('kyc.rejected_title', 'مستند مرفوض')}</p>
                        <p className="text-sm text-red-600">{t('kyc.rejected_desc', 'بعض مستنداتك تم رفضها. يرجى مراجعة الملاحظات وإعادة الرفع.')}</p>
                    </div>
                </div>
            )}

            {/* Document Cards */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                            <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {DOCUMENT_TYPES.map(docType => {
                        const doc = getDocForType(docType.value);
                        const status = doc ? STATUS_CONFIG[doc.status] : null;
                        const isUploading = uploading === docType.value;

                        return (
                            <div key={docType.value} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${doc?.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <i className={`fa-solid ${docType.icon} text-xl`}></i>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{t(docType.labelKey, docType.fallback)}</h3>
                                            {doc && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {doc.original_name || t('kyc.uploaded', 'تم الرفع')} — {new Date(doc.created_at).toLocaleDateString('ar')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {status && (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${status.color} ${status.bg}`}>
                                            <i className={`fa-solid ${status.icon} text-[10px]`}></i>
                                            {t(status.labelKey, status.fallback)}
                                        </span>
                                    )}
                                </div>

                                {/* Reviewer notes for rejected docs */}
                                {doc?.status === 'rejected' && doc.reviewer_notes && (
                                    <div className="mt-3 bg-red-50 rounded-xl p-3 text-sm text-red-700">
                                        <i className="fa-solid fa-comment-dots mx-1"></i>
                                        {doc.reviewer_notes}
                                    </div>
                                )}

                                {/* Upload button */}
                                {(!doc || doc.status === 'rejected') && (
                                    <button
                                        onClick={() => handleUpload(docType.value)}
                                        disabled={isUploading}
                                        className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-bold"
                                    >
                                        {isUploading ? (
                                            <><i className="fa-solid fa-spinner fa-spin"></i> {t('kyc.uploading', 'جاري الرفع...')}</>
                                        ) : (
                                            <><i className="fa-solid fa-cloud-arrow-up"></i> {doc ? t('kyc.reupload', 'إعادة الرفع') : t('kyc.upload', 'رفع المستند')}</>
                                        )}
                                    </button>
                                )}

                                {/* View link for uploaded docs */}
                                {doc && doc.file_url && (
                                    <a
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        <i className="fa-solid fa-external-link"></i>
                                        {t('kyc.view_document', 'عرض المستند')}
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <h4 className="font-bold text-blue-800 text-sm mb-2">
                    <i className="fa-solid fa-info-circle mx-1"></i>
                    {t('kyc.info_title', 'معلومات مهمة')}
                </h4>
                <ul className="text-xs text-blue-700 space-y-1.5">
                    <li>• {t('kyc.info_1', 'جميع المستندات مطلوبة للحصول على شارة التحقق')}</li>
                    <li>• {t('kyc.info_2', 'يجب أن تكون الصور واضحة وصالحة')}</li>
                    <li>• {t('kyc.info_3', 'مدة المراجعة: 24-48 ساعة عمل')}</li>
                    <li>• {t('kyc.info_4', 'الخدمات تكون مخفية حتى يتم التحقق من حسابك')}</li>
                </ul>
            </div>
        </div>
    );
};

export default ProviderVerificationPage;
