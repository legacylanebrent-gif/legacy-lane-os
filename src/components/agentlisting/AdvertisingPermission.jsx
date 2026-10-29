import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Megaphone, ShieldAlert } from 'lucide-react';
import { enrichment } from './listingApi';

const BASES = [
  { value: 'owner_written_permission', label: 'Owner gave written permission' },
  { value: 'signed_agreement_advertising_clause', label: 'Signed agreement has an advertising clause' },
  { value: 'platform_opt_in', label: 'Owner opted in on the platform' },
  { value: 'other_documented', label: 'Other documented permission' },
];

export default function AdvertisingPermission({ opportunity, onChanged }) {
  const permission = opportunity?.advertising_permission || {};
  const granted = permission.granted === true && !permission.revoked_at;
  const [open, setOpen] = useState(false);
  const [basis, setBasis] = useState(permission.basis || BASES[0].value);
  const [reference, setReference] = useState(permission.reference || '');
  const [note, setNote] = useState(permission.scope_note || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setBusy('save');
    setError('');
    try {
      await enrichment.setPermission(opportunity.id, { granted: true, basis, reference, scope_note: note });
      setOpen(false);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const revoke = async () => {
    setBusy('revoke');
    setError('');
    try {
      await enrichment.setPermission(opportunity.id, { granted: false });
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <Megaphone className="h-4 w-4 text-slate-400" /> Advertising permission
        </h4>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            granted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'
          }`}
        >
          {granted ? 'Permission recorded' : 'No permission recorded'}
        </span>
      </div>

      {granted ? (
        <div className="mt-2 space-y-1 text-xs text-slate-600">
          <p className="flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Customer-list advertising permission is documented.
          </p>
          <p>Basis: {(BASES.find((b) => b.value === permission.basis) || {}).label || permission.basis}</p>
          <p>Evidence: {permission.reference}</p>
          {permission.scope_note && <p>Scope: {permission.scope_note}</p>}
          <p>
            Recorded by {permission.captured_by_name || 'you'}
            {permission.captured_at ? ` on ${String(permission.captured_at).slice(0, 10)}` : ''}
          </p>
          <div className="pt-1">
            <Button size="sm" variant="outline" onClick={revoke} disabled={!!busy}>
              {busy === 'revoke' ? 'Revoking…' : 'Revoke permission'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Seeing this owner’s contact details is not permission to advertise to them. Record the documented
            permission before they can be exported for a Facebook customer list.
          </p>
          {!open ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpen(true)}>
              Record permission evidence
            </Button>
          ) : (
            <div className="mt-2 space-y-2">
              <div>
                <Label className="text-xs text-slate-600" htmlFor="perm-basis">How was permission obtained?</Label>
                <select
                  id="perm-basis"
                  value={basis}
                  onChange={(e) => setBasis(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                >
                  {BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-600" htmlFor="perm-ref">Where is the evidence?</Label>
                <Input
                  id="perm-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. signed agreement §7, email dated 2026-10-14"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600" htmlFor="perm-note">Scope note (optional)</Label>
                <Input id="perm-note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={save} disabled={busy === 'save'}>
                  {busy === 'save' ? 'Saving…' : 'Save evidence'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
              <p className="text-xs text-slate-500">A checkbox alone is not evidence — the reference is required.</p>
            </div>
          )}
        </div>
      )}
      {error && !open && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </section>
  );
}