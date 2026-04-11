import { useTranslation } from 'react-i18next';

interface PaginationProps {
    page: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    className?: string;
}

const Pagination = ({ page, total, pageSize, onPageChange, className = '' }: PaginationProps) => {
    const { t, i18n } = useTranslation();

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const isFirstPage = page <= 0;
    const isLastPage = page + 1 >= totalPages;
    const isRtl = i18n.language?.startsWith('ar');

    if (total <= pageSize) {
        return null;
    }

    return (
        <div className={`flex items-center justify-center gap-3 pt-4 pb-2 ${className}`}>
            <button
                onClick={() => onPageChange(Math.max(0, page - 1))}
                disabled={isFirstPage}
                aria-label={t('common.previous', 'Previous')}
                className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
                <i className={`fa-solid ${isRtl ? 'fa-chevron-right' : 'fa-chevron-left'} text-sm`}></i>
            </button>
            <span className="text-sm font-bold text-gray-700">
                {t('common.page_status', '{{current}} / {{total}}', { current: page + 1, total: totalPages })}
            </span>
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={isLastPage}
                aria-label={t('common.next', 'Next')}
                className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
                <i className={`fa-solid ${isRtl ? 'fa-chevron-left' : 'fa-chevron-right'} text-sm`}></i>
            </button>
        </div>
    );
};

export default Pagination;
