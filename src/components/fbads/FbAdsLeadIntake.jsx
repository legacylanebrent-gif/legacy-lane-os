import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, Send, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

const AI_STATUS_COLORS = {
  not_started: 'bg-slate-100 text-slate-500',
  draft_ready: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const ALERT_COLORS = {
  not_sent: 'bg-slate-100 text-slate-500',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function LeadRow({ lead, onGenerateResponse, onSendResponse, generating, sending }) {
  const [open, setOpen] = useState(false);
  let draft = null;
  try { draft = lead.ai_response_draft ? JSON.parse(lead.ai_response_draft) : null; } catch (_) {}

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setOpen(e => !e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-semibold text-slate-700">{lead.full_name || 'Unknown'}</span>
            <Badge className={`text-xs ${AI_STATUS_COLORS[lead.ai_response_status] || AI_STATUS_COLORS.not_started}`}>{lead.ai_response_status}</Badge>
            <Badge className={`text-xs ${ALERT_COLORS[lead.admin_alert_status] || ALERT_COLORS.not_sent}`}>alert: {lead.admin_alert_status}</Badge>
          </div>
          <p className="text-xs text-slate-400">{lead.email || '—'} · {lead.phone || '—'} · {lead.company_name || '—'}</p>
          {lead.created_at && <p className="text-xs text-slate-300 mt-0.5">{format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}</p>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div><p className="text-slate-400 mb-0.5">Campaign ID</p><p className="text-slate-600">{lead.campaign_id || '—'}</p></div>
            <div><p className="text-slate-400 mb-0.5">Ad ID</p><p className="text-slate-600">{lead.ad_id || '—'}</p></div>
            <div><p className="text-slate-400 mb-0.5">Form ID</p><p className="text-slate-600">{lead.form_id || '—'}</p></div>
            <div><p className="text-slate-400 mb-0.5">Lead Stage</p><p className="text-slate-600">{lead.lead_stage}</p></div>
            <div><p className="text-slate-400 mb-0.5">Meta Lead ID</p><p className="text-slate-600 font-mono">{lead.meta_lead_id || '—'}</p></div>
          </div>

          {draft && (
            <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">AI Draft Response</p>
              <p className="text-xs text-slate-500"><strong>Subject:</strong> {draft.subject}</p>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{draft.email_body}</p>
              {draft.sms_draft && <p className="text-xs text-blue-600 bg-blue-50 rounded p-2"><strong>SMS:</strong> {draft.sms_draft}</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {lead.ai_response_status === 'not_started' && (
              <Button size="sm" variant="ghost" onClick={() => onGenerateResponse(lead.id)}
                disabled={generating === lead.id}
                className="text-amber-600 hover:bg-amber-50 text-xs">
                {generating === lead.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</> : 'Generate AI Response'}
              </Button>
            )}
            {lead.ai_response_status === 'draft_ready' && lead.email && (
              <Button size="sm" onClick={() => onSendResponse(lead.id)}
                disabled={sending === lead.id}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                {sending === lead.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sending...</> : <><Send className="w-3 h-3 mr-1" />Send Response</>}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FbAdsLeadIntake({ settings }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [sending, setSending] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.FacebookLeadImport.list('-created_at', 50);
      setLeads(data);
    } catch (_) { setLeads([]); }
    setLoading(false);
  };

  const handleGenerateResponse = async (leadId) => {
    setGenerating(leadId);
    try {
      await base44.functions.invoke('generateFacebookLeadAIResponse', { lead_import_id: leadId, auto_send: false });
      setFeedback('✓ AI response drafted. Expand the lead to review and send.');
      await loadLeads();
    } catch (e) {
      setFeedback('Error: ' + (e?.response?.data?.error || e.message));
    }
    setGenerating(null);
  };

  const handleSendResponse = async (leadId) => {
    setSending(leadId);
    try {
      await base44.functions.invoke('generateFacebookLeadAIResponse', { lead_import_id: leadId, auto_send: true });
      setFeedback('✓ Response sent to lead.');
      await loadLeads();
    } catch (e) {
      setFeedback('Error: ' + (e?.response?.data?.error || e.message));
    }
    setSending(null);
  };

  return (
    <div className="space-y-4">
      {/* Webhook info */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-xs text-blue-700 space-y-1.5">
        <p className="font-semibold text-blue-800">Meta Lead Ads Webhook Setup</p>
        <p>Configure your Meta App webhook to point to your <code className="bg-blue-100 px-1 rounded font-mono">metaLeadWebhook</code> backend function URL.</p>
        <p>Find the function URL at: <strong>Dashboard → Code → Functions → metaLeadWebhook</strong></p>
        <p>Required secrets: <code className="bg-blue-100 px-1 rounded font-mono">META_LEADGEN_VERIFY_TOKEN</code>, <code className="bg-blue-100 px-1 rounded font-mono">META_LEADGEN_WEBHOOK_SECRET</code>, <code className="bg-blue-100 px-1 rounded font-mono">META_ACCESS_TOKEN</code></p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Badge className="bg-slate-100 text-slate-600 text-xs">{leads.length} leads imported</Badge>
          <Badge className="bg-green-100 text-green-700 text-xs">{leads.filter(l => l.ai_response_status === 'sent').length} responded</Badge>
          {!settings?.allow_ai_lead_auto_response && <Badge className="bg-amber-100 text-amber-700 text-xs">Auto-response: OFF</Badge>}
        </div>
        <Button size="sm" variant="ghost" onClick={loadLeads} className="text-slate-500 text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh
        </Button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg border text-sm ${feedback.startsWith('✓') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {feedback}<button onClick={() => setFeedback('')} className="ml-2 text-xs opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No Facebook leads imported yet. Configure the Meta webhook to start receiving leads.</div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <LeadRow key={lead.id} lead={lead} onGenerateResponse={handleGenerateResponse} onSendResponse={handleSendResponse} generating={generating} sending={sending} />
          ))}
        </div>
      )}
    </div>
  );
}