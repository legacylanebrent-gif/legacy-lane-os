// Testimonials editor (Phase 4B — Part 14). Presentation-only social proof;
// no star ratings, no consumer-review infrastructure.
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field, ItemListEditor } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function TestimonialsEditor({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [t, setT] = useState(() => {
    const src = (settings && settings.testimonials) || {};
    return { headline: src.headline || '', items: Array.isArray(src.items) ? src.items.map(it => ({ ...it, featured: !!it.featured, visible: it.visible !== false })) : [] };
  });

  return (
    <div className="space-y-4">
      <SectionCard title="Testimonials" description="Quotes from people you have served, exactly as you enter them. Hide or archive any item without deleting it.">
        <Field label="Headline"><Input value={t.headline} onChange={(e) => setT(s => ({ ...s, headline: e.target.value }))} placeholder="What Clients Say" /></Field>
        <ItemListEditor items={t.items} onChange={(items) => setT(s => ({ ...s, items }))}
          fields={[
            { key: 'quote', label: 'Quote', type: 'textarea', full: true },
            { key: 'name', label: 'Display Name' }, { key: 'location', label: 'Location' },
            { key: 'context', label: 'Context (service used, role)' },
            { key: 'photo_url', label: 'Photo URL', placeholder: 'https://… (optional)' },
            { key: 'featured', label: 'Featured', type: 'bool' }, { key: 'visible', label: 'Visible', type: 'bool' }
          ]}
          addLabel="Add Testimonial" emptyText="No testimonials yet — testimonials never block launch." />
      </SectionCard>
      <div className="max-w-3xl">
        <SaveBar onSave={() => saver.save({ testimonials: t }, 'testimonials')} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}