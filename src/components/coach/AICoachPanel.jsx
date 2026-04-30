import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Send, Sparkles, Loader2, RotateCcw, ChevronDown, Zap, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTED_PROMPTS = [
  'How can I grow my estate sale business this month?',
  'Write a marketing plan for my next sale',
  'How should I price antique furniture?',
  'Give me a 30-day lead generation strategy',
  'How do I improve my Facebook Ads performance?',
  'Help me write a client onboarding email',
  'What KPIs should I track as an operator?',
  'How do I expand into a new territory?',
];

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o (Recommended)', badge: 'Smart' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)', badge: 'Fast' },
  { value: 'o1-mini', label: 'o1 Mini (Reasoning)', badge: 'Deep' },
];

export default function AICoachPanel({ user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('gpt-4o');
  const [context, setContext] = useState(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadContext = async () => {
    try {
      const [sales] = await Promise.all([
        base44.entities.EstateSale.filter({ operator_id: user.id }, '-created_date', 10),
      ]);

      const totalRevenue = sales.reduce((s, sale) => s + (sale.actual_revenue || 0), 0);

      setContext({
        companyName: user.company_name || user.full_name,
        territory: user.territory || user.location_city || '',
        brandVoice: user.brand_voice || 'Professional, warm, and trustworthy',
        recentSales: sales,
        aiMemory: user.ai_coach_memory || '',
        role: user.primary_account_type,
        totalSales: sales.length,
        totalRevenue,
      });
    } catch (e) {
      setContext({
        companyName: user.company_name || user.full_name,
        territory: '',
        brandVoice: 'Professional and trustworthy',
        recentSales: [],
        aiMemory: user.ai_coach_memory || '',
        role: user.primary_account_type,
        totalSales: 0,
        totalRevenue: 0,
      });
    }
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const res = await base44.functions.invoke('aiCoach', {
        messages: newMessages,
        context,
        model,
      });
      const data = res.data;
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      setTotalTokens(prev => prev + (data.usage?.total_tokens || 0));
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ I ran into an issue connecting to the AI. Please try again in a moment.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setShowSuggestions(true);
    setTotalTokens(0);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Legacy Lane AI Coach</h2>
              <p className="text-xs text-slate-400 leading-tight">
                {context ? `Coaching ${context.companyName || user.full_name}` : 'Loading your profile…'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={clearConversation} className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded" title="Clear conversation">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Model selector + token count */}
        <div className="flex items-center justify-between gap-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-7 bg-slate-800 border-slate-600 text-slate-200 text-xs w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {MODEL_OPTIONS.map(m => (
                <SelectItem key={m.value} value={m.value} className="text-slate-200 text-xs focus:bg-slate-700">
                  <span className="flex items-center gap-2">
                    {m.label}
                    <span className="text-orange-400 text-xs">[{m.badge}]</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {totalTokens > 0 && (
            <Badge className="bg-slate-700 text-slate-300 text-xs border-slate-600 gap-1">
              <Zap className="w-2.5 h-2.5" />
              {totalTokens.toLocaleString()} tokens
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700">
        {messages.length === 0 && (
          <div className="text-center pt-4 pb-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl flex items-center justify-center mb-3 shadow-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-white font-bold text-lg">Welcome{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!</h3>
            <p className="text-slate-400 text-sm mt-1 mb-4 leading-relaxed">
              I'm your dedicated AI Business Coach.<br />
              I know your company, your territory, and your goals.<br />
              Let's build something great together.
            </p>
            {context && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-left text-xs space-y-1.5 mb-4">
                <p className="text-slate-500 font-semibold uppercase tracking-wide text-xs mb-2">Your Profile</p>
                {context.companyName && <p className="text-slate-300">🏢 <span className="text-slate-400">Company:</span> {context.companyName}</p>}
                {context.territory && <p className="text-slate-300">📍 <span className="text-slate-400">Territory:</span> {context.territory}</p>}
                <p className="text-slate-300">📊 <span className="text-slate-400">Sales:</span> {context.totalSales} completed</p>
                <p className="text-slate-300">💰 <span className="text-slate-400">Revenue:</span> ${context.totalRevenue.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        {/* Suggestion chips */}
        {showSuggestions && messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium">Suggested topics:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-orange-500 text-slate-300 hover:text-white rounded-lg px-3 py-2 transition-all text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-orange-600 text-white rounded-tr-sm'
                : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:leading-relaxed [&_ul]:my-2 [&_li]:my-0.5 [&_strong]:text-orange-300 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-700 p-3 bg-slate-900">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach anything…"
            className="flex-1 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 resize-none text-sm min-h-[44px] max-h-32 focus-visible:ring-orange-500"
            rows={1}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-orange-600 hover:bg-orange-700 h-11 w-11 p-0 flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-slate-600 mt-2 text-center">
          Shift+Enter for new line · Enter to send · Powered by OpenAI
        </p>
      </div>
    </div>
  );
}