import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const ProviderLayout = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/provider/dashboard', label: t('common.provider.dashboard'), icon: 'fa-chart-line' },
    { path: '/provider/calendar', label: t('common.provider.calendar'), icon: 'fa-calendar' },
    { path: '/provider/services', label: t('common.provider.services'), icon: 'fa-concierge-bell' },
    { path: '/provider/bookings', label: t('common.provider.bookings'), icon: 'fa-calendar-check' },
    { path: '/provider/quotes', label: t('common.provider.quotes'), icon: 'fa-file-contract' },
    { path: '/provider/reviews', label: t('common.provider.reviews'), icon: 'fa-star' },
    { path: '/provider/verification', label: t('common.provider.verification', 'التحقق'), icon: 'fa-shield-check' },
    { path: '/provider/profile', label: t('common.provider.profile'), icon: 'fa-user' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-primary">
                Dousha
              </Link>
              <span className="ms-4 text-sm text-gray-500">{t('common.provider.portal')}</span>
              <Link
                to="/"
                className="ms-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                <i className="fa-solid fa-house"></i>
                <span>{t('common.admin.back_to_site')}</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/provider/notifications" className="relative p-2 text-gray-600 hover:text-primary" aria-label={t('common.notifications')}>
                <i className="fa-solid fa-bell text-lg"></i>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Link>

              <div className="flex items-center space-x-3">
                <LanguageSwitcher />
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{t('common.provider.portal')}</p>
                </div>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-user text-white text-sm"></i>
                </div>
              </div>

              <button
                onClick={logout}
                className="px-3 py-2 text-sm text-gray-700 hover:text-primary"
              >
                <i className="fa-solid fa-sign-out-alt ms-2"></i>
                {t('common.admin.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-screen">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <i className={`fa-solid ${item.icon} w-5`}></i>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProviderLayout;
