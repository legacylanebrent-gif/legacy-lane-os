// FAQ builder (Phase 4B — Part 18). Editable starter questions; enable,
// disable, edit, add, reorder. Only operator-reviewed items render.
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field, ItemListEditor, FAQ_STARTERS } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';

export default function FaqEditor({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [f, setF] = useState(() => {
    const src = (settings && settings.faq) || {};
    return { headline: src.headline || '', items: (Array.isArray(src.items) ? src.items : []).map(it => ({ ...it, visible: it.visible !== false })) };
  });

  const addStarters = () => {
    const existing = new Set((f.items || []).map(it => (it.question || '').toLowerCase()));
    const fresh = FAQ_STARTERS.filter(st => !existing.has(st.question.toLowerCase())).map(st => ({ ...st, visible: true }));
    setF(s => ({ ...s, items: [...(s.items || []), ...fresh] }));
  };

  return (
    <div className="space-y-4">
      <SectionCard title="FAQ" description="Questions and answers you review and own. Disabled questions never render. Review any starter answer before publishing.">
        <Field label="Headline"><Input value={f.headline} onChange={(e) => setF(s => ({ ...s, headline: e.target.value }))} placeholder="Frequently Asked Questions" /></Field>
        <Button variant="outline" size="sm" onClick={addStarters}><Wand2 className="w-3.5 h-3.5 mr-1" /> Add starter questions</Button>
        <ItemListEditor items={f.items} onChange={(items) => setF(s => ({ ...s, items }))}
          fields={[
            { key: 'question', label: 'Question' }, { key: 'visible', label: 'Visible', type: 'bool' },
            { key: 'answer', label: 'Answer', type: 'textarea', rows: 3, full: true }
          ]}
          addLabel="Add Question" emptyText="No questions yet — FAQ never blocks launch." />
      </SectionCard>
      <div className="max-w-3xl">
        <SaveBar onSave={() => saver.save({ faq: f }, 'faq')} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}