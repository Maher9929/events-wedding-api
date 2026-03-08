import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { servicesService } from '../services/services.service';
import { categoriesService } from '../services/categories.service';
import type { ServiceItem, Category } from '../services/api';
import { getThumbnailUrl } from '../utils/image.utils';

const ServiceListingPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const CITIES = [
        t('cities.Doha'),
        t('cities.Al Rayyan'),
        t('cities.Al Wakrah'),
        t('cities.Al Khor'),
        t('cities.Al Shamal'),
        t('cities.Al Shahaniya'),
        t('cities.Umm Salal'),
        t('cities.Al Daayen')
    ];

    const [services, setServices] = useState<ServiceItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
    const providerIdFilter = searchParams.get('provider') || undefined;
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating' | 'popular' | 'newest'>('rating');
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
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
    const [visibleCount, setVisibleCount] = useState(12);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const catName = selectedCategory === 'all' ? '' : categories.find(c => c.id === selectedCategory)?.name;
        document.title = catName
            ? `${catName} | ${t('service.listing.title')} | DOUSHA`
            : `${t('service.listing.title')} | DOUSHA`;
    }, [selectedCategory, categories, t]);

    useEffect(() => {
        categoriesService.getAll()
            .then((data: any) => {
                const list = Array.isArray(data) ? data : data?.data || [];
                setCategories(list);
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        // Reset count when filters change
        setVisibleCount(12);
    }, [selectedCategory, appliedFilters, searchQuery, sortBy]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(true);
            const params: any = {
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
            const fetch = selectedCategory !== 'all'
                ? servicesService.getByCategory(selectedCategory, params)
                : servicesService.getAll(params);
            fetch
                .then((data: any) => {
                    const list = Array.isArray(data) ? data : data?.data || [];
                    setServices(list);
                })
                .catch(() => { })
                .finally(() => setLoading(false));
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [selectedCategory, appliedFilters, searchQuery, sortBy]); // eslint-disable-line

    const applyFilters = () => {
        setAppliedFilters({ ...filters });
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
        setShowFilters(false);
    };

    const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

    const filteredServices = services;

    const visibleServices = filteredServices.slice(0, visibleCount);
    const hasMore = visibleCount < filteredServices.length;

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-20">
            {/* Header */}
            <header id="header" className="bg-white sticky top-0 z-50 shadow-sm">
                <div className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center card-hover">
                            <i className="fa-solid fa-arrow-right text-gray-700"></i>
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-gray-900">{t('service.listing.title')}</h1>
                            <p className="text-xs text-gray-500">{t('service.listing.subtitle')}</p>
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
                            placeholder={t('service.listing.search_placeholder')}
                            className="w-full h-12 rounded-2xl bg-bglight pe-12 ps-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>
            </header>

            {/* Category Tabs */}
            <section id="category-tabs" className="bg-white px-5 py-4 sticky top-[136px] z-40 shadow-sm">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${selectedCategory === 'all'
                            ? 'bg-primary text-white shadow-md transform scale-105'
                            : 'bg-bglight text-gray-700 hover:bg-gray-200'
                            }`}
                    >{t('common.all')}</button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${selectedCategory === cat.id
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
                        <span className="text-xs text-gray-500">{t('service.listing.filters.title')}:</span>
                        {appliedFilters.city && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                <i className="fa-solid fa-location-dot"></i>{appliedFilters.city}
                            </span>
                        )}
                        {(appliedFilters.minPrice || appliedFilters.maxPrice) && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                <i className="fa-solid fa-coins"></i>
                                {appliedFilters.minPrice || '0'} - {appliedFilters.maxPrice || '∞'} QR
                            </span>
                        )}
                        {appliedFilters.minRating && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                <i className="fa-solid fa-star"></i>+{appliedFilters.minRating}
                            </span>
                        )}
                        <button onClick={resetFilters} className="text-xs text-red-500 font-bold hover:underline">
                            {t('service.listing.filters.reset')}
                        </button>
                    </div>
                </section>
            )}

            {/* Sort Chips */}
            <section className="px-5 py-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                    {[
                        { key: 'rating', label: t('service.listing.sort.rating'), icon: 'fa-star' },
                        { key: 'popular', label: t('service.listing.sort.popular'), icon: 'fa-fire' },
                        { key: 'newest', label: t('service.listing.sort.newest'), icon: 'fa-clock' },
                        { key: 'price_asc', label: t('service.listing.sort.price_asc'), icon: 'fa-arrow-up-short-wide' },
                        { key: 'price_desc', label: t('service.listing.sort.price_desc'), icon: 'fa-arrow-down-short-wide' },
                    ].map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setSortBy(opt.key as typeof sortBy)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${sortBy === opt.key ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-700 shadow-sm'
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
                    <p className="text-sm text-gray-600">{t('common.search')}: <span className="font-bold text-primary">{filteredServices.length}</span> {t('service.listing.results_found')}</p>
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
                            <h3 className="font-bold text-gray-900">{t('service.listing.featured_title')}</h3>
                        </div>
                        <p className="text-xs text-gray-600">{t('service.listing.featured_subtitle')}</p>
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
                                <div className="p-3"><div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div><div className="h-3 bg-gray-200 rounded w-1/2"></div></div>
                            </div>
                        ))}
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <i className="fa-solid fa-box-open text-gray-300 text-5xl mb-4"></i>
                        <p className="text-gray-500 font-bold">{t('service.listing.no_services')}</p>
                        <button onClick={resetFilters} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">{t('service.listing.filters.reset')}</button>
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
                                                    <i className="fa-solid fa-crown mx-1"></i>{t('service.listing.featured_title')}
                                                </div>
                                            )}
                                            <button className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white flex items-center justify-center hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); }}>
                                                <i className="fa-regular fa-heart text-gray-600 text-sm"></i>
                                            </button>
                                        </div>
                                        <div className="p-3 flex-1 flex flex-col">
                                            <div className="flex items-center gap-1 mb-2">
                                                <i className="fa-solid fa-star text-accent text-xs"></i>
                                                <span className="text-xs font-bold text-gray-900">{service.rating || '0'}</span>
                                                <span className="text-xs text-gray-500">({service.review_count || 0})</span>
                                                {catName && <span className="me-auto text-xs text-gray-500"><i className="fa-solid fa-tag text-primary mx-1"></i>{catName}</span>}
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-900 mb-1">{service.title}</h3>
                                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{service.description}</p>
                                            {(service as any).providers?.city && (
                                                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                                    <i className="fa-solid fa-location-dot text-primary"></i>{(service as any).providers.city}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between mt-auto">
                                                <div>
                                                    <p className="text-xs text-gray-500">{t('service.details.price_from')}</p>
                                                    <p className="text-base font-bold text-primary">{service.base_price} QR</p>
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
                                                {(service as any).providers?.city && (
                                                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                                        <i className="fa-solid fa-location-dot text-primary text-[10px]"></i>
                                                        {(service as any).providers.city}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-bold text-primary text-sm">{service.base_price} ر.ق</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Load More */}
            {hasMore && (
                <section id="load-more" className="px-5 pb-6">
                    <button
                        onClick={() => setVisibleCount(c => c + 12)}
                        className="w-full h-14 rounded-2xl bg-white text-primary font-bold text-base shadow-sm card-hover border-2 border-primary"
                    >
                        {t('service.listing.load_more')} ({filteredServices.length - visibleCount})
                        <i className="fa-solid fa-chevron-down mx-2"></i>
                    </button>
                </section>
            )}

            {/* Quick Filter Bottom */}
            <section id="quick-filter-bottom" className="px-5 pb-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
                            <i className="fa-solid fa-filter text-white text-xl"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">{t('service.listing.filters.title')}?</h3>
                            <p className="text-xs text-gray-600">{t('service.listing.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={() => setShowFilters(true)} className="w-full h-12 rounded-xl gradient-purple text-white font-bold text-sm">
                        {t('service.listing.filters.apply')}
                    </button>
                </div>
            </section>

            {/* Help Banner */}
            <section id="help-banner" className="px-5 pb-20">
                <div className="bg-white rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <i className="fa-solid fa-lightbulb text-blue-500 text-lg"></i>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm">{t('service.listing.tip_title')}</h4>
                            <p className="text-xs text-gray-600">{t('service.listing.tip_desc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Filter Panel Modal */}
            {showFilters && (
                <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowFilters(false)}>
                    <div className="bg-white rounded-t-3xl w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-lg text-gray-900">{t('service.listing.filters.title')}</h3>
                            <button onClick={() => setShowFilters(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                <i className="fa-solid fa-times text-sm"></i>
                            </button>
                        </div>

                        <div className="space-y-5 max-h-[60vh] overflow-y-auto">
                            {/* City */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.city')}</label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setFilters(f => ({ ...f, city: '' }))}
                                        className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${!filters.city ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        {t('common.all')}
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
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.price_range')} (QR)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        placeholder={t('service.listing.filters.min_price')}
                                        value={filters.minPrice}
                                        onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        min="0"
                                    />
                                    <input
                                        type="number"
                                        placeholder={t('service.listing.filters.max_price')}
                                        value={filters.maxPrice}
                                        onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Available Date */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Date disponible</label>
                                <input
                                    type="date"
                                    value={filters.availableDate}
                                    onChange={e => setFilters(f => ({ ...f, availableDate: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                />
                            </div>

                            {/* Max Budget */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Budget maximum (QR)</label>
                                <input
                                    type="number"
                                    placeholder="Budget max"
                                    value={filters.maxBudget}
                                    onChange={e => setFilters(f => ({ ...f, maxBudget: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                    min="0"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie</label>
                                <select
                                    value={filters.category}
                                    onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                >
                                    <option value="">Toutes</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Capacity Range */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Capacité (invités)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.minCapacity}
                                        onChange={e => setFilters(f => ({ ...f, minCapacity: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        min="0"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.maxCapacity}
                                        onChange={e => setFilters(f => ({ ...f, maxCapacity: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Event Style */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Style d'événement</label>
                                <div className="flex flex-wrap gap-2">
                                    {['', 'modern', 'traditional', 'rustic', 'elegant', 'bohemian'].map(style => (
                                        <button
                                            key={style}
                                            onClick={() => setFilters(f => ({ ...f, eventStyle: f.eventStyle === style ? '' : style }))}
                                            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${filters.eventStyle === style ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {style === '' ? 'Tous' : style}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Min Rating */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('service.listing.filters.min_rating')}</label>
                                <div className="flex gap-2">
                                    {['', '3', '4', '4.5'].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setFilters(f => ({ ...f, minRating: val }))}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${filters.minRating === val ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {val === '' ? t('common.all') : (
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
                                {t('service.listing.filters.apply')}
                            </button>
                            <button
                                onClick={resetFilters}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold"
                            >
                                {t('service.listing.filters.reset')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceListingPage;
