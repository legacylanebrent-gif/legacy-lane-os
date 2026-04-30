import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Bot, User, Loader2, Sparkles, BarChart2, FileText, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ── Chat Tab ─────────────────────────────────────────────────────────────────
function ChatTab() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your Legacy Lane AI assistant. Ask me anything about your business, estate sales, leads, expenses, or platform features.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const res = await base44.functions.invoke('openaiAssistant', {
      mode: 'chat',
      messages: newMessages.slice(1) // exclude initial assistant greeting
    });
    setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-50 rounded-xl mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-orange-600" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-800'
            }`}>
              {msg.role === 'assistant'
                ? <ReactMarkdown className="prose prose-sm max-w-none">{msg.content}</ReactMarkdown>
                : msg.content
              }
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-orange-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask anything about your business..."
          className="flex-1"
        />
        <Button onClick={send} disabled={loading || !input.trim()} className="bg-orange-600 hover:bg-orange-700">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Content Generation Tab ────────────────────────────────────────────────────
const CONTENT_TEMPLATES = [
  { label: 'Estate Sale Listing Description', value: 'estate_listing', prompt: (details) => `Write a compelling estate sale listing description for: ${details}. Include highlights of items, atmosphere, and a call-to-action. Make it warm, inviting, and professional.` },
  { label: 'Email to Seller/Client', value: 'client_email', prompt: (details) => `Write a professional email to a client about: ${details}. Tone: warm, professional, clear. Include a greeting, body, and closing.` },
  { label: 'Social Media Post', value: 'social_post', prompt: (details) => `Write an engaging social media post (suitable for Facebook/Instagram) about: ${details}. Include relevant emojis and a call-to-action.` },
  { label: 'Property Description', value: 'property_desc', prompt: (details) => `Write a professional real estate property description for: ${details}. Highlight key features, lifestyle benefits, and location advantages.` },
  { label: 'Follow-up Email', value: 'followup', prompt: (details) => `Write a professional follow-up email regarding: ${details}. Keep it concise, friendly, and include a clear next step.` },
];

function ContentTab() {
  const [template, setTemplate] = useState('estate_listing');
  const [details, setDetails] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!details.trim()) return;
    setLoading(true);
    setResult('');
    const tpl = CONTENT_TEMPLATES.find(t => t.value === template);
    const res = await base44.functions.invoke('openaiAssistant', {
      mode: 'generate',
      prompt: tpl.prompt(details)
    });
    setResult(res.data.content);
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Content Type</label>
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TEMPLATES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Details / Context</label>
        <Textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder="Describe what you need... e.g. 'Victorian estate sale in Austin TX with antique furniture, jewelry, and art. 3 days, Friday–Sunday'"
          rows={4}
        />
      </div>
      <Button onClick={generate} disabled={loading || !details.trim()} className="bg-orange-600 hover:bg-orange-700 w-full">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating…</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Content</>}
      </Button>

      {result && (
        <div className="relative">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {result}
          </div>
          <Button
            onClick={copy}
            variant="outline"
            size="sm"
            className="absolute top-3 right-3 gap-1"
          >
            {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Data Analysis Tab ─────────────────────────────────────────────────────────
const ANALYSIS_TYPES = [
  { label: 'My Expenses Summary', value: 'expenses', fetch: async (user) => {
    const data = await base44.entities.BusinessExpense.filter({ created_by: user.email });
    const total = data.reduce((s, e) => s + e.amount, 0);
    const byCategory = data.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {});
    return { total_expenses: total, count: data.length, by_category: byCategory, recent: data.slice(0, 5).map(e => ({ vendor: e.vendor_name, amount: e.amount, category: e.category, date: e.expense_date })) };
  }},
  { label: 'Estate Sales Performance', value: 'sales', fetch: async (user) => {
    const data = await base44.entities.EstateSale.filter({ operator_id: user.id });
    return { total_sales: data.length, by_status: data.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {}), total_revenue: data.reduce((s, e) => s + (e.actual_revenue || 0), 0), avg_commission: data.filter(s => s.commission_rate).reduce((s, e, _, a) => s + e.commission_rate / a.length, 0) };
  }},
  { label: 'Leads Overview', value: 'leads', fetch: async () => {
    const data = await base44.entities.Lead.list('-created_date', 50);
    return { total_leads: data.length, by_source: data.reduce((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc; }, {}), by_intent: data.reduce((acc, l) => { acc[l.intent] = (acc[l.intent] || 0) + 1; return acc; }, {}), converted: data.filter(l => l.converted).length };
  }},
];

function AnalysisTab() {
  const [analysisType, setAnalysisType] = useState('expenses');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setResult('');
    const user = await base44.auth.me();
    const type = ANALYSIS_TYPES.find(t => t.value === analysisType);
    const data = await type.fetch(user);
    const res = await base44.functions.invoke('openaiAssistant', { mode: 'analyze', data });
    setResult(res.data.analysis);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">What to Analyze</label>
        <Select value={analysisType} onValueChange={setAnalysisType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANALYSIS_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={analyze} disabled={loading} className="bg-purple-600 hover:bg-purple-700 w-full">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyzing…</> : <><BarChart2 className="w-4 h-4 mr-2" />Analyze My Data</>}
      </Button>

      {result && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <ReactMarkdown className="prose prose-sm max-w-none text-slate-800">{result}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AIAssistant() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-orange-600" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-slate-900">AI Assistant</h1>
          <Badge className="bg-orange-100 text-orange-700 border-orange-200">Powered by OpenAI</Badge>
        </div>
        <p className="text-slate-600">Chat with AI, generate professional content, or get insights from your data.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="chat">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="chat" className="gap-2">
                <Bot className="w-4 h-4" /> Chat
              </TabsTrigger>
              <TabsTrigger value="generate" className="gap-2">
                <FileText className="w-4 h-4" /> Content
              </TabsTrigger>
              <TabsTrigger value="analyze" className="gap-2">
                <BarChart2 className="w-4 h-4" /> Insights
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat"><ChatTab /></TabsContent>
            <TabsContent value="generate"><ContentTab /></TabsContent>
            <TabsContent value="analyze"><AnalysisTab /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}