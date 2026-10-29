import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PencilLine } from 'lucide-react';
import { opportunities } from './listingApi';

export default function AddressCorrection({ opportunity, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...(opportunity.address || {}) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await opportunities.act('correct_address', opportunity.id, form);
      setOpen(false);
      onUpdated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="gap-1.5 text-slate-600">
        <PencilLine className="h-3.5 w-3.5" />
        Correct the address
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-800">Correct this import</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {[
          ['street', 'Street'],
          ['unit', 'Unit'],
          ['city', 'City'],
          ['state', 'State'],
          ['zip', 'ZIP'],
        ].map(([key, label]) => (
          <div key={key}>
            <Label className="text-xs text-slate-600">{label}</Label>
            <Input
              value={form[key] || ''}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={save} disabled={busy} className="gap-1.5">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save and re-match
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}