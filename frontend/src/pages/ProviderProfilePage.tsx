import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { reviewsService } from '../services/reviews.service';
import type { Provider } from '../services/api';
import { getThumbnailUrl } from '../utils/image.utils';

const ProviderProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'about' | 'portfolio' | 'reviews' | 'availability'>('about');

    useEffect(() => {
        if (!id) return;
        const loadProvider = async () => {
            try {
                const [providerData, reviewsData] = await Promise.all([
                    apiService.get<Provider>(`/providers/${id}`),
                    reviewsService.getByProvider(id)
                ]);
                setProvider(providerData);
                setReviews(Array.isArray(reviewsData) ? reviewsData : []);
            } catch (error) {
                console.error('Failed to load provider:', error);
            } finally {
                setLoading(false);
            }
        };
        loadProvider();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bglight p-5">
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
            <div className="min-h-screen bg-bglight flex items-center justify-center p-5">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Prestataire introuvable</h2>
                    <button onClick={() => navigate(-1)} className="text-primary font-bold">
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0;

    return (
        <div className="min-h-screen bg-bglight">
            {/* Header */}
            <div className="relative">
                {provider.portfolio_images && provider.portfolio_images.length > 0 && (
                    <img
                        src={getThumbnailUrl(provider.portfolio_images[0])}
                        alt="Cover"
                        className="w-full h-48 object-cover"
                    />
                )}
                <button onClick={() => navigate(-1)} className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <i className="fa-solid fa-arrow-left text-gray-700"></i>
                </button>
            </div>

            {/* Provider Info */}
            <div className="px-5 pb-5">
                <div className="bg-white rounded-3xl shadow-sm p-5 -mt-8 relative">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">{provider.company_name || provider.business_name}</h1>
                            <p className="text-sm text-gray-600 mb-2">{provider.city}, {provider.region}</p>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-sm">
                                    <i className="fa-solid fa-star text-accent"></i>
                                    <span className="font-bold">{averageRating.toFixed(1)}</span>
                                    <span className="text-gray-500">({reviews.length} avis)</span>
                                </span>
                                {provider.is_verified && (
                                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                        <i className="fa-solid fa-check-circle"></i>
                                        Vérifié
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                                {provider.min_price || 0} - {provider.max_price || 0} ر.ق
                            </p>
                            <p className="text-xs text-gray-500">par événement</p>
                        </div>
                    </div>

                    <p className="text-gray-700 mb-4">{provider.description}</p>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <i className="fa-solid fa-users text-primary text-lg mb-1"></i>
                            <p className="text-xs text-gray-500">Capacité max</p>
                            <p className="font-bold text-gray-900">{provider.max_capacity || 'N/A'}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <i className="fa-solid fa-briefcase text-primary text-lg mb-1"></i>
                            <p className="text-xs text-gray-500">Expérience</p>
                            <p className="font-bold text-gray-900">{provider.years_experience || 0} ans</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <i className="fa-solid fa-clock text-primary text-lg mb-1"></i>
                            <p className="text-xs text-gray-500">Temps de réponse</p>
                            <p className="font-bold text-gray-900">{provider.response_time_hours || 24}h</p>
                        </div>
                    </div>

                    {/* Categories & Styles */}
                    {(provider.categories?.length || provider.event_styles?.length) && (
                        <div className="mb-4">
                            {provider.categories && provider.categories.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-xs font-bold text-gray-500 mb-2">Catégories</p>
                                    <div className="flex flex-wrap gap-2">
                                        {provider.categories?.map((cat: string) => (
                                            <span key={cat} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {provider.event_styles && provider.event_styles.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 mb-2">Styles d'événement</p>
                                    <div className="flex flex-wrap gap-2">
                                        {provider.event_styles?.map((style: string) => (
                                            <span key={style} className="px-3 py-1 rounded-full bg-purple/10 text-purple text-xs font-bold">
                                                {style}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Languages */}
                    {provider.languages && provider.languages.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-bold text-gray-500 mb-2">Langues</p>
                            <div className="flex flex-wrap gap-2">
                                {provider.languages?.map((lang: string) => (
                                    <span key={lang} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                                        {lang.toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate(`/client/messages?providerId=${provider.user_id}&autoStart=true`)}
                            className="flex-1 py-3 rounded-xl gradient-purple text-white font-bold shadow-lg"
                        >
                            Contacter
                        </button>
                        <button className="flex-1 py-3 rounded-xl bg-white text-primary font-bold border-2 border-primary">
                            Réserver
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-5 mb-4 overflow-x-auto">
                    {[
                        { key: 'about', label: 'À propos', icon: 'fa-info-circle' },
                        { key: 'portfolio', label: 'Portfolio', icon: 'fa-images' },
                        { key: 'reviews', label: 'Avis', icon: 'fa-star' },
                        { key: 'availability', label: 'Disponibilités', icon: 'fa-calendar' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
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

                {/* Tab Content */}
                <div className="bg-white rounded-3xl shadow-sm p-5">
                    {activeTab === 'about' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">À propos</h3>
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
                                        Site web
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'portfolio' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">Portfolio</h3>
                            {provider.portfolio_images && provider.portfolio_images.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {provider.portfolio_images?.map((img: string, idx: number) => (
                                        <img
                                            key={idx}
                                            src={getThumbnailUrl(img)}
                                            alt={`Portfolio ${idx + 1}`}
                                            className="w-full h-32 object-cover rounded-xl"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">Aucune photo dans le portfolio</p>
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
                                        Voir la vidéo
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">Avis clients</h3>
                            {reviews.length > 0 ? (
                                <div className="space-y-4">
                                    {reviews.map(review => (
                                        <div key={review.id} className="border-b pb-4 last:border-b-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <i className="fa-solid fa-user text-primary text-xs"></i>
                                                    </div>
                                                    <span className="font-bold text-gray-900">{review.user?.full_name}</span>
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
                                <p className="text-gray-500 text-center py-8">Aucun avis pour le moment</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'availability' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">Disponibilités</h3>
                            <p className="text-gray-500 text-center py-8">
                                Contactez le prestataire pour connaître ses disponibilités
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderProfilePage;
