// Chapter 7 P2 — marketing kit drafts editor.
// Editable DRAFTS only: the kit never publishes or sends. Every publish/send
// happens through its own existing system (sale page, campaigns, social, SMS
// at launch). Unsupported claims the shared brand-truth guardrail removed are
// shown to the operator — never silently dropped.
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, MessageSquare } from 'lucide-react';

export default function KitDrafts({ draft, onChange }) {
  const d = draft || {};
  const updateSocial = (i, text) => {
    const posts = [...(d.social_posts || [])];
    posts[i] = { ...posts[i], text };
    onChange({ ...d, social_posts: posts });
  };
  const copy = (text, label) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-slate-700">Sale description</label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-slate-500">Draft — publish on the sale page</Badge>
            <button onClick={() => copy(d.sale_description || '')} className="text-slate-400 hover:text-slate-700"><Copy className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <Textarea rows={6} value={d.sale_description || ''} placeholder="Generate the kit to draft the sale description"
          onChange={(e) => onChange({ ...d, sale_description: e.target.value })} />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1.5">Social posts</label>
        <div className="space-y-2">
          {(d.social_posts || []).map((p, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <Badge variant="secondary" className="capitalize">{p.platform}</Badge>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {(p.text || '').length} chars
                  <button onClick={() => copy(p.text || '')} className="hover:text-slate-700"><Copy className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <Textarea rows={3} value={p.text || ''} onChange={(e) => updateSocial(i, e.target.value)} />
            </div>
          ))}
          {(!d.social_posts || d.social_posts.length === 0) && (
            <div className="text-sm text-slate-400">Generate the kit to draft social posts.</div>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-2">Drafts only — publishing happens through your existing social posting tools.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-slate-700">Email campaign</label>
          <Badge variant="outline" className="text-slate-500">Draft — send via Campaigns</Badge>
        </div>
        <Input value={(d.email_draft || {}).subject || ''} placeholder="Subject" className="mb-2"
          onChange={(e) => onChange({ ...d, email_draft: { ...(d.email_draft || {}), subject: e.target.value } })} />
        <Textarea rows={5} value={(d.email_draft || {}).body || ''} placeholder="Email body"
          onChange={(e) => onChange({ ...d, email_draft: { ...(d.email_draft || {}), body: e.target.value } })} />
        <p className="text-xs text-slate-500 mt-1.5">
          Sending always goes through your existing campaign system with its own consent rules — the kit never sends.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> SMS draft</label>
          <Badge variant="outline" className="text-slate-500">Content only — SMS sending arrives at launch</Badge>
        </div>
        <Textarea rows={2} value={d.sms_draft || ''} placeholder="Short, factual SMS draft"
          onChange={(e) => onChange({ ...d, sms_draft: e.target.value })} />
        <p className="text-xs text-slate-500 mt-1.5">
          SMS sending is not available yet — this is content preparation only, and SMS will always require explicit
          per-buyer SMS opt-in.
        </p>
      </div>

      {(d.ai_removals || []).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-800 mb-1">
            <AlertTriangle className="w-4 h-4" /> Claims removed from AI drafts
          </div>
          <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
            {d.ai_removals.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <p className="text-xs text-amber-600 mt-1.5">
            These sentences made claims your records do not support, so the brand-truth guardrail removed them.
          </p>
        </div>
      )}
    </div>
  );
}