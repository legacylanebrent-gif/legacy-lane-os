import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { advisoryInputs } from '@/components/saleops/acceptanceReviewModel';
import { PREPARATION_WORK_OPTIONS, GOAL_LABEL } from '@/components/consultation/consultationModel';
import VoiceNoteInput from '@/components/consultation/VoiceNoteInput';

// Chapter 12 P1 — PREPARATION & ACCESS (P1-19/P1-20): structured expected-work
// evidence + access assessment assembled from the canonical site assessment and
// room observations. These flags are EVIDENCE for the human labor estimate — the
// system never auto-manufactures labor hours from them.
export default function PrepAccessSection({ deal, linkedSale, consult, saveConsult }) {
  const work = consult.preparation_work || [];
  const advisory = advisoryInputs(deal, linkedSale);
  const access = linkedSale?.site_assessment?.access_details || {};
  const roomAccess = (consult.rooms || []).map(r => ({ name: r.name, concern: r.access_concern })).filter(r => r.concern);

  const toggle = (value) => {
    const next = work.includes(value) ? work.filter(w => w !== value) : [...work, value];
    saveConsult({ preparation_work: next });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Expected preparation work</p>
        <p className="text-[10px] text-slate-400">Check what this project will need. This is evidence for YOUR labor estimate — hours are never invented from these flags.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PREPARATION_WORK_OPTIONS.map(o => (
            <button key={o.value} onClick={() => toggle(o.value)}
              className={`min-h-[44px] rounded-lg border text-xs font-medium px-2 ${work.includes(o.value) ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <VoiceNoteInput label="Preparation notes" value={consult.preparation_notes || ''} onChange={v => saveConsult({ preparation_notes: v })} placeholder="What the preparation will involve, in your words" rows={2} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Access assessment</p>
        {advisory.siteFlags.length ? (
          advisory.siteFlags.map((f, i) => <Badge key={i} variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 mr-1 mb-1">{f.toUpperCase()}</Badge>)
        ) : (
          <p className="text-xs text-slate-500">No access complexity recorded on the site assessment{linkedSale ? '' : ' (no linked sale yet)'}.</p>
        )}
        {roomAccess.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-slate-600 mb-1">Room access concerns (your walkthrough)</p>
            {roomAccess.map((r, i) => <p key={i} className="text-xs text-slate-600">• {r.name}: {r.concern}</p>)}
          </div>
        )}
        {(access.occupied_areas || access.restricted_rooms) && (
          <div className="pt-2 space-y-1">
            {access.occupied_areas && <p className="text-xs text-slate-600">Occupied areas: {access.occupied_areas}</p>}
            {access.restricted_rooms && <p className="text-xs text-slate-600">Restricted rooms: {access.restricted_rooms}</p>}
            <p className="text-[10px] text-slate-400">From the canonical (private) access plan on the sale.</p>
          </div>
        )}
        {linkedSale && <Link to={`/SaleEditor?saleId=${linkedSale.id}`} className="text-xs text-cyan-600 hover:underline">Edit access on the sale's site assessment →</Link>}
      </div>
      {(consult.client_goals || []).length > 0 && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
          Client goals on record: {(consult.client_goals || []).map(g => GOAL_LABEL(g)).join(', ')} — keep them distinct from what you recommend.
        </p>
      )}
    </div>
  );
}