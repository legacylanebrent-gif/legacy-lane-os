// Generic settings section editor (Phase 4A — Part 7).
// One config-driven editor powers every settings-backed Website Manager panel.
// Saves go through the certified websiteTenantSettingsAdmin seam — sanitization
// and tenant authorization are server-side; only the panel's own keys are sent
// so panels never clobber each other.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { EDITOR_PANELS } from '@/components/llbb/managerConfig';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';

function initDraft(panel, settings) {
  const cfg = EDITOR_PANELS[panel];
  const top = {};
  const sections = {};
  for (const g of cfg.groups) {
    if (g.section) {
      const src = (settings && settings[g.section]) || {};
      sections[g.section] = {};
      for (const f of g.fields) {
        sections[g.section][f.key] = f.type === 'bool' ? (src[f.key] !== false) : (src[f.key] ?? '');
      }
      if (g.itemFields) sections[g.section].items = Array.isArray(src.items) ? src.items.map(it => ({ ...it })) : [];
    } else {
      for (const f of g.fields) top[f.key] = (settings && settings[f.key]) ?? '';
    }
  }
  return { top, sections };
}

function buildPatch(panel, draft) {
  const cfg = EDITOR_PANELS[panel];
  const out = {};
  for (const g of cfg.groups) {
    if (g.section) {
      const d = draft.sections[g.section] || {};
      const v = {};
      for (const f of g.fields) v[f.key] = f.type === 'bool' ? !!d[f.key] : (typeof d[f.key] === 'string' ? d[f.key] : (d[f.key] ?? ''));
      if (g.itemFields) {
        v.items = (d.items || []).map(it => {
          const o = {};
          for (const f of g.itemFields) o[f.key] = typeof it[f.key] === 'string' ? it[f.key] : '';
          return o;
        });
      }
      out[g.section] = v;
    } else {
      for (const f of g.fields) out[f.key] = draft.top[f.key];
    }
  }
  return out;
}

export default function SettingsSectionEditor({ websiteTenantId, panel, settings, onSaved }) {
  const cfg = EDITOR_PANELS[panel];
  const [draft, setDraft] = useState(() => initDraft(panel, settings));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setDraft(initDraft(panel, settings)); setSaved(false); setError(null); }, [panel, settings]);

  const setField = (group, key, value) => {
    setDraft(d => {
      const next = { ...d, top: { ...d.top }, sections: { ...d.sections } };
      if (group) next.sections = { ...next.sections, [group]: { ...next.sections[group], [key]: value } };
      else next.top[key] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await base44.functions.invoke('websiteTenantSettingsAdmin', {
        action: 'update',
        website_tenant_id: websiteTenantId,
        settings: buildPatch(panel, draft)
      });
      setSaved(true);
      if (onSaved) onSaved();
    } catch (e) {
      setError('Could not save. Please try again.');
    }
    setSaving(false);
  };

  const renderField = (group, f, value) => {
    if (f.type === 'bool') {
      return (
        <div key={f.key} className="flex items-center justify-between gap-4 py-2">
          <Label className="text-sm text-slate-700">{f.label}</Label>
          <Switch checked={!!value} onCheckedChange={(v) => setField(group, f.key, v)} />
        </div>
      );
    }
    if (f.type === 'color') {
      return (
        <div key={f.key} className="space-y-1">
          <Label className="text-sm text-slate-700">{f.label}</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#ffffff'} onChange={(e) => setField(group, f.key, e.target.value)} className="w-9 h-9 rounded border border-slate-200 cursor-pointer p-0.5" aria-label={f.label} />
            <Input value={value || ''} onChange={(e) => setField(group, f.key, e.target.value)} placeholder="#f59e0b" className="flex-1" />
          </div>
        </div>
      );
    }
    const Comp = f.type === 'textarea' ? Textarea : Input;
    return (
      <div key={f.key} className="space-y-1">
        <Label className="text-sm text-slate-700">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</Label>
        <Comp value={value ?? ''} onChange={(e) => setField(group, f.key, e.target.value)} rows={f.type === 'textarea' ? (f.rows || 4) : undefined} placeholder={f.placeholder} />
      </div>
    );
  };

  if (!cfg) return null;
  return (
    <div className="bg-white rounded-lg border border-slate-200 max-w-3xl">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="font-heading font-bold text-slate-900">{cfg.title}</div>
        <div className="text-sm text-slate-500 mt-0.5">{cfg.description}</div>
      </div>
      <div className="p-5 space-y-6">
        {cfg.groups.map((g, gi) => (
          <div key={gi} className="space-y-4">
            {g.fields.map((f) => renderField(g.section, f, g.section ? (draft.sections[g.section] || {})[f.key] : draft.top[f.key]))}
            {g.itemFields && (
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">Items</Label>
                {(draft.sections[g.section].items || []).map((it, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-md p-3 space-y-3 bg-slate-50/60">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setDraft(d => {
                        const items = [...d.sections[g.section].items]; items.splice(idx, 1);
                        return { ...d, sections: { ...d.sections, [g.section]: { ...d.sections[g.section], items } } };
                      })}><Trash2 className="w-3.5 h-3.5 text-red-500" /> Remove</Button>
                    </div>
                    {g.itemFields.map(f => (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs text-slate-500">{f.label}</Label>
                        {f.type === 'textarea'
                          ? <Textarea rows={2} value={it[f.key] ?? ''} onChange={(e) => setDraft(d => {
                              const items = [...d.sections[g.section].items]; items[idx] = { ...items[idx], [f.key]: e.target.value };
                              return { ...d, sections: { ...d.sections, [g.section]: { ...d.sections[g.section], items } } };
                            })} />
                          : <Input value={it[f.key] ?? ''} onChange={(e) => setDraft(d => {
                              const items = [...d.sections[g.section].items]; items[idx] = { ...items[idx], [f.key]: e.target.value };
                              return { ...d, sections: { ...d.sections, [g.section]: { ...d.sections[g.section], items } } };
                            })} />}
                      </div>
                    ))}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDraft(d => {
                  const blank = {};
                  for (const f of g.itemFields) blank[f.key] = '';
                  const items = [...(d.sections[g.section].items || []), blank];
                  return { ...d, sections: { ...d.sections, [g.section]: { ...d.sections[g.section], items } } };
                })}><Plus className="w-3.5 h-3.5" /> Add Item</Button>
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  );
}