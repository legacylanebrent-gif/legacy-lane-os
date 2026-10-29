import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { matching } from './listingApi';
import OwnershipBadge from './OwnershipBadge';

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default function OwnershipEvidence({ opportunity, onUpdated }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const ownership = opportunity.ownership || {};
  const candidates = ownership.candidates || [];

  const run = async (kind) => {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'recheck') await matching.one(opportunity.id);
      else await matching.aiExplain(opportunity.id);
      onUpdated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Ownership evidence</h4>
        <OwnershipBadge status={ownership.match_status} reviewStatus={ownership.review_status} conflict={!!ownership.conflict_note} />
      </div>

      <p className="mt-2 text-xs text-slate-600">{ownership.explanation || 'This address has not been matched yet.'}</p>
      {ownership.confidence_basis && <p className="mt-1 text-xs text-slate-500">{ownership.confidence_basis}</p>}

      {ownership.conflict_note && (
        <Alert className="mt-2 border-amber-200 bg-amber-50">
          <AlertDescription className="text-xs text-amber-900">{ownership.conflict_note}</AlertDescription>
        </Alert>
      )}

      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Owner of record" value={ownership.owner_of_record} />
        <Field label="Entity type" value={ownership.ownership_type} />
        <Field label="Owner mailing address" value={ownership.owner_mailing_address} />
        <Field label="Parcel / APN" value={ownership.parcel_id} />
        <Field label="Reference source" value={ownership.source} />
        <Field label="As of" value={ownership.source_date} />
      </dl>

      {ownership.owner_of_record && (
        <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          Owner of record is reference data from the export date. It is not proof of who the seller, occupant or
          decision-maker is.
        </p>
      )}

      {candidates.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-slate-700">Candidate reference records ({candidates.length})</p>
          {candidates.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 p-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-medium text-slate-800">
                  {c.property_address}{c.unit_number ? ` #${c.unit_number}` : ''}, {c.city}, {c.state} {c.zip}
                </span>
                {typeof c.score === 'number' && <span className="text-slate-500">score {c.score}</span>}
              </div>
              {c.owner_of_record && <p className="mt-1 text-slate-600">Owner of record: {c.owner_of_record}</p>}
              {(c.reasons || []).length > 0 && <p className="mt-0.5 text-slate-500">{c.reasons.join(' · ')}</p>}
            </div>
          ))}
          <p className="text-xs text-slate-500">
            A review result is not a confirmation. Your platform administrator confirms or rejects a candidate before it
            counts as verified.
          </p>
        </div>
      )}

      {ownership.ai_hint && (
        <p className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-xs text-cyan-900">
          AI interpretation of the candidates above (never an approval): {ownership.ai_hint}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => run('recheck')} disabled={!!busy} className="gap-1.5">
          {busy === 'recheck' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Recheck match
        </Button>
        {candidates.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => run('explain')} disabled={!!busy} className="gap-1.5">
            {busy === 'explain' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Explain candidates
          </Button>
        )}
      </div>
    </section>
  );
}