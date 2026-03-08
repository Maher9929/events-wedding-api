import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categoriesService } from '../services/categories.service';
import { servicesService } from '../services/services.service';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Category, ServiceItem } from '../services/api';
import { getCarouselUrl, getThumbnailUrl } from '../utils/image.utils';

const HomePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [featuredServices, setFeaturedServices] = useState<ServiceItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [stats, setStats] = useState({ providers: 0, services: 0, events: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = `${t('home.hero.title')} | DOUSHA`;
    }, [t]);

    useEffect(() => {
        Promise.allSettled([
            categoriesService.getAll().then((data: any) => {
                const list = Array.isArray(data) ? data : data?.data || [];
                setCategories(list.slice(0, 8));
            }),
            servicesService.getFeatured(6).then((data: any) => {
                const list = Array.isArray(data) ? data : data?.data || [];
                setFeaturedServices(list.slice(0, 6));
            }),
            apiService.get<any>('/stats').then((d: any) => {
                setStats({
                    providers: d?.providers || 0,
                    services: d?.services || 0,
                    events: d?.total_events || d?.completed_bookings || 0,
                });
            }),
        ]);

        if (isAuthenticated) {
            apiService.get<any>('/notifications/unread-count')
                .then((data: any) => setUnreadCount(data?.count || data?.data?.count || 0))
                .catch(() => { });
        }
    }, [isAuthenticated]);

    return (
        <>
            <header id="header" className="glass-effect sticky top-0 z-50 shadow-sm">
                <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
                                <i className="fa-solid fa-sparkles text-white text-lg"></i>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">DOUSHA</h1>
                                <p className="text-xs text-gray-500">{t('home.hero.subtitle')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {isAuthenticated ? (
                                <Link
                                    to={user?.role === 'provider' ? '/provider/notifications' : '/client/notifications'}
                                    className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center relative"
                                >
                                    <i className="fa-regular fa-bell text-gray-700"></i>
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-[9px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                                        </span>
                                    )}
                                </Link>
                            ) : (
                                <button
                                    onClick={() => navigate('/auth/login')}
                                    className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center"
                                >
                                    <i className="fa-regular fa-bell text-gray-700"></i>
                                </button>
                            )}
                            {isAuthenticated ? (
                                <Link
                                    to={user?.role === 'provider' ? '/provider/dashboard' : user?.role === 'admin' ? '/admin/dashboard' : '/client/dashboard'}
                                    className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center"
                                >
                                    <i className="fa-solid fa-user text-primary"></i>
                                </Link>
                            ) : (
                                <Link to="/auth/login" className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                                    <i className="fa-regular fa-user text-gray-700"></i>
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="relative">
                        <input type="text" placeholder={t('common.search')} className="w-full h-12 rounded-2xl bg-bglight pe-12 ps-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            onFocus={() => navigate('/services')} readOnly />
                        <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>
            </header>

            {/* Platform Stats Bar */}
            <section className="px-5 pt-4 pb-2 animate-fade-in-up">
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { value: stats.providers || '50+', label: 'مزود خدمة', icon: 'fa-store', color: 'text-primary' },
                        { value: stats.services || '200+', label: 'خدمة متاحة', icon: 'fa-box', color: 'text-green-600' },
                        { value: categories.length || '10+', label: 'فئة', icon: 'fa-border-all', color: 'text-amber-600' },
                    ].map((s, i) => (
                        <div key={i} className="glass-effect rounded-2xl p-3 shadow-premium text-center card-hover">
                            <i className={`fa-solid ${s.icon} ${s.color} text-lg mb-1`}></i>
                            <p className="text-lg font-bold text-gray-900">{s.value}</p>
                            <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="quick-actions" className="px-5 py-4">
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigate('/client/events/new')} className="card-hover h-32 rounded-3xl gradient-purple shadow-premium p-5 flex flex-col justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-white bg-opacity-20 flex items-center justify-center">
                            <i className="fa-solid fa-calendar-plus text-white text-xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-white font-bold text-lg">حجز فعالية</p>
                            <p className="text-white text-opacity-80 text-xs">بناء فريق متكامل</p>
                        </div>
                    </button>

                    <button onClick={() => navigate('/services')} className="card-hover h-32 rounded-3xl gradient-gold shadow-premium p-5 flex flex-col justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-white bg-opacity-30 flex items-center justify-center">
                            <i className="fa-solid fa-wand-magic-sparkles text-gray-800 text-xl"></i>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-800 font-bold text-lg">خدمة سريعة</p>
                            <p className="text-gray-700 text-xs">احجز الآن</p>
                        </div>
                    </button>
                </div>
            </section>

            <section id="promo-carousel" className="px-5 py-4">
                <div className="relative h-44 overflow-hidden">
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none" style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
                        <div className="min-w-[85%] h-40 rounded-3xl relative overflow-hidden" style={{ scrollSnapAlign: 'center' }}>
                            <img
                                className="w-full h-full object-cover"
                                src={getCarouselUrl("https://images.unsplash.com/photo-1519225421980-715cb0202128?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80")}
                                alt="luxury wedding venue"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            <div className="absolute bottom-0 right-0 p-5">
                                <p className="text-accent text-xs font-bold mb-1">عرض خاص</p>
                                <h3 className="text-white font-bold text-lg mb-1">باقة الزفاف الماسية</h3>
                                <p className="text-white text-opacity-90 text-sm">خصم 30% على الحجز المبكر</p>
                            </div>
                        </div>

                        <div className="min-w-[85%] h-40 rounded-3xl relative overflow-hidden" style={{ scrollSnapAlign: 'center' }}>
                            <img
                                className="w-full h-full object-cover"
                                src={getCarouselUrl("https://images.unsplash.com/photo-1517457373958-b7bdd4587268?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80")}
                                alt="Ramadan iftar setup"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            <div className="absolute bottom-0 right-0 p-5">
                                <p className="text-accent text-xs font-bold mb-1">رمضان كريم</p>
                                <h3 className="text-white font-bold text-lg mb-1">باقات الإفطار الرمضاني</h3>
                                <p className="text-white text-opacity-90 text-sm">ضيافة فاخرة لضيوفك</p>
                            </div>
                        </div>

                        <div className="min-w-[85%] h-40 rounded-3xl relative overflow-hidden" style={{ scrollSnapAlign: 'center' }}>
                            <img
                                className="w-full h-full object-cover"
                                src={getCarouselUrl("https://images.unsplash.com/photo-1530103862676-de3c9a59af57?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80")}
                                alt="kids birthday party"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            <div className="absolute bottom-0 right-0 p-5">
                                <p className="text-accent text-xs font-bold mb-1">حفلات الأطفال</p>
                                <h3 className="text-white font-bold text-lg mb-1">أفكار إبداعية للأطفال</h3>
                                <p className="text-white text-opacity-90 text-sm">اجعل يومهم مميزاً</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="featured-categories" className="px-5 py-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{t('common.categories')}</h2>
                    <button onClick={() => navigate('/categories')} className="text-primary text-sm font-bold">{t('common.footer.about')}</button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {(categories.length > 0 ? categories : [
                        { id: '1', name: 'حفلات زواج' }, { id: '2', name: 'طعام وضيافة' },
                        { id: '3', name: 'تصوير' }, { id: '4', name: 'مكياج' },
                        { id: '5', name: 'مجالس' }, { id: '6', name: 'حفلات أطفال' },
                        { id: '7', name: 'زهور' }, { id: '8', name: 'نقل' },
                    ]).map((cat, idx) => {
                        const icons = ['fa-ring', 'fa-utensils', 'fa-camera', 'fa-spray-can', 'fa-couch', 'fa-child', 'fa-fan', 'fa-car', 'fa-music', 'fa-video'];
                        return (
                            <button key={cat.id || idx} onClick={() => navigate(`/services?category=${cat.id}`)} className="card-hover flex flex-col items-center">
                                <div className="w-16 h-16 rounded-2xl glass-effect shadow-premium flex items-center justify-center mb-2">
                                    <i className={`fa-solid ${icons[idx % icons.length]} text-primary text-2xl`}></i>
                                </div>
                                <p className="text-xs font-bold text-gray-700 text-center">{cat.name}</p>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section id="trending-services" className="px-5 py-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">الأكثر طلباً</h2>
                        <p className="text-xs text-gray-500 mt-1">خدمات مميزة يحبها عملاؤنا</p>
                    </div>
                    <button onClick={() => navigate('/services')} className="text-primary text-sm font-bold">المزيد</button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                    {featuredServices.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 w-full">جاري التحميل...</p>
                    ) : (
                        featuredServices.map((service) => (
                            <div key={service.id} onClick={() => navigate(`/services/${service.id}`)} className="min-w-[280px] card-hover cursor-pointer">
                                <div className="glass-effect rounded-3xl overflow-hidden shadow-premium">
                                    <div className="h-48 overflow-hidden relative">
                                        <img
                                            className="w-full h-full object-cover"
                                            src={getThumbnailUrl(service.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800')}
                                            alt={service.title}
                                            loading="lazy"
                                        />
                                        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-accent text-gray-900 text-xs font-bold">
                                            مميز
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex items-center gap-1">
                                                <i className="fa-solid fa-star text-accent text-xs"></i>
                                                <span className="text-sm font-bold text-gray-900">{service.rating || '0'}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">({service.review_count || 0} تقييم)</span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-1">{service.title}</h3>
                                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{service.description}</p>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500">يبدأ من</p>
                                                <p className="text-lg font-bold text-primary">{service.base_price.toLocaleString()} ر.ق</p>
                                            </div>
                                            <button className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
                                                <i className="fa-solid fa-arrow-left text-white"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="px-5 py-6 animate-fade-in-up">
                <div className="bg-gradient-to-br from-purple-900 to-purple-700 rounded-3xl p-6 text-center relative overflow-hidden mb-6 shadow-premium">
                    <div className="relative z-10">
                        <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-rocket text-white text-3xl"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">ابدأ فعاليتك الآن</h2>
                        <p className="text-white text-opacity-90 mb-6">انشئ فعاليتك واختر الخدمات المناسبة بكل سهولة</p>
                        <button onClick={() => navigate('/client/events/new')} className="w-full h-14 rounded-2xl bg-white text-primary font-bold text-lg shadow-lg card-hover">
                            إنشاء فعالية جديدة
                        </button>
                    </div>
                </div>

                <div className="glass-effect rounded-3xl p-6 shadow-premium">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-headset text-white text-xl"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">هل تحتاج مساعدة؟</h3>
                            <p className="text-sm text-gray-600 mb-3">فريق الدعم جاهز لمساعدتك على مدار الساعة</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.open('https://wa.me/97400000000', '_blank')}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold card-hover"
                                >
                                    <i className="fa-brands fa-whatsapp ms-1"></i>
                                    واتساب
                                </button>
                                <button
                                    onClick={() => window.location.href = 'tel:+97400000000'}
                                    className="px-4 py-2 rounded-xl bg-white text-primary text-sm font-bold card-hover"
                                >
                                    <i className="fa-solid fa-phone ms-1"></i>
                                    اتصل بنا
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default HomePage;
