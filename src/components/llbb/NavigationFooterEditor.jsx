// Navigation & Footer manager (Phase 4B — Parts 20/21).
// Navigation: show/hide, rename, reorder — paths are constrained to the
// platform-controlled template route allowlist (server-enforced). Footer:
// logo, description, copyright name, attribution, address visibility.
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field, NAV_DEFAULT_ITEMS } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

export default function NavigationFooterEditor({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [nav, setNav] = useState(() => {
    const src = (((settings && settings.navigation) || {}).items) || [];
    if (src.length === 0) return NAV_DEFAULT_ITEMS.map(it => ({ ...it }));
    return src.map(it => ({ key: it.key || it.path, label: it.label || '', path: it.path, visible: it.visible !== false }));
  });
  const [ft, setFt] = useState(() => {
    const src = (settings && settings.footer) || {};
    return { logo_url: src.logo_url || '', description: src.description || '', copyright_name: src.copyright_name || '', show_powered_by: src.show_powered_by !== false };
  });

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= nav.length) return;
    const next = [...nav];
    [next[idx], next[j]] = [next[j], next[idx]];
    setNav(next);
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Navigation" description="Which pages appear in the website menu, their labels, and their order. Page routes are controlled by the platform — only labels and visibility are editable.">
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {nav.map((it, idx) => (
            <li key={it.key} className="flex items-center gap-3 px-3 py-2">
              <Switch checked={it.visible !== false} onCheckedChange={(v) => setNav(nav.map(x => x.key === it.key ? { ...x, visible: v } : x))} aria-label={`Show ${it.label}`} />
              <Input value={it.label} onChange={(e) => setNav(nav.map(x => x.key === it.key ? { ...x, label: e.target.value } : x))} className="w-40" aria-label={`${it.label} menu label`} />
              <span className="text-xs text-slate-400 flex-1 truncate">{it.path}</span>
              <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === nav.length - 1} aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></Button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" onClick={() => setNav(NAV_DEFAULT_ITEMS.map(it => ({ ...it })))}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset to defaults</Button>
      </SectionCard>

      <SectionCard title="Footer" description="Footer content. Contact details and social links reuse the Contact & Social panel.">
        <Field label="Footer Logo URL" hint="Or set one from the Media Library panel."><Input value={ft.logo_url} onChange={(e) => setFt(s => ({ ...s, logo_url: e.target.value }))} placeholder="https://…" /></Field>
        <Field label="Short Description"><Textarea rows={2} value={ft.description} onChange={(e) => setFt(s => ({ ...s, description: e.target.value }))} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Copyright Business Name"><Input value={ft.copyright_name} onChange={(e) => setFt(s => ({ ...s, copyright_name: e.target.value }))} /></Field>
          <div className="flex items-center justify-between gap-4 sm:mt-6">
            <Label className="text-sm text-slate-700">Show "Powered by EstateSalen"</Label>
            <Switch checked={ft.show_powered_by} onCheckedChange={(v) => setFt(s => ({ ...s, show_powered_by: v }))} />
          </div>
        </div>
      </SectionCard>

      <div className="max-w-3xl">
        <SaveBar onSave={() => saver.save({ navigation: { items: nav }, footer: ft }, 'navigation')} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}