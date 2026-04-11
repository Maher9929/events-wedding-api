import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categoriesService } from '../services/categories.service';
import { servicesService } from '../services/services.service';
import type { Category } from '../services/api';

const KEYWORD_ICONS: Array<{ keywords: string[]; icon: string; iconColor: string; bgClass: string }> = [
    { keywords: ['زفاف', 'عرس', 'خطوبة', 'wedding'], icon: 'fa-solid fa-ring', iconColor: 'text-white', bgClass: 'gradient-purple' },
    { keywords: ['تصوير', 'كاميرا', 'فيديو', 'photo'], icon: 'fa-solid fa-camera', iconColor: 'text-blue-500', bgClass: 'bg-blue-100' },
    { keywords: ['طعام', 'ضيافة', 'كيتر', 'catering'], icon: 'fa-solid fa-utensils', iconColor: 'text-pink-500', bgClass: 'bg-pink-100' },
    { keywords: ['موسيقى', 'فرقة', 'دي جي', 'music'], icon: 'fa-solid fa-music', iconColor: 'text-indigo-500', bgClass: 'bg-indigo-100' },
    { keywords: ['ديكور', 'زينة', 'تزيين', 'decor'], icon: 'fa-solid fa-wand-sparkles', iconColor: 'text-green-500', bgClass: 'bg-green-100' },
    { keywords: ['قاعة', 'مكان', 'venue'], icon: 'fa-solid fa-building-columns', iconColor: 'text-amber-500', bgClass: 'bg-amber-100' },
    { keywords: ['مكياج', 'تجميل', 'beauty'], icon: 'fa-solid fa-spray-can', iconColor: 'text-rose-500', bgClass: 'bg-rose-100' },
    { keywords: ['أثاث', 'كراسي', 'furniture'], icon: 'fa-solid fa-couch', iconColor: 'text-orange-500', bgClass: 'bg-orange-100' },
    { keywords: ['ضيافة', 'قهوة', 'coffee'], icon: 'fa-solid fa-mug-hot', iconColor: 'text-cyan-500', bgClass: 'bg-cyan-100' },
    { keywords: ['أطفال', 'kids'], icon: 'fa-solid fa-child', iconColor: 'text-yellow-500', bgClass: 'bg-yellow-100' },
    { keywords: ['نقل', 'سيارة', 'transport'], icon: 'fa-solid fa-car', iconColor: 'text-gray-600', bgClass: 'bg-gray-100' },
    { keywords: ['ورود', 'زهور', 'flowers'], icon: 'fa-solid fa-seedling', iconColor: 'text-emerald-500', bgClass: 'bg-emerald-100' },
];

const FALLBACK_ICONS = [
    { icon: 'fa-solid fa-star', iconColor: 'text-white', bgClass: 'gradient-purple' },
    { icon: 'fa-solid fa-heart', iconColor: 'text-red-500', bgClass: 'bg-red-100' },
    { icon: 'fa-solid fa-gem', iconColor: 'text-blue-500', bgClass: 'bg-blue-100' },
    { icon: 'fa-solid fa-crown', iconColor: 'text-amber-500', bgClass: 'bg-amber-100' },
    { icon: 'fa-solid fa-bolt', iconColor: 'text-yellow-500', bgClass: 'bg-yellow-100' },
];

const getIconForCategory = (name: string, index: number) => {
    const lower = name.toLowerCase();
    const match = KEYWORD_ICONS.find(k => k.keywords.some(kw => lower.includes(kw)));
    if (match) return match;
    return FALLBACK_ICONS[index % FALLBACK_ICONS.length];
};

const CategoriesPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        Promise.allSettled([
            categoriesService.getAll().then((data) => {
                setCategories(Array.isArray(data) ? data : []);
            }),
            servicesService.getAll().then((data) => {
                const list = Array.isArray(data) ? data : [];
                const counts: Record<string, number> = {};
                list.forEach((s) => {
                    if (s.category_id) counts[s.category_id] = (counts[s.category_id] || 0) + 1;
                });
                setServiceCounts(counts);
            }),
        ]).finally(() => setLoading(false));
    }, []);

    const filtered = search
        ? categories.filter(c => c.name.includes(search) || c.description?.includes(search))
        : categories;

    return (
        <div className="min-h-screen bg-bglight">
            <header id="header" className="bg-white sticky top-0 z-50 shadow-sm">
                <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                            <i className="fa-solid fa-arrow-right text-gray-700"></i>
                        </button>
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-gray-900">{t('common.categories')}</h1>
                            <p className="text-xs text-gray-500">{categories.length} {t('common.categories')}</p>
                        </div>
                        <button className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center">
                            <i className="fa-solid fa-sliders text-gray-700"></i>
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-12 rounded-2xl bg-bglight pe-12 ps-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>
            </header>

            <section className="px-5 py-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{t('common.services')}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{filtered.length} {t('common.categories')}</p>
                    </div>
                </div>

                {loading ? (
                    <p className="text-center text-gray-400 py-8">{t('common.loading')}</p>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">{t('common.no_results')}</p>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {filtered.map((cat, idx) => {
                            const style = getIconForCategory(cat.name, idx);
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => navigate(`/services?category=${cat.id}`)}
                                    className="category-card bg-white rounded-2xl p-4 shadow-sm relative overflow-hidden group"
                                >
                                    <div className={`w-14 h-14 rounded-xl ${style.bgClass} flex items-center justify-center mx-auto mb-3`}>
                                        <i className={`${style.icon} ${style.iconColor} text-2xl`}></i>
                                    </div>
                                    <p className="text-xs font-bold text-gray-900 text-center mb-1">{cat.name}</p>
                                    <p className="text-xs text-gray-500 text-center">
                                        {serviceCounts[cat.id] ? `${serviceCounts[cat.id]} ${t('common.services')}` : cat.description?.substring(0, 20) || ''}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            <section id="seasonal-categories" className="px-5 py-6">
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">{t('home.hero.title')}</h2>
                    <p className="text-xs text-gray-500">{t('home.hero.subtitle')}</p>
                </div>

                <div className="space-y-3">
                    <div className="bg-gradient-to-br from-purple-900 to-purple-700 rounded-3xl p-5 card-hover relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
                            <i className="fa-solid fa-moon text-white text-8xl"></i>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
                                    <i className="fa-solid fa-mosque text-white text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">{t('categories.ramadan_events', 'Ramadan Events')}</h3>
                                    <p className="text-white text-opacity-80 text-xs">{t('categories.ramadan_desc', 'Iftar, Suhoor, Ghabga')}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-white text-sm">156 {t('common.services')}</p>
                                <button className="px-4 py-2 rounded-xl bg-white text-purple-900 text-xs font-bold">
                                    {t('common.footer.about')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="help-center" className="px-5 py-6 mb-20 scroll-mt-20">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-circle-question text-white text-xl"></i>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">{t('common.footer.about')}?</h3>
                            <p className="text-sm text-gray-600 mb-3">{t('home.hero.subtitle')}</p>
                            <button className="px-5 py-2.5 rounded-xl gradient-purple text-white text-sm font-bold card-hover">
                                <i className="fa-brands fa-whatsapp ms-1"></i>
                                WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default CategoriesPage;
