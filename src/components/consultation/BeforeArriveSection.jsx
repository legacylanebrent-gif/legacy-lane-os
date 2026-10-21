import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, ExternalLink } from 'lucide-react';
import VoiceNoteInput from '@/components/consultation/VoiceNoteInput';
import { OCCUPANCY_OPTIONS } from '@/components/consultation/consultationModel';

// Chapter 12 P1 — BEFORE YOU ARRIVE (P1-3/P1-4): assemble what canonical records
// already know (no re-entry) and show what is UNKNOWN / must be asked. The
// pre-consultation questionnaire is the minimum useful structured intake — it lives
// on the deal's consultation block, NOT a parallel questionnaire record.
const Row = ({ label, value, isLink, to }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
    <span className="text-xs text-slate-500">{label}</span>
    {value ? (
      isLink ? <Link to={to} className="text-xs text-cyan-600 font-medium text-right hover:underline">{value} →</Link>
        : <span className="text-xs text-slate-800 font-medium text-right">{value}</span>
    ) : (
      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">ASK AT CONSULTATION</Badge>
    )}
  </div>
);

export default function BeforeArriveSection({ deal, consult, saveConsult }) {
  const q = consult.questionnaire || {};
  const [form, setForm] = useState({
    occupancy: q.occupancy || 'unknown',
    previous_removals: q.previous_removals || '',
    merchandise_overview: q.merchandise_overview || '',
    special_circumstances: q.special_circumstances || '',
    important_dates_note: q.important_dates_note || '',
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try { await saveConsult({ questionnaire: form }); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">Already known from your records</p>
        <p className="text-[10px] text-slate-400 mb-2">Loaded from the canonical opportunity — nothing here needs re-entry.</p>
        <Row label="Seller / client" value={deal.client_name} />
        <Row label="Phone" value={deal.client_phone} />
        <Row label="Email" value={deal.client_email} />
        <Row label="Reason for sale" value={deal.situation ? String(deal.situation).replace(/_/g, ' ') : ''} />
        <Row label="Property" value={[deal.property_address, deal.property_city, deal.property_state].filter(Boolean).join(', ')} />
        <Row label="Consultation date" value={deal.consultation_date ? new Date(deal.consultation_date).toLocaleString() : ''} />
        <Row label="Referral source" value={[deal.referral_source_type ? String(deal.referral_source_type).replace(/_/g, ' ') : '', deal.referral_source_name].filter(Boolean).join(' — ')} />
        <Row label="Inquiry source" value={deal.inquiry_source_type ? String(deal.inquiry_source_type).replace(/_/g, ' ') : ''} />
        <Row label="Next action" value={deal.next_action ? `${deal.next_action}${deal.next_action_at ? ` (due ${new Date(deal.next_action_at).toLocaleDateString()})` : ''}` : ''} />
        <Row label="Notes from inquiry" value={deal.notes} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Pre-consultation questionnaire</p>
        <p className="text-[10px] text-slate-400">Answers are ASKED/CONFIRMED information — never verified facts.</p>
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">Property occupancy</p>
          <Select value={form.occupancy} onValueChange={v => f('occupancy', v)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OCCUPANCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <VoiceNoteInput label="Previous removals (if known)" value={form.previous_removals} onChange={v => f('previous_removals', v)} placeholder="What has already been removed from the property?" rows={2} />
        <VoiceNoteInput label="Merchandise overview" value={form.merchandise_overview} onChange={v => f('merchandise_overview', v)} placeholder="Basic overview of what is in the property" rows={2} />
        <VoiceNoteInput label="Special circumstances" value={form.special_circumstances} onChange={v => f('special_circumstances', v)} placeholder="Anything the team should know before arriving" rows={2} />
        <Textarea value={form.important_dates_note} onChange={e => f('important_dates_note', e.target.value)} rows={2} placeholder="Important dates context (structured deadlines go in Goals & Expectations)" />
        <Button onClick={save} disabled={saving} className="w-full h-11 bg-cyan-600 hover:bg-cyan-700">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Questionnaire
        </Button>
      </div>
      <Link to="/SaleConversionPipeline" className="text-xs text-cyan-600 hover:underline inline-flex items-center gap-1">
        Need to edit the opportunity basics? Open the deal <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}