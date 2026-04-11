import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';


const HeroSection = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <section className="relative w-full overflow-hidden bg-gray-900 rounded-b-[40px] mb-6 shadow-2xl animate-scale-in">
            <div className="absolute inset-0">
                <img
                    src="https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=40&fm=webp"
                    alt="Wedding Hero"
                    className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
            </div>

            <div className="relative z-10 px-5 pt-12 pb-16 text-center">
                <span className="inline-block py-1 px-3 rounded-full bg-accent/20 text-accent text-xs font-bold mb-4 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <i className="fa-solid fa-star me-1"></i>
                    {t('home.hero.badge')}
                </span>
                <h2 className="text-3xl font-bold text-white mb-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {t('home.hero.main_title')} <span className="text-accent text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-200">{t('home.hero.main_title_highlight')}</span>
                </h2>
                <p className="text-gray-300 text-sm mb-8 max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    {t('home.hero.description')}
                </p>

                <div className="relative max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <div className="glass-effect rounded-2xl p-2 flex items-center shadow-premium bg-white/10 backdrop-blur-md border border-white/20">
                        <i className="fa-solid fa-magnifying-glass text-white ms-3"></i>
                        <input
                            type="text"
                            placeholder={t('home.hero.search_placeholder')}
                            className="w-full h-12 bg-transparent text-white placeholder-gray-300 px-3 text-sm focus:outline-none"
                            onFocus={() => navigate('/services')}
                            readOnly
                        />
                        <button onClick={() => navigate('/services')} className="h-10 px-5 rounded-xl gradient-purple text-white text-sm font-bold shadow-lg hover-scale">
                            {t('home.hero.search_button')}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
