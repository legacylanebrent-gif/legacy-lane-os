// Chapter 7 P2 — shared helpers for sale-scoped backend functions.
// Plain module: exported helpers, no Deno.serve. Imported by
// buildMarketingKit and sellerOnboardingAi so authorization + response
// helpers are written exactly once.

export function jerr(code, message, status) {
  return Response.json({ error: { code, message: message || code } }, { status: status || 400 });
}

export const pageOf = (p) => p.items || p;

export const cap = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

// Authorization: the caller must own the sale (operator_id), be on its sale
// team, or be a platform admin. The sale is ALWAYS resolved server-side by
// id — client-supplied operator/company fields are never trusted.
export async function loadAuthorizedSale(service, user, saleId) {
  if (!saleId) return { error: jerr('sale_id_required', 'sale_id is required', 400) };
  const sale = await service.entities.EstateSale.get(saleId).catch(() => null);
  if (!sale) return { error: jerr('sale_not_found', 'Sale not found', 404) };
  const isTeam = (sale.sale_team || []).includes(user.id);
  if (sale.operator_id !== user.id && !isTeam && user.role !== 'admin') {
    return { error: jerr('not_authorized', 'Caller is not authorized for this sale', 403) };
  }
  return { sale };
}