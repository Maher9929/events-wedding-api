import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { authService } from '../services/auth.service';

const ClientLayout = () => {
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
                .then((data: any) => setUnreadCount(data?.count || data?.data?.count || 0))
                .catch(() => { });
            apiService.get<any>('/messages/conversations')
                .then((data: any) => {
                    const list = Array.isArray(data) ? data : data?.data || [];
                    const unread = list.filter((c: any) => c.unread_count > 0).length;
                    setUnreadMessages(unread);
                })
                .catch(() => { });
        };
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-bglight font-tajawal pb-20 md:pb-0" dir="rtl">
            {/* Mobile Header */}
            <header className="glass-effect sticky top-0 z-50 shadow-sm px-5 py-4 flex items-center justify-between md:hidden">
                <h1 className="text-lg font-bold text-gray-900">لوحة التحكم</h1>
                <div className="flex items-center gap-2">
                    <Link to="/client/notifications" className="w-10 h-10 rounded-xl bg-bglight flex items-center justify-center hover:bg-gray-200 transition-colors relative">
                        <i className="fa-regular fa-bell text-gray-700"></i>
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-[9px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                            </span>
                        )}
                    </Link>
                    <Link to="/client/profile" className="w-10 h-10 rounded-xl bg-bglight flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <i className="fa-solid fa-user text-gray-700"></i>
                    </Link>
                </div>
            </header>

            <div className="flex">
                {/* Simplify for now - Sidebar could go here for desktop */}
                <main className="flex-1 p-5 md:p-8 animate-fade-in-up">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 glass-effect border-t border-gray-100 py-2 px-4 flex justify-between items-center z-50 md:hidden">
                <Link to="/client/dashboard" className={`flex flex-col items-center gap-1 px-3 py-1 ${isExact('/client/dashboard') ? 'text-primary' : 'text-gray-400'}`}>
                    <i className="fa-solid fa-house text-xl"></i>
                    <span className="text-xs font-bold">الرئيسية</span>
                </Link>
                <Link to="/client/events" className={`flex flex-col items-center gap-1 px-3 py-1 ${isActive('/client/events') ? 'text-primary' : 'text-gray-400'}`}>
                    <i className="fa-solid fa-calendar-days text-xl"></i>
                    <span className="text-xs">فعالياتي</span>
                </Link>
                <Link to="/client/bookings" className={`flex flex-col items-center gap-1 px-3 py-1 ${isActive('/client/bookings') ? 'text-primary' : 'text-gray-400'}`}>
                    <i className="fa-solid fa-calendar-check text-xl"></i>
                    <span className="text-xs">حجوزاتي</span>
                </Link>
                <Link to="/client/favorites" className={`flex flex-col items-center gap-1 px-3 py-1 ${isActive('/client/favorites') ? 'text-primary' : 'text-gray-400'}`}>
                    <i className="fa-solid fa-heart text-xl"></i>
                    <span className="text-xs">المفضلة</span>
                </Link>
                <Link to="/client/messages" className={`flex flex-col items-center gap-1 px-3 py-1 relative ${isActive('/client/messages') ? 'text-primary' : 'text-gray-400'}`}>
                    <i className="fa-solid fa-comment-dots text-xl"></i>
                    {unreadMessages > 0 && (
                        <span className="absolute -top-0.5 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[9px] font-bold">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
                        </span>
                    )}
                    <span className="text-xs">الرسائل</span>
                </Link>
                <Link to="/client/profile" className={`flex flex-col items-center gap-1 px-3 py-1 ${isActive('/client/profile') ? 'text-primary' : 'text-gray-400'}`}>
                    <i className="fa-solid fa-user text-xl"></i>
                    <span className="text-xs">حسابي</span>
                </Link>
            </nav>
        </div>
    );
};

export default ClientLayout;
