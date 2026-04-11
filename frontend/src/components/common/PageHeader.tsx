import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Reusable page header with title, optional back button, subtitle, and action buttons.
 * Standardizes the top bar across client, provider, and admin pages.
 */
const PageHeader = ({ title, subtitle, showBack = false, actions, className = '' }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className={`bg-white sticky top-0 z-40 shadow-sm ${className}`}>
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-bglight flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors"
            >
              <i className="fa-solid fa-arrow-right text-gray-700"></i>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
};

export default PageHeader;
