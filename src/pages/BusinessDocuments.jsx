import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Search, FileCheck2, AlertTriangle } from 'lucide-react';
import DocumentCard from '@/components/businessdocs/DocumentCard';
import DocumentChecklist from '@/components/businessdocs/DocumentChecklist';
import AiUsePolicyCard from '@/components/businessdocs/AiUsePolicyCard';
import DocumentUploadModal from '@/components/businessdocs/DocumentUploadModal';
import PolicyAssignmentDialog from '@/components/businessdocs/PolicyAssignmentDialog';
import { DOC_CATEGORIES, expiringState } from '@/components/businessdocs/documentModel';

// Chapter 6 P1 — the Business Document Vault. One vault, private files,
// factual expiration warnings. Filtering/search run on the server.
export default function BusinessDocuments() {
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ACTIVE');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [counts, setCounts] = useState({ active: 0, expiring: 0, byCategory: {} });
  const [modal, setModal] = useState({ open: false, doc: null });
  const [options, setOptions] = useState({ sales: [], contacts: [], teamMembers: [] });
  const [policyDoc, setPolicyDoc] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const query = { operator_id: user.id };
      if (category !== 'ALL') query.category = category;
      if (status !== 'ALL') query.status = status;
      if (search.trim()) query.title = { $regex: search.trim(), $options: 'i' };
      if (expiringOnly) {
        const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
        query.expiration_date = { $lte: in60 };
      }
      const res = await base44.entities.BusinessDocument.filter(query, { sort: '-created_date', limit: 200 });
      setDocs(res.items || []);
      const [active, expiring] = await Promise.all([
        base44.entities.BusinessDocument.count({ operator_id: user.id, status: 'ACTIVE' }),
        base44.entities.BusinessDocument.count({
          operator_id: user.id, status: 'ACTIVE',
          expiration_date: { $lte: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10) },
        }),
      ]);
      const byCat = {};
      (docsRef.current || []).forEach(d => { if (d.status === 'ACTIVE') byCat[d.category] = (byCat[d.category] || 0) + 1; });
      setCounts({ active, expiring, byCategory: byCat });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, category, status, search, expiringOnly]);

  const docsRef = React.useRef([]);
  useEffect(() => { docsRef.current = docs; }, [docs]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { await load(); };

  const loadOptions = async () => {
    if (!user) return;
    try {
      const [sales, contacts, teamMembers] = await Promise.all([
        base44.entities.EstateSale.filter({ operator_id: user.id }),
        base44.entities.Contact.filter({}),
        base44.entities.TeamMember.filter({ operator_id: user.id, status: 'ACTIVE' }),
      ]);
      setOptions({
        sales: Array.isArray(sales) ? sales : (sales.items || []),
        contacts: Array.isArray(contacts) ? contacts : (contacts.items || []),
        teamMembers: Array.isArray(teamMembers) ? teamMembers : (teamMembers.items || []),
      });
    } catch (e) {
      console.error('vault options load failed', e);
    }
  };

  const openModal = async (doc) => {
    await loadOptions();
    setModal({ open: true, doc: doc || null });
  };

  const openPolicies = async (doc) => {
    await loadOptions();
    setPolicyDoc(doc);
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-cyan-600" /> Business Documents
          </h1>
          <p className="text-xs text-slate-500">Your company's document vault. Files are stored privately and open only through short-lived authorized links.</p>
        </div>
        <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openModal(null)}>
          <Plus className="w-4 h-4 mr-1" /> Upload document
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-slate-200 bg-white">
          <p className="text-xs text-slate-500">Active documents</p>
          <p className="text-lg font-bold text-slate-900">{counts.active}</p>
        </div>
        <div className="p-3 rounded-xl border border-slate-200 bg-white">
          <p className="text-xs text-slate-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" />Expiring within 60 days / expired</p>
          <p className="text-lg font-bold text-amber-600">{counts.expiring}</p>
        </div>
      </div>

      <DocumentChecklist categoryCounts={counts.byCategory} />
      <AiUsePolicyCard />

      {/* Filters — vertical-first on small screens */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {DOC_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="REVIEW">Review</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
              <SelectItem value="ALL">All statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant={expiringOnly ? 'default' : 'outline'} className={expiringOnly ? 'bg-amber-600 hover:bg-amber-700' : ''} onClick={() => setExpiringOnly(v => !v)}>
          Expiring soon
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-10"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading your documents…</p>
      ) : docs.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No documents here yet. Upload insurance, agreements, policies, registrations, permits and more.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {docs.map(d => (
            <DocumentCard
              key={d.id}
              doc={d}
              onEdit={doc => openModal(doc)}
              onArchived={refresh}
              onReplaced={refresh}
              onPolicies={openPolicies}
            />
          ))}
        </div>
      )}

      <DocumentUploadModal
        open={modal.open}
        doc={modal.doc}
        operatorId={user.id}
        options={options}
        onClose={() => setModal({ open: false, doc: null })}
        onSaved={refresh}
      />
      {policyDoc && (
        <PolicyAssignmentDialog
          open={!!policyDoc}
          doc={policyDoc}
          teamMembers={options.teamMembers}
          operatorId={user.id}
          onClose={() => setPolicyDoc(null)}
        />
      )}
    </div>
  );
}