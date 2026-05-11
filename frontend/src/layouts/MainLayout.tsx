import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth.service';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import BrandLogo from '../components/common/BrandLogo';

const MainLayout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
    const user = authService.getCurrentUser();
    const whatsappUrl = 'https://wa.me/97400000000';

    const dashboardPath = user?.role === 'provider'
        ? '/provider/dashboard'
        : user?.role === 'admin'
            ? '/admin/dashboard'
            : '/client/dashboard';

    const profilePath = user?.role === 'provider'
        ? '/provider/profile'
        : user?.role === 'admin'
            ? '/admin/dashboard'
            : user
                ? '/client/profile'
                : '/auth/login';

    const navItems = [
        { to: '/', icon: 'fa-house', label: t('common.dashboard') },
        { to: '/categories', icon: 'fa-border-all', label: t('common.categories') },
        { to: dashboardPath, icon: 'fa-calendar-days', label: t('common.events') },
        { to: '/services', icon: 'fa-store', label: t('common.services') },
        { to: profilePath, icon: 'fa-user', label: t('common.profile') },
    ];

    const notificationsPath = user?.role === 'provider'
        ? '/provider/notifications'
        : user?.role === 'admin'
            ? '/admin/notifications'
            : '/client/notifications';

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-20 lg:pb-0">
            <header className="hidden lg:block sticky top-0 z-50 overflow-hidden">
                <div className="absolute inset-0 bg-white/90 backdrop-blur-xl"></div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] gradient-purple opacity-50"></div>
                <div className="relative w-full max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
                    <BrandLogo />

                    <nav className="flex items-center gap-1" aria-label={t('common.dashboard')}>
                        {navItems.map((item, index) => {
                            const active = isActive(item.to);
                            return (
                                <Link
                                    key={`${item.to}-desktop-${index}`}
                                    to={item.to}
                                    className={`h-10 px-5 rounded-2xl flex items-center gap-2.5 text-sm font-semibold transition-all duration-300 ${
                                        active
                                            ? 'gradient-purple text-white shadow-md scale-105'
                                            : 'text-gray-500 hover:bg-purple-50 hover:text-primary'
                                    }`}
                                >
                                    <i className={`fa-solid ${item.icon} text-sm`}></i>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 hover:shadow-sm transition-all duration-300"
                            aria-label="WhatsApp"
                        >
                            <i className="fa-brands fa-whatsapp text-lg"></i>
                        </a>
                        <Link
                            to={notificationsPath}
                            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-purple-50 transition-all duration-300"
                            aria-label={t('common.notifications')}
                        >
                            <i className="fa-solid fa-bell"></i>
                        </Link>
                    </div>
                </div>
            </header>

            <main id="main-content" className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-6">
                <Outlet />
            </main>

            <footer className="hidden lg:block bg-white mt-10 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] gradient-purple opacity-30"></div>
                <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-4 gap-8 text-sm">
                    <div>
                        <BrandLogo />
                        <p className="text-gray-400 mt-4 leading-relaxed">{t('home.hero.description')}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 mb-4 text-base">{t('common.services')}</h3>
                        <div className="space-y-3 text-gray-500">
                            <Link to="/categories" className="block hover:text-primary transition-colors">{t('common.categories')}</Link>
                            <Link to="/services" className="block hover:text-primary transition-colors">{t('home.trending.more')}</Link>
                            <Link to="/client/events/new" className="block hover:text-primary transition-colors">{t('home.quick_actions.book_event')}</Link>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 mb-4 text-base">{t('common.footer.about')}</h3>
                        <div className="space-y-3 text-gray-500">
                            <Link to="/legal?section=terms" className="block hover:text-primary transition-colors">{t('common.footer.terms')}</Link>
                            <Link to="/legal?section=privacy" className="block hover:text-primary transition-colors">{t('common.footer.privacy')}</Link>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 mb-4 text-base">{t('common.contact')}</h3>
                        <div className="space-y-3 text-gray-500">
                            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                                <i className="fa-brands fa-whatsapp text-green-500"></i>WhatsApp
                            </a>
                            <a href="tel:+97400000000" className="flex items-center gap-2 hover:text-primary transition-colors">
                                <i className="fa-solid fa-phone text-primary"></i>+974 0000 0000
                            </a>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-50 py-5 text-center text-xs text-gray-400">
                    &copy; 2026 Doha Events — {t('home.hero.subtitle')}
                </div>
            </footer>

            <div className="px-5 py-4 mb-20 text-center lg:hidden">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                    <Link to="/legal?section=terms" className="hover:text-primary">{t('common.footer.terms')}</Link>
                    <span>|</span>
                    <Link to="/legal?section=privacy" className="hover:text-primary">{t('common.footer.privacy')}</Link>
                    <span>|</span>
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="hover:text-primary">WhatsApp</a>
                </div>
                <p className="text-xs text-gray-500 mt-2">&copy; 2026 Doha Events - {t('home.hero.title')}</p>
            </div>

            <footer className="bg-white/90 backdrop-blur-lg border-t border-gray-100/50 fixed bottom-0 left-0 right-0 z-50 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-around py-2.5 px-3 w-full max-w-md mx-auto">
                    {navItems.map((item, index) => {
                        const active = isActive(item.to);
                        return (
                            <Link key={`${item.to}-${index}`} to={item.to} className="flex flex-col items-center gap-0.5 px-2 py-1 group">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${active ? 'gradient-purple shadow-md scale-110' : 'bg-transparent group-hover:bg-gray-50'}`}>
                                    <i className={`fa-solid ${item.icon} text-[15px] ${active ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}></i>
                                </div>
                                <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-primary' : 'text-gray-400'}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
