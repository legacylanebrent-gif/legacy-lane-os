import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Send, Loader2, RotateCcw, ChevronDown, AlertTriangle, Brain, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MODE_GROUPS, ALL_MODES, getModeByKey } from './coachModes';

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', badge: 'Smart' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', badge: 'Fast' },
];

// Suggested prompts per mode key
const MODE_STARTERS = {
  general_assistant: ['How do I grow my estate sale business?', 'What KPIs should I track?', 'Help me plan next month', 'How do I stand out from competitors?'],
  sale_promotion_package: ['My next sale is in Westfield, NJ on May 10–11. Featured items: Victorian bedroom set, Waterford crystal, mid-century modern chairs. Cash and Venmo accepted.'],
  social_media_post: ['Write a Facebook post for my upcoming sale in Bergen County this Saturday', 'Write an Instagram caption for a stunning antique bedroom set'],
  blog_post: ['Write a blog post about estate sale tips for families in Essex County, NJ', 'SEO blog: Why hire a professional estate sale company vs. doing it yourself?'],
  email_campaign: ['Write a 3-email sequence announcing my upcoming sale', 'Write a post-sale thank-you email with a review request'],
  sms_campaign: ['Write 3 SMS messages for my sale this Saturday in Montclair, NJ. Featured: jewelry, antiques, collectibles.'],
  image_prompt: ['Create image prompts for a Victorian-era estate sale in New Jersey', 'Jewelry and antiques flat lay for Instagram'],
  video_script: ['Write a 60-second promo video for my upcoming estate sale', 'Create a "Meet Our Team" video script'],
  lead_generation: ['Build me a 30-day lead generation plan for Bergen County', 'How do I get probate leads in my area?'],
  referral_partner_builder: ['Write an outreach email to a probate attorney', 'Help me pitch my services to elder law attorneys'],
  real_estate_agent_relations: ['Help me get real estate agents to refer me clients', 'Write a lunch-and-learn pitch for local agents'],
  territory_growth_plan: ['Build a 90-day plan to expand into Somerset County', 'How do I dominate my current territory before expanding?'],
  weekly_growth_plan: ['Build my growth plan for this week — I have one sale running and two consultations scheduled'],
  monthly_performance_review: ['Help me review last month: 4 sales, $82,000 revenue, 12 new leads. What should I focus on next month?'],
  objection_handler: ['"Your commission is too high — another company said they\'d do it for less"', '"We\'re not ready yet, we need more time"', '"The family can\'t agree on anything"'],
  post_sale_followup: ['Write my post-sale follow-up sequence for a sale that just closed in Ridgewood, NJ'],
  review_generation: ['Write everything I need to ask for a Google review after a sale', 'Write a review request text message for happy clients'],
  business_coaching: ['How do I scale from 2 to 5 sales per month?', 'What systems do I need to hire my first employee?'],
  vendor_relations: ['Help me build a junk removal vendor network', 'Write an outreach email to a senior move manager'],
  pricing_consultation: ['How do I price antique furniture at an estate sale?', 'Write my consultation walkthrough script for new clients'],
  team_task_suggestions: ['Build weekly task lists for my team of 3: me, a marketer, and an on-site crew lead'],
};

