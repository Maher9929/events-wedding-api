import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { servicesService } from '../services/services.service';
import { categoriesService } from '../services/categories.service';
import type { ServiceItem, Category } from '../services/api';
import { getThumbnailUrl } from '../utils/image.utils';
import { toastService } from '../services/toast.service';
import Pagination from '../components/common/Pagination';

const ServiceListingPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const CITIES = [
        t('cities.Doha', 'الدوحة'),
        t('cities.Al Rayyan', 'الريان'),
        t('cities.Al Wakrah', 'الوكرة'),
        t('cities.Al Khor', 'الخور'),
        t('cities.Al Shamal', 'الشمال'),
        t('cities.Al Shahaniya', 'الشحانية'),
        t('cities.Umm Salal', 'أم صلال'),
        t('cities.Al Daayen', 'الضعاين')
    ];

    const EVENT_STYLES = [
        { value: '', label: t('common.all', 'الكل') },
        { value: 'modern', label: t('service.listing.styles.modern', 'عصري') },
        { value: 'traditional', label: t('service.listing.styles.traditional', 'تقليدي') },
        { value: 'rustic', label: t('service.listing.styles.rustic', 'ريفي') },
        { value: 'elegant', label: t('service.listing.styles.elegant', 'أنيق') },
        { value: 'bohemian', label: t('service.listing.styles.bohemian', 'بوهيمي') },
    ];

    const SORT_OPTIONS = [
        { key: 'rating', label: t('service.listing.sort.rating', 'التقييم'), icon: 'fa-star' },
        { key: 'popular', label: t('service.listing.sort.popular', 'الأكثر شعبية'), icon: 'fa-fire' },
        { key: 'newest', label: t('service.listing.sort.newest', 'الأحدث'), icon: 'fa-clock' },
        { key: 'price_asc', label: t('service.listing.sort.price_asc', 'أقل سعر'), icon: 'fa-arrow-up-short-wide' },
        { key: 'price_desc', label: t('service.listing.sort.price_desc', 'أعلى سعر'), icon: 'fa-arrow-down-short-wide' },
    ];

    const [services, setServices] = useState<ServiceItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
    const providerIdFilter = searchParams.get('provider') || undefined;
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating' | 'popular' | 'newest'>('rating');
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    
    // Filters State
    const [filters, setFilters] = useState({
        minPrice: '',
        maxPrice: '',
        minRating: '',
        city: '',
        availableDate: '',
        maxBudget: '',
        category: '',
        minCapacity: '',
        maxCapacity: '',
        eventStyle: ''
    });
    const [appliedFilters, setAppliedFilters] = useState({
        minPrice: '',
        maxPrice: '',
        minRating: '',
        city: '',
        availableDate: '',
        maxBudget: '',
        category: '',
        minCapacity: '',
        maxCapacity: '',
        eventStyle: ''
    });

    const [page, setPage] = useState(0);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const PAGE_SIZE = 12;

    useEffect(() => {
        const catName = selectedCategory === 'all' ? '' : categories.find(c => c.id === selectedCategory)?.name;
        document.title = catName
            ? `${catName} | ${t('service.listing.title', 'الخدمات')} | DOUSHA`
            : `${t('service.listing.title', 'الخدمات')} | DOUSHA`;
    }, [selectedCategory, categories, t]);

    useEffect(() => {
        categoriesService.getAll()
            .then(data => {
                const list = Array.isArray(data) ? data : (data as { data: Category[] })?.data || [];
                setCategories(list);
            })
            .catch(() => { /* categories are non-critical, page still works */ });
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(true);
            const params: Record<string, any> = {
                city: appliedFilters.city || undefined,
                min_price: appliedFilters.minPrice ? parseFloat(appliedFilters.minPrice) : undefined,
                max_price: appliedFilters.maxPrice ? parseFloat(appliedFilters.maxPrice) : undefined,
                min_rating: appliedFilters.minRating ? parseFloat(appliedFilters.minRating) : undefined,
                available_date: appliedFilters.availableDate || undefined,
                max_budget: appliedFilters.maxBudget ? parseFloat(appliedFilters.maxBudget) : undefined,
                category: appliedFilters.category || undefined,
                min_capacity: appliedFilters.minCapacity ? parseInt(appliedFilters.minCapacity) : undefined,
                max_capacity: appliedFilters.maxCapacity ? parseInt(appliedFilters.maxCapacity) : undefined,
                event_style: appliedFilters.eventStyle || undefined,
                provider_id: providerIdFilter,
                search: searchQuery.trim() || undefined,
                sort_by: sortBy === 'price_asc' || sortBy === 'price_desc' ? 'price' : sortBy === 'popular' ? 'review_count' : sortBy === 'newest' ? 'created_at' : 'rating',
                sort_order: sortBy === 'price_asc' ? 'asc' : 'desc',
            };
            
            const fetchPromise = selectedCategory !== 'all'
                ? servicesService.getByCategory(selectedCategory, params)
                : servicesService.getAll(params);
                
            fetchPromise
                .then(data => {
                    const list = Array.isArray(data) ? data : (data as { data: ServiceItem[] })?.data || [];
                    setServices(list);
                })
                .catch(() => toastService.error(t('service.listing.error_loading', 'فشل تحميل الخدمات')))
                .finally(() => setLoading(false));
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [selectedCategory, appliedFilters, searchQuery, sortBy, providerIdFilter, t]); 

    const applyFilters = () => {
        setAppliedFilters({ ...filters });
        setPage(0);
        setShowFilters(false);
    };

    const resetFilters = () => {
        const empty = {
            minPrice: '',
            maxPrice: '',
            minRating: '',
            city: '',
            availableDate: '',
            maxBudget: '',
            category: '',
            minCapacity: '',
            maxCapacity: '',
            eventStyle: ''
        };
        setFilters(empty);
        setAppliedFilters(empty);
        setPage(0);
        setShowFilters(false);
    };

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setPage(0);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPage(0);
    };

    const handleSortChange = (value: typeof sortBy) => {
        setSortBy(value);
        setPage(0);
    };

    const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;
    const filteredServices = services;
    const visibleServices = filteredServices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-20" dir={i18n.language === 'en' ? 'ltr' : 'rtl'}>
            {/* Header */}
            <header id="header" className="bg-white sticky top-0 z-50 shadow-sm">
                <div className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center card-hover">
                            <i className={`fa-solid ${i18n.language === 'en' ? 'fa-arrow-left' : 'fa-arrow-right'} text-gray-700`}></i>
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-900">{t('service.listing.title', 'تصفح الخدمات')}</h1>
                            <p className="text-xs text-gray-500">{t('service.listing.subtitle', 'اكتشف أفضل الخدمات لمناسبتك')}</p>
                        </div>
                        <button
                            onClick={() => setShowFilters(true)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center card-hover relative ${activeFilterCount > 0 ? 'bg-primary' : 'bg-bglight'}`}
                        >
                            <i className={`fa-solid fa-sliders ${activeFilterCount > 0 ? 'text-white' : 'text-gray-700'}`}></i>
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-[9px] font-bold">{activeFilterCount}</span>
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('service.listing.search_placeholder', 'ابحث عن خدمات...')}
                            className={`w-full h-12 rounded-2xl bg-bglight ${i18n.language === 'en' ? 'pe-4 ps-12' : 'pe-12 ps-4'} text-sm focus:outline-none focus:ring-2 focus:ring-primary`}
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                        <i className={`fa-solid fa-magnifying-glass absolute ${i18n.language === 'en' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-gray-400`}></i>
                    </div>
                </div>
            </header>

            {/* Category Tabs */}
            <section id="category-tabs" className="bg-white px-5 py-4 sticky top-[136px] z-40 shadow-sm">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                    <button
                        onClick={() => handleCategoryChange('all')}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                            selectedCategory === 'all'
                                ? 'bg-primary text-white shadow-md transform scale-105'
                                : 'bg-bglight text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {t('common.all', 'الكل')}
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryChange(cat.id)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                                selectedCategory === cat.id
                                    ? 'bg-primary text-white shadow-md transform scale-105'
                                    : 'bg-bglight text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* Active Filter Tags */}
            {activeFilterCount > 0 && (
                <section className="px-5 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">{t('service.listing.filters.title', 'عوامل التصفية النشطة')}:</span>
                        {appliedFilters.city && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                <i className="fa-solid fa-location-dot"></i>{appliedFilters.city}
                            </span>
                        )}
                        {(appliedFilters.minPrice || appliedFilters.maxPrice) && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                <i className="fa-solid fa-coins"></i>
                                {appliedFilters.minPrice || '0'} - {appliedFilters.maxPrice || '∞'} {t('common.currency', 'QR')}
                            </span>
                        )}
                        {appliedFilters.minRating && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                <i className="fa-solid fa-star"></i>+{appliedFilters.minRating}
                            </span>
                        )}
                        <button onClick={resetFilters} className="text-xs text-red-500 font-bold hover:underline">
                            {t('common.clear', 'مسح الكل')}
                        </button>
                    </div>
                </section>
            )}

            {/* Sort Chips */}
            <section className="px-5 py-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                    {SORT_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => handleSortChange(opt.key as typeof sortBy)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                                sortBy === opt.key ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-700 shadow-sm'
                            }`}
                        >
                            <i className={`fa-solid ${opt.icon} text-xs`}></i>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Results Header */}
            <section id="results-header" className="px-5 pb-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        {t('common.search', 'البحث')}: <span className="font-bold text-primary">{filteredServices.length}</span> {t('service.listing.results_found', 'نتيجة')}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-primary' : 'bg-white'}`}
                        >
                            <i className={`fa-solid fa-grid-2 text-sm ${viewMode === 'grid' ? 'text-white' : 'text-gray-600'}`}></i>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-primary' : 'bg-white'}`}
                        >
                            <i className={`fa-solid fa-list text-sm ${viewMode === 'list' ? 'text-white' : 'text-gray-600'}`}></i>
                        </button>
                    </div>
                </div>
            </section>

            {/* Featured Banner */}
            <section id="featured-services" className="px-5 pb-4">
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-3xl p-4 mb-4 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <i className="fa-solid fa-crown text-accent text-lg"></i>
                            <h3 className="font-bold text-gray-900">{t('service.listing.featured_title', 'خدمات مميزة')}</h3>
                        </div>
                        <p className="text-xs text-gray-600">{t('service.listing.featured_subtitle', 'أفضل الخيارات لمناسبتك')}</p>
                    </div>
                </div>
            </section>

            {/* Service Grid */}
            <section id="service-grid" className="px-5 pb-6">
                {loading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm animate-pulse">
                                <div className="h-44 bg-gray-200"></div>
                                <div className="p-3">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <i className="fa-solid fa-box-open text-gray-300 text-5xl mb-4"></i>
                        <p className="text-gray-500 font-bold">{t('service.listing.no_services', 'لا توجد خدمات مطابقة للبحث')}</p>
                        <button onClick={resetFilters} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">
                            {t('service.listing.filters.reset', 'إعادة ضبط')}
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 gap-3">
                        {visibleServices.map((service) => {
                            const catName = categories.find(c => c.id === service.category_id)?.name || '';
                            const imgSrc = service.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80';
                            return (
                                <div
                                    key={service.id}
                                    className="card-hover cursor-pointer"
                                    onClick={() => navigate(`/services/${service.id}`)}
                                >
                                    <div className="bg-white rounded-3xl overflow-hidden shadow-sm h-full flex flex-col">
                                        <div className="h-44 overflow-hidden relative">
                                            <img
                                                className="w-full h-full object-cover"
                                                src={getThumbnailUrl(imgSrc)}
                                                alt={service.title}
                                                loading="lazy"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80';
                                                }}
                                            />
                                            {service.is_featured && (
                                                <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-accent text-gray-900 text-xs font-bold">
                                                    <i className="fa-solid fa-crown mx-1"></i>{t('service.listing.featured_title', 'مميز')}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 flex-1 flex flex-col">
                                            <div className="flex items-center gap-1 mb-2">
                                                <i className="fa-solid fa-star text-accent text-xs"></i>
                                                <span className="text-xs font-bold text-gray-900">{service.rating || '0'}</span>
                                                <span className="text-xs text-gray-500">({service.review_count || 0})</span>
                                                {catName && <span className={`${i18n.language === 'en' ? 'ml-auto' : 'mr-auto'} text-xs text-gray-500`}><i className="fa-solid fa-tag text-primary mx-1"></i>{catName}</span>}
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-900 mb-1">{service.title}</h3>
                                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{service.description}</p>
                                            {service.providers?.city && (
                                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                                    <i className="fa-solid fa-location-dot text-primary"></i>{service.providers.city}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between mt-auto">
                                                <div>
                                                    <p className="text-xs text-gray-500">{t('service.details.price_from', 'تبدأ من')}</p>
                                                    <p className="text-base font-bold text-primary">{service.base_price} {t('common.currency', 'QR')}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/services/${service.id}`); }}
                                                    className="w-8 h-8 rounded-xl gradient-purple flex items-center justify-center hover:shadow-lg transition-shadow"
                                                >
                                                    <i className="fa-solid fa-plus text-white text-sm"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visibleServices.map((service) => {
                            const catName = categories.find(c => c.id === service.category_id)?.name || '';
                            const imgSrc = service.images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80';
                            return (
                                <div
                                    key={service.id}
                                    className="bg-white rounded-2xl shadow-sm overflow-hidden flex cursor-pointer card-hover"
                                    onClick={() => navigate(`/services/${service.id}`)}
                                >
                                    <div className="w-28 h-28 flex-shrink-0 relative">
                                        <img
                                            className="w-full h-full object-cover"
                                            src={getThumbnailUrl(imgSrc)}
                                            alt={service.title}
                                            loading="lazy"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80';
                                            }}
                                        />
                                        {service.is_featured && (
                                            <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-accent text-gray-900 text-[10px] font-bold">
                                                <i className="fa-solid fa-crown"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h3 className="font-bold text-sm text-gray-900 truncate">{service.title}</h3>
                                                {catName && <span className="text-[10px] text-gray-400 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded-md">{catName}</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2">{service.description}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-0.5 text-xs">
                                                    <i className="fa-solid fa-star text-accent text-[10px]"></i>
                                                    <span className="font-bold text-gray-900">{service.rating || '0'}</span>
                                                </span>
                                                {service.providers?.city && (
                                                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                                        <i className="fa-solid fa-location-dot text-primary text-[10px]"></i>
                                                        {service.providers.city}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-bold text-primary text-sm">{service.base_price} {t('common.currency', 'QR')}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
            <section id="pagination" className="px-5 pb-6">
                <Pagination
                    page={page}
                    total={filteredServices.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                />
            </section>

            {/* Quick Filter Bottom */}
            <section id="quick-filter-bottom" className="px-5 pb-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
                            <i className="fa-solid fa-filter text-white text-xl"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">{t('service.listing.filters.title', 'خيارات التصفية')}</h3>
                            <p className="text-xs text-gray-600">{t('service.listing.subtitle', 'قم بتضييق نطاق البحث')}</p>
                        </div>
                    </div>
                    <button onClick={() => setShowFilters(true)} className="w-full h-12 rounded-xl gradient-purple text-white font-bold text-sm">
                        {t('service.listing.filters.apply', 'تطبيق الخيارات')}
                    </button>
                </div>
            </section>

            {/* Filter Panel Modal */}
            {showFilters && (
                <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowFilters(false)}>
                    <div className="bg-white rounded-t-3xl w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-lg text-gray-900">{t('service.listing.filters.title', 'خيارات التصفية')}</h3>
                            <button onClick={() => setShowFilters(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                <i className="fa-solid fa-times text-sm"></i>
                            </button>
                        </div>

                        <div className="space-y-5 max-h-[60vh] overflow-y-auto">
                            {/* City */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.city', 'المدينة')}</label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setFilters(f => ({ ...f, city: '' }))}
                                        className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${!filters.city ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        {t('common.all', 'الكل')}
                                    </button>
                                    {CITIES.map(city => (
                                        <button
                                            key={city}
                                            onClick={() => setFilters(f => ({ ...f, city: f.city === city ? '' : city }))}
                                            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${filters.city === city ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {city}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.price_range', 'نطاق السعر')} ({t('common.currency', 'QR')})</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        placeholder={t('service.listing.filters.min_price', 'الأدنى')}
                                        value={filters.minPrice}
                                        onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        min="0"
                                    />
                                    <input
                                        type="number"
                                        placeholder={t('service.listing.filters.max_price', 'الأقصى')}
                                        value={filters.maxPrice}
                                        onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Available Date */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.available_date', 'التاريخ المتاح')}</label>
                                <input
                                    type="date"
                                    value={filters.availableDate}
                                    onChange={e => setFilters(f => ({ ...f, availableDate: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                />
                            </div>

                            {/* Max Budget */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.max_budget', 'الميزانية القصوى')} ({t('common.currency', 'QR')})</label>
                                <input
                                    type="number"
                                    placeholder={t('service.listing.filters.max_budget', 'الميزانية القصوى')}
                                    value={filters.maxBudget}
                                    onChange={e => setFilters(f => ({ ...f, maxBudget: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                    min="0"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.category', 'الفئة')}</label>
                                <select
                                    value={filters.category}
                                    onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                >
                                    <option value="">{t('common.all', 'الكل')}</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Capacity Range */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.capacity', 'السعة (عدد الضيوف)')}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        placeholder={t('service.listing.filters.min', 'الحد الأدنى')}
                                        value={filters.minCapacity}
                                        onChange={e => setFilters(f => ({ ...f, minCapacity: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        min="0"
                                    />
                                    <input
                                        type="number"
                                        placeholder={t('service.listing.filters.max', 'الحد الأقصى')}
                                        value={filters.maxCapacity}
                                        onChange={e => setFilters(f => ({ ...f, maxCapacity: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Event Style */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.event_style', 'نمط الفعالية')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {EVENT_STYLES.map(style => (
                                        <button
                                            key={style.value}
                                            onClick={() => setFilters(f => ({ ...f, eventStyle: f.eventStyle === style.value ? '' : style.value }))}
                                            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${filters.eventStyle === style.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Min Rating */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.min_rating', 'الحد الأدنى للتقييم')}</label>
                                <div className="flex gap-2">
                                    {['', '3', '4', '4.5'].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setFilters(f => ({ ...f, minRating: val }))}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${filters.minRating === val ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {val === '' ? t('common.all', 'الكل') : (
                                                <span className="flex items-center justify-center gap-1">
                                                    <i className="fa-solid fa-star text-xs"></i>{val}+
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={applyFilters}
                                className="flex-1 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg"
                            >
                                {t('service.listing.filters.apply', 'تطبيق الخيارات')}
                            </button>
                            <button
                                onClick={resetFilters}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold"
                            >
                                {t('service.listing.filters.reset', 'إعادة ضبط')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceListingPage;


