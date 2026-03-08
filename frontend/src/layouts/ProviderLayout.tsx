import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProviderLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/provider/dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
    { path: '/provider/calendar', label: 'Calendar', icon: 'fa-calendar' },
    { path: '/provider/services', label: 'Services', icon: 'fa-concierge-bell' },
    { path: '/provider/bookings', label: 'Bookings', icon: 'fa-calendar-check' },
    { path: '/provider/quotes', label: 'Quotes', icon: 'fa-file-contract' },
    { path: '/provider/reviews', label: 'Reviews', icon: 'fa-star' },
    { path: '/provider/profile', label: 'Profile', icon: 'fa-user' },
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
              <span className="ms-4 text-sm text-gray-500">Provider Portal</span>
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/provider/notifications" className="relative p-2 text-gray-600 hover:text-primary">
                <i className="fa-solid fa-bell text-lg"></i>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Link>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">Provider</p>
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
                Logout
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
