import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { apiService } from '../services/api';
import type { Review } from '../services/reviews.service';
import { toastService } from '../services/toast.service';
import Pagination from '../components/common/Pagination';

type AdminReview = Review & {
    service?: { title?: string };
    user?: { full_name?: string; email?: string };
};

const AdminReviewsPage = () => {
    const { t } = useTranslation();
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const PAGE_SIZE = 10;

    const loadReviews = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.get<{ data?: AdminReview[] } | AdminReview[]>('/reviews');
            const list = Array.isArray(data) ? data : data?.data || [];
            setReviews(list);
        } catch (_error) {
            toastService.error(t('common.admin.reviews_load_error', 'Failed to load reviews'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadReviews();
    }, [loadReviews]);
    const paginatedReviews = reviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const handleDeleteReview = async (id: string) => {
        const ok = await confirm({
            title: t('common.admin.confirm_delete', 'Delete Review'),
            message: t('common.admin.confirm_delete_review_msg', 'Are you sure you want to delete this review?'),
            confirmLabel: t('common.delete', 'Delete'),
            cancelLabel: t('common.cancel', 'Cancel'),
        });

        if (!ok) return;

        try {
            await apiService.delete(`/reviews/id/${id}`);
            setReviews(prev => prev.filter(review => review.id !== id));
            toastService.success(t('common.admin.review_delete_success', 'Review deleted successfully'));
        } catch (_error) {
            toastService.error(t('common.admin.review_delete_error', 'Failed to delete review'));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('common.admin.reviews', 'Reviews')}</h1>
                <p className="text-gray-500">{t('common.admin.reviews_subtitle', 'Moderate and manage reviews submitted across the platform.')}</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-100 bg-gray-50 text-sm font-bold text-gray-700">
                            <tr>
                                <th className="px-6 py-4">{t('common.service_label', 'Service')}</th>
                                <th className="px-6 py-4">{t('common.client_label', 'Client')}</th>
                                <th className="px-6 py-4">{t('common.rating', 'Rating')}</th>
                                <th className="px-6 py-4">{t('common.comment', 'Comment')}</th>
                                <th className="px-6 py-4 text-center">{t('common.actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                                        {t('common.loading', 'Loading...')}
                                    </td>
                                </tr>
                            ) : reviews.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        {t('common.no_results', 'No results found')}
                                    </td>
                                </tr>
                            ) : (
                                paginatedReviews.map(review => (
                                    <tr key={review.id} className="transition-colors hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-800">{review.service?.title || t('common.not_available', 'N/A')}</td>
                                        <td className="px-6 py-4 text-gray-600">{review.user?.full_name || review.user?.email || t('common.not_available', 'N/A')}</td>
                                        <td className="px-6 py-4 font-bold text-yellow-500">{review.rating} ★</td>
                                        <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500">{review.comment}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDeleteReview(review.id)}
                                                className="p-2 text-red-400 transition-colors hover:text-red-600"
                                                title={t('common.delete', 'Delete')}
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

            <Pagination
                page={page}
                total={reviews.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
            />

            <ConfirmDialogComponent />
        </div>
    );
};

export default AdminReviewsPage;
