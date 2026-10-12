// Policies manager (Phase 4B — Part 19). Structured tenant-level policies
// (sale terms, payment, pickup, returns, parking, security, privacy…).
// Precedence: canonical Sale-specific policies always win over these
// tenant defaults — tenant policies are defaults only, never overrides.
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field, ItemListEditor } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const POLICY_TEMPLATES = [
  ['sale_terms', 'Sale Terms'], ['payment', 'Accepted Payment Methods'], ['pickup', 'Pickup'],
  ['returns', 'Returns'], ['parking', 'Parking'], ['children', 'Children'],
  ['bags', 'Bags'], ['security', 'Security'], ['privacy', 'Privacy'], ['website_terms', 'Website Terms']
];

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);

export default function PoliciesEditor({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [legal, setLegal] = useState(() => {
    const src = (settings && settings.legal) || {};
    return { privacy_policy_text: src.privacy_policy_text || '', terms_text: src.terms_text || '' };
  });
  const [items, setItems] = useState(() => (((settings && settings.policies) || {}).items || []).map(it => ({ ...it, visible: it.visible !== false })));

  const existingKeys = new Set(items.map(it => it.key).filter(Boolean));
  const addTemplate = ([key, title]) => setItems(list => [...list, { key, title, body: '', visible: true }]);
  const addCustom = () => setItems(list => [...list, { key: '', title: '', body: '', visible: true }]);

  const save = () => saver.save({ legal, policies: { items } }, 'policies');

  return (
    <div className="space-y-4">
      <SectionCard title="Privacy & Terms" description="Website privacy policy and terms copy shown on the legal page.">
        <Field label="Privacy Policy" hint="Paragraphs separated by blank lines."><Textarea rows={6} value={legal.privacy_policy_text} onChange={(e) => setLegal(l => ({ ...l, privacy_policy_text: e.target.value }))} /></Field>
        <Field label="Terms of Service"><Textarea rows={6} value={legal.terms_text} onChange={(e) => setLegal(l => ({ ...l, terms_text: e.target.value }))} /></Field>
      </SectionCard>

      <SectionCard title="Structured Policies" description="Tenant-level defaults for how your sales operate. Individual sales can carry their own specific policies — those always take precedence on the sale's page. Write only policies that are actually true for your business.">
        <div className="flex flex-wrap gap-2">
          {POLICY_TEMPLATES.map(([key, title]) => (
            <Button key={key} size="sm" variant={existingKeys.has(key) ? 'ghost' : 'outline'} disabled={existingKeys.has(key)} onClick={() => addTemplate([key, title])}>
              {existingKeys.has(key) ? `${title} ✓` : `+ ${title}`}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={addCustom}>+ Custom Policy</Button>
        </div>
        <ItemListEditor items={items} onChange={setItems}
          fields={[
            { key: 'title', label: 'Title' }, { key: 'visible', label: 'Visible', type: 'bool' },
            { key: 'body', label: 'Policy Text', type: 'textarea', rows: 3, full: true }
          ]}
          addLabel="Add Policy" emptyText="No policies yet — policies never block launch." />
      </SectionCard>

      <div className="max-w-3xl">
        <SaveBar onSave={save} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}