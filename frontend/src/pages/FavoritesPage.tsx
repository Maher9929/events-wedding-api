import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import type { ServiceItem } from '../services/api';
import EmptyState from '../components/common/EmptyState';

const FavoritesPage = () => {
    const { t } = useTranslation();
    const [favorites, setFavorites] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiService.get<{ data?: ServiceItem[] } | ServiceItem[]>('/services/favorites')
            .then(data => {
                const list = Array.isArray(data) ? data : (data as { data?: ServiceItem[] })?.data || [];
                setFavorites(list);
            })
            .catch(() => { /* favorites may not be implemented yet */ })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-24">
            <header className="bg-white sticky top-0 z-50 shadow-sm px-5 py-4">
                <h1 className="text-xl font-bold text-gray-900">{t('favorites.title', 'المفضلة')}</h1>
                <p className="text-xs text-gray-500">{t('favorites.subtitle', 'الخدمات التي أعجبتك')}</p>
            </header>

            <main className="px-5 py-4">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
                                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : favorites.length === 0 ? (
                    <EmptyState
                        icon="fa-heart"
                        title={t('favorites.empty_title', 'لا توجد مفضلات بعد')}
                        description={t('favorites.empty_desc', 'تصفح الخدمات وأضف ما يعجبك إلى المفضلة')}
                        action={{
                            label: t('favorites.browse_services', 'تصفح الخدمات'),
                            onClick: () => window.location.href = '/services',
                        }}
                    />
                ) : (
                    <div className="space-y-4">
                        {favorites.map(service => (
                            <Link
                                key={service.id}
                                to={`/services/${service.id}`}
                                className="block bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="p-5">
                                    <div className="flex items-start gap-3">
                                        {service.images?.[0] && (
                                            <img
                                                src={service.images[0]}
                                                alt={service.title}
                                                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                                                loading="lazy"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-sm truncate">{service.title}</h3>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                                            <p className="text-sm font-bold text-primary mt-2">
                                                {service.base_price?.toLocaleString()} {t('common.currency', 'ر.ق')}
                                            </p>
                                        </div>
                                        <i className="fa-solid fa-heart text-red-400 flex-shrink-0 mt-1"></i>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default FavoritesPage;
