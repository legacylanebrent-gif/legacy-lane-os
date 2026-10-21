import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { CLIENT_FIT_DIMENSIONS, CLIENT_FIT_OPTIONS } from '@/components/saleops/ClientFitPanel';

// Chapter 12 P1 — CLIENT & AUTHORITY (P1-8): reuse Chapter 9 SaleAuthority and
// Chapter 5 client_fit VERBATIM. No consultation-specific authority exists.
// CLIENT EXPECTATION IS NOT CLIENT AUTHORITY.
const STATUS = {
  VERIFIED: { label: 'VERIFIED', tone: 'bg-green-100 text-green-700 border-green-300' },
  UNRESOLVED: { label: 'UNRESOLVED', tone: 'bg-red-100 text-red-700 border-red-300' },
  DISPUTED: { label: 'DISPUTED', tone: 'bg-red-100 text-red-700 border-red-300' },
};

export default function ClientAuthoritySection({ deal, authority, linkedSaleId }) {
  const cf = deal?.client_fit || {};
  const authStatus = authority && authority.is_active !== false ? STATUS[authority.verification_status] : null;
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Decision authority (Chapter 9 record)</p>
        {authority ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{authority.full_name}</p>
                <p className="text-xs text-slate-500">{authority.authority_role || authority.relationship || ''}{authority.source ? ` · basis: ${authority.source}` : ''}</p>
              </div>
              <Badge className={authStatus.tone}>{authStatus.label}</Badge>
            </div>
            {authority.verification_status !== 'VERIFIED' && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                AUTHORITY NEEDS REVIEW — this classification is operational, never a legal conclusion. Resolve or verify through the
                canonical authority workflow before the agreement.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500">
            {linkedSaleId
              ? 'No SaleAuthority record on this sale yet. Add one so the recommendation can see who can give instructions.'
              : 'No linked Estate Sale yet — authority records live on the sale. For now, ask at the consultation: who owns the merchandise, who can give instructions, and who must approve important decisions.'}
          </p>
        )}
        {linkedSaleId && (
          <Link to={`/SaleClientDecisions?saleId=${linkedSaleId}`} className="text-xs text-cyan-600 hover:underline">
            Review / update authority on the canonical workflow →
          </Link>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Client fit (observable project conditions)</p>
        <div className="grid grid-cols-2 gap-2">
          {CLIENT_FIT_DIMENSIONS.map(d => {
            const opt = CLIENT_FIT_OPTIONS.find(o => o.value === (cf[d.key] || 'unknown'));
            return (
              <div key={d.key} className="border border-slate-100 rounded-lg p-2">
                <p className="text-[10px] text-slate-500 leading-tight">{d.label}</p>
                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border mt-1 ${opt.tone}`}>{opt.label}</span>
              </div>
            );
          })}
        </div>
        {cf.notes && <p className="text-xs text-slate-600 bg-slate-50 rounded p-2">{cf.notes}</p>}
        <Link to="/SaleConversionPipeline" className="text-xs text-cyan-600 hover:underline">
          Rate client fit on the deal's Client Fit tab →
        </Link>
      </div>
    </div>
  );
}