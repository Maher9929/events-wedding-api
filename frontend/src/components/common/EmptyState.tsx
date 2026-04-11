import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Reusable empty state placeholder for pages with no data.
 * Replaces scattered inline "no data" messages across the app.
 */
const EmptyState = ({
  icon = 'fa-inbox',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) => {
  const { t } = useTranslation();
  const displayTitle = title || t('common.no_data', 'لا توجد بيانات');
  const displayDesc = description || t('common.no_data_desc', 'لم يتم العثور على نتائج');

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
        <i className={`fa-solid ${icon} text-3xl text-gray-300`}></i>
      </div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">{displayTitle}</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6">{displayDesc}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 rounded-2xl gradient-purple text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
