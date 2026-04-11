import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { messagesService } from '../../services/messages.service';
import type { Conversation } from '../../services/api';

interface ConversationListProps {
    onSelect: (id: string) => void;
    selectedId?: string;
}

const ConversationList = ({ onSelect, selectedId }: ConversationListProps) => {
    const { t, i18n } = useTranslation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

    useEffect(() => {
        messagesService.getConversations()
            .then((data) => { if (Array.isArray(data)) setConversations(data); })
            .catch(() => undefined)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80">
            <div className="p-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">{t('messages.title', 'Messages')}</h2>
                <div className="mt-3 relative">
                    <input
                        type="text"
                        placeholder={t('common.search', 'Search...')}
                        className="w-full h-10 bg-gray-50 rounded-xl px-4 ps-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading && <p className="p-4 text-center text-gray-400 text-sm">{t('common.loading', 'Loading...')}</p>}
                {!loading && conversations.length === 0 && (
                    <p className="p-4 text-center text-gray-400 text-sm">{t('messages.empty', 'No conversations yet')}</p>
                )}
                {conversations.map((convo) => (
                    <button
                        key={convo.id}
                        onClick={() => onSelect(convo.id)}
                        className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${selectedId === convo.id ? 'bg-purple-50 border-r-4 border-primary' : ''}`}
                    >
                        <div className="relative">
                            {convo.recipient_avatar ? (
                                <img loading="lazy" src={convo.recipient_avatar} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-primary font-bold">
                                    <i className="fa-solid fa-user"></i>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-right">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-sm text-gray-900">
                                    {convo.recipient_name || t('messages.conversation_fallback', 'Conversation ({{count}})', { count: convo.participant_ids?.length || 0 })}
                                </h3>
                                <span className="text-xs text-gray-400">
                                    {convo.last_message_at ? new Date(convo.last_message_at).toLocaleDateString(locale) : ''}
                                </span>
                            </div>
                            <p className="text-xs truncate text-gray-500">
                                {(convo.unread_count || 0) > 0
                                    ? t('messages.unread_count', { count: convo.unread_count, defaultValue: '{{count}} unread' })
                                    : t('messages.open_prompt', 'Click to view messages')}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ConversationList;
