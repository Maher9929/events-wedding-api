import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const getNavItems = (t: any) => [
    { to: '/admin/dashboard', icon: 'fa-chart-pie', label: t('common.admin.overview') },
    { to: '/admin/users', icon: 'fa-users', label: t('common.admin.users') },
    { to: '/admin/providers', icon: 'fa-store', label: t('common.admin.providers') },
    { to: '/admin/categories', icon: 'fa-border-all', label: t('common.admin.categories') },
    { to: '/admin/bookings', icon: 'fa-calendar-check', label: t('common.admin.bookings') },
    { to: '/admin/events', icon: 'fa-calendar-days', label: t('common.admin.events') },
    { to: '/admin/services', icon: 'fa-box', label: t('common.admin.services') },
    { to: '/admin/messages', icon: 'fa-comment-dots', label: t('common.admin.messages') },
    { to: '/admin/reviews', icon: 'fa-star', label: t('common.admin.reviews') },
    { to: '/admin/quotes', icon: 'fa-file-invoice', label: t('common.admin.quotes') },
    { to: '/admin/commissions', icon: 'fa-coins', label: t('common.admin.commissions') },
    { to: '/admin/audit-logs', icon: 'fa-shield-halved', label: t('common.admin.audit_logs') },
];

const SidebarContent = ({ currentUser, pathname, setSidebarOpen }: { currentUser: any, pathname: string, setSidebarOpen?: (val: boolean) => void }) => {
    const { t } = useTranslation();
    const isActive = (path: string) => pathname === path;
    const navItems = getNavItems(t);
    return (
        <>
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
                        <i className="fa-solid fa-shield text-white"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-primary">{t('common.admin.title')}</h1>
                        <p className="text-xs text-gray-500">{currentUser?.full_name || t('common.user')}</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1">
                {navItems.map(item => (
                    <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen?.(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${isActive(item.to) ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-bglight'
                            }`}
                    >
                        <i className={`fa-solid ${item.icon} w-4`}></i>
                        {item.label}
                    </Link>
                ))}
                <div className="pt-4 border-t border-gray-100 mt-4">
                    <Link
                        to="/"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-bglight font-bold transition-colors text-sm"
                    >
                        <i className="fa-solid fa-arrow-right w-4 rtl:rotate-180"></i>
                        {t('common.admin.back_to_site')}
                    </Link>
                    <button
                        onClick={() => authService.logout()}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-bold transition-colors text-sm w-full"
                    >
                        <i className="fa-solid fa-sign-out-alt w-4"></i>
                        {t('common.admin.logout')}
                    </button>
                </div>
            </nav>
        </>
    );
};

const AdminLayout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isActive = (path: string) => location.pathname === path;
    const currentUser = authService.getCurrentUser();
    const navItems = getNavItems(t);

    return (
        <div className="min-h-screen bg-bglight font-tajawal flex">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-white border-l border-gray-100 hidden md:flex flex-col h-screen sticky top-0">
                <SidebarContent currentUser={currentUser} pathname={location.pathname} />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
                    <aside className="absolute right-0 top-0 h-full w-64 bg-white flex flex-col shadow-2xl">
                        <SidebarContent currentUser={currentUser} pathname={location.pathname} setSidebarOpen={setSidebarOpen} />
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                <header className="bg-white shadow-sm px-5 py-4 flex justify-between items-center sticky top-0 z-40">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="w-10 h-10 rounded-xl bg-bglight flex items-center justify-center md:hidden"
                    >
                        <i className="fa-solid fa-bars text-gray-700"></i>
                    </button>
                    <h1 className="font-bold text-lg text-gray-900 md:hidden">{t('common.admin.title')}</h1>
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-sm text-gray-500">{t('common.notifications.dates.today')}, {currentUser?.full_name || t('common.user')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <div className="flex items-center gap-2">
                            {navItems.slice(0, 3).map(item => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isActive(item.to) ? 'bg-primary text-white' : 'bg-bglight text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <i className={`fa-solid ${item.icon}`}></i>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                        <button
                            onClick={() => authService.logout()}
                            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        >
                            <i className="fa-solid fa-sign-out-alt"></i>
                            {t('common.admin.logout')}
                        </button>
                    </div>
                </header>
                <main className="p-5 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
