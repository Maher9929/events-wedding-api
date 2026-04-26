import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { messagesService, type UserSearchResult } from '../services/messages.service';
import { authService } from '../services/auth.service';
import type { Conversation, Message } from '../services/api';
import { toastService } from '../services/toast.service';
import { useTranslation } from 'react-i18next';

const MessagesPage = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const providerIdParam = searchParams.get('providerId');
    const autoStart = searchParams.get('autoStart') === 'true';

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | undefined>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [sending, setSending] = useState(false);
    const [showNewConvo, setShowNewConvo] = useState(false);
    const [recipientId, setRecipientId] = useState('');
    const [recipientSearch, setRecipientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(null);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [firstMsg, setFirstMsg] = useState('');
    const [search, setSearch] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentUser = authService.getCurrentUser();

    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        document.title = `${t('common.messages')} | DOUSHA`;
    }, [t]);

    useEffect(() => {
        const loadConversations = (initial = false) => {
            messagesService.getConversations()
                .then((data) => {
                    const list = Array.isArray(data) ? data : [];
                    setConversations(list);

                    // Handle auto-start or pre-selection
                    if (initial && providerIdParam) {
                        const existingConvo = list.find((c) =>
                            c.participant_ids?.includes(providerIdParam)
                        );
                        if (existingConvo) {
                            setSelectedId(existingConvo.id);
                        } else if (autoStart) {
                            setRecipientId(providerIdParam);
                            setShowNewConvo(true);
                        }
                    }
                })
                .catch(() => { /* conversations may fail on first load */ })
                .finally(() => { if (initial) setLoadingConvos(false); });
        };

        loadConversations(true);

        if (currentUser?.id) {
            const subscription = messagesService.subscribeToConversations(currentUser.id, () => {
                loadConversations(false);
            });
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [currentUser?.id, providerIdParam, autoStart]);

    useEffect(() => {
        if (!selectedId) return;
        setLoadingMsgs(true);
        messagesService.getMessages(selectedId)
            .then((data) => {
                setMessages(Array.isArray(data) ? data : []);
            })
            .catch(() => { /* messages load failure handled by empty state UI */ })
            .finally(() => setLoadingMsgs(false));

        messagesService.markConversationRead(selectedId).catch(() => { /* fire-and-forget */ });

        const subscription = messagesService.subscribeToMessages(selectedId, (newMsg: Message) => {
            if (newMsg.sender_id !== currentUser?.id) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [selectedId, currentUser?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedId || sending) return;
        setSending(true);
        try {
            const sent = await messagesService.sendMessage({ conversation_id: selectedId, content: newMessage });
            if (sent?.id) {
                setMessages(prev => [...prev, sent]);
                if (sent.metadata?.content_filtered) {
                    toastService.warning(t('messages_page.content_filtered', 'تم تعديل رسالتك — لا يُسمح بمشاركة معلومات الاتصال'));
                }
            }
            setNewMessage('');
            setConversations(prev => prev.map(c =>
                c.id === selectedId ? { ...c, last_message_at: new Date().toISOString() } : c
            ));
        } catch (_error) {
            toastService.error(t('messages_page.send_error'));
        } finally {
            setSending(false);
        }
    };

    // Search users by name/email with debounce
    const handleRecipientSearch = (query: string) => {
        setRecipientSearch(query);
        setSelectedRecipient(null);
        setRecipientId('');
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (query.trim().length < 2) { setSearchResults([]); return; }
        searchTimeoutRef.current = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const results = await messagesService.searchUsers(query);
                setSearchResults(Array.isArray(results) ? results : []);
            } catch { setSearchResults([]); }
            finally { setSearchingUsers(false); }
        }, 300);
    };

    const selectRecipient = (user: UserSearchResult) => {
        setSelectedRecipient(user);
        setRecipientId(user.id);
        setRecipientSearch(user.full_name);
        setSearchResults([]);
    };

    const handleNewConversation = async () => {
        if (!recipientId.trim() || !firstMsg.trim()) return;
        try {
            const result = await messagesService.createConversation(recipientId, firstMsg);
            const msg = result;
            if (msg?.conversation_id) {
                const newConvo: Conversation = {
                    id: msg.conversation_id,
                    participant_ids: [currentUser?.id || '', recipientId],
                    last_message_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setConversations(prev => [newConvo, ...prev]);
                setSelectedId(msg.conversation_id);
                setMessages([msg]);
            }
            setShowNewConvo(false);
            setRecipientId('');
            setRecipientSearch('');
            setSelectedRecipient(null);
            setFirstMsg('');
            toastService.success(t('messages_page.create_success'));
        } catch (_error) {
            toastService.error(t('messages_page.create_error'));
        }
    };

    const getContactName = (convo: Conversation) => {
        return (convo as Conversation & { recipient_name?: string }).recipient_name || `${t('messages_page.conversation_fallback')} (${convo.participant_ids.length})`;
    };

    const getContactAvatar = (convo: Conversation) => {
        return (convo as Conversation & { recipient_avatar?: string }).recipient_avatar;
    };

    const filteredConvos = conversations.filter(c => {
        if (!search) return true;
        const name = getContactName(c).toLowerCase();
        return name.includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    });

    const selectedConvo = conversations.find(c => c.id === selectedId);

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <div className={`flex flex-col bg-white border-l border-gray-200 transition-all ${selectedId ? 'hidden md:flex w-80' : 'flex w-full md:w-80'}`}>
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold text-gray-900">{t('common.messages') || 'الرسائل'}</h2>
                        <button
                            onClick={() => setShowNewConvo(true)}
                            className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                            title={t('messages_page.new_conversation')}
                        >
                            <i className="fa-solid fa-pen-to-square text-sm"></i>
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('messages_page.search_placeholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-10 bg-gray-50 rounded-xl px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-gray-100"
                        />
                        <i className="fa-solid fa-search absolute right-3 top-3 text-gray-400 text-sm"></i>
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {loadingConvos && (
                        <div className="p-8 text-center text-gray-400">
                            <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
                            <p className="text-sm">{t('common.loading')}</p>
                        </div>
                    )}
                    {!loadingConvos && filteredConvos.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            <i className="fa-regular fa-comments text-4xl mb-3 opacity-30"></i>
                            <p className="text-sm font-bold">{t('messages_page.no_conversations')}</p>
                            <p className="text-xs mt-1">{t('messages_page.no_conversations_desc')}</p>
                            <button
                                onClick={() => setShowNewConvo(true)}
                                className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                            >
                                {t('messages_page.new_conversation')}
                            </button>
                        </div>
                    )}
                    {filteredConvos.map(convo => {
                        const isSelected = selectedId === convo.id;
                        const unread = convo.unread_count || 0;
                        return (
                            <button
                                key={convo.id}
                                onClick={() => setSelectedId(convo.id)}
                                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 text-right ${isSelected ? 'bg-purple-50 border-r-4 border-r-primary' : ''}`}
                            >
                                {getContactAvatar(convo) ? (
                                    <img loading="lazy" src={getContactAvatar(convo)} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                                        <i className="fa-solid fa-user text-sm"></i>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h3 className={`font-bold text-sm truncate ${unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {getContactName(convo)}
                                        </h3>
                                        <div className="flex items-center gap-1 flex-shrink-0 me-1">
                                            {convo.last_message_at && (
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(convo.last_message_at).toLocaleDateString(t('common.date_locale'), { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                            {unread > 0 && (
                                                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                                    {unread > 9 ? '9+' : unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className={`text-xs truncate ${unread > 0 ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>{t('messages_page.click_to_view')}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Chat Window */}
            <div className={`flex-1 flex flex-col ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
                {!selectedId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <i className="fa-regular fa-comments text-7xl mb-4 opacity-20"></i>
                        <p className="font-bold text-lg">{t('messages_page.select_conversation')}</p>
                        <p className="text-sm mt-1">{t('messages_page.or_start_new')}</p>
                        <button
                            onClick={() => setShowNewConvo(true)}
                            className="mt-6 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-colors"
                        >
                            <i className="fa-solid fa-pen-to-square ms-2"></i>
                            {t('messages_page.new_conversation')}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
                            <button
                                onClick={() => setSelectedId(undefined)}
                                className="md:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600"
                            >
                                <i className="fa-solid fa-arrow-right"></i>
                            </button>
                            {selectedConvo && selectedConvo.recipient_avatar ? (
                                <img loading="lazy" src={selectedConvo.recipient_avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                                    <i className="fa-solid fa-user text-sm"></i>
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">
                                    {selectedConvo ? getContactName(selectedConvo) : t('messages_page.conversation_fallback')}
                                </h3>
                                <span className="text-xs text-green-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                                    {t('messages_page.active')}
                                </span>
                            </div>
                        </div>

                        {/* Safety Banner */}
                        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-800 text-xs flex-shrink-0">
                            <i className="fa-solid fa-shield-halved text-amber-500"></i>
                            <span>{t('messages_page.safety_banner', 'لحمايتك، مشاركة أرقام الهاتف والبريد الإلكتروني محظورة. يرجى التواصل عبر المنصة فقط.')}</span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loadingMsgs && (
                                <div className="text-center text-gray-400 py-8">
                                    <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
                                </div>
                            )}
                            {!loadingMsgs && messages.length === 0 && (
                                <div className="text-center text-gray-400 py-8">
                                    <i className="fa-regular fa-comment-dots text-4xl mb-2 opacity-30"></i>
                                    <p className="text-sm">{t('messages_page.no_messages_yet')}</p>
                                </div>
                            )}
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_id === currentUser?.id;
                                const senderInfo = msg.sender;
                                const attachments = msg.metadata?.attachments || msg.attachments || [];
                                const showDate = idx === 0 ||
                                    new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString();
                                return (
                                    <div key={msg.id}>
                                        {showDate && (
                                            <div className="flex items-center justify-center my-4">
                                                <span className="px-3 py-1 bg-gray-100 rounded-full text-[11px] text-gray-500 font-bold">
                                                    {new Date(msg.created_at).toLocaleDateString(t('common.date_locale'), { weekday: 'long', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                            {!isMe && (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1 me-2">
                                                    {senderInfo?.full_name?.charAt(0) || <i className="fa-solid fa-user text-[10px]"></i>}
                                                </div>
                                            )}
                                            <div className={`max-w-[70%] ${isMe ? '' : ''}`}>
                                                {!isMe && senderInfo?.full_name && (
                                                    <p className="text-[11px] font-bold text-gray-500 mb-1 ms-1">{senderInfo.full_name}</p>
                                                )}
                                                <div className={`rounded-2xl px-4 py-3 ${isMe
                                                    ? 'bg-gradient-to-br from-primary to-purple-600 text-white rounded-br-sm'
                                                    : 'bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100'
                                                    }`}>
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                    {attachments.length > 0 && (
                                                        <div className="mt-2 space-y-1.5">
                                                            {attachments.map((att: { url?: string; type?: string; name?: string }, i: number) => {
                                                                const isImage = att.type?.startsWith('image/') || att.url?.match(/\.(jpg|jpeg|png|gif|webp)/i);
                                                                return isImage ? (
                                                                    <img loading="lazy" key={i} src={att.url} alt={att.name || t('messages_page.attachment')} className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(att.url, '_blank')} />
                                                                ) : (
                                                                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                                                                        <i className="fa-solid fa-file-arrow-down"></i>
                                                                        {att.name || t('messages_page.download_file')}
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <span className={`text-[10px] ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString(t('common.date_locale'), { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {isMe && (
                                                            <i className={`fa-solid fa-check-double text-[10px] ${isMe ? 'text-purple-200' : 'text-gray-400'}`}></i>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Typing Indicator */}
                            {isTyping && (
                                <div className="flex justify-start items-end gap-2 animate-fade-in my-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        <i className="fa-solid fa-user text-[10px]"></i>
                                    </div>
                                    <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                                        <div className="flex gap-1 items-center h-4">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => {
                                        setNewMessage(e.target.value);
                                        // Fake typing indicator for demo purposes
                                        if (e.target.value.length > 0) {
                                            setIsTyping(true);
                                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
                                        } else {
                                            setIsTyping(false);
                                        }
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder={t('messages_page.type_message')}
                                    className="flex-1 h-12 bg-gray-50 rounded-full px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-gray-100"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !newMessage.trim()}
                                    className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {sending
                                        ? <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                                        : <i className="fa-solid fa-paper-plane text-sm"></i>
                                    }
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* New Conversation Modal */}
            {showNewConvo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-lg text-gray-900">{t('messages_page.new_conversation')}</h3>
                            <button onClick={() => setShowNewConvo(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <i className="fa-solid fa-times text-sm"></i>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="text-sm font-bold text-gray-700 block mb-1.5">{t('messages_page.recipient', 'ابحث عن المستلم')}</label>
                                {selectedRecipient ? (
                                    <div className="flex items-center gap-3 h-11 border border-primary/30 bg-purple-50 rounded-xl px-4">
                                        {selectedRecipient.avatar_url ? (
                                            <img src={selectedRecipient.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                                                {selectedRecipient.full_name?.charAt(0)}
                                            </div>
                                        )}
                                        <span className="flex-1 text-sm font-bold text-gray-800 truncate">{selectedRecipient.full_name}</span>
                                        <button
                                            onClick={() => { setSelectedRecipient(null); setRecipientId(''); setRecipientSearch(''); }}
                                            className="text-xs text-primary font-bold hover:underline"
                                        >
                                            {t('messages_page.change_recipient', 'تغيير')}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder={t('messages_page.recipient_placeholder', 'اكتب الاسم أو البريد الإلكتروني')}
                                                value={recipientSearch}
                                                onChange={e => handleRecipientSearch(e.target.value)}
                                                className="w-full h-11 border border-gray-200 rounded-xl px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            {searchingUsers && (
                                                <i className="fa-solid fa-spinner fa-spin absolute left-3 top-3.5 text-gray-400 text-sm"></i>
                                            )}
                                        </div>
                                        {searchResults.length > 0 && (
                                            <div className="absolute z-10 left-0 right-0 top-[4.5rem] bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                {searchResults.map(user => (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => selectRecipient(user)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-right"
                                                    >
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                                {user.full_name?.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 truncate">{user.full_name}</p>
                                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                                        </div>
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{user.role}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {recipientSearch.length >= 2 && !searchingUsers && searchResults.length === 0 && (
                                            <p className="text-xs text-gray-400 mt-1">{t('messages_page.no_recipient_results', 'لا توجد نتائج مطابقة')}</p>
                                        )}
                                    </>
                                )}
                                <p className="text-xs text-gray-400 mt-1">{t('messages_page.recipient_hint', 'ابحث بالاسم أو البريد الإلكتروني')}</p>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-1.5">{t('messages_page.first_message')}</label>
                                <textarea
                                    placeholder={t('messages_page.first_message_placeholder')}
                                    value={firstMsg}
                                    onChange={e => setFirstMsg(e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={handleNewConversation}
                                disabled={!recipientId.trim() || !firstMsg.trim()}
                                className="flex-1 h-11 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {t('messages_page.send')}
                            </button>
                            <button
                                onClick={() => setShowNewConvo(false)}
                                className="flex-1 h-11 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesPage;
