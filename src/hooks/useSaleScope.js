import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// P0 security helper — sale ownership scope for child-record writes.
// Returns { operatorId, teamIds } so child records (Item, Expense, Offer,
// EarlySignIn, SaleClientPermission...) carry the operator_id / sale_team_ids
// projections their RLS rules authorize against.
export default function useSaleScope(saleId) {
  const [scope, setScope] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!saleId) { setScope(null); return undefined; }
    (async () => {
      try {
        const sales = await base44.entities.EstateSale.filter({ id: saleId });
        if (!cancelled && sales.length > 0) {
          setScope({ operatorId: sales[0].operator_id, teamIds: sales[0].sale_team || [] });
        }
      } catch (e) {
        // scope stays null; caller's write fails closed if the projection is required
      }
    })();
    return () => { cancelled = true; };
  }, [saleId]);

  return scope;
}