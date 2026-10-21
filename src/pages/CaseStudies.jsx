// Chapter 7 P2 — COMPLETED-SALE PORTFOLIO (case studies).
// A SAFE PUBLIC PROJECTION of real work: the operator selects what a
// completed sale shows publicly (generalized location, services, approved
// photos, record-supported metrics, one approved testimonial). Private
// details — client names, exact address, proceeds, profitability — never
// appear here. Publish computes metrics from the records at publish time.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Camera, Plus, Rocket, Archive, Save, CheckCircle2 } from 'lucide-react';

const STATUS_BADGE = {
  DRAFT: 'bg-amber-100 text-amber-800 border-amber-200',
  READY: 'bg-amber-100 text-amber-800 border-amber-200',
  PUBLISHED: 'bg-green-100 text-green-800 border-green-200',
  ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',
};

const toList = (arr) => (arr || []).join('\n');
const fromList = (text) => String(text || '').split('\n').map(s => s.trim()).filter(Boolean);

export default function CaseStudies() {
  const [loading, setLoading] = useState(true);
  const [studies, setStudies] = useState([]);
  const [sales, setSales] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [editing, setEditing] = useState(null); // study record being edited
  const [form, setForm] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('saleCaseStudies', { action: 'list' });
      setStudies(res.data.studies || []);
      setSales(res.data.sales || []);
      setTestimonials(res.data.testimonials || []);
    } catch (e) {
      setNotice('Could not load your case studies.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saleFor = (study) => sales.find(s => s.id === (study && study.sale_id)) || null;

  const startCreate = async (sale) => {
    setBusy(true); setNotice(null);
    try {
      const res = await base44.functions.invoke('saleCaseStudies', { action: 'create', sale_id: sale.id });
      setEditing(res.data.study);
      setForm({
        public_title: res.data.study.public_title || '',
        generalized_location: res.data.study.generalized_location || '',
        challenge_context: res.data.study.challenge_context || '',
        services_performed: toList(res.data.study.services_performed),
        merchandise_highlights: toList(res.data.study.merchandise_highlights),
        operator_summary: res.data.study.operator_summary || '',
        metric_notes: (res.data.study.metrics || {}).notes || '',
        testimonial_id: res.data.study.testimonial_id || ''
      });
      setSelectedPhotos(res.data.study.approved_photo_urls || []);
      await load();
      setEditing(res.data.study);
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setNotice((d && d.message) || 'Could not create the case study.');
    }
    setBusy(false);
  };

  const openEdit = (study) => {
    setEditing(study);
    setForm({
      public_title: study.public_title || '',
      generalized_location: study.generalized_location || '',
      challenge_context: study.challenge_context || '',
      services_performed: toList(study.services_performed),
      merchandise_highlights: toList(study.merchandise_highlights),
      operator_summary: study.operator_summary || '',
      metric_notes: (study.metrics || {}).notes || '',
      testimonial_id: study.testimonial_id || ''
    });
    setSelectedPhotos(study.approved_photo_urls || []);
    setNotice(null);
  };

  const save = async () => {
    setBusy(true); setNotice(null);
    try {
      const res = await base44.functions.invoke('saleCaseStudies', {
        action: 'update', id: editing.id,
        public_title: form.public_title,
        generalized_location: form.generalized_location,
        challenge_context: form.challenge_context,
        services_performed: fromList(form.services_performed),
        merchandise_highlights: fromList(form.merchandise_highlights),
        operator_summary: form.operator_summary,
        metric_notes: form.metric_notes,
        testimonial_id: form.testimonial_id || null,
        approved_photo_urls: selectedPhotos
      });
      const removals = res.data.removals;
      setNotice(removals && removals.length
        ? `Saved. The brand-truth guard removed ${removals.length} unsupported claim${removals.length > 1 ? 's' : ''} from your summary.`
        : 'Saved.');
      await load();
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setNotice((d && d.message) || 'Could not save.');
    }
    setBusy(false);
  };

  const publish = async () => {
    if (!window.confirm('Publish this case study to your public website? Only what you selected here becomes public.')) return;
    setBusy(true); setNotice(null);
    try {
      await base44.functions.invoke('saleCaseStudies', { action: 'publish', id: editing.id });
      setNotice('Published. Record-supported metrics were snapshotted from your sale records.');
      await load();
      setEditing(null); setForm(null);
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setNotice((d && d.message) || 'Could not publish.');
    }
    setBusy(false);
  };

  const archive = async (study) => {
    if (!window.confirm('Archive this case study? It stops appearing publicly; the record is kept.')) return;
    setBusy(true); setNotice(null);
    try {
      await base44.functions.invoke('saleCaseStudies', { action: 'archive', id: study.id });
      await load();
      if (editing && editing.id === study.id) { setEditing(null); setForm(null); }
    } catch (e) { setNotice('Could not archive.'); }
    setBusy(false);
  };

  const togglePhoto = (url) => {
    setSelectedPhotos(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const editableSales = sales.filter(s => !s.has_study);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <Camera className="w-7 h-7 text-cyan-700" /> Case Studies
        </h1>
        <p className="text-slate-600 mt-2 text-sm md:text-base">
          Real work, in your own words. Publish a safe projection of a completed sale — generalized location,
          services performed, approved photos and record-supported results. Client names, exact addresses
          and financials are never shown.
        </p>
      </div>

      {notice && (
        <div className="bg-cyan-50 border border-cyan-200 text-cyan-900 rounded-lg px-4 py-3 text-sm">{notice}</div>
      )}

      {/* ── Editor ── */}
      {editing && form && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Edit case study</h2>
            <Badge variant="outline" className={STATUS_BADGE[editing.status] || ''}>{editing.status}</Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Public title (no client names)</label>
              <Input value={form.public_title} onChange={e => setForm({ ...form, public_title: e.target.value })} placeholder="Three-bedroom estate sale, 3-day turnaround" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Generalized location (never the exact address)</label>
              <Input value={form.generalized_location} onChange={e => setForm({ ...form, generalized_location: e.target.value })} placeholder="Middletown, NJ" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">The situation / challenge (your words, no identifying detail)</label>
            <Textarea rows={3} value={form.challenge_context} onChange={e => setForm({ ...form, challenge_context: e.target.value })} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Services performed (one per line)</label>
              <Textarea rows={4} value={form.services_performed} onChange={e => setForm({ ...form, services_performed: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Merchandise highlights (one per line — from records, never invented)</label>
              <Textarea rows={4} value={form.merchandise_highlights} onChange={e => setForm({ ...form, merchandise_highlights: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Public summary</label>
            <Textarea rows={4} value={form.operator_summary} onChange={e => setForm({ ...form, operator_summary: e.target.value })}
              placeholder="What you did and how it went. Unsupported claims (credentials, years, superlatives, guarantees) are removed by the brand-truth guard." />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Result notes (context proof — volume, complexity; no dollar figures)</label>
            <Input value={form.metric_notes} onChange={e => setForm({ ...form, metric_notes: e.target.value })}
              placeholder="400+ items organized and sold across 3 sale days" />
            <p className="text-xs text-slate-500 mt-1">Item counts, sell-through and views are computed from your records at publish time.</p>
          </div>

          {(saleFor(editing)?.photos || []).length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700">Photos approved for public use</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                {(saleFor(editing)?.photos || []).map(url => (
                  <button key={url} type="button" onClick={() => togglePhoto(url)}
                    className={`relative rounded-lg overflow-hidden border-2 transition ${selectedPhotos.includes(url) ? 'border-cyan-600 ring-2 ring-cyan-200' : 'border-transparent opacity-80 hover:opacity-100'}`}>
                    <img src={url} alt="Sale photo" className="w-full h-20 object-cover" />
                    {selectedPhotos.includes(url) && (
                      <span className="absolute top-1 right-1 bg-cyan-600 rounded-full p-0.5"><CheckCircle2 className="w-3.5 h-3.5 text-white" /></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">Approved testimonial (optional)</label>
            <select
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.testimonial_id}
              onChange={e => setForm({ ...form, testimonial_id: e.target.value })}
            >
              <option value="">No testimonial</option>
              {testimonials.map(t => (
                <option key={t.id} value={t.id}>{t.public_display_name ? `${t.public_display_name} — ` : ''}{(t.text || '').slice(0, 60)}…</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Only testimonials with publish permission and approved status can be linked.</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={save} disabled={busy}><Save className="w-4 h-4" /> Save draft</Button>
            <Button onClick={publish} disabled={busy} className="bg-green-700 hover:bg-green-800"><Rocket className="w-4 h-4" /> Publish</Button>
            <Button variant="outline" onClick={() => { setEditing(null); setForm(null); }}>Close</Button>
          </div>
        </div>
      )}

      {/* ── Existing studies ── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Your case studies</h2>
        {studies.length === 0 ? (
          <p className="text-slate-500 text-sm bg-white border border-slate-200 rounded-lg p-4">
            No case studies yet — create one from a completed sale below.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {studies.map(study => (
              <div key={study.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{study.public_title}</p>
                    <p className="text-sm text-slate-500">{study.generalized_location || 'No location set'}</p>
                  </div>
                  <Badge variant="outline" className={STATUS_BADGE[study.status] || ''}>{study.status}</Badge>
                </div>
                {study.status === 'PUBLISHED' && (study.metrics || {}).sale_days > 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    {study.metrics.sale_days} sale day{study.metrics.sale_days > 1 ? 's' : ''}
                    {study.metrics.total_items ? ` · ${study.metrics.total_items} items` : ''}
                    {study.metrics.total_sold ? ` · ${study.metrics.total_sold} sold` : ''}
                    {study.metrics.sell_through_pct != null ? ` · ${study.metrics.sell_through_pct}% sell-through` : ''}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {study.status !== 'ARCHIVED' && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(study)} disabled={busy}>Edit</Button>
                  )}
                  {study.status !== 'ARCHIVED' && (
                    <Button size="sm" variant="ghost" onClick={() => archive(study)} disabled={busy}>
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Create from completed sale ── */}
      {editableSales.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Create from a completed sale</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {editableSales.map(sale => (
              <div key={sale.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{sale.title}</p>
                  <p className="text-sm text-slate-500">{[sale.city, sale.state].filter(Boolean).join(', ') || 'No location'}</p>
                </div>
                <Button size="sm" onClick={() => startCreate(sale)} disabled={busy}>
                  <Plus className="w-3.5 h-3.5" /> Create
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}