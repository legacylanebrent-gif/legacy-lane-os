import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Send, Loader2, RotateCcw, ChevronDown, AlertTriangle, Brain, ChevronRight, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MODE_GROUPS, ALL_MODES, getModeByKey, MODE_STARTERS } from './coachModes';
import { SCREEN_ACTIONS, getScreenKey } from './screenActions';
import SalePromotionEngine from './SalePromotionEngine';
import ToneAdjustmentPanel from './ToneAdjustmentPanel';
import VoicePreferencesModal from './VoicePreferencesModal';
import GuidedContentFlow from './GuidedContentFlow';

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', badge: 'Smart' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', badge: 'Fast' },
];



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

function DefaultWelcome({ user, context, onSelectAction }) {
  const specialists = [
    { label: 'Marketing Assistant', icon: '📢', desc: 'Email campaigns, SMS, content strategy' },
    { label: 'Social Media Manager', icon: '📱', desc: 'Posts, captions, Reels, TikTok scripts' },
    { label: 'Blog Writer', icon: '📝', desc: 'SEO-optimized local content' },
    { label: 'Sale Promotion Expert', icon: '🎯', desc: '15-piece marketing packages' },
    { label: 'Business Coach', icon: '💼', desc: 'Scaling, systems, revenue growth' },
    { label: 'Referral Strategist', icon: '🤝', desc: 'Agent & attorney partnerships' },
    { label: 'Objection Coach', icon: '🛡️', desc: 'Client conversation scripts' },
    { label: 'Territory Growth Advisor', icon: '📍', desc: 'Local domination strategies' },
    { label: 'Content Memory System', icon: '🧠', desc: 'Remembers your brand voice' },
    { label: 'Weekly Accountability Partner', icon: '✅', desc: 'Growth plans & KPI tracking' },
  ];

  const quickActions = [
    { label: 'Promote an upcoming sale', mode: 'sale_promotion_package', icon: '🎯' },
    { label: 'Create social posts', mode: 'social_media_post', icon: '📱' },
    { label: 'Write a blog', mode: 'blog_post', icon: '📝' },
    { label: 'Build my lead plan', mode: 'lead_flow_planner', icon: '🎯' },
    { label: 'Coach me through a business issue', mode: 'business_coaching', icon: '💼' },
    { label: 'Help me contact real estate agents', mode: 'lead_generation', icon: '🤝' },
    { label: "Create this week's growth plan", mode: 'weekly_growth_plan', icon: '📅' },
    { label: 'Review my business performance', mode: 'monthly_business_review', icon: '📊' },
  ];

  return (
    <div className="text-center pt-4 pb-2 space-y-4">
      <div className="w-14 h-14 mx-auto bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl flex items-center justify-center shadow-xl">
        <Brain className="w-7 h-7 text-white" />
      </div>
      <div>
        <h3 className="text-white font-bold text-lg">
          Hi {user.full_name ? user.full_name.split(' ')[0] : 'there'} — Your 10-Specialist Team is Ready
        </h3>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          I'm your dedicated AI Coach covering every aspect of growing {context?.companyName || 'your company'} in {context?.territory || 'your territory'}. Think of me as 10 experts in one place.
        </p>
      </div>

      {/* Specialist Grid */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 px-3 py-3">
        <p className="text-xs text-orange-400 font-semibold mb-3 text-left">Your 10-Person Team:</p>
        <div className="grid grid-cols-2 gap-2">
          {specialists.map((spec, i) => (
            <div key={i} className="text-left bg-slate-800/60 rounded-lg p-2.5 border border-slate-700 hover:border-orange-600 transition-all">
              <div className="text-sm font-medium text-white mb-0.5">{spec.icon} {spec.label}</div>
              <div className="text-xs text-slate-400">{spec.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => onSelectAction(action.mode)}
            className="text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-orange-500 rounded-lg px-3 py-3 transition-all group"
          >
            <div className="text-lg mb-1">{action.icon}</div>
            <p className="text-xs font-medium text-slate-200 group-hover:text-white leading-tight">
              {action.label}
            </p>
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-400 text-center">
          💡 <span className="text-slate-300 font-medium">All 10 specialists are available anytime.</span> Switch modes above or ask me anything — I'll use the right expert.
        </p>
      </div>
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
    <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 px-3 py-2 space-y-1.5">
      <p className="text-xs text-slate-500 font-medium px-2">Switch Specialist:</p>
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

export default function AICoachPanel({ user, onClose, currentPathname }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [adjustingMessage, setAdjustingMessage] = useState(false);
  const [model, setModel] = useState('gpt-4o');
  const [context, setContext] = useState(null);
  const [showStarters, setShowStarters] = useState(true);
  const [activeMode, setActiveMode] = useState(getModeByKey('general_assistant'));
  const [creditAccount, setCreditAccount] = useState(null);
  const [voicePreferences, setVoicePreferences] = useState(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showContentFlow, setShowContentFlow] = useState(false);
  const [lastAssistantIndex, setLastAssistantIndex] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { loadContext(); loadCredits(); loadVoicePreferences(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const loadVoicePreferences = async () => {
    try {
      const me = await base44.auth.me();
      if (me && me.voice_preferences) {
        setVoicePreferences(typeof me.voice_preferences === 'string' ? JSON.parse(me.voice_preferences) : me.voice_preferences);
      }
    } catch (_) {}
  };

  const saveVoicePreferences = async (prefs) => {
    try {
      await base44.auth.updateMe({ voice_preferences: JSON.stringify(prefs) });
      setVoicePreferences(prefs);
    } catch (_) {}
  };

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

  const sendMessage = async (text, toneAdjustment = null) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    // Check if user is requesting guided content creation
    const contentFlowKeywords = ['create posts', 'create content', 'create social', 'make posts', 'generate posts', 'content for'];
    const isContentRequest = contentFlowKeywords.some(kw => userText.toLowerCase().includes(kw));
    if (isContentRequest) {
      setShowContentFlow(true);
      setInput('');
      return;
    }

    // If adjusting tone, send adjustment request with last assistant message
    if (toneAdjustment && lastAssistantIndex !== null) {
      const newMessages = [
        ...messages,
        { role: 'user', content: `${toneAdjustment}: "${messages[lastAssistantIndex].content.substring(0, 200)}..."` }
      ];
      setMessages(newMessages);
      setInput('');
      setAdjustingMessage(true);

      try {
        const res = await base44.functions.invoke('aiCoach', {
          messages: newMessages,
          model,
          ai_mode: activeMode.key,
          voice_preferences: voicePreferences,
        });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: res.data.reply };
          return updated;
        });
        loadCredits();
      } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Could not adjust tone. Please try again.' }]);
      } finally {
        setAdjustingMessage(false);
      }
      return;
    }

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
        voice_preferences: voicePreferences,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
      setLastAssistantIndex(newMessages.length); // track last assistant message index
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

  const handleQuickAction = (modeKey) => {
    const mode = getModeByKey(modeKey);
    if (mode) {
      handleModeSelect(mode);
    }
  };

  const creditsUsed = creditAccount?.monthly_credits_used || 0;
  const creditsLimit = (creditAccount?.monthly_credit_limit || 0) + (creditAccount?.bonus_credits || 0) + (creditAccount?.rollover_credits || 0);
  const creditsAvailable = Math.max(0, creditsLimit - creditsUsed);
  const creditPct = creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 0;
  const isExhausted = creditAccount && creditsAvailable <= 0;
  const isLow = creditAccount && !isExhausted && creditPct >= 75;

  const starters = MODE_STARTERS[activeMode.key] || MODE_STARTERS.general_assistant;
  const screenKey = getScreenKey(currentPathname || '');
  const screenActions = screenKey ? (SCREEN_ACTIONS[screenKey] || null) : null;

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
              <h2 className="text-sm font-bold text-white leading-tight">Your 10-Specialist Team</h2>
              <p className="text-xs text-slate-400 leading-tight">
                {context ? `${context.companyName || user.full_name} — Marketing, Sales, Growth & Coaching` : 'Loading profile…'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setShowStarters(true); }} className="text-slate-400 hover:text-slate-200 p-1 rounded" title="Clear">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setShowVoiceModal(true)} className="text-slate-400 hover:text-orange-400 p-1 rounded" title="Voice preferences">
              <Settings className="w-4 h-4" />
            </button>
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

      {/* ── Sale Promotion Engine (full-screen mode) ── */}
      {activeMode.key === 'sale_promotion_package' && (
        <div className="flex-1 overflow-hidden">
          <SalePromotionEngine user={user} isExhausted={isExhausted} onCreditsUsed={loadCredits} />
        </div>
      )}

      {/* ── Messages (all other modes) ── */}
      {activeMode.key !== 'sale_promotion_package' && <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700">

        {/* Welcome state */}
        {messages.length === 0 && (
          activeMode.welcome
            ? <ModeWelcomeCard mode={activeMode} />
            : <DefaultWelcome user={user} context={context} onSelectAction={handleQuickAction} />
        )}

        {/* Screen-contextual actions */}
        {showStarters && messages.length === 0 && screenActions && (
          <div className="space-y-1.5 mt-2">
            <p className="text-xs text-orange-400 font-semibold px-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
              Suggested for this page:
            </p>
            <div className="space-y-1.5">
              {screenActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const mode = getModeByKey(action.mode);
                    if (mode.key !== activeMode.key) setActiveMode(mode);
                    sendMessage(action.message);
                  }}
                  className="w-full text-left text-xs bg-orange-950/40 hover:bg-orange-900/50 border border-orange-800/50 hover:border-orange-600 text-orange-200 hover:text-white rounded-lg px-3 py-2 transition-all leading-relaxed"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Starter prompts */}
        {showStarters && messages.length === 0 && !screenActions && starters.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <p className="text-xs text-slate-500 font-medium px-0.5">Try asking:</p>
            <div className={activeMode.key === 'business_coaching' ? 'grid grid-cols-2 gap-1.5' : 'space-y-1.5'}>
              {starters.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className={`w-full text-left text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/60 text-slate-300 hover:text-white rounded-lg px-3 py-2 transition-all leading-relaxed ${activeMode.key === 'business_coaching' ? 'hover:bg-amber-950/30 hover:border-amber-600/50' : ''}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
            {msg.role === 'assistant' && i === messages.length - 1 && (
              <ToneAdjustmentPanel
                onAdjust={(tone) => sendMessage(`Make this ${tone}`, tone)}
                onSaveStyle={() => saveVoicePreferences({ ...voicePreferences, last_saved_style: new Date().toISOString() })}
                isAdjusting={adjustingMessage}
              />
            )}
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
      </div>}

      {/* ── Credit warnings ── */}
      {activeMode.key !== 'sale_promotion_package' && isLow && !isExhausted && (
        <div className="flex-shrink-0 mx-3 mb-1.5 flex items-start gap-2 bg-yellow-900/40 border border-yellow-700 rounded-lg px-3 py-2 text-xs text-yellow-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Running low on AI credits for this billing period.</span>
        </div>
      )}
      {activeMode.key !== 'sale_promotion_package' && isExhausted && (
        <div className="flex-shrink-0 mx-3 mb-1.5 flex items-start gap-2 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>AI credit limit reached. Contact your admin to continue.</span>
        </div>
      )}

      {/* ── Input (hidden for promotion engine) ── */}
      {activeMode.key !== 'sale_promotion_package' && <div className="flex-shrink-0 border-t border-slate-700 p-3 bg-slate-900">
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
      </div>}

      {/* ── Voice Preferences Modal ── */}
      <VoicePreferencesModal
        open={showVoiceModal}
        onOpenChange={setShowVoiceModal}
        preferences={voicePreferences}
        onSave={saveVoicePreferences}
      />

      {/* ── Guided Content Flow Modal ── */}
      {showContentFlow && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowContentFlow(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <GuidedContentFlow
              user={user}
              onClose={() => setShowContentFlow(false)}
              onContentSaved={() => loadCredits()}
            />
          </div>
        </>
      )}
    </div>
  );
}