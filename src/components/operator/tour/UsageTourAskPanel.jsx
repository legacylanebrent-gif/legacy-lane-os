import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  'What should I do first?',
  'How do I publish a sale?',
  'Where do I change my plan?',
];

/**
 * Ask-anything box inside the guided tour. Answers platform usage questions
 * through the operatorUsageAssistant backend function.
 */
export default function UsageTourAskPanel({ user, stepId, askExample }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  const ask = async (raw) => {
    const text = String(raw ?? question).trim();
    if (!text || asking) return;

    const thread = [...messages, { role: 'user', content: text }];
    setMessages(thread);
    setQuestion('');
    setAsking(true);

    try {
      const res = await base44.functions.invoke('operatorUsageAssistant', {
        question: text,
        history: thread.slice(-8),
        context: {
          step: stepId,
          account_type: user?.primary_account_type || '',
          plan: user?.subscription_tier || 'none',
          company_name: user?.company_name || '',
        },
      });
      const reply = res.data?.reply || 'Sorry, I could not answer that. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      console.error('Usage assistant error:', e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I could not reach the assistant just now. Please try again in a moment.' },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-700">
        <Sparkles className="w-3.5 h-3.5" />
        Ask AI about using the site
      </p>

      {messages.length > 0 && (
        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white'
                  : 'max-w-[92%] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700'
              }
            >
              {m.role === 'user' ? (
                m.content
              ) : (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
          {asking && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              ask();
            }
          }}
          placeholder={askExample || 'Ask a question about using EstateSalen…'}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
        <Button
          onClick={() => ask()}
          disabled={asking || !question.trim()}
          className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800"
        >
          {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="ml-2">Ask</span>
        </Button>
      </div>

      {messages.length === 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => ask(p)}
              className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-cyan-500 hover:text-cyan-700"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}