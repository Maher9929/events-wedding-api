import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth.service';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const MainLayout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;
    const user = authService.getCurrentUser();

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

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-20">
            <header className="bg-white px-5 py-3 sticky top-0 z-50 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center text-white shadow-premium">
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <span className="font-bold text-lg text-gray-800 tracking-tight">DOUSHA</span>
                </div>
                <div className="flex items-center gap-3">
                    <LanguageSwitcher />
                    <Link to={user?.role === 'provider' ? '/provider/notifications' : user?.role === 'admin' ? '/admin/notifications' : '/client/notifications'} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-primary transition-colors">
                        <i className="fa-solid fa-bell"></i>
                    </Link>
                </div>
            </header>
            <main id="main-content">
                <Outlet />
            </main>

            {/* Legal Links */}
            <div className="px-5 py-4 mb-20 text-center">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                    <Link to="/terms" className="hover:text-primary">{t('common.footer.terms')}</Link>
                    <span>|</span>
                    <Link to="/privacy" className="hover:text-primary">{t('common.footer.privacy')}</Link>
                </div>
                <p className="text-xs text-gray-300 mt-2">© 2026 DOUSHA - {t('home.hero.title')}</p>
            </div>

            {/* Bottom Nav */}
            <footer className="bg-white border-t border-gray-100 fixed bottom-0 left-0 right-0 z-50">
                <div className="flex items-center justify-around py-2 w-full">
                    {navItems.map((item, index) => {
                        const active = isActive(item.to);
                        return (
                            <Link key={`${item.to}-${index}`} to={item.to} className="flex flex-col items-center gap-1 px-2 py-1">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${active ? 'gradient-purple shadow-md' : 'bg-bglight'}`}>
                                    <i className={`fa-solid ${item.icon} ${active ? 'text-white' : 'text-gray-600'}`}></i>
                                </div>
                                <span className={`text-xs font-bold ${active ? 'text-primary' : 'text-gray-500'}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
