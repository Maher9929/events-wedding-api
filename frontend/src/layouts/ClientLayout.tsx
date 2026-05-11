import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { authService } from '../services/auth.service';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const ClientLayout = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const isActive = (path: string) => location.pathname.startsWith(path);
    const isExact = (path: string) => location.pathname === path;
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        // Only fetch if authenticated — prevents 401 loops
        if (!authService.isAuthenticated()) return;

        const fetchCounts = () => {
            apiService.get<{ count: number }>('/notifications/unread-count')
                .then((data) => setUnreadCount(data?.count || 0))
                .catch(() => { /* badge count is non-critical */ });
            apiService.get<{ unread_count?: number }[]>('/messages/conversations')
                .then((data) => {
                    const list = Array.isArray(data) ? data : [];
                    setUnreadMessages(list.filter((c) => (c.unread_count || 0) > 0).length);
                })
                .catch(() => { /* unread messages count is non-critical */ });
        };
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-20 md:pb-0">
            {/* Mobile Header — Premium branded chip */}
            <header className="sticky top-0 z-50 md:hidden overflow-hidden">
                <div className="absolute inset-0 bg-white/85 backdrop-blur-xl"></div>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] gradient-animated"></div>
                <div className="relative px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Link to="/" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-all duration-300 group" aria-label={t('common.admin.back_to_site')}>
                            <div className="w-6 h-6 rounded-lg gradient-purple flex items-center justify-center">
                                <i className="fa-solid fa-house text-white text-[10px]"></i>
                            </div>
                            <span className="text-xs font-bold text-primary group-hover:text-purple-700 transition-colors">Doha Events</span>
                        </Link>
                        <div className="w-px h-5 bg-gray-200"></div>
                        <h1 className="text-sm font-bold text-gray-700">{t('common.dashboard')}</h1>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <LanguageSwitcher />
                        <Link to="/client/notifications" className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors relative" aria-label={t('common.notifications')}>
                            <i className="fa-regular fa-bell text-gray-500 text-xs"></i>
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-[8px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                                </span>
                            )}
                        </Link>
                        <Link to="/client/profile" className="w-8 h-8 rounded-xl gradient-purple flex items-center justify-center shadow-sm" aria-label={t('common.profile')}>
                            <i className="fa-solid fa-user text-white text-[10px]"></i>
                        </Link>
                    </div>
                </div>
            </header>

            <div className="flex">
                <main className="flex-1 p-5 md:p-8 animate-fade-in-up">
                    {/* Desktop "Back to Site" — Premium breadcrumb with glow */}
                    <div className="hidden md:flex items-center justify-between mb-6">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl glass-effect glow-button text-gray-700 hover:text-primary transition-all duration-300 border border-purple-100/50 group"
                        >
                            <div className="w-8 h-8 rounded-xl gradient-animated flex items-center justify-center shadow-sm">
                                <i className="fa-solid fa-house text-white text-sm"></i>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">{t('common.admin.back_to_site')}</span>
                                <span className="text-[10px] text-gray-400">Doha Events</span>
                            </div>
                            <i className="fa-solid fa-arrow-up-right-from-square text-xs text-gray-300 group-hover:text-primary transition-colors ms-1"></i>
                        </Link>
                        <LanguageSwitcher />
                    </div>
                    <Outlet />
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100/50 py-2 px-2 flex justify-around items-center z-50 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <Link to="/client/dashboard" className={`flex flex-col items-center gap-0.5 px-2 py-1 group ${isExact('/client/dashboard') ? '' : ''}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isExact('/client/dashboard') ? 'gradient-purple shadow-md scale-110' : 'group-hover:bg-gray-50'}`}>
                        <i className={`fa-solid fa-house text-[15px] ${isExact('/client/dashboard') ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}></i>
                    </div>
                    <span className={`text-[10px] font-semibold ${isExact('/client/dashboard') ? 'text-primary' : 'text-gray-400'}`}>{t('common.client.dashboard')}</span>
                </Link>
                <Link to="/client/events" className={`flex flex-col items-center gap-0.5 px-2 py-1 group`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive('/client/events') ? 'gradient-purple shadow-md scale-110' : 'group-hover:bg-gray-50'}`}>
                        <i className={`fa-solid fa-calendar-days text-[15px] ${isActive('/client/events') ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}></i>
                    </div>
                    <span className={`text-[10px] font-semibold ${isActive('/client/events') ? 'text-primary' : 'text-gray-400'}`}>{t('common.client.my_events')}</span>
                </Link>
                <Link to="/client/bookings" className={`flex flex-col items-center gap-0.5 px-2 py-1 group`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive('/client/bookings') ? 'gradient-purple shadow-md scale-110' : 'group-hover:bg-gray-50'}`}>
                        <i className={`fa-solid fa-calendar-check text-[15px] ${isActive('/client/bookings') ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}></i>
                    </div>
                    <span className={`text-[10px] font-semibold ${isActive('/client/bookings') ? 'text-primary' : 'text-gray-400'}`}>{t('common.client.my_bookings')}</span>
                </Link>
                <Link to="/client/favorites" className={`flex flex-col items-center gap-0.5 px-2 py-1 group`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive('/client/favorites') ? 'gradient-purple shadow-md scale-110' : 'group-hover:bg-gray-50'}`}>
                        <i className={`fa-solid fa-heart text-[15px] ${isActive('/client/favorites') ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}></i>
                    </div>
                    <span className={`text-[10px] font-semibold ${isActive('/client/favorites') ? 'text-primary' : 'text-gray-400'}`}>{t('common.client.favorites')}</span>
                </Link>
                <Link to="/client/messages" className={`flex flex-col items-center gap-0.5 px-2 py-1 relative group`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive('/client/messages') ? 'gradient-purple shadow-md scale-110' : 'group-hover:bg-gray-50'}`}>
                        <i className={`fa-solid fa-comment-dots text-[15px] ${isActive('/client/messages') ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}></i>
                    </div>
                    {unreadMessages > 0 && (
                        <span className="absolute top-0 right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[9px] font-bold">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
                        </span>
                    )}
                    <span className={`text-[10px] font-semibold ${isActive('/client/messages') ? 'text-primary' : 'text-gray-400'}`}>{t('common.client.messages')}</span>
                </Link>
            </nav>
        </div>
    );
};

export default ClientLayout;
