import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShieldCheck, Users, Package, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import AuthorityPanel from '@/components/saleops/AuthorityPanel';
import DecisionsPanel from '@/components/saleops/DecisionsPanel';
import MerchandiseDecisionPanel from '@/components/saleops/MerchandiseDecisionPanel';
import SaleScopeSection from '@/components/saleops/SaleScopeSection';
import { asArray, scopeLabel, fmtDateTime } from '@/components/saleops/saleDecisionModel';

// Chapter 1 P1 — Client Authority & Decisions surface: who is authorized on this
// sale, what they instructed, when, and whether it changed. Single page, three tabs.
export default function SaleClientDecisions() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [user, setUser] = useState(null);
  const [authorities, setAuthorities] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('makers');
  const [printing, setPrinting] = useState(false);

  const loadData = async () => {
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get('saleId');
    if (!saleId) { navigate(createPageUrl('MySales')); return; }

    const saleData = await base44.entities.EstateSale.filter({ id: saleId });
    if (!saleData.length) { alert('Sale not found'); navigate(createPageUrl('MySales')); return; }
    setSale(saleData[0]);

    const [authRes, decRes, me] = await Promise.all([
      base44.entities.SaleAuthority.filter({ sale_id: saleId }),
      base44.entities.SaleClientDecision.filter({ sale_id: saleId }),
      base44.auth.me().catch(() => null),
    ]);
    setAuthorities(asArray(authRes));
    setDecisions(asArray(decRes));
    setUser(me);
    setLoading(false);
  };

  useEffect(() => {
    loadData().catch(e => { console.error(e); setLoading(false); });
  }, []);

  const refresh = () => loadData();

  const reviewOpen = decisions.filter(d => d.decision_type === 'merchandise' && d.current_decision === 'review' && d.status === 'open');

  const printSummary = () => {
    setPrinting(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const margin = 48;
      let y = margin;
      const line = (text, size = 10, bold = false) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        const wrapped = doc.splitTextToSize(text, 612 - margin * 2);
        doc.text(wrapped, margin, y);
        y += wrapped.length * (size * 1.3) + 4;
      };
      line('Client Decision Summary', 18, true);
      line(`${sale.title} — ${sale.property_address?.formatted_address || sale.property_address?.city || ''}`, 11);
      line(`Prepared ${new Date().toLocaleString()}`, 9);
      y += 10;

      line('Authorized Decision-Makers', 13, true);
      const activeAuth = authorities.filter(a => a.is_active);
      if (!activeAuth.length) line('None recorded — authority status NOT RECORDED.', 10);
      activeAuth.forEach(a => {
        line(`${a.full_name}${a.is_primary ? ' (PRIMARY)' : ''} — ${a.authority_role || a.relationship || 'role not recorded'}; scopes: ${(a.authority_scopes || []).map(scopeLabel).join(', ') || 'none'}; established via: ${a.source || 'not recorded'}`, 10);
      });
      y += 10;

      line('Client Decisions', 13, true);
      const general = decisions.filter(d => d.decision_type !== 'merchandise');
      if (!general.length) line('None recorded.', 10);
      general.forEach(d => {
        line(`${d.subject} — CURRENT: ${d.current_decision} (${d.status === 'open' ? 'OPEN' : 'RESOLVED'})`, 10, true);
        (d.history || []).forEach(h => {
          line(`   ${fmtDateTime(h.decided_at)}: "${h.decision}" authorized by ${h.authorized_by_name || 'unknown'} via ${h.source?.replace('_', ' ')}${h.reason ? ` — ${h.reason}` : ''}`, 9);
        });
      });
      y += 10;

      line('Merchandise Dispositions (Keep / Sell / Review)', 13, true);
      const merch = decisions.filter(d => d.decision_type === 'merchandise');
      if (!merch.length) line('None recorded.', 10);
      merch.forEach(d => {
        line(`${d.subject}: ${String(d.current_decision).toUpperCase()} (${d.status})`, 10, true);
        (d.history || []).slice(0, -1).forEach(h => {
          line(`   ${fmtDateTime(h.decided_at)}: ${String(h.decision).toUpperCase()} (${h.authorized_by_name || 'unknown'})${h.reason ? ` — ${h.reason}` : ''}`, 9);
        });
      });

      doc.save(`decision-summary-${sale.id.slice(0, 8)}.pdf`);
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col items-start gap-1 min-w-0">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sales
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-slate-900 break-words">{sale.title}</h1>
            <p className="text-slate-600">Client Authority & Decisions</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={printSummary} disabled={printing}>
            <Download className="w-4 h-4 mr-2" />{printing ? 'Preparing…' : 'Print Summary'}
          </Button>
          <Button variant="outline" asChild>
            <Link to={'/SaleCloseout?saleId=' + sale.id}>Closeout</Link>
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <Button variant={tab === 'makers' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('makers')}>
          <ShieldCheck className="w-4 h-4 mr-1.5" />Decision-Makers ({authorities.filter(a => a.is_active).length})
        </Button>
        <Button variant={tab === 'decisions' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('decisions')}>
          <Users className="w-4 h-4 mr-1.5" />Decisions ({decisions.filter(d => d.decision_type !== 'merchandise').length})
        </Button>
        <Button variant={tab === 'merch' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('merch')}>
          <Package className="w-4 h-4 mr-1.5" />Keep / Sell / Review
          {reviewOpen.length > 0 && <Badge className="ml-1.5 bg-amber-100 text-amber-700">{reviewOpen.length}</Badge>}
        </Button>
      </div>

      {/* Chapter 7 P1 — canonical agreed scope: what this client hired us to do.
          Always visible above the tabs: the scope is the context for every
          client decision below. Mid-sale changes stay in the Decisions tab;
          this record preserves the original agreed scope with full history. */}
      <SaleScopeSection saleId={sale.id} />

      {tab === 'makers' && (
        <AuthorityPanel sale={sale} user={user} authorities={authorities} onChanged={refresh} />
      )}
      {tab === 'decisions' && (
        <DecisionsPanel sale={sale} user={user} authorities={authorities} decisions={decisions} onChanged={refresh} />
      )}
      {tab === 'merch' && (
        <MerchandiseDecisionPanel sale={sale} user={user} authorities={authorities} decisions={decisions}
          onChanged={refresh} onGoToAuthorities={() => setTab('makers')} />
      )}
    </div>
  );
}