import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { servicesService } from '../services/services.service';
import { reviewsService, type Review } from '../services/reviews.service';
import { messagesService } from '../services/messages.service';
import { bookingsService } from '../services/bookings.service';
import { useAuth } from '../hooks/useAuth';
import { toastService } from '../services/toast.service';
import type { ServiceItem } from '../services/api';
import { getCarouselUrl, getAvatarUrl } from '../utils/image.utils';

const ServiceDetailsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAuthenticated, user } = useAuth();
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [service, setService] = useState<ServiceItem | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [visibleReviews, setVisibleReviews] = useState(3);
    const [loading, setLoading] = useState(true);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [submitting, setSubmitting] = useState(false);
    const [contacting, setContacting] = useState(false);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingNotes, setBookingNotes] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [isFavorite] = useState(false);
    const [togglingFav, setTogglingFav] = useState(false);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (service) {
            document.title = `${service.title} | ${t('service.listing.title')} | DOUSHA`;
        } else {
            document.title = `${t('service.listing.title')} | DOUSHA`;
        }
    }, [service, t]);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        servicesService.findById(id)
            .then((data: any) => setService(data?.data || data))
            .catch(() => toastService.error('فشل تحميل تفاصيل الخدمة'))
            .finally(() => setLoading(false));
        loadReviews();
        if (isAuthenticated) {
            // favoritesService.check(id) - service removed
            // .then((data: any) => setIsFavorite(data?.isFavorite || false))
            // .catch(() => { });
        }
    }, [id, isAuthenticated]);

    const handleToggleFavorite = async () => {
        if (!isAuthenticated) { navigate('/auth/login'); return; }
        if (!id) return;
        setTogglingFav(true);
        try {
            toastService.info('المفضلة غير متاحة حالياً');
            // if (isFavorite) {
            //     await favoritesService.remove(id);
            //     setIsFavorite(false);
            //     toastService.success('تم الحذف من المفضلة');
            // } else {
            //     await favoritesService.add(id);
            //     setIsFavorite(true);
            //     toastService.success('تم الإضافة إلى المفضلة');
            // }
        } catch (err: any) {
            toastService.error(err?.message || 'فشل تحديث المفضلة');
        } finally {
            setTogglingFav(false);
        }
    };

    const loadReviews = () => {
        if (!id) return;
        reviewsService.getByService(id)
            .then(data => { if (Array.isArray(data)) setReviews(data); })
            .catch(() => { });
    };

    const handleContact = async () => {
        if (!isAuthenticated) { navigate('/auth/login'); return; }
        if (!service) return;
        setContacting(true);
        try {
            const providerUserId = (service as any).providers?.user_id || service.provider_id;
            await messagesService.createConversation(
                providerUserId,
                `مرحباً، أود الاستفسار عن خدمة: ${service.title}`
            );
            const basePath = user?.role === 'provider' ? '/provider' : '/client';
            navigate(`${basePath}/messages`);
            toastService.success('تم إنشاء المحادثة');
        } catch {
            toastService.error('فشل إنشاء المحادثة');
        } finally {
            setContacting(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!id || !isAuthenticated) return;
        setSubmitting(true);
        try {
            await reviewsService.create({ service_id: id, rating: reviewForm.rating, comment: reviewForm.comment });
            setReviewForm({ rating: 5, comment: '' });
            loadReviews();
        } catch (err) {
            toastService.error('فشل إرسال التقييم');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bglight font-tajawal">
                <p className="text-gray-400">{t('common.loading')}...</p>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-bglight font-tajawal">
                <p className="text-gray-500 mb-4">{t('service.listing.no_services')}</p>
                <button onClick={() => navigate('/services')} className="px-4 py-2 bg-primary text-white rounded-xl">{t('common.back_to_services') || 'العودة للخدمات'}</button>
            </div>
        );
    }

    const images = service.images?.length ? service.images : ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'];
    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-24">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 shadow-sm">
                <div className="px-5 py-4 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                        <i className="fa-solid fa-arrow-right text-gray-700"></i>
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">{t('service.listing.title')}</h1>
                    <button
                        onClick={handleToggleFavorite}
                        disabled={togglingFav}
                        className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center transition-transform active:scale-90"
                    >
                        <i className={`${isFavorite ? 'fa-solid' : 'fa-regular'} fa-heart text-red-500 ${togglingFav ? 'opacity-50' : ''}`}></i>
                    </button>
                </div>
            </header>

            <main>
                {/* Gallery */}
                <section className="relative">
                    <div className="h-[350px] overflow-hidden">
                        <img
                            className="w-full h-full object-cover"
                            src={getCarouselUrl(images[activeImageIndex])}
                            alt={service.title}
                            loading="lazy"
                        />
                    </div>
                    {images.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                            {images.map((_: string, idx: number) => (
                                <button key={idx} onClick={() => setActiveImageIndex(idx)}
                                    className={`rounded-full h-2 shadow-sm transition-all ${activeImageIndex === idx ? 'bg-white w-6' : 'bg-white/50 w-2'}`}
                                />
                            ))}
                        </div>
                    )}
                    {service.is_featured && (
                        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-accent shadow-sm">
                            <span className="text-xs font-bold text-gray-900"><i className="fa-solid fa-crown mx-1"></i>{t('service.listing.featured_title')}</span>
                        </div>
                    )}
                </section>

                {/* Service Info */}
                <section className="bg-white px-5 py-5 rounded-b-3xl shadow-sm mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{service.title}</h2>
                    <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1">
                            <i className="fa-solid fa-star text-accent"></i>
                            <span className="text-lg font-bold text-gray-900">{avgRating}</span>
                            <span className="text-sm text-gray-500">({reviews.length} {t('service.details.reviews')})</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bglight">
                            <i className="fa-solid fa-tag text-primary text-sm"></i>
                            <span className="text-sm text-gray-700">{service.base_price} QR</span>
                        </div>
                        {service.duration_minutes && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bglight">
                                <i className="fa-solid fa-clock text-primary text-sm"></i>
                                <span className="text-sm text-gray-700">{service.duration_minutes} {t('service.details.duration_unit') || 'دقيقة'}</span>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                const url = window.location.href;
                                if (navigator.share) {
                                    navigator.share({ title: service.title, text: service.description, url });
                                } else {
                                    navigator.clipboard.writeText(url);
                                    toastService.success(t('common.link_copied') || 'تم نسخ الرابط');
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bglight hover:bg-gray-200 transition-colors me-auto"
                        >
                            <i className="fa-solid fa-share-nodes text-primary text-sm"></i>
                            <span className="text-sm text-gray-700">{t('common.share')}</span>
                        </button>
                    </div>
                </section>

                {/* Provider Info */}
                {(service as any).providers && (
                    <section className="px-5 py-5 bg-white mb-2">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">{t('service.details.about_provider') || 'عن مقدم الخدمة'}</h3>
                        <div className="flex items-center gap-4 p-4 bg-bglight rounded-2xl">
                            {(service as any).providers.avatar_url ? (
                                <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                                    <img
                                        src={getAvatarUrl((service as any).providers.avatar_url)}
                                        alt={(service as any).providers.company_name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </div>
                            ) : (
                                <div className="w-14 h-14 rounded-2xl gradient-purple flex items-center justify-center flex-shrink-0">
                                    <i className="fa-solid fa-store text-white text-xl"></i>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-bold text-gray-900 truncate">{(service as any).providers.company_name || t('service.details.provider')}</p>
                                    {(service as any).providers.is_verified && (
                                        <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                            <i className="fa-solid fa-circle-check text-[10px]"></i>{t('common.verified') || 'موثق'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    {(service as any).providers.rating_avg > 0 && (
                                        <span className="flex items-center gap-1">
                                            <i className="fa-solid fa-star text-accent"></i>
                                            <span className="font-bold text-gray-700">{Number((service as any).providers.rating_avg).toFixed(1)}</span>
                                        </span>
                                    )}
                                    {(service as any).providers.city && (
                                        <span className="flex items-center gap-1">
                                            <i className="fa-solid fa-location-dot text-primary"></i>
                                            {(service as any).providers.city}
                                        </span>
                                    )}
                                    {(service as any).providers.review_count > 0 && (
                                        <span>{(service as any).providers.review_count} {t('service.details.reviews')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* About */}
                <section className="px-5 py-5 bg-white mb-2">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{t('common.about')}</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                        {service.description}
                    </p>
                </section>

                {/* Booking Section */}
                <section className="px-5 py-5 bg-white mb-2">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        <i className="fa-solid fa-calendar-check text-primary mx-2"></i>
                        {t('service.details.book_now')}
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('bookings.event_date')} *</label>
                            <input
                                type="date"
                                value={bookingDate}
                                min={today}
                                onChange={e => setBookingDate(e.target.value)}
                                className="w-full h-12 bg-bglight rounded-2xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('bookings.notes')} ({t('common.optional') || 'اختياري'})</label>
                            <textarea
                                value={bookingNotes}
                                onChange={e => setBookingNotes(e.target.value)}
                                rows={2}
                                placeholder={t('bookings.notes_placeholder') || 'أي تفاصيل أو متطلبات خاصة...'}
                                className="w-full bg-bglight rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border-none resize-none"
                            />
                        </div>
                        <div className="bg-bglight rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500">{t('service.details.base_price') || 'السعر الأساسي'}</p>
                                <p className="text-xl font-bold text-primary">{service.base_price.toLocaleString()} QR</p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!isAuthenticated) { navigate('/auth/login'); return; }
                                    if (!bookingDate) { toastService.error(t('bookings.errors.select_date') || 'يرجى اختيار تاريخ الفعالية'); return; }
                                    setBookingLoading(true);
                                    try {
                                        const booking = await bookingsService.create({
                                            service_id: service.id,
                                            provider_id: service.provider_id,
                                            booking_date: bookingDate,
                                            amount: service.base_price,
                                            notes: bookingNotes || undefined,
                                        });
                                        const bookingData = (booking as any)?.data || booking;
                                        toastService.success('تم إنشاء الحجز بنجاح');
                                        navigate(`/client/payment/${bookingData.id}`);
                                    } catch {
                                        toastService.error('فشل إنشاء الحجز');
                                    } finally {
                                        setBookingLoading(false);
                                    }
                                }}
                                disabled={bookingLoading}
                                className="px-6 py-3 rounded-2xl gradient-purple text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {bookingLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-calendar-plus mx-1"></i>}
                                {t('service.details.book_now')}
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate(`/client/messages?providerId=${service.provider_id}&autoStart=true`)}
                                className="flex-1 px-6 py-4 rounded-2xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fa-regular fa-comment-dots"></i>
                                {t('common.contact')}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Reviews Section */}
                <section className="px-5 py-5 bg-white mb-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">{t('service.details.reviews')} ({reviews.length})</h3>
                        <div className="flex items-center gap-1">
                            <i className="fa-solid fa-star text-accent"></i>
                            <span className="font-bold">{avgRating}</span>
                        </div>
                    </div>

                    {reviews.length === 0 ? (
                        <p className="text-center text-gray-400 py-4 text-sm">{t('service.details.no_reviews')}</p>
                    ) : (
                        <div className="mb-4">
                            <div className="space-y-3">
                                {reviews.slice(0, visibleReviews).map((rev) => (
                                    <div key={rev.id} className="bg-bglight/50 rounded-2xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-primary font-bold text-sm">
                                                    {(rev.user_profiles?.full_name || '?').charAt(0)}
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm">{rev.user_profiles?.full_name || t('common.user')}</span>
                                            </div>
                                            <div className="flex text-accent text-xs">
                                                {[...Array(rev.rating)].map((_, i) => <i key={i} className="fa-solid fa-star"></i>)}
                                            </div>
                                        </div>
                                        {rev.comment && <p className="text-sm text-gray-700">{rev.comment}</p>}
                                        <p className="text-xs text-gray-400 mt-2">{new Date(rev.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                            {reviews.length > 3 && (
                                <button
                                    onClick={() => setVisibleReviews(v => v >= reviews.length ? 3 : v + 3)}
                                    className="w-full mt-3 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    {visibleReviews >= reviews.length ? (
                                        <><i className="fa-solid fa-chevron-up"></i> {t('common.show_less') || 'عرض أقل'}</>
                                    ) : (
                                        <><i className="fa-solid fa-chevron-down"></i> {t('service.listing.load_more')} ({reviews.length - visibleReviews})</>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Add Review Form */}
                    {isAuthenticated && (
                        <div className="border-t border-gray-100 pt-4">
                            <h4 className="font-bold text-gray-900 text-sm mb-3">{t('service.details.add_review') || 'أضف تقييمك'}</h4>
                            <div className="flex items-center gap-1 mb-3">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} onClick={() => setReviewForm(f => ({ ...f, rating: star }))}
                                        className={`text-xl ${star <= reviewForm.rating ? 'text-accent' : 'text-gray-300'}`}>
                                        <i className="fa-solid fa-star"></i>
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={reviewForm.comment}
                                onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                                placeholder={t('service.details.review_placeholder') || 'اكتب تعليقك...'}
                                className="w-full h-20 rounded-xl bg-bglight p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-3"
                            />
                            <button onClick={handleSubmitReview} disabled={submitting}
                                className="px-6 py-2 rounded-xl gradient-purple text-white text-sm font-bold disabled:opacity-50">
                                {submitting ? `${t('common.sending')}...` : t('service.details.submit_review')}
                            </button>
                        </div>
                    )}
                </section>
            </main>

            {/* Floating Bottom Action */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-50 flex items-center gap-3 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="flex-1">
                    <p className="text-xs text-gray-600">{t('service.details.price_from')}</p>
                    <p className="text-xl font-bold text-primary">{service.base_price?.toLocaleString()} QR</p>
                </div>
                <button
                    onClick={handleContact}
                    disabled={contacting}
                    className="px-4 py-3 rounded-xl border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    <i className="fa-solid fa-comment-dots"></i>
                    {t('service.details.contact')}
                </button>
                <button onClick={async () => {
                    if (!isAuthenticated) { navigate('/auth/login'); return; }
                    if (!bookingDate) {
                        toastService.error('يرجى اختيار تاريخ الفعالية أعلاه');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        return;
                    }
                    setBookingLoading(true);
                    try {
                        const booking = await bookingsService.create({
                            service_id: service.id,
                            provider_id: service.provider_id,
                            booking_date: bookingDate,
                            amount: service.base_price,
                            notes: bookingNotes || undefined,
                        });
                        const bookingData = (booking as any)?.data || booking;
                        toastService.success('تم إنشاء الحجز بنجاح');
                        navigate(`/client/payment/${bookingData.id}`);
                    } catch {
                        toastService.error('فشل إنشاء الحجز');
                    } finally {
                        setBookingLoading(false);
                    }
                }}
                    disabled={bookingLoading}
                    className="px-6 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg card-hover text-sm disabled:opacity-50">
                    {bookingLoading ? <><i className="fa-solid fa-spinner fa-spin me-1"></i> جاري...</> : t('service.details.book_now')}
                </button>
            </div>
        </div>
    );
};

export default ServiceDetailsPage;
