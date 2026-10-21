import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldQuestion, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import QuestionCard from '@/components/compliance/QuestionCard';
import QuestionModal from '@/components/compliance/QuestionModal';
import EscalationDialog from '@/components/compliance/EscalationDialog';
import AiResearchPanel from '@/components/compliance/AiResearchPanel';
import StartingQuestions from '@/components/compliance/StartingQuestions';
import AdminChecksPanel from '@/components/compliance/AdminChecksPanel';
import { CQ_CATEGORIES, CQ_JURISDICTIONS, CQ_STATUSES } from '@/components/compliance/complianceModel';

// Chapter 6 P2 — the Compliance / Requirements page.
// Purpose: "the questions your business should make sure it has answered" — never
// "the laws you must follow", never a compliance claim.
export default function ComplianceQuestions() {
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [escalating, setEscalating] = useState(null);
  const [researching, setResearching] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      const [qs, mySales] = await Promise.all([
        base44.entities.ComplianceQuestion.filter({ operator_id: me.id }),
        base44.entities.EstateSale.filter({ operator_id: me.id }),
      ]);
      setQuestions(Array.isArray(qs) ? qs : (qs?.items || []));
      setSales(Array.isArray(mySales) ? mySales : (mySales?.items || []));
    } catch (e) {
      console.error(e);
      toast.error('Could not load your compliance questions.');
    } finally {
      setLoading(false);
    }
  };

  const saleById = useMemo(() => Object.fromEntries(sales.map(s => [s.id, s])), [sales]);

  const filtered = questions.filter(q => {
    if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && q.category !== categoryFilter) return false;
    if (jurisdictionFilter !== 'ALL' && q.jurisdiction_type !== jurisdictionFilter) return false;
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (a.status === 'RESEARCH_NEEDED' ? -1 : 0) - (b.status === 'RESEARCH_NEEDED' ? -1 : 0));

  const saveQuestion = async (form, initial) => {
    try {
      const sale = form.sale_id ? saleById[form.sale_id] : null;
      const payload = {
        operator_id: user.id,
        company_id: sale?.company_id || '',
        question: form.question,
        category: form.category,
        jurisdiction_type: form.jurisdiction_type,
        jurisdiction_name: form.jurisdiction_name,
        sale_id: form.sale_id || null,
        sale_team_ids: sale?.sale_team || [],
        status: form.status,
        source_name: form.source_name,
        source_url: form.source_url,
        source_type: form.source_type || null,
        last_verified_at: form.last_verified_at,
        verified_by: form.verified_by,
        notes: form.notes,
      };
      if (initial) {
        await base44.entities.ComplianceQuestion.update(initial.id, payload);
        toast.success('Question updated.');
      } else {
        await base44.entities.ComplianceQuestion.create({ ...payload, professional_review_needed: false });
        toast.success('Question added — it will surface in your admin checks until investigated.');
      }
      setShowModal(false);
      setEditing(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Could not save the question.');
    }
  };

  const addStarter = async (s) => {
    try {
      await base44.entities.ComplianceQuestion.create({
        operator_id: user.id,
        question: s.question,
        category: s.category,
        jurisdiction_type: s.jurisdiction_type,
        status: 'RESEARCH_NEEDED',
      });
      toast.success('Starter question added as research-needed.');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Could not add the starter question.');
    }
  };

  const handleDelete = async (q) => {
    if (!confirm('Delete this question and its provenance record?')) return;
    try {
      await base44.entities.ComplianceQuestion.delete(q.id);
      await load();
      toast.success('Question deleted.');
    } catch (e) {
      console.error(e);
      toast.error('Could not delete.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <ShieldQuestion className="w-6 h-6 text-orange-600" /> Compliance & Requirements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            The questions your business should make sure it has answered — with sources, verification, and escalation.
            EstateSalen organizes your research; it never provides legal, tax, insurance, or employment advice.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Deterministic administrative checks */}
        {user && <AdminChecksPanel user={user} />}

        {/* Add */}
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-orange-600 hover:bg-orange-700 gap-2">
            <Plus className="w-4 h-4" /> Add question
          </Button>
        </div>

        {/* Starting questions */}
        {user && <StartingQuestions existing={questions} onAdd={addStarter} />}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {CQ_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {CQ_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All jurisdictions</SelectItem>
              {CQ_JURISDICTIONS.map(j => <SelectItem key={j.key} value={j.key}>{j.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[180px] max-w-xs" />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-slate-500">
              <ShieldQuestion className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No questions here yet. Add a question above, or start with the starter questions.</p>
              <p className="text-xs text-slate-400 mt-2">A reviewed checklist is not a claim of legal compliance.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                sale={q.sale_id ? saleById[q.sale_id] : null}
                onEdit={() => { setEditing(q); setShowModal(true); }}
                onEscalate={() => setEscalating(q)}
                onResearch={() => setResearching(q)}
                onDelete={() => handleDelete(q)}
              />
            ))}
          </div>
        )}
      </div>

      <QuestionModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={saveQuestion}
        initial={editing}
        sales={sales}
      />
      {escalating && (
        <EscalationDialog
          open={!!escalating}
          onClose={() => setEscalating(null)}
          question={escalating}
          onSaved={load}
        />
      )}
      {researching && user && (
        <AiResearchPanel
          open={!!researching}
          onClose={() => setResearching(null)}
          question={researching}
          user={user}
        />
      )}
    </div>
  );
}