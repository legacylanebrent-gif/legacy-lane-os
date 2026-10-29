import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send } from 'lucide-react';
import { opportunities, SERVICE_NEEDS } from './listingApi';

export default function ServiceNeedPanel({ opportunity, onUpdated }) {
  const [need, setNeed] = useState(opportunity.service_need || 'unknown');
  const [deadline, setDeadline] = useState(opportunity.deadline || '');
  const [note, setNote] = useState(opportunity.service_need_note || '');
  const [nextAction, setNextAction] = useState(opportunity.next_action || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [share, setShare] = useState(false);
  const [contactPhone, setContactPhone] = useState('');

  const save = async () => {
    setBusy('save');
    setError('');
    setResult('');
    try {
      await opportunities.act('set_service_need', opportunity.id, {
        service_need: need,
        note,
        deadline: deadline || undefined,
        next_action: nextAction || undefined,
      });
      onUpdated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const requestHelp = async () => {
    setBusy('help');
    setError('');
    setResult('');
    try {
      const res = await opportunities.act('request_help', opportunity.id, {
        permission_to_share: share,
        contact_phone: contactPhone,
        notes: note,
        situation: note,
        best_contact_time: '',
        timeline: opportunity.listing?.expected_closing_date || '',
      });
      setResult(res.note || 'Request recorded.');
      onUpdated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">Service need</h4>
      <p className="mt-1 text-xs text-slate-600">
        Recorded only when the seller or their representative tells you. A pending listing does not imply anyone needs a
        service.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-slate-600">What do they need?</Label>
          <select
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            {SERVICE_NEEDS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs text-slate-600">Deadline (move-out or closing)</Label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-slate-600">Next action</Label>
          <Input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="Call the executor about the walkthrough"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-slate-600">What they told you</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1" />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {result && <p className="mt-2 text-xs text-emerald-700">{result}</p>}

      <Button size="sm" onClick={save} disabled={busy === 'save'} className="mt-3 gap-1.5 bg-cyan-600 hover:bg-cyan-700">
        {busy === 'save' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save service need
      </Button>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-xs font-medium text-slate-800">Ask an Estate Sale Company for help</p>
        {opportunity.service_request_id ? (
          <p className="mt-1 text-xs text-emerald-700">
            Request sent ({opportunity.service_request_status || 'submitted'}). Follow up with the matched company.
          </p>
        ) : (
          <>
            <div className="mt-2 flex items-start gap-2">
              <Checkbox id="share-ok" checked={share} onCheckedChange={setShare} className="mt-0.5" />
              <label htmlFor="share-ok" className="text-xs text-slate-600">
                The seller or authorized representative gave permission to share this property and my contact details with
                Estate Sale Companies.
              </label>
            </div>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Your callback number (optional)"
              className="mt-2"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={requestHelp}
              disabled={!share || busy === 'help'}
              className="mt-2 gap-1.5"
            >
              {busy === 'help' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Request operator help
            </Button>
          </>
        )}
      </div>
    </section>
  );
}