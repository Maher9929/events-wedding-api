import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function DohaEventsChatbot() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory: ChatMessage[] = [...messages, userMsg];

      const response = await fetch(`${API_BASE_URL}/chatbot/ask`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationHistory,
          language: i18n.language,
        }),
      });

      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      const content =
        data.data?.content ??
        data.content ??
        data.reply ??
        'Désolé, une erreur est survenue.';
      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch {
      const errMsgs: Record<string, string> = {
        fr: 'Désolé, une erreur est survenue. Réessayez.',
        ar: 'عذرًا، حدث خطأ. حاول مرة أخرى.',
        en: 'Sorry, something went wrong. Please try again.',
      };
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errMsgs[i18n.language] || errMsgs.fr },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, i18n.language]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const placeholders: Record<string, string> = {
    fr: 'Posez votre question...',
    ar: 'اطرح سؤالك...',
    en: 'Ask a question...',
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chatbot"
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 99999,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B4FFF, #6C3CE0)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(139,79,255,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 148,
            right: 16,
            zIndex: 99999,
            width: 380,
            maxWidth: 'calc(100vw - 48px)',
            height: 520,
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: 16,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
            fontFamily: isArabic ? 'Tajawal, sans-serif' : 'Inter, sans-serif',
            direction: isArabic ? 'rtl' : 'ltr',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #8B4FFF, #6C3CE0)',
              color: '#fff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 22 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Doha Events Assistant
              </div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                {isLoading
                  ? isArabic
                    ? 'جاري الرد...'
                    : i18n.language === 'en'
                      ? 'Typing...'
                      : 'En train de répondre...'
                  : isArabic
                    ? 'متصل'
                    : i18n.language === 'en'
                      ? 'Online'
                      : 'En ligne'}
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              background: '#f8f9fa',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: '#888',
                  fontSize: 13,
                  marginTop: 40,
                  padding: '0 20px',
                }}
              >
                {isArabic
                  ? '👋 مرحبًا! كيف يمكنني مساعدتك في تنظيم مناسبتك؟'
                  : i18n.language === 'en'
                    ? '👋 Hi! How can I help you plan your event?'
                    : "👋 Bonjour ! Comment puis-je t'aider à organiser ton événement ?"}
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius:
                    msg.role === 'user'
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                  background:
                    msg.role === 'user'
                      ? 'linear-gradient(135deg, #8B4FFF, #6C3CE0)'
                      : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#333',
                  fontSize: 14,
                  lineHeight: 1.5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: '#fff',
                  padding: '10px 14px',
                  borderRadius: '16px 16px 16px 4px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  fontSize: 20,
                }}
              >
                <span style={{ animation: 'pulse 1.5s infinite' }}>●</span>
                <span style={{ animation: 'pulse 1.5s infinite 0.3s' }}>●</span>
                <span style={{ animation: 'pulse 1.5s infinite 0.6s' }}>●</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: '12px 16px',
              background: '#fff',
              borderTop: '1px solid #eee',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholders[i18n.language] || placeholders.fr}
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid #e0e0e0',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'inherit',
                direction: isArabic ? 'rtl' : 'ltr',
                maxHeight: 80,
              }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                background: input.trim() && !isLoading ? '#8B4FFF' : '#ccc',
                color: '#fff',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
