import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { reviewsService, type Review } from '../services/reviews.service';
import { toastService } from '../services/toast.service';
import Pagination from '../components/common/Pagination';

interface ProviderProfileResponse {
    id: string;
    company_name?: string;
    rating_avg?: number;
    review_count?: number;
}

const PAGE_SIZE = 10;

const ProviderReviewsPage = () => {
    const { t, i18n } = useTranslation();
    const [providerId, setProviderId] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string>('');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);

    const locale = i18n.language?.startsWith('ar')
        ? 'ar-EG'
        : i18n.language?.startsWith('en')
            ? 'en-US'
            : 'fr-FR';

    const loadReviews = useCallback(async () => {
        setLoading(true);
        try {
            const profile = await apiService.get<ProviderProfileResponse>('/providers/my-profile');
            if (!profile?.id) {
                throw new Error('Missing provider profile');
            }

            setProviderId(profile.id);
            setCompanyName(profile.company_name || '');

            const data = await reviewsService.getByProvider(profile.id);
            const list = Array.isArray(data) ? data : [];
            setReviews(list);
        } catch (_error) {
            toastService.error(t('provider.profile.error_loading', 'فشل تحميل بيانات المزود'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadReviews();
    }, [loadReviews]);

    useEffect(() => {
        setPage(0);
    }, [reviews.length]);

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
    }, [reviews]);

    const paginatedReviews = reviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="space-y-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('provider_dashboard.reviews', 'التقييمات')}
                    </h1>
                    <p className="text-gray-500">
                        {companyName
                            ? t('provider_reviews.subtitle_with_name', 'آراء العملاء حول خدمات {{name}}', { name: companyName })
                            : t('provider.profile.customer_reviews', 'آراء العملاء')}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-2xl font-bold text-yellow-500">{averageRating.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">{t('provider_dashboard.average_rating', 'متوسط التقييم')}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
                        <p className="text-xs text-gray-500">{t('provider.profile.reviews', 'تقييمات')}</p>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="border-b border-gray-100 bg-gray-50 text-sm font-bold text-gray-700">
                            <tr>
                                <th className="px-6 py-4">{t('common.client_label', 'العميل')}</th>
                                <th className="px-6 py-4">{t('common.rating', 'التقييم')}</th>
                                <th className="px-6 py-4">{t('common.comment', 'التعليق')}</th>
                                <th className="px-6 py-4">{t('common.date', 'التاريخ')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        {t('common.loading', 'جاري التحميل...')}
                                    </td>
                                </tr>
                            ) : paginatedReviews.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        {t('provider.profile.no_reviews', 'لا توجد تقييمات حتى الآن')}
                                    </td>
                                </tr>
                            ) : (
                                paginatedReviews.map((review) => (
                                    <tr key={review.id} className="transition-colors hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                            {review.user_profiles?.full_name || t('common.user', 'مستخدم')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-yellow-500">
                                                <span className="font-bold text-gray-900">{review.rating}</span>
                                                <i className="fa-solid fa-star text-xs"></i>
                                            </div>
                                        </td>
                                        <td className="max-w-xl px-6 py-4 text-sm text-gray-600">
                                            {review.comment || t('common.not_available', 'N/A')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(review.created_at).toLocaleDateString(locale)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {!loading && providerId && (
                <Pagination
                    page={page}
                    total={reviews.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
};

export default ProviderReviewsPage;
