import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { adminApi } from './listingApi';

const NUMBERS = [
  ['auto_verify_min_score', 'Auto-verify at score or above', 'A single clear candidate at this score is verified automatically.'],
  ['possible_min_score', 'Send to review at score or above', 'Below this, the address is treated as no match.'],
  ['ambiguity_gap', 'Required lead over second candidate', 'If two candidates are closer than this, it always goes to review.'],
  ['max_candidates', 'Candidates shown per address', ''],
  ['max_rows_per_import', 'Rows allowed per import', ''],
];

export default function AdminConfigPanel({ config, defaultFields, onSaved }) {
  const [form, setForm] = useState({ ...config });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const toggleField = (field) => {
    const current = form.allowed_enrichment_fields || [];
    const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
    setForm({ ...form, allowed_enrichment_fields: next });
  };

  const save = async () => {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await adminApi.configSet(form);
      setSaved('Matching policy saved. New imports and rechecks use it.');
      onSaved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Matching policy</h3>
      <p className="mt-1 text-xs text-slate-600">
        Deterministic rules only. AI never decides ownership, and owner phone numbers and emails can never be exposed.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {NUMBERS.map(([key, label, hint]) => (
          <div key={key}>
            <Label className="text-xs text-slate-600">{label}</Label>
            <Input
              type="number"
              value={form[key] ?? ''}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-1 h-8"
            />
            {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Switch
          checked={form.ai_assist_enabled !== false}
          onCheckedChange={(checked) => setForm({ ...form, ai_assist_enabled: checked })}
        />
        <span className="text-xs text-slate-700">Let agents request AI explanations and drafts</span>
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium text-slate-800">Reference fields agents may see</p>
        <div className="mt-1 grid gap-1 sm:grid-cols-2">
          {defaultFields.map((field) => (
            <div key={field} className="flex items-center gap-2">
              <Checkbox
                checked={(form.allowed_enrichment_fields || []).includes(field)}
                onCheckedChange={() => toggleField(field)}
              />
              <span className="text-xs text-slate-700">{field.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {saved && <p className="mt-2 text-xs text-emerald-700">{saved}</p>}

      <Button size="sm" onClick={save} disabled={busy} className="mt-3 gap-1.5 bg-cyan-600 hover:bg-cyan-700">
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save policy
      </Button>
      {config.updated_by_name && (
        <p className="mt-2 text-xs text-slate-500">
          Last changed by {config.updated_by_name} on {String(config.updated_at || '').slice(0, 10)}
        </p>
      )}
    </section>
  );
}