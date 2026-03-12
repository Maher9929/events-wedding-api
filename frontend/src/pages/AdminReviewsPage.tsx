import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { toastService } from '../services/toast.service';

const AdminReviewsPage = () => {
    const { t } = useTranslation();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const data: any = await apiService.get('/reviews');
            const list = Array.isArray(data) ? data : data?.data || [];
            setReviews(list);
        } catch (error) {
            toastService.error(t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReview = async (id: string) => {
        if (!window.confirm(t('common.admin.confirm_delete'))) return;
        try {
            await apiService.delete(`/reviews/${id}`);
            setReviews(prev => prev.filter(r => r.id !== id));
            toastService.success(t('common.admin.success_delete'));
        } catch (error) {
            toastService.error(t('common.error_deleting'));
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('common.admin.reviews')}</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 text-sm">
                            <tr>
                                <th className="px-6 py-4">الخدمة</th>
                                <th className="px-6 py-4">العميل</th>
                                <th className="px-6 py-4">التقييم</th>
                                <th className="px-6 py-4">التعليق</th>
                                <th className="px-6 py-4 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center">جاري التحميل...</td></tr>
                            ) : reviews.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">{t('common.no_results')}</td></tr>
                            ) : (
                                reviews.map(review => (
                                    <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{review.service?.title || '—'}</td>
                                        <td className="px-6 py-4 text-gray-600">{review.user?.full_name || review.user?.email}</td>
                                        <td className="px-6 py-4 text-yellow-500 font-bold">{review.rating} ⭐</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{review.comment}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleDeleteReview(review.id)} className="text-red-400 hover:text-red-600 p-2">
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

export default AdminReviewsPage;
