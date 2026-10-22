// Chapter 19 P1-5..P1-7 — TeamMember profile extension UI: preferred roles,
// skill strengths with honest sources, availability windows, training
// history, and the operator's document checklist. All operator-recorded
// observation — never certification.
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { RESPONSIBILITY_TYPES } from '@/components/staffing/staffingModel';

const SKILL_SOURCES = ['PREFERRED', 'EXPERIENCED', 'TRAINED', 'MANAGER_OBSERVED'];
const uid = () => Math.random().toString(36).slice(2, 10);

export default function TeamMemberProfileSection({ profile = {}, onChange }) {
  const set = (k, v) => onChange({ [k]: v });
  const skills = profile.skills_detail || [];
  const availability = profile.availability || [];
  const training = profile.training_records || [];
  const checklist = profile.document_checklist || [];
  const preferred = profile.preferred_roles || [];

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100">
      <div>
        <Label>Preferred sale-day roles</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {RESPONSIBILITY_TYPES.filter((t) => t.key !== 'OTHER').map((t) => {
            const on = preferred.includes(t.key);
            return (
              <button key={t.key} type="button"
                onClick={() => set('preferred_roles', on ? preferred.filter((r) => r !== t.key) : [...preferred, t.key])}
                className={`text-xs px-2 py-1 rounded-full border ${on ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Skill strengths <span className="text-slate-400 font-normal">(with honest source — never a certification)</span></Label>
        <div className="space-y-1.5 mt-1">
          {skills.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input className="flex-1" placeholder="e.g. POS checkout" value={s.skill || ''}
                onChange={(e) => set('skills_detail', skills.map((x, xi) => xi === i ? { ...x, skill: e.target.value } : x))} />
              <Select value={s.source || 'PREFERRED'} onValueChange={(v) => set('skills_detail', skills.map((x, xi) => xi === i ? { ...x, source: v } : x))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{SKILL_SOURCES.map((src) => <SelectItem key={src} value={src}>{src.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
              <button className="text-slate-300 hover:text-red-500" onClick={() => set('skills_detail', skills.filter((_, xi) => xi !== i))}><X className="w-4 h-4" /></button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => set('skills_detail', [...skills, { skill: '', source: 'PREFERRED' }])}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add skill
          </Button>
        </div>
      </div>

      <div>
        <Label>Known availability <span className="text-slate-400 font-normal">(planning input — not a schedule)</span></Label>
        <div className="space-y-1.5 mt-1">
          {availability.map((w, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <Input type="date" className="w-36" value={w.start_date || ''}
                onChange={(e) => set('availability', availability.map((x, xi) => xi === i ? { ...x, start_date: e.target.value } : x))} />
              <span className="text-xs text-slate-400">to</span>
              <Input type="date" className="w-36" value={w.end_date || ''}
                onChange={(e) => set('availability', availability.map((x, xi) => xi === i ? { ...x, end_date: e.target.value } : x))} />
              <Input className="flex-1 min-w-32" placeholder="e.g. weekends only" value={w.note || ''}
                onChange={(e) => set('availability', availability.map((x, xi) => xi === i ? { ...x, note: e.target.value } : x))} />
              <button className="text-slate-300 hover:text-red-500" onClick={() => set('availability', availability.filter((_, xi) => xi !== i))}><X className="w-4 h-4" /></button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => set('availability', [...availability, { availability_id: uid(), start_date: '', end_date: '', note: '' }])}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add window
          </Button>
        </div>
      </div>

      <div>
        <Label>Training history <span className="text-slate-400 font-normal">(factual record — not a qualification)</span></Label>
        <div className="space-y-1.5 mt-1">
          {training.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <Input className="flex-1 min-w-40" placeholder="e.g. Checkout practice" value={t.name || ''}
                onChange={(e) => set('training_records', training.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))} />
              <Input type="date" className="w-36" value={t.completed_at || ''}
                onChange={(e) => set('training_records', training.map((x, xi) => xi === i ? { ...x, completed_at: e.target.value } : x))} />
              <button className="text-slate-300 hover:text-red-500" onClick={() => set('training_records', training.filter((_, xi) => xi !== i))}><X className="w-4 h-4" /></button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => set('training_records', [...training, { training_id: uid(), name: '', completed_at: '' }])}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add training
          </Button>
        </div>
      </div>

      <div>
        <Label>Document checklist <span className="text-slate-400 font-normal">(your memory aid — not a compliance conclusion)</span></Label>
        <div className="space-y-1.5 mt-1">
          {checklist.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <input type="checkbox" className="w-4 h-4 accent-cyan-600" checked={!!c.completed}
                onChange={(e) => set('document_checklist', checklist.map((x, xi) => xi === i ? { ...x, completed: e.target.checked } : x))} />
              <Input className="flex-1" placeholder="e.g. Signed confidentiality policy" value={c.label || ''}
                onChange={(e) => set('document_checklist', checklist.map((x, xi) => xi === i ? { ...x, label: e.target.value } : x))} />
              <button className="text-slate-300 hover:text-red-500" onClick={() => set('document_checklist', checklist.filter((_, xi) => xi !== i))}><X className="w-4 h-4" /></button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => set('document_checklist', [...checklist, { checklist_item_id: uid(), label: '', completed: false }])}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add checklist item
          </Button>
        </div>
      </div>
    </div>
  );
}