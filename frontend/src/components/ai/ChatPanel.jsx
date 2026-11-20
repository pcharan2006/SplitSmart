import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, RotateCcw, Trash2, AlertCircle } from 'lucide-react';
import { sendChat } from '../../services/aiService';
import { getErrorMessage } from '../../utils/format';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Who owes me the most money?',
  'Which category has the highest expenses?',
  'How much did we spend on groceries?',
  'What was our biggest expense?',
  "Compare this month's expenses with last month.",
  'Suggest ways to reduce our spending.',
];
const MAX = 1000;

let nextId = 1;

export default function ChatPanel({ groupId, scopeLabel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) return; // nothing to follow yet: keep the welcome screen at the top
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || loading) return;

    // Only real conversation turns go back to the server as context (never error bubbles).
    const history = messages.filter((m) => m.role !== 'error').slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    setMessages((m) => [...m.filter((x) => x.role !== 'error'), { id: nextId++, role: 'user', content: message }]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendChat({ message, history, groupId });
      setMessages((m) => [...m, { id: nextId++, role: 'assistant', content: res.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { id: nextId++, role: 'error', content: getErrorMessage(err), retry: message }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const empty = messages.length === 0;

  return (
    <div className="card flex h-[calc(100vh-15rem)] min-h-[28rem] flex-col overflow-hidden">
      <div className="flex flex-1 flex-col space-y-4 overflow-y-auto p-4 sm:p-6" role="log" aria-live="polite" aria-label="Conversation">
        {empty && (
          <div className="m-auto flex flex-col items-center py-4 text-center">
            <span className="gradient-brand flex h-16 w-16 animate-float items-center justify-center rounded-3xl text-white shadow-[0_18px_36px_-10px_rgb(var(--brand-rgb)/0.75)]"><Sparkles className="h-8 w-8" /></span>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight">Ask about your <span className="gradient-text">expenses</span></h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">Answers use your real data from {scopeLabel}. The assistant can explain your numbers but can't change anything.</p>
            <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((q, i) => (
                <button key={q} onClick={() => send(q)} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-up rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-sm text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md active:scale-95">{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="animate-pop flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-linear-to-br from-[#0f5b48] via-[#157a5c] to-[#1f9a6f] px-4 py-2.5 text-sm text-white shadow-[0_10px_20px_-10px_rgb(var(--brand-rgb)/0.8)]">{m.content}</p>
            </div>
          ) : m.role === 'assistant' ? (
            <div key={m.id} className="animate-pop flex gap-3">
              <span className="gradient-brand mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-md shadow-violet-500/30"><Sparkles className="h-4 w-4" /></span>
              {/* Rendered as plain text: React escapes it, so model output can never inject HTML. */}
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm ring-1 ring-slate-200/70">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{m.content}</span>
              <button onClick={() => send(m.retry)} className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"><RotateCcw className="h-3.5 w-3.5" />Retry</button>
            </div>
          )
        )}

        {loading && (
          <div className="flex gap-3" aria-label="Assistant is typing">
            <span className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"><Sparkles className="h-4 w-4" /></span>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
              {[0, 150, 300].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-slate-200/70 bg-white/70 p-3 backdrop-blur sm:p-4">
        <div className="flex items-end gap-2">
          <textarea ref={inputRef} rows={1} value={input} maxLength={MAX} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Ask a question about your expenses…" aria-label="Your question" className="input max-h-32 min-h-11 resize-none" />
          {messages.length > 0 && (
            <button type="button" onClick={() => setMessages([])} className="btn-secondary !px-3" aria-label="Clear conversation" title="Clear conversation"><Trash2 className="h-4 w-4" /></button>
          )}
          <button type="submit" className="btn-primary !px-3.5" disabled={loading || !input.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">Enter to send · Shift+Enter for a new line{input.length > MAX - 100 && ` · ${MAX - input.length} characters left`}</p>
      </form>
    </div>
  );
}
