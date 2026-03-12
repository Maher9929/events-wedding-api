import { useState, useEffect } from 'react';
import { messagesService } from '../../services/messages.service';
import type { Conversation } from '../../services/api';

interface ConversationListProps {
    onSelect: (id: string) => void;
    selectedId?: string;
}

const ConversationList = ({ onSelect, selectedId }: ConversationListProps) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        messagesService.getConversations()
            .then(data => { if (Array.isArray(data)) setConversations(data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80">
            <div className="p-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">الرسائل</h2>
                {/* Search Bar */}
                <div className="mt-3 relative">
                    <input
                        type="text"
                        placeholder="بحث..."
                        className="w-full h-10 bg-gray-50 rounded-xl px-4 ps-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading && <p className="p-4 text-center text-gray-400 text-sm">جاري التحميل...</p>}
                {!loading && conversations.length === 0 && (
                    <p className="p-4 text-center text-gray-400 text-sm">لا توجد محادثات بعد</p>
                )}
                {conversations.map((convo: any) => (
                    <button
                        key={convo.id}
                        onClick={() => onSelect(convo.id)}
                        className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${selectedId === convo.id ? 'bg-purple-50 border-r-4 border-primary' : ''
                            }`}
                    >
                        <div className="relative">
                            {convo.recipient_avatar ? (
                                <img src={convo.recipient_avatar} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-primary font-bold">
                                    <i className="fa-solid fa-user"></i>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-right">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-sm text-gray-900">
                                    {convo.recipient_name || `محادثة (${convo.participant_ids?.length || 0})`}
                                </h3>
                                <span className="text-xs text-gray-400">
                                    {convo.last_message_at ? new Date(convo.last_message_at).toLocaleDateString('ar-EG') : ''}
                                </span>
                            </div>
                            <p className="text-xs truncate text-gray-500">
                                {convo.unread_count > 0 ? `${convo.unread_count} رسائل جديدة` : 'انقر لعرض الرسائل'}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ConversationList;
