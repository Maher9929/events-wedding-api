import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';

const navItems = [
    { to: '/admin/dashboard', icon: 'fa-chart-pie', label: 'نظرة عامة' },
    { to: '/admin/users', icon: 'fa-users', label: 'المستخدمين' },
    { to: '/admin/providers', icon: 'fa-store', label: 'مقدمو الخدمات' },
    { to: '/admin/categories', icon: 'fa-border-all', label: 'الفئات' },
    { to: '/admin/bookings', icon: 'fa-calendar-check', label: 'الحجوزات' },
    { to: '/admin/events', icon: 'fa-calendar-days', label: 'الفعاليات' },
    { to: '/admin/services', icon: 'fa-box', label: 'الخدمات' },
    { to: '/admin/reviews', icon: 'fa-star', label: 'التقييمات' },
    { to: '/admin/quotes', icon: 'fa-file-invoice', label: 'عروض الأسعار' },
    { to: '/admin/commissions', icon: 'fa-coins', label: 'العمولات' },
    { to: '/admin/audit-logs', icon: 'fa-shield-halved', label: 'سجل المراقبة' },
];

const SidebarContent = ({ currentUser, pathname, setSidebarOpen }: { currentUser: any, pathname: string, setSidebarOpen?: (val: boolean) => void }) => {
    const isActive = (path: string) => pathname === path;
    return (
        <>
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
                        <i className="fa-solid fa-shield text-white"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-primary">لوحة الإدارة</h1>
                        <p className="text-xs text-gray-500">{currentUser?.full_name || 'مدير'}</p>
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
                        <i className="fa-solid fa-arrow-right w-4"></i>
                        العودة للموقع
                    </Link>
                    <button
                        onClick={() => authService.logout()}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-bold transition-colors text-sm w-full"
                    >
                        <i className="fa-solid fa-sign-out-alt w-4"></i>
                        تسجيل الخروج
                    </button>
                </div>
            </nav>
        </>
    );
};

const AdminLayout = () => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isActive = (path: string) => location.pathname === path;
    const currentUser = authService.getCurrentUser();

    return (
        <div className="min-h-screen bg-bglight font-tajawal flex" dir="rtl">
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
                    <h1 className="font-bold text-lg text-gray-900 md:hidden">لوحة الإدارة</h1>
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-sm text-gray-500">مرحباً، {currentUser?.full_name || 'مدير'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {navItems.map(item => (
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
                        <button
                            onClick={() => authService.logout()}
                            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        >
                            <i className="fa-solid fa-sign-out-alt"></i>
                            تسجيل الخروج
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
