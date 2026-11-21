import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, BookmarkPlus, Loader2 } from 'lucide-react';
import { downloadEntry } from './glossaryFile';

export const GLOSSARY_CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'team_accountability', label: 'Team & accountability' },
  { value: 'referrals', label: 'Referrals & partnerships' },
  { value: 'client_communication', label: 'Client communication' },
  { value: 'growth', label: 'Growth & strategy' },
  { value: 'other', label: 'Other' },
];

const guessCategory = (modeKey = '') => {
  if (/social|marketing|blog|email|sms|promo|content|image|video/.test(modeKey)) return 'marketing';
  if (/pricing|consult/.test(modeKey)) return 'pricing';
  if (/referral|lead_gen|agent/.test(modeKey)) return 'referrals';
  if (/objection|client|team_instructions|post_sale/.test(modeKey)) return 'client_communication';
  if (/task|accountab|team/.test(modeKey)) return 'team_accountability';
  if (/growth|territory|review|business/.test(modeKey)) return 'growth';
  return 'other';
};

// Save what the coach produced into the operator's Coaching Glossary, and optionally
// straight to a markdown file they can keep.
export default function CoachSaveDialog({ open, onOpenChange, user, messages, modeKey, modeLabel, saleId, onSaved }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState('');
  const [scope, setScope] = useState('last');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const lastReply = [...(messages || [])].reverse().find(m => m.role === 'assistant')?.content || '';

  useEffect(() => {
    if (!open) return;
    const firstUser = (messages || []).find(m => m.role === 'user')?.content || 'Coaching session';
    setTitle(firstUser.replace(/\*\*/g, '').slice(0, 90));
    setCategory(guessCategory(modeKey));
    setTags('');
    setScope('last');
    setError('');
  }, [open, messages, modeKey]);

  const content = scope === 'conversation'
    ? (messages || []).map(m => `${m.role === 'user' ? '**You**' : '**Coach**'}\n\n${m.content}`).join('\n\n---\n\n')
    : lastReply;

  const save = async (alsoDownload = false) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError('Give this coaching a title so you can find it later.'); return; }
    if (!content.trim()) { setError('There is nothing to save yet.'); return; }
    setSaving(true);
    setError('');
    try {
      const entry = await base44.entities.CoachGlossaryEntry.create({
        user_id: user.id,
        user_name: user.full_name || '',
        title: cleanTitle,
        category,
        mode_key: modeKey || '',
        mode_label: modeLabel || '',
        summary: content.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 240),
        content,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        sale_id: saleId || '',
        saved_at: new Date().toISOString(),
      });
      onOpenChange(false);
      if (alsoDownload) downloadEntry(entry);
      onSaved?.(`Saved to your Coaching Glossary: "${cleanTitle}".`, entry);
    } catch (e) {
      console.error(e);
      setError('Could not save this to your glossary. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save coaching to your glossary</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Keep this advice so it is waiting for you after the coach window closes — filed, searchable and downloadable.
          </p>
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Spring agent outreach plan" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GLOSSARY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags</Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="agents, spring, 90-day" />
            </div>
          </div>
          <div>
            <Label>What to save</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setScope('last')}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${scope === 'last' ? 'bg-cyan-100 border-cyan-400 text-cyan-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                Last answer
              </button>
              <button
                type="button"
                onClick={() => setScope('conversation')}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${scope === 'conversation' ? 'bg-cyan-100 border-cyan-400 text-cyan-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                Whole conversation
              </button>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-md p-2 max-h-28 overflow-y-auto">
            <p className="text-[11px] text-slate-500 whitespace-pre-wrap">{content.slice(0, 500)}{content.length > 500 ? '…' : ''}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="outline"
              onClick={() => save(true)}
              disabled={saving}
            >
              Save & download .md
            </Button>
            <Button onClick={() => save()} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BookmarkPlus className="w-4 h-4 mr-1" />}
              {saving ? 'Saving…' : 'Save to glossary'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}