// About editor (Phase 4B — Part 10). Story, mission, owner introduction,
// team introduction + team members. No field is required.
import React, { useState } from 'react';
import { useSectionSaver, SaveBar, SectionCard, Field, ItemListEditor, uploadStudioImage } from '@/components/llbb/editorKit';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';

export default function AboutEditor({ websiteTenantId, settings, onSaved }) {
  const saver = useSectionSaver(websiteTenantId, onSaved);
  const [a, setA] = useState(() => {
    const src = (settings && settings.about) || {};
    return {
      headline: src.headline || '', body: src.body || '', mission: src.mission || '',
      owner_bio: src.owner_bio || '', owner_photo_url: src.owner_photo_url || '',
      team_intro: src.team_intro || '', team_photo_url: src.team_photo_url || '',
      team_members: Array.isArray(src.team_members) ? src.team_members.map(m => ({ ...m })) : []
    };
  });
  const [uploading, setUploading] = useState(null);
  const set = (k, v) => setA(s => ({ ...s, [k]: v }));

  const uploadPhoto = async (which, file) => {
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setUploading(which);
    try {
      const url = await uploadStudioImage(file);
      set(which === 'owner' ? 'owner_photo_url' : 'team_photo_url', url);
      await saver.save({ about: { ...a, [which === 'owner' ? 'owner_photo_url' : 'team_photo_url']: url } }, 'about');
    } catch (e) { /* surfaced via saver error state on next save */ }
    setUploading(null);
  };

  return (
    <div className="space-y-4">
      <SectionCard title="About Page" description="Company story, mission and introductions. Nothing is required — empty sections simply don't render.">
        <Field label="Headline"><Input value={a.headline} onChange={(e) => set('headline', e.target.value)} placeholder={`About the business`} /></Field>
        <Field label="Company Story" hint="Paragraphs separated by blank lines."><Textarea rows={6} value={a.body} onChange={(e) => set('body', e.target.value)} /></Field>
        <Field label="Mission"><Textarea rows={3} value={a.mission} onChange={(e) => set('mission', e.target.value)} /></Field>
      </SectionCard>

      <SectionCard title="Owner Introduction">
        <Field label="Owner Bio"><Textarea rows={4} value={a.owner_bio} onChange={(e) => set('owner_bio', e.target.value)} /></Field>
        <div className="flex items-center gap-3">
          {a.owner_photo_url && <img src={a.owner_photo_url} alt="Owner" className="w-14 h-14 rounded object-cover" />}
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50">
              {uploading === 'owner' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Owner photo
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto('owner', e.target.files && e.target.files[0])} />
          </label>
          {a.owner_photo_url && <Button variant="ghost" size="sm" onClick={() => set('owner_photo_url', '')}>Remove</Button>}
        </div>
      </SectionCard>

      <SectionCard title="Team" description="Optional team introduction and member cards (name, role, photo, short bio).">
        <Field label="Team Introduction"><Textarea rows={3} value={a.team_intro} onChange={(e) => set('team_intro', e.target.value)} /></Field>
        <div className="flex items-center gap-3">
          {a.team_photo_url && <img src={a.team_photo_url} alt="Team" className="w-14 h-14 rounded object-cover" />}
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50">
              {uploading === 'team' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Team photo
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto('team', e.target.files && e.target.files[0])} />
          </label>
          {a.team_photo_url && <Button variant="ghost" size="sm" onClick={() => set('team_photo_url', '')}>Remove</Button>}
        </div>
        <ItemListEditor items={a.team_members} onChange={(items) => set('team_members', items)}
          fields={[
            { key: 'name', label: 'Name' }, { key: 'role', label: 'Role' },
            { key: 'photo_url', label: 'Photo URL', placeholder: 'https://… (or add from the Media Library)' },
            { key: 'bio', label: 'Short Bio', type: 'textarea', full: true }
          ]}
          addLabel="Add Team Member" emptyText="No team members yet." />
      </SectionCard>

      <div className="max-w-3xl">
        <SaveBar onSave={() => saver.save({ about: a }, 'about')} saving={saver.saving} saved={saver.saved} error={saver.error} />
      </div>
    </div>
  );
}