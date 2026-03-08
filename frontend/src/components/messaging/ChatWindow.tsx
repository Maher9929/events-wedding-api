import { useState, useEffect, useRef } from 'react';
import { messagesService } from '../../services/messages.service';
import { authService } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { Paperclip, X, Image as ImageIcon, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import type { Message } from '../../services/api';

interface ChatWindowProps {
    conversationId?: string;
}

const ChatWindow = ({ conversationId }: ChatWindowProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [attachments, setAttachments] = useState<{ url: string; name: string; type: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentUser = authService.getCurrentUser();

    useEffect(() => {
        if (conversationId) {
            setLoading(true);
            messagesService.getMessages(conversationId)
                .then(data => { if (Array.isArray(data)) setMessages(data); })
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [conversationId]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        try {
            const newAttachments: { url: string; name: string; type: string }[] = [];
            for (const file of files) {
                const result = await uploadService.uploadFile(file, 'attachments', 'chat');
                newAttachments.push({
                    url: result.url,
                    name: file.name,
                    type: file.type.startsWith('image/') ? 'image' : 'document'
                });
            }
            setAttachments(prev => [...prev, ...newAttachments]);
        } catch (error) {
            toast.error('Erreur lors du téléchargement de la pièce jointe');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if ((!newMessage.trim() && attachments.length === 0) || !conversationId) return;
        try {
            const sent = await messagesService.sendMessage({
                recipient_id: conversationId, // Fallback if no convo id
                content: newMessage,
                conversation_id: conversationId,
                attachments: attachments.length > 0 ? attachments : undefined
            });
            if (sent) setMessages(prev => [...prev, sent]);
            setNewMessage('');
            setAttachments([]);
        } catch (err) {
            toast.error('Erreur lors de l\'envoi de la رسالة');
        }
    };

    if (!conversationId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <i className="fa-regular fa-comments text-6xl mb-4 opacity-20"></i>
                <p>اختر محادثة لبدء المراسلة</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-primary font-bold">
                        <i className="fa-solid fa-user"></i>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">محادثة</h3>
                        <span className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            متصل الآن
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loading && <p className="text-center text-gray-400 text-sm">جاري التحميل...</p>}
                {!loading && messages.length === 0 && (
                    <p className="text-center text-gray-400 text-sm">لا توجد رسائل بعد. ابدأ المحادثة!</p>
                )}
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl p-4 ${isMe
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-white text-gray-800 shadow-sm rounded-bl-none'
                                }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {msg.attachments.map((file, idx) => (
                                            <a 
                                                key={idx} 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-2 p-2 rounded text-xs ${isMe ? 'bg-white/20' : 'bg-gray-100'} hover:opacity-80 transition-opacity`}
                                            >
                                                {file.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                                <span className="truncate max-w-[150px]">{file.name}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                                <span className={`text-[10px] block mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4">
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {attachments.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm">
                                {file.type === 'image' ? <ImageIcon className="w-4 h-4 text-gray-500" /> : <FileText className="w-4 h-4 text-gray-500" />}
                                <span className="truncate max-w-[100px] text-gray-700">{file.name}</span>
                                <button onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-end gap-2">
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={uploading}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-gray-400 hover:text-primary hover:bg-purple-50 transition-colors flex-shrink-0 disabled:opacity-50"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="اكتب رسالتك... (اضغط Enter للإرسال)"
                        className="flex-1 max-h-32 min-h-[48px] bg-gray-50 rounded-2xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={uploading || (!newMessage.trim() && attachments.length === 0)}
                        className="w-12 h-12 rounded-full gradient-purple flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex-shrink-0 disabled:opacity-50 disabled:transform-none"
                    >
                        {uploading ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                            <i className="fa-solid fa-paper-plane"></i>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;
