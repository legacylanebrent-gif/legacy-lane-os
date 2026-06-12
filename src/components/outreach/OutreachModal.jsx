import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, CheckCircle2, AlertCircle, Send, X, Sparkles } from 'lucide-react';

const STATUS_COLORS = {
  queued: 'bg-slate-100 text-slate-600',
  email_1_sent: 'bg-blue-100 text-blue-700',
  email_2_sent: 'bg-indigo-100 text-indigo-700',
  email_3_sent: 'bg-purple-100 text-purple-700',
  replied: 'bg-green-100 text-green-700',
  booked: 'bg-emerald-100 text-emerald-800',
  not_interested: 'bg-slate-100 text-slate-500',
  unsubscribed: 'bg-red-100 text-red-600',
  failed: 'bg-red-100 text-red-700',
};

export default function OutreachModal({ open, onClose, selectedLeads }) {
  const [template, setTemplate] = useState('value_first');
  const [step, setStep] = useState('configure'); // configure | sending | done
  const [results, setResults] = useState([]);
  const [sending, setSending] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [notes, setNotes] = useState('');

  const eligibleLeads = selectedLeads.filter(l => l.email && !l.do_not_contact);
  const noEmailLeads = selectedLeads.filter(l => !l.email);

  const handleStart = async () => {
    setSending(true);
    setStep('sending');
    setResults([]);
    setCurrentIdx(0);

    const newResults = [];

    for (let i = 0; i < eligibleLeads.length; i++) {
      const lead = eligibleLeads[i];
      setCurrentIdx(i);

      try {
        // Create sequence record
        const seq = await base44.asServiceRole.entities.OutreachSequence.create({
          lead_id: lead.id,
          company_name: lead.company_name,
          contact_email: lead.email,
          contact_name: lead.owner_name || '',
          city: lead.city || '',
          state: lead.state || '',
          sequence_status: 'queued',
          sequence_template: template,
          admin_notes: notes,
        });

        // Send email 1
        const res = await base44.functions.invoke('sendOutreachEmail', {
          sequence_id: seq.id,
          email_num: 1,
        });

        newResults.push({
          lead,
          status: res.data?.success ? 'sent' : 'failed',
          subject: res.data?.subject,
          error: res.data?.error,
          sequence_id: seq.id,
        });
      } catch (e) {
        newResults.push({ lead, status: 'failed', error: e.message });
      }

      setResults([...newResults]);
    }

    setSending(false);
    setStep('done');
  };

  const handleClose = () => {
    setStep('configure');
    setResults([]);
    setCurrentIdx(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !sending && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            AI Outreach Sequence
          </DialogTitle>
          <DialogDescription>
            Send personalized AI-generated emails to selected leads via Gmail to convert them into paid Estate Sale Company Owners.
          </DialogDescription>
        </DialogHeader>

        {/* Configure step */}
        {step === 'configure' && (
          <div className="space-y-5 py-2">
            {/* Lead summary */}
            <div className="bg-slate-50 border rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Selected leads:</span>
                <span className="font-semibold">{selectedLeads.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Have email (eligible):</span>
                <span className="font-semibold text-green-700">{eligibleLeads.length}</span>
              </div>
              {noEmailLeads.length > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Missing email (skipped):</span>
                  <span className="font-semibold">{noEmailLeads.length}</span>
                </div>
              )}
            </div>

            {eligibleLeads.length === 0 && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                None of the selected leads have email addresses. Please enrich emails first.
              </div>
            )}

            {/* Template selector */}
            <div>
              <Label className="mb-1 block">Email Template Style</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value_first">Value-First — Lead with benefits & platform value</SelectItem>
                  <SelectItem value="pain_point">Pain-Point — Address frustrations, offer solution</SelectItem>
                  <SelectItem value="direct">Direct & Brief — Short, punchy, no fluff</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">AI will personalize each email to the company name, city, and state.</p>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-1 block">Internal Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Focus on NJ Estate Sale Company Owners who mentioned price..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}><X className="w-4 h-4 mr-1" />Cancel</Button>
              <Button
                onClick={handleStart}
                disabled={eligibleLeads.length === 0}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to {eligibleLeads.length} Lead{eligibleLeads.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Sending step */}
        {step === 'sending' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
              <span className="text-sm text-slate-600">
                Sending {currentIdx + 1} of {eligibleLeads.length}: {eligibleLeads[currentIdx]?.company_name}…
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-violet-500 h-2 rounded-full transition-all"
                style={{ width: `${((currentIdx + 1) / eligibleLeads.length) * 100}%` }}
              />
            </div>
            <ResultsList results={results} />
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Outreach complete — {results.filter(r => r.status === 'sent').length} emails sent
            </div>
            <ResultsList results={results} />
            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultsList({ results }) {
  if (results.length === 0) return null;
  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      {results.map((r, i) => (
        <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded-lg border ${r.status === 'sent' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {r.status === 'sent'
            ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          }
          <div className="min-w-0">
            <div className="font-medium text-slate-700 truncate">{r.lead.company_name}</div>
            {r.subject && <div className="text-slate-500 text-xs truncate">"{r.subject}"</div>}
            {r.error && <div className="text-red-600 text-xs">{r.error}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}