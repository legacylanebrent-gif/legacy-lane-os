import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Chapter 9 P0 — the legacy schema-less contracts surface (EstateSale.contracts
// custom attribute with hardcoded boilerplate and a mock send-for-signature)
// is RETIRED as production truth. All existing links land here and are
// redirected to the canonical Proposal & Agreement system.
export default function SaleContracts() {
  const navigate = useNavigate();
  useEffect(() => {
    const saleId = new URLSearchParams(window.location.search).get('saleId');
    navigate(saleId ? `/ProposalAgreement?saleId=${saleId}` : '/MySales', { replace: true });
  }, [navigate]);
  return (
    <div className="p-8 flex items-center gap-2 text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin" />Opening Proposal & Agreement…
    </div>
  );
}