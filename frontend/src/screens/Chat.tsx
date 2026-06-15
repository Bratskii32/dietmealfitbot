import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { ErrorToast } from '../components/ErrorToast';
import { parseApiError } from '../utils/errors';
import { ChatMessage } from '../types';

interface Props {
  onShowPaywall: () => void;
}

const QUICK_QUESTIONS = [
  'Чем заменить сахар?',
  'Что съесть до тренировки?',
  'Почему я не худею?',
  'Составь список покупок',
];

export function Chat({ onShowPaywall }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [remaining, setRemaining] = useState(3);
  const [limit, setLimit] = useState(3);
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; retry?: () => void } | null>(null);
  const pendingMessage = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await api.getChatMessages();
      setMessages(data.messages);
      setRemaining(data.remaining);
      setLimit(data.limit);
      setWeeklyUsed(data.weeklyUsed);
      setIsPremium(data.isPremium);
    } catch { /* ignore */ }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    if (!isPremium && remaining <= 0) {
      onShowPaywall();
      return;
    }

    setLoading(true);
    setToast(null);
    setInput('');
    pendingMessage.current = text;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const data = await api.sendMessage(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      setRemaining(data.remaining);
      setWeeklyUsed(data.weeklyUsed);
      setIsPremium(data.isPremium);
      pendingMessage.current = '';
    } catch (err: unknown) {
      const e = err as { status?: number; error?: string };
      if (e.status === 429 || e.error === 'premium_required') {
        onShowPaywall();
      } else {
        const parsed = parseApiError(err);
        setToast({
          message: parsed.message,
          retry: parsed.retryable ? () => sendMessage(pendingMessage.current || text) : undefined,
        });
      }
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
      <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 18 }}>AI-диетолог 💬</h2>
        {!isPremium && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Запросов в чате на этой неделе: {weeklyUsed}/{limit}
          </p>
        )}
        {isPremium && (
          <p style={{ fontSize: 13, color: 'var(--primary)', marginTop: 4 }}>⭐ Premium — безлимит</p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 40, fontSize: 15 }}>
            Задай вопрос о питании — я помогу! 🥗
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: 16,
              fontSize: 15,
              lineHeight: 1.4,
              background: msg.role === 'user' ? 'var(--user-msg)' : 'var(--ai-msg)',
              color: msg.role === 'user' ? 'white' : 'var(--text)',
              borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{ padding: '10px 14px', borderRadius: 16, background: 'var(--ai-msg)', fontSize: 15 }}>
              Печатает...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '8px 16px', background: 'white', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8, paddingBottom: 4 }}>
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} className="chip" onClick={() => sendMessage(q)}>{q}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Напиши вопрос..."
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '2px solid var(--border)',
              borderRadius: 24,
              fontSize: 15,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--primary)', color: 'white', fontSize: 18, flexShrink: 0,
            }}
          >
            ➤
          </button>
        </div>
      </div>

      {toast && (
        <ErrorToast message={toast.message} onRetry={toast.retry} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
