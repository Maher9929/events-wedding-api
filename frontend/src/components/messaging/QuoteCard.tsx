import { useTranslation } from 'react-i18next';

interface QuoteCardProps {
    quoteId: string;
    total: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
    items: { description: string; price: number; quantity: number }[];
    onAccept?: () => void;
    onReject?: () => void;
    isSender: boolean;
}

const QuoteCard = ({ total, status, items, onAccept, onReject, isSender }: QuoteCardProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

    return (
        <div className={`rounded-xl overflow-hidden border ${isSender ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'} min-w-[300px]`}>
            <div className={`p-3 flex items-center justify-between ${isSender ? 'bg-purple-100' : 'bg-gray-100'}`}>
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-file-invoice-dollar text-primary"></i>
                    <span className="font-bold text-sm text-gray-900">{t('quotes.quote_label', 'Quote')}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${status === 'accepted' ? 'bg-green-100 text-green-700' : status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {status === 'sent' ? t('quotes.awaiting_reply', 'Awaiting reply') : status}
                </span>
            </div>

            <div className="p-3">
                <ul className="space-y-2 mb-3">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex justify-between text-xs text-gray-600">
                            <span>{item.description} (x{item.quantity})</span>
                            <span className="font-mono">{(item.price * item.quantity).toLocaleString(locale)} {t('common.currency', 'QAR')}</span>
                        </li>
                    ))}
                </ul>

                <div className="border-t border-gray-200 pt-2 flex justify-between items-center mb-3">
                    <span className="font-bold text-sm text-gray-900">{t('quotes.total', 'Total')}</span>
                    <span className="font-bold text-lg text-primary">{total.toLocaleString(locale)} {t('common.currency', 'QAR')}</span>
                </div>

                {!isSender && status === 'sent' && (
                    <div className="flex gap-2">
                        <button onClick={onAccept} className="flex-1 py-2 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors">
                            {t('common.accept', 'Accept')}
                        </button>
                        <button onClick={onReject} className="flex-1 py-2 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition-colors">
                            {t('common.reject', 'Reject')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuoteCard;
