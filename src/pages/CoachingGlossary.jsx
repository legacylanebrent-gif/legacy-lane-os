import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Search, Download, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import GlossaryEntryCard from '@/components/coach/GlossaryEntryCard';
import { GLOSSARY_CATEGORIES } from '@/components/coach/CoachSaveDialog';
import { downloadEntry, downloadAllEntries } from '@/components/coach/glossaryFile';

const list = (r) => (Array.isArray(r) ? r : (r?.items || []));

// The operator's own library of saved AI Coach advice — filed by category, searchable,
// and downloadable as files once the coaching window is long closed.
export default function CoachingGlossary() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      const res = list(await base44.entities.CoachGlossaryEntry.filter({ user_id: me.id }, '-saved_at', 200));
      setEntries(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (entry) => {
    if (!window.confirm(`Delete "${entry.title}" from your glossary?`)) return;
    try {
      await base44.entities.CoachGlossaryEntry.delete(entry.id);
      setSelected(null);
      load();
    } catch (e) {
      console.error(e);
      alert('Could not delete this entry.');
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = entries.filter(e => {
    if (category !== 'all' && e.category !== category) return false;
    if (!q) return true;
    return [e.title, e.summary, e.content, ...(e.tags || [])].join(' ').toLowerCase().includes(q);
  });

  const usedCategories = GLOSSARY_CATEGORIES.filter(c => entries.some(e => e.category === c.value));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-orange-500" />Coaching Glossary
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Every piece of coaching you saved, filed and ready to pull back up. Save new advice with “Save to glossary” under any AI Coach answer.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your coaching…" className="pl-8" />
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <p className="text-xs text-slate-500">{filtered.length} of {entries.length} saved</p>
          {entries.length > 0 && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => downloadAllEntries(filtered)}>
              <Download className="w-3.5 h-3.5 mr-1" />Download all
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${category === 'all' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
        >
          All
        </button>
        {usedCategories.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${category === c.value ? 'bg-cyan-100 border-cyan-400 text-cyan-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-lg animate-pulse" />)}</div>}

      {!loading && entries.length === 0 && (
        <div className="text-center py-16 bg-slate-50 border border-slate-200 rounded-lg">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-700 font-medium">No saved coaching yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Open the AI Coach, ask for the plan you need, then press “Save to glossary” under the answer — it lands here, categorized, and downloads as a file.
          </p>
        </div>
      )}

      {!loading && entries.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate-500 py-8 text-center">No saved coaching matches that search.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(entry => (
          <GlossaryEntryCard key={entry.id} entry={entry} onOpen={setSelected} onDelete={remove} />
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {(GLOSSARY_CATEGORIES.find(c => c.value === selected.category) || {}).label || 'Other'}
                  </Badge>
                  {selected.mode_label && <Badge variant="secondary" className="text-[10px]">{selected.mode_label}</Badge>}
                  <span className="text-[11px] text-slate-500">
                    {selected.saved_at ? new Date(selected.saved_at).toLocaleString() : ''}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-slate-800 [&_h2]:text-base [&_h3]:text-sm [&_p]:leading-relaxed">
                  <ReactMarkdown>{selected.content || ''}</ReactMarkdown>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                  <Button size="sm" variant="outline" onClick={() => downloadEntry(selected)}>
                    <Download className="w-3.5 h-3.5 mr-1" />Download file
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => remove(selected)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}