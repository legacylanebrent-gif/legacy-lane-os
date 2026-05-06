import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import {
  Loader2, Sparkles, Mail, Calendar, CheckCircle2, ChevronRight,
  Edit3, Send, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const EMAIL_SEQUENCE = [
  { key: 'teaser', label: 'Teaser Email', daysBeforeSale: 7, subject: '7-Day Early Notice', icon: '📬' },
  { key: 'announcement', label: 'Announcement Email', daysBeforeSale: 3, subject: '3 Days Away!', icon: '📣' },
  { key: 'day_before', label: 'Day-Before Reminder', daysBeforeSale: 1, subject: 'Tomorrow!', icon: '⏰' },
  { key: 'day_of', label: 'Day-Of Email', daysBeforeSale: 0, subject: 'TODAY — Doors Open!', icon: '🚪' },
];

export default function EmailCampaignModal({ sale, open, onClose, onSaved }) {
  const [step, setStep] = useState('configure'); // configure | generating | review | saving | done
  const [listId, setListId] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [generatedEmails, setGeneratedEmails] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingStatus, setSavingStatus] = useState({});

  const saleStartDate = sale?.sale_dates?.[0]?.date || scheduleDate;

  const getScheduledDate = (daysBeforeSale) => {
    if (!saleStartDate) return null;
    const d = new Date(saleStartDate);
    d.setDate(d.getDate() - daysBeforeSale);
    return d.toISOString().split('T')[0];
  };

  const handleGenerate = async () => {
    setStep('generating');
    const featuredItems = (sale?.featured_items || []).join(', ') || 'Furniture, antiques, collectibles';
    const address = sale?.property_address
      ? `${sale.property_address.city || ''}, ${sale.property_address.state || ''}`.trim().replace(/^,|,$/, '')
      : '';

    const prompt = `You are an expert estate sale email marketer. Generate a 4-email drip sequence for this estate sale.

Sale Details:
- Title: ${sale?.title || 'Estate Sale'}
- Location: ${address || 'Local area'}
- Sale Dates: ${saleStartDate || 'Coming soon'}
- Featured Items: ${featuredItems}
- Special Notes: ${sale?.special_notes || 'None'}

Generate 4 emails. For EACH email output exactly this format:

### EMAIL: teaser
**Subject:** [subject line]
**Preview Text:** [one-line preview]
**Body:**
[full email body in HTML-friendly markdown — include greeting, 2-3 paragraphs, and a clear CTA button label]

### EMAIL: announcement
[same format]

### EMAIL: day_before
[same format]

### EMAIL: day_of
[same format]

Make each email feel urgent, warm, and local. Use real details. Keep bodies under 200 words each.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
      const parsed = parseEmails(typeof res === 'string' ? res : JSON.stringify(res));
      setGeneratedEmails(parsed);
      setStep('review');
    } catch (err) {
      alert('Generation failed: ' + err.message);
      setStep('configure');
    }
  };

  const parseEmails = (text) => {
    const result = {};
    EMAIL_SEQUENCE.forEach(({ key }) => {
      const regex = new RegExp(`### EMAIL: ${key}([\\s\\S]*?)(?=### EMAIL:|$)`, 'i');
      const match = text.match(regex);
      if (match) {
        const block = match[1].trim();
        const subjectMatch = block.match(/\*\*Subject:\*\*\s*(.+)/i);
        const previewMatch = block.match(/\*\*Preview Text:\*\*\s*(.+)/i);
        const bodyMatch = block.match(/\*\*Body:\*\*\s*([\s\S]+)/i);
        result[key] = {
          subject: subjectMatch?.[1]?.trim() || `Email for ${key}`,
          preview: previewMatch?.[1]?.trim() || '',
          body: bodyMatch?.[1]?.trim() || block,
        };
      } else {
        result[key] = { subject: `${key} email`, preview: '', body: text.slice(0, 300) };
      }
    });
    return result;
  };

  const handleSaveAll = async () => {
    setStep('saving');
    const results = {};
    for (const seq of EMAIL_SEQUENCE) {
      const email = generatedEmails[seq.key];
      if (!email) continue;
      setSavingStatus(prev => ({ ...prev, [seq.key]: 'saving' }));
      try {
        const scheduledDate = getScheduledDate(seq.daysBeforeSale);
        const record = await base44.entities.MarketingTask.create({
          task_type: 'estate_sale',
          sale_id: sale.id,
          sale_title: sale.title,
          title: `[Email] ${seq.label} — ${sale.title}`,
          description: `**Subject:** ${email.subject}\n\n**Preview:** ${email.preview}\n\n${email.body}`,
          category: 'email',
          status: 'pending',
          due_date: scheduledDate || null,
          notes: JSON.stringify({
            email_key: seq.key,
            subject: email.subject,
            preview: email.preview,
            mailchimp_list_id: listId || null,
            from_name: fromName || null,
            reply_to: replyTo || null,
            scheduled_send_date: scheduledDate || null,
            mailchimp_status: 'pending_keys', // ready to activate when API keys are added
          }),
        });
        results[seq.key] = record.id;
        setSavingStatus(prev => ({ ...prev, [seq.key]: 'done' }));
      } catch (err) {
        setSavingStatus(prev => ({ ...prev, [seq.key]: 'error' }));
      }
    }
    setStep('done');
    if (onSaved) onSaved();
  };

  const handleEditSave = (key) => {
    setGeneratedEmails(prev => ({ ...prev, [key]: { ...prev[key], body: editContent } }));
    setEditingKey(null);
  };

  const handleClose = () => {
    setStep('configure');
    setGeneratedEmails(null);
    setEditingKey(null);
    setSavingStatus({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            Email Campaign Builder
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs ml-1">4-Email Sequence</Badge>
          </DialogTitle>
          <p className="text-xs text-slate-500">AI-generated drip sequence — pre-scheduled and ready for Mailchimp.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 p-1">

          {/* STEP: Configure */}
          {(step === 'configure' || step === 'generating') && (
            <div className="space-y-4">
              {/* Sequence preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-800 mb-2">📧 Campaign Sequence</p>
                {EMAIL_SEQUENCE.map(seq => (
                  <div key={seq.key} className="flex items-center gap-3 text-xs text-blue-700">
                    <span>{seq.icon}</span>
                    <span className="font-medium w-36">{seq.label}</span>
                    <span className="text-blue-500">
                      {seq.daysBeforeSale === 0 ? 'Day of sale' : `${seq.daysBeforeSale} days before`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Optional: Sale start date override */}
              {!saleStartDate && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Sale Start Date (for scheduling)</label>
                  <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="h-9 text-sm" />
                </div>
              )}

              {/* Mailchimp config — optional, stored for later activation */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Mailchimp Settings <span className="text-slate-400 font-normal">(optional — store for later activation)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Audience List ID</label>
                    <Input value={listId} onChange={e => setListId(e.target.value)} placeholder="abc123def4" className="h-8 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">From Name</label>
                    <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your Estate Sales" className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Reply-To Email</label>
                    <Input type="email" value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="you@yourbusiness.com" className="h-8 text-xs" />
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <p className="text-[11px] text-amber-700">
                    💡 Campaigns will be saved as <strong>pending</strong> entities and pre-scheduled. Once your Mailchimp API key is added to settings, they can be activated with one click.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={step === 'generating'}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {step === 'generating'
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating 4-email sequence...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Generate Email Campaign with AI<ChevronRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </div>
          )}

          {/* STEP: Review */}
          {step === 'review' && generatedEmails && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-green-100 text-green-700 border-green-200">✓ 4 emails generated</Badge>
                <Button size="sm" variant="outline" onClick={() => setStep('configure')} className="text-xs">← Reconfigure</Button>
              </div>

              {EMAIL_SEQUENCE.map(seq => {
                const email = generatedEmails[seq.key];
                const scheduledDate = getScheduledDate(seq.daysBeforeSale);
                const isEditing = editingKey === seq.key;
                return (
                  <div key={seq.key} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{seq.icon}</span>
                        <span className="text-sm font-semibold text-slate-800">{seq.label}</span>
                        {scheduledDate && (
                          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />{scheduledDate}
                          </Badge>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingKey(seq.key); setEditContent(email.body); }} className="h-7 text-xs">
                        <Edit3 className="w-3 h-3 mr-1" />Edit
                      </Button>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Subject:</span>
                        <span className="text-xs font-medium text-slate-800">{email.subject}</span>
                      </div>
                      {email.preview && (
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Preview:</span>
                          <span className="text-xs text-slate-600">{email.preview}</span>
                        </div>
                      )}
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            className="w-full border border-slate-300 rounded-lg p-3 text-xs text-slate-700 min-h-[120px] font-mono resize-y"
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleEditSave(seq.key)} className="bg-blue-600 text-white text-xs h-7">Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingKey(null)} className="text-xs h-7">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-xs max-w-none text-slate-700 bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                          <ReactMarkdown>{email.body}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <Button onClick={handleSaveAll} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                <Send className="w-4 h-4 mr-2" />Save All 4 Emails to Campaigns
              </Button>
            </div>
          )}

          {/* STEP: Saving */}
          {step === 'saving' && (
            <div className="py-8 space-y-3">
              {EMAIL_SEQUENCE.map(seq => (
                <div key={seq.key} className="flex items-center gap-3 text-sm">
                  {savingStatus[seq.key] === 'done'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : savingStatus[seq.key] === 'error'
                      ? <span className="text-red-500 text-xs">✕</span>
                      : <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                  <span className="text-slate-700">{seq.icon} {seq.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <div>
                <p className="text-lg font-semibold text-slate-800">Email Campaign Saved!</p>
                <p className="text-sm text-slate-500 mt-1">4 emails created as pending campaign tasks, pre-scheduled by sale date.</p>
                <p className="text-xs text-amber-600 mt-2">Add your Mailchimp API key in settings to activate sending.</p>
              </div>
              <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700 text-white">Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}