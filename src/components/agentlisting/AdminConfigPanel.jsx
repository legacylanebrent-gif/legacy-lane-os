import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldAlert } from 'lucide-react';
import { adminApi } from './listingApi';

const NUMBERS = [
  ['auto_verify_min_score', 'Auto-verify at score or above', 'A single clear candidate at this score is verified automatically.'],
  ['possible_min_score', 'Send to review at score or above', 'Below this, the address is treated as no match.'],
  ['ambiguity_gap', 'Required lead over second candidate', 'If two candidates are closer than this, it always goes to review.'],
  ['max_candidates', 'Candidates shown per address', ''],
  ['max_rows_per_import', 'Rows allowed per import', ''],
];

const pretty = (field) => field.replace(/_/g, ' ');

function FieldGroup({ title, hint, fields, selected, onToggle }) {
  if (!fields.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-slate-800">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-1 grid gap-1 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field} className="flex items-center gap-2">
            <Checkbox checked={selected.includes(field)} onCheckedChange={() => onToggle(field)} />
            <span className="text-xs text-slate-700">{pretty(field)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminConfigPanel({ config, defaultFields, defaultContactFields, defaultFactFields, onSaved }) {
  const [form, setForm] = useState({ ...config });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const toggle = (key, field) => {
    const current = form[key] || [];
    const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
    setForm({ ...form, [key]: next });
  };

  const policy = form.source_use_policy || {};
  const setPolicy = (patch) => setForm({ ...form, source_use_policy: { ...policy, ...patch } });

  const save = async () => {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await adminApi.configSet(form);
      setSaved('Policy saved. New imports, enrichments and exports use it.');
      onSaved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Matching and data policy</h3>
      <p className="mt-1 text-xs text-slate-600">
        Deterministic rules only — AI never decides ownership. Owner contact values reach an agent only for their own
        verified or admin-confirmed match, and only through the allowlists below.
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

      <FieldGroup
        title="Ownership evidence agents may see"
        fields={defaultFields}
        selected={form.allowed_enrichment_fields || []}
        onToggle={(f) => toggle('allowed_enrichment_fields', f)}
      />
      <FieldGroup
        title="Contact columns agents may receive"
        hint="Only these reference columns exist, so this is an allowlist — not a broad grant."
        fields={defaultContactFields}
        selected={form.contact_source_fields || []}
        onToggle={(f) => toggle('contact_source_fields', f)}
      />
      <FieldGroup
        title="Property fact columns"
        hint="Demographic, health and financial reference columns are never available."
        fields={defaultFactFields}
        selected={form.property_fact_fields || []}
        onToggle={(f) => toggle('property_fact_fields', f)}
      />

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-900">
          <ShieldAlert className="h-3.5 w-3.5" /> Advertising / customer-list use
        </p>
        <p className="mt-1 text-xs text-amber-900">
          Until you confirm the source’s terms permit customer-list advertising, every Facebook export evaluates as
          “source use restricted” and nobody qualifies. This attestation is a gate — the individual owner’s documented
          permission is still required per property.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Switch
            checked={policy.customer_list_export_enabled === true}
            onCheckedChange={(checked) => setPolicy({ customer_list_export_enabled: checked })}
          />
          <span className="text-xs text-slate-800">Source terms permit customer-list advertising</span>
        </div>
        <div className="mt-2">
          <Label className="text-xs text-slate-700">Note on the source terms you relied on</Label>
          <Input
            value={policy.allowed_use_note || ''}
            onChange={(e) => setPolicy({ allowed_use_note: e.target.value })}
            placeholder="e.g. PropStream license §4 permits audience building"
            className="mt-1 h-8"
          />
        </div>
        {policy.updated_by_name && (
          <p className="mt-1 text-xs text-amber-800">
            Last attested by {policy.updated_by_name} on {String(policy.updated_at || '').slice(0, 10)}
          </p>
        )}
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