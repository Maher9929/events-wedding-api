import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { reviewsService, type Review } from '../services/reviews.service';
import type { Provider } from '../services/api';
import { getThumbnailUrl } from '../utils/image.utils';
import { toastService } from '../services/toast.service';

type TabKey = 'about' | 'portfolio' | 'reviews' | 'availability';

const ProviderProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('about');

    useEffect(() => {
        if (!id) return;
        const loadProvider = async () => {
            try {
                const [providerData, reviewsData] = await Promise.all([
                    apiService.get<Provider>(`/providers/id/${id}`),
                    reviewsService.getByProvider(id)
                ]);
                const reviewArray = Array.isArray(reviewsData) ? reviewsData : (reviewsData as any)?.data || [];
                setProvider(providerData as Provider);
                setReviews(reviewArray);
            } catch (_error) {
                toastService.error(t('provider.profile.error_loading', 'فشل تحميل بيانات المزود'));
            } finally {
                setLoading(false);
            }
        };
        loadProvider();
    }, [id, t]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bglight p-5" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-3xl mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (!provider) {
        return (
            <div className="min-h-screen bg-bglight flex items-center justify-center p-5" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{t('provider.profile.not_found', 'مزود الخدمة غير موجود')}</h2>
                    <button onClick={() => navigate(-1)} className="text-primary font-bold">
                        {t('common.back', 'عودة')}
                    </button>
                </div>
            </div>
        );
    }

    const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0;

    return (
        <div className="min-h-screen bg-bglight" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="relative">
                {provider.portfolio_images && provider.portfolio_images.length > 0 && (
                    <img
                        src={getThumbnailUrl(provider.portfolio_images[0])}
                        alt="Cover"
                        className="w-full h-48 object-cover"
                        loading="lazy"
                    />
                )}
                <button onClick={() => navigate(-1)} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <i className="fa-solid fa-arrow-right text-gray-700"></i>
                </button>
            </div>

            <div className="px-5 pb-5">
                <div className="bg-white rounded-3xl shadow-sm p-5 -mt-8 relative gap-y-4 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">{provider.company_name || provider.business_name}</h1>
                            <p className="text-sm text-gray-600 mb-2">{provider.city}, {provider.region}</p>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-sm">
                                    <i className="fa-solid fa-star text-accent"></i>
                                    <span className="font-bold">{averageRating.toFixed(1)}</span>
                                    <span className="text-gray-500">({reviews.length} {t('provider.profile.reviews', 'تقييمات')})</span>
                                </span>
                                {provider.is_verified && (
                                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                        <i className="fa-solid fa-check-circle"></i>
                                        {t('common.verified', 'موثق')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-primary">
                                {provider.min_price || 0} - {provider.max_price || 0} {t('common.currency', 'ر.ق')}
                            </p>
                            <p className="text-xs text-gray-500">{t('provider.profile.per_event', 'لكل مناسبة')}</p>
                        </div>
                    </div>

                    <p className="text-gray-700 mb-4">{provider.description}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <i className="fa-solid fa-users text-primary text-lg mb-1"></i>
                            <p className="text-xs text-gray-500">{t('provider.profile.max_capacity', 'السعة القصوى')}</p>
                            <p className="font-bold text-gray-900">{provider.max_capacity || 'N/A'}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <i className="fa-solid fa-briefcase text-primary text-lg mb-1"></i>
                            <p className="text-xs text-gray-500">{t('provider.profile.experience', 'الخبرة')}</p>
                            <p className="font-bold text-gray-900">{provider.years_experience || 0} {t('provider.profile.years', 'سنوات')}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <i className="fa-solid fa-clock text-primary text-lg mb-1"></i>
                            <p className="text-xs text-gray-500">{t('provider.profile.response_time', 'وقت الاستجابة')}</p>
                            <p className="font-bold text-gray-900">{provider.avg_response_minutes ? `${Math.round(provider.avg_response_minutes / 60)}${t('common.hours_suffix', 'س')}` : `${provider.response_time_hours || 24}${t('common.hours_suffix', 'س')}`}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <i className="fa-solid fa-chart-line text-primary text-lg mb-1"></i>
                            <p className="text-xs text-gray-500">{t('provider.profile.response_rate', 'معدل الاستجابة')}</p>
                            <p className={`font-bold ${(provider.response_rate || 0) >= 80 ? 'text-green-600' : (provider.response_rate || 0) >= 50 ? 'text-amber-600' : 'text-gray-900'}`}>{provider.response_rate || 0}%</p>
                        </div>
                    </div>

                    {(provider.categories?.length || provider.event_styles?.length) ? (
                        <div className="mb-4">
                            {(provider.categories && provider.categories.length > 0) && (
                                <div className="mb-3">
                                    <p className="text-xs font-bold text-gray-500 mb-2">{t('provider.profile.categories', 'الفئات')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {provider.categories.map((cat: string) => (
                                            <span key={cat} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(provider.event_styles && provider.event_styles.length > 0) && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-2">{t('provider.profile.styles', 'أنماط المناسبات')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {provider.event_styles.map((style: string) => (
                                            <span key={style} className="px-3 py-1 rounded-full bg-purple-100/50 text-purple-600 text-xs font-bold">
                                                {style}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}

                    {provider.languages && provider.languages.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-bold text-gray-500 mb-2">{t('provider.profile.languages', 'اللغات')}</p>
                            <div className="flex flex-wrap gap-2">
                                {provider.languages.map((lang: string) => (
                                    <span key={lang} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                                        {lang.toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 mt-auto">
                        <button
                            onClick={() => navigate(`/client/messages?providerId=${provider.user_id}&autoStart=true`)}
                            className="flex-1 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg"
                        >
                            {t('provider.profile.contact', 'تواصل')}
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 mt-5 mb-4 overflow-x-auto">
                    {[
                        { key: 'about', label: t('common.about', 'حول'), icon: 'fa-info-circle' },
                        { key: 'portfolio', label: t('provider.profile.portfolio', 'المعرض'), icon: 'fa-images' },
                        { key: 'reviews', label: t('provider.profile.reviews', 'تقييمات'), icon: 'fa-star' },
                        { key: 'availability', label: t('provider.profile.availability', 'التوفر'), icon: 'fa-calendar' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as TabKey)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === tab.key
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-gray-600'
                                }`}
                        >
                            <i className={`fa-solid ${tab.icon} text-xs`}></i>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-3xl shadow-sm p-5">
                    {activeTab === 'about' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">{t('common.about', 'حول')}</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{provider.description}</p>
                            {provider.website && (
                                <div className="mt-4">
                                    <a
                                        href={provider.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary font-bold flex items-center gap-2"
                                    >
                                        <i className="fa-solid fa-globe"></i>
                                        {t('provider.profile.website', 'الموقع الإلكتروني')}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'portfolio' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">{t('provider.profile.portfolio', 'المعرض')}</h3>
                            {provider.portfolio_images && provider.portfolio_images.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {provider.portfolio_images.map((img: string, idx: number) => (
                                        <img
                                            key={idx}
                                            src={getThumbnailUrl(img)}
                                            alt={`Portfolio ${idx + 1}`}
                                            className="w-full h-32 object-cover rounded-xl"
                                            loading="lazy"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">{t('provider.profile.no_portfolio', 'لا توجد صور في المعرض')}</p>
                            )}
                            {provider.video_url && (
                                <div className="mt-4">
                                    <a
                                        href={provider.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary font-bold flex items-center gap-2"
                                    >
                                        <i className="fa-solid fa-play-circle"></i>
                                        {t('provider.profile.watch_video', 'شاهد الفيديو')}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">{t('provider.profile.customer_reviews', 'آراء العملاء')}</h3>
                            {reviews.length > 0 ? (
                                <div className="space-y-4">
                                    {reviews.map(review => (
                                        <div key={review.id} className="border-b pb-4 last:border-b-0 border-gray-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <i className="fa-solid fa-user text-primary text-xs"></i>
                                                    </div>
                                                    <span className="font-bold text-gray-900">{review.user_profiles?.full_name || t('common.user', 'مستخدم')}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <i className="fa-solid fa-star text-accent text-xs"></i>
                                                    <span className="text-sm font-bold">{review.rating}</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-700 text-sm">{review.comment}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">{t('provider.profile.no_reviews', 'لا توجد تقييمات حتى الآن')}</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'availability' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">{t('provider.profile.availability', 'التوفر')}</h3>
                            <p className="text-gray-500 text-center py-8">
                                {t('provider.profile.contact_for_availability', 'يرجى التواصل مع المزود لمعرفة التوفر')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderProfilePage;
