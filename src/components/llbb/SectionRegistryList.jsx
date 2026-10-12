// Controlled homepage section registry list (Phase 4B — Part 6).
// Show/hide/reorder only — keys are platform-owned; labels are defaults.
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowUp, ArrowDown } from 'lucide-react';

const DEFAULT_ORDER = ['intro', 'services', 'sales', 'why_choose_us', 'how_it_works', 'testimonials', 'service_area', 'cta'];

export const SectionRegistryList = {
  init(homepage, labels) {
    const configured = (homepage && homepage.sections) || [];
    const present = new Set(configured.map(s => s.key));
    const out = configured.map(s => ({ key: s.key, label: (labels && labels[s.key]) || s.key, visible: s.visible !== false }));
    for (const k of DEFAULT_ORDER) {
      if (!present.has(k)) out.push({ key: k, label: (labels && labels[k]) || k, visible: true });
    }
    return out;
  },
  toPayload(list) {
    return (list || []).map(s => ({ key: s.key, label: s.label || s.key, visible: s.visible !== false }));
  }
};

export default function SectionRegistryListRenderer({ sections, onChange, labels }) {
  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
      {sections.map((s, idx) => (
        <li key={s.key} className="flex items-center gap-3 px-3 py-2">
          <Switch checked={s.visible !== false} onCheckedChange={(v) => onChange(sections.map(x => x.key === s.key ? { ...x, visible: v } : x))} aria-label={`Show ${s.label}`} />
          <span className={`text-sm flex-1 ${s.visible !== false ? 'text-slate-800' : 'text-slate-400'}`}>{(labels && labels[s.key]) || s.label}</span>
          <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={`Move ${s.label} up`}><ArrowUp className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} aria-label={`Move ${s.label} down`}><ArrowDown className="w-3.5 h-3.5" /></Button>
        </li>
      ))}
    </ul>
  );
}