function ModeWelcomeCard({ mode }) {
  const w = mode.welcome;
  if (!w) return null;
  const Icon = mode.icon;
  return (
    <div className="pt-3 pb-2">
      <div className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center mb-3 shadow-lg`}>
        <Icon className={`w-5 h-5 ${mode.color}`} />
      </div>
      <h3 className="text-white font-bold text-base text-center">{w.title}</h3>
      <p className="text-slate-400 text-xs mt-1 mb-3 leading-relaxed text-center">{w.subtitle}</p>
      {w.deliverables && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs mb-3">
          <p className={`font-semibold mb-2 ${mode.color}`}>✦ You'll receive:</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {w.deliverables.map((d, i) => (
              <p key={i} className="text-slate-300">✓ {d}</p>
            ))}
          </div>
        </div>
      )}
      {w.tip && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-400">
          <span className="text-slate-300 font-medium">💡 </span>{w.tip}
        </div>
      )}
    </div>
  );
}

function DefaultWelcome({ user, context }) {
  return (
    <div className="text-center pt-4 pb-2">
      <div className="w-14 h-14 mx-auto bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl flex items-center justify-center mb-3 shadow-xl">
        <Brain className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-white font-bold text-base">
        Welcome{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
      </h3>
      <p className="text-slate-400 text-xs mt-1 mb-3 leading-relaxed">
        Your dedicated AI business partner.<br />
        I know your company, territory, and goals.<br />
        Choose a mode or just start talking.
      </p>
      {context && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-left text-xs space-y-1 mb-3">
          <p className="text-slate-500 font-semibold uppercase tracking-wide text-xs mb-1.5">Your Profile</p>
          {context.companyName && <p className="text-slate-300">🏢 <span className="text-slate-500">Company:</span> {context.companyName}</p>}
          {context.territory && <p className="text-slate-300">📍 <span className="text-slate-500">Territory:</span> {context.territory}</p>}
          <p className="text-slate-300">📊 <span className="text-slate-500">Sales:</span> {context.totalSales} completed</p>
          <p className="text-slate-300">💰 <span className="text-slate-500">Revenue:</span> ${context.totalRevenue.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

function ModeSelector({ activeMode, onSelect }) {
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);

  const handleSelect = (mode) => {
    onSelect(mode);
    setOpen(false);
    setExpandedGroup(null);
  };

  const Icon = activeMode.icon;

  return (
    <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 px-3 py-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 transition-all"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${activeMode.color}`} />
          <span className="text-xs font-medium text-slate-200">{activeMode.label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-1 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-600">
          {MODE_GROUPS.map(group => {
            const isExpanded = expandedGroup === group.label;
            return (
              <div key={group.label}>
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors hover:bg-slate-800"
                >
                  <span className={group.color}>{group.label}</span>
                  <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="grid grid-cols-2 gap-1 mt-1 mb-1">
                    {group.modes.map(mode => {
                      const MIcon = mode.icon;
                      const isActive = activeMode.key === mode.key;
                      return (
                        <button
                          key={mode.key}
                          onClick={() => handleSelect(mode)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-all border ${
                            isActive
                              ? 'bg-orange-600 border-orange-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <MIcon className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-white' : mode.color}`} />
                          <span className="leading-tight truncate">{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AICoachPanel({ user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('gpt-4o');
  const [context, setContext] = useState(null);
  const [showStarters, setShowStarters] = useState(true);
  const [activeMode, setActiveMode] = useState(getModeByKey('general_assistant'));
  const [creditAccount, setCreditAccount] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { loadContext(); loadCredits(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const loadCredits = async () => {
    try {
      const accounts = await base44.entities.OperatorAICreditAccount.filter({ operator_id: user.id });
      if (accounts.length > 0) setCreditAccount(accounts[0]);
    } catch (_) {}
  };

  const loadContext = async () => {
    try {
      const sales = await base44.entities.EstateSale.filter({ operator_id: user.id }, '-created_date', 10);
      setContext({
        companyName: user.company_name || user.full_name,
        territory: user.territory || user.location_city || '',
        totalSales: sales.length,
        totalRevenue: sales.reduce((s, sale) => s + (sale.actual_revenue || 0), 0),
      });
    } catch (_) {
      setContext({ companyName: user.company_name || user.full_name, territory: '', totalSales: 0, totalRevenue: 0 });
    }
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInput('');
    setShowStarters(false);
    setLoading(true);

    try {
      const res = await base44.functions.invoke('aiCoach', {
        messages: newMessages,
        model,
        ai_mode: activeMode.key,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      loadCredits();
    } catch (err) {
      const isLimit = err?.response?.data?.error === 'credit_limit_reached' || err?.response?.status === 402;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isLimit
          ? '🚫 **Credit Limit Reached**\n\nYou have reached your AI credit limit for this billing period. Please contact your admin to add more credits.'
          : '⚠️ I ran into an issue. Please try again in a moment.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleModeSelect = (mode) => {
    setActiveMode(mode);
    setMessages([]);
    setShowStarters(true);
  };

  const creditsUsed = creditAccount?.monthly_credits_used || 0;
  const creditsLimit = (creditAccount?.monthly_credit_limit || 0) + (creditAccount?.bonus_credits || 0) + (creditAccount?.rollover_credits || 0);
  const creditsAvailable = Math.max(0, creditsLimit - creditsUsed);
  const creditPct = creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 0;
  const isExhausted = creditAccount && creditsAvailable <= 0;
  const isLow = creditAccount && !isExhausted && creditPct >= 75;

  const starters = MODE_STARTERS[activeMode.key] || MODE_STARTERS.general_assistant;

  return (
    <div className="flex flex-col h-full bg-slate-950">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Legacy Lane AI Coach</h2>
              <p className="text-xs text-slate-400 leading-tight">
                {context ? `${context.companyName || user.full_name}` : 'Loading profile…'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setShowStarters(true); }} className="text-slate-400 hover:text-slate-200 p-1 rounded" title="Clear">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Model + Credits row */}
        <div className="flex items-center gap-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-6 bg-slate-800 border-slate-600 text-slate-300 text-xs w-36 flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {MODEL_OPTIONS.map(m => (
                <SelectItem key={m.value} value={m.value} className="text-slate-200 text-xs focus:bg-slate-700">
                  {m.label} <span className="text-orange-400 ml-1">[{m.badge}]</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {creditAccount && (
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${isExhausted ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, creditPct)}%` }}
                />
              </div>
              <span className={`text-xs flex-shrink-0 ${isExhausted ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-green-400'}`}>
                {creditsAvailable.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Mode Selector ── */}
      <ModeSelector activeMode={activeMode} onSelect={handleModeSelect} />

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700">

        {/* Welcome state */}
        {messages.length === 0 && (
          activeMode.welcome
            ? <ModeWelcomeCard mode={activeMode} />
            : <DefaultWelcome user={user} context={context} />
        )}

        {/* Starter prompts */}
        {showStarters && messages.length === 0 && starters.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <p className="text-xs text-slate-500 font-medium px-0.5">Try asking:</p>
            <div className="space-y-1.5">
              {starters.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="w-full text-left text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg px-3 py-2 transition-all leading-relaxed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <Brain className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={`max-w-[87%] rounded-2xl px-3.5 py-2.5 ${
              msg.role === 'user'
                ? 'bg-orange-600 text-white rounded-tr-sm'
                : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:leading-relaxed [&_ul]:my-1.5 [&_li]:my-0.5 [&_strong]:text-orange-300 [&_h2]:text-sm [&_h3]:text-xs [&_h2]:mt-3 [&_h3]:mt-2">
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
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
              <Brain className="w-3 h-3 text-white" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Credit warnings ── */}
      {isLow && !isExhausted && (
        <div className="flex-shrink-0 mx-3 mb-1.5 flex items-start gap-2 bg-yellow-900/40 border border-yellow-700 rounded-lg px-3 py-2 text-xs text-yellow-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Running low on AI credits for this billing period.</span>
        </div>
      )}
      {isExhausted && (
        <div className="flex-shrink-0 mx-3 mb-1.5 flex items-start gap-2 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>AI credit limit reached. Contact your admin to continue.</span>
        </div>
      )}

      {/* ── Input ── */}
      <div className="flex-shrink-0 border-t border-slate-700 p-3 bg-slate-900">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isExhausted ? 'Credits exhausted — contact admin…' : activeMode.placeholder}
            disabled={isExhausted}
            className="flex-1 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 resize-none text-sm min-h-[44px] max-h-28 focus-visible:ring-orange-500 disabled:opacity-50"
            rows={1}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || isExhausted}
            className="bg-orange-600 hover:bg-orange-700 h-11 w-11 p-0 flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}