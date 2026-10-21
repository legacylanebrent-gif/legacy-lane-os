// Testimonials editor (Phase 4B — Part 14). Presentation-only social proof;
// no star ratings, no consumer-review infrastructure.
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field, ItemListEditor } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TestimonialsEditor({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [t, setT] = useState(() => {
    const src = (settings && settings.testimonials) || {};
    return { headline: src.headline || '', items: Array.isArray(src.items) ? src.items.map(it => ({ ...it, featured: !!it.featured, visible: it.visible !== false })) : [] };
  });

  // Chapter 7 P1 — import ONLY approved ClientTestimonials with explicit
  // publication permission. Projection to the website is an explicit operator
  // action; nothing publishes automatically.
  const importApproved = async () => {
    try {
      const user = await base44.auth.me();
      const list = await base44.entities.ClientTestimonial.filter({ operator_id: user.id });
      const eligible = (list || []).filter(t => (t.status === 'APPROVED' || t.status === 'PUBLISHED') && t.permission_to_publish);
      const existingIds = new Set((t.items || []).map(it => it.source_testimonial_id).filter(Boolean));
      const additions = eligible.filter(t => !existingIds.has(t.id)).map(t => ({
        source_testimonial_id: t.id,
        quote: t.testimonial_text,
        name: t.public_display_name || t.client_display_name || 'Client',
        location: '',
        context: 'Verified EstateSalen client',
        visible: true,
      }));
      if (additions.length) {
        setT(s => ({ ...s, items: [...(s.items || []), ...additions] }));
      } else {
        alert('No new approved testimonials with publication permission.');
      }
    } catch (e) {
      alert('Could not import testimonials: ' + e.message);
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard title="Testimonials" description="Quotes from people you have served, exactly as you enter them. Hide or archive any item without deleting it.">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={importApproved}><Plus className="w-3.5 h-3.5" /> Import approved client testimonials</Button>
        </div>
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