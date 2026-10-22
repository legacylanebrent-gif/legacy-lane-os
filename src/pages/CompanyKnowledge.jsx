// Chapter 25 P1 — EMPLOYEE approved-knowledge surface. Only CURRENT APPROVED,
// employee-visible knowledge of the caller's own company — served by the
// companyKnowledge seam (authorize first, fetch second). Drafts, in-review,
// superseded and operator-private documents are structurally absent here.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, BookOpen, Lightbulb, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SopContent from '@/components/knowledge/SopContent';
import ProcessObservationDialog from '@/components/knowledge/ProcessObservationDialog';
import { KNOWLEDGE_CATEGORIES, CATEGORY_LABELS } from '@/components/knowledge/knowledgeModel';

const callFn = async (payload) => {
  const res = await base44.functions.invoke('companyKnowledge', payload);
  return res.data || res;
};

export default function CompanyKnowledge() {
  const [items, setItems] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [openDoc, setOpenDoc] = useState(null);
  const [showObserve, setShowObserve] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [c, list] = await Promise.all([
        callFn({ action: 'context' }),
        callFn({ action: 'list' }),
      ]);
      if (c.error || list.error) { setError((c.error || list.error).message); return; }
      setCtx(c);
      setItems(list.items || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not load company knowledge.');
    }
  };
  useEffect(() => { load(); }, []);

  const runSearch = async () => {
    if (!q.trim() || q.trim().length < 2) { setResults(null); return; }
    try {
      const r = await callFn({ action: 'search', q: q.trim() });
      if (r.error) { setError(r.error.message); return; }
      setResults(r.results || []);
    } catch (e) { setError('Search failed.'); }
  };

  const openItem = async (id) => {
    try {
      const r = await callFn({ action: 'get', id });
      if (r.error) return;
      setOpenDoc(r.doc);
    } catch (e) { /* not authorized */ }
  };

  const shown = results !== null ? results : (items || []).filter((d) => !category || d.category === category);

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><BookOpen className="w-6 h-6 text-cyan-700" /> Company knowledge</h1>
          <p className="text-sm text-slate-500">Current approved procedures, policies and training for your company. Drafts and old versions never appear here.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowObserve(true)} disabled={!ctx?.sales?.length}>
          <Lightbulb className="w-4 h-4 mr-1 text-cyan-600" /> Suggest an improvement
        </Button>
      </div>

      {error && <Card><CardContent className="p-3 text-sm text-red-600">{error}</CardContent></Card>}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search approved procedures…" value={q}
            onChange={(e) => { setQ(e.target.value); if (!e.target.value.trim()) setResults(null); }}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => { setCategory(''); setResults(null); }}
            className={`text-xs px-2.5 py-1.5 rounded-full border ${!category ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-300'}`}>All</button>
          {KNOWLEDGE_CATEGORIES.map((c) => (
            <button key={c} onClick={() => { setCategory(c); setResults(null); }}
              className={`text-xs px-2.5 py-1.5 rounded-full border ${category === c ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-300'}`}>
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {shown === null && <p className="text-sm text-slate-400">Loading…</p>}
      {shown?.length === 0 && (
        <Card><CardContent className="p-4 text-sm text-slate-400">
          {results !== null ? 'No approved procedure matches that search.' : 'No approved company knowledge published to employees yet.'}
        </CardContent></Card>
      )}

      <div className="space-y-2">
        {(shown || []).map((d) => (
          <button key={d.id} onClick={() => openItem(d.id)} className="w-full text-left">
            <Card className="hover:border-cyan-300 transition-colors">
              <CardContent className="p-3.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{d.title}</p>
                  {d.snippet ? <p className="text-xs text-slate-500 mt-0.5">…{d.snippet}…</p>
                    : <p className="text-xs text-slate-400 mt-0.5">{d.purpose}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="bg-white">{CATEGORY_LABELS[d.category] || d.category}</Badge>
                    <Badge variant="outline" className="bg-white">v{d.version} · current</Badge>
                    {(d.audience_roles || []).filter((r) => r !== 'ALL_STAFF').map((r) => (
                      <Badge key={r} variant="outline" className="bg-white">{r.replace(/_/g, ' ').toLowerCase()}</Badge>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 mt-1" />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {ctx?.sales?.length === 0 && (
        <p className="text-xs text-slate-400">To suggest improvements you need an active sale assignment. See <Link to="/MySaleDay" className="underline text-cyan-600">My Sale Day</Link>.</p>
      )}

      <Dialog open={!!openDoc} onOpenChange={(o) => !o && setOpenDoc(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{openDoc?.title}</DialogTitle>
          </DialogHeader>
          {openDoc && <SopContent doc={openDoc} />}
        </DialogContent>
      </Dialog>

      <ProcessObservationDialog open={showObserve} onClose={() => setShowObserve(false)} sales={ctx?.sales || []} onSubmitted={() => {}} />
    </div>
  );
}