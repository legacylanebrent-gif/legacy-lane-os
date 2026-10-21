// Chapter 18 P1-20..P1-24/P1-42 — deterministic, explainable, consent-aware
// BUYER MATCH for one of the operator's own sales. Every match shows WHY
// (declared interest / prior offer / prior purchase). RELEVANT is always
// separate from CONTACTABLE: eligibility flags come from explicit consent
// only, and the copy-email action can only ever include email-consented
// buyers. No opaque AI score.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users2, Copy, CheckCircle2 } from 'lucide-react';

export default function BuyerMatchPanel() {
  const [sales, setSales] = useState(null);
  const [saleId, setSaleId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const p = await base44.entities.EstateSale.filter(
          { operator_id: me.id, status: { $in: ['draft', 'upcoming', 'active'] } },
          { sort: '-updated_date', limit: 50 });
        setSales(p.items || []);
      } catch (e) { setSales([]); }
    })();
  }, []);

  const runMatch = async () => {
    if (!saleId) return;
    setLoading(true); setResult(null); setCopied(false);
    try {
      const res = await base44.functions.invoke('buyerAudience', { action: 'match', sale_id: saleId });
      setResult(res.data);
    } catch (e) {
      setResult({ error: true });
    }
    setLoading(false);
  };

  const copyEligibleEmails = async () => {
    const emails = ((result && result.matches) || []).filter(m => m.email_eligible && m.email).map(m => m.email);
    if (!emails.length) return;
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) { /* clipboard unavailable */ }
  };

  const eligibleCount = ((result && result.matches) || []).filter(m => m.email_eligible).length;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
      <div className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><Users2 className="w-4 h-4 text-cyan-700" /> Find buyers for a sale</div>
      <p className="text-sm text-slate-500 mb-3">
        Deterministic match from stored buyer history — declared interests, past offers and purchases — with the reason shown for every match.
        Relevance is separate from eligibility: a strong match without consent is NOT contactable.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <select value={saleId} onChange={e => setSaleId(e.target.value)} className="flex-1 text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white" aria-label="Pick a sale to match buyers against">
          <option value="">Pick a sale…</option>
          {(sales || []).map(s => <option key={s.id} value={s.id}>{s.title} ({s.status})</option>)}
        </select>
        <Button size="sm" onClick={runMatch} disabled={!saleId || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null} Find matching buyers
        </Button>
      </div>

      {result && !result.error && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-2 text-sm text-slate-600">
            <span className="font-medium">{result.matches.length} relevant buyer{result.matches.length === 1 ? '' : 's'}</span>
            <Badge variant="outline" className="text-[11px]">{result.totals.email_eligible} email eligible</Badge>
            <Badge variant="outline" className="text-[11px]">{result.totals.sms_eligible} SMS eligible</Badge>
            {eligibleCount > 0 && (
              <Button size="sm" variant="outline" onClick={copyEligibleEmails} className="ml-auto">
                {copied ? <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copied ? 'Copied' : 'Copy email-eligible addresses'}
              </Button>
            )}
          </div>
          {result.matches.length === 0 ? (
            <p className="text-sm text-slate-400">No stored buyer history matches this sale's categories yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-md">
              {result.matches.map(m => (
                <li key={m.key} className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{m.display_name || 'Buyer'}</span>
                    <span className="text-xs text-slate-500">{m.email}</span>
                    {m.email_eligible
                      ? <Badge className="bg-green-100 text-green-800 border-green-200 text-[11px]">Email eligible</Badge>
                      : <Badge variant="outline" className="text-slate-400 text-[11px]">No email consent</Badge>}
                    {m.sms_eligible
                      ? <Badge className="bg-green-100 text-green-800 border-green-200 text-[11px]">SMS eligible</Badge>
                      : <Badge variant="outline" className="text-slate-400 text-[11px]">No SMS consent</Badge>}
                    {m.vip && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[11px]">VIP</Badge>}
                  </div>
                  <ul className="mt-1 text-xs text-slate-600 space-y-0.5">
                    {m.reasons.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {result && result.error && <p className="text-sm text-red-600">Could not run the match — try again.</p>}
    </div>
  );
}