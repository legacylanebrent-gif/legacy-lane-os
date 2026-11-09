// Canonical guest sale entitlement rules.
// One paid sale package covers ONE sale weekend. The purchase is bound to a sale
// on first publish and never moves. Clients never write these records: every write
// happens in a server function.
//
// Publishing rights are always VERIFIED from server-side truth (a bound paid
// entitlement or a live company subscription) — never from a flag a browser wrote.

export const GUEST_SALE_PACKAGE = {
  key: 'one_time_estate_sale',
  kind: 'sale_package',
  name: 'One-Time Estate Sale',
  amount: '147.00',
  currency: 'USD',
  // Financial guardrails. Ordinary AI item descriptions are cheap; Deep Scan and
  // external provider lookups cost real money and are NOT included.
  ai_description_allowance: 60,
  deep_scan_credits_included: 0,
};

export const GUEST_ACCOUNT_TYPE = 'diy_seller';

// Account types that hold a company subscription and publish without buying a
// guest sale package. Their existing rights are unchanged by this system.
export const PROFESSIONAL_ACCOUNT_TYPES = [
  'estate_sale_operator',
  'team_admin',
  'team_member',
  'team_marketer',
  'collector_dealer',
  'consignor',
  'real_estate_agent',
  'investor',
  'vendor',
];

export const PUBLISHED_SALE_STATUSES = ['upcoming', 'active'];
export const ENTITLED_SUBSCRIPTION_STATUSES = ['active', 'pending', 'trialing'];
const USABLE_ENTITLEMENT_STATUSES = ['active', 'bound'];

export function nowIso() {
  return new Date().toISOString();
}

export function money2(value) {
  const n = Number(value);
  if (!isFinite(n)) return null;
  return n.toFixed(2);
}

export function appendAudit(record, entry) {
  const audit = Array.isArray(record?.audit) ? record.audit.slice() : [];
  audit.push({ at: nowIso(), ...entry });
  return audit;
}

export function isProfessionalAccount(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return PROFESSIONAL_ACCOUNT_TYPES.includes(user.primary_account_type);
}

// A company subscription carries publishing rights while it is in good standing.
// A trial ('pending') counts — professional operators keep working exactly as before.
export async function hasPublishingSubscription(base44, owner) {
  if (!owner?.id) return { allowed: false };
  const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: owner.id });
  const good = (subs || []).filter((s) => ENTITLED_SUBSCRIPTION_STATUSES.includes(s.status));
  if (good.length === 0) return { allowed: false };
  const now = Date.now();
  const live = good.find((s) => {
    const end = s.end_date ? new Date(s.end_date).getTime() : null;
    if (end && end < now) return false;
    const renewal = s.renewal_date ? new Date(s.renewal_date).getTime() : null;
    if (renewal && renewal < now) return false;
    return true;
  });
  return live ? { allowed: true, subscription: live } : { allowed: false };
}

export async function loadSale(base44, saleId) {
  try {
    return await base44.asServiceRole.entities.EstateSale.get(saleId);
  } catch (e) {
    return null;
  }
}

export function isSaleOwner(user, sale) {
  if (!user || !sale) return false;
  if (user.role === 'admin') return true;
  return sale.operator_id === user.id || sale.created_by_id === user.id;
}

export function canActForSale(user, sale) {
  if (!user || !sale) return false;
  if (isSaleOwner(user, sale)) return true;
  return !!user.operator_id && user.operator_id === sale.operator_id;
}

// The entitlement permanently bound to this sale, if any.
export async function boundEntitlementForSale(base44, saleId) {
  const rows = await base44.asServiceRole.entities.SaleEntitlement.filter({
    bound_sale_id: saleId,
    kind: GUEST_SALE_PACKAGE.kind,
  });
  return (rows || [])[0] || null;
}

// A paid, unused sale package the buyer can still claim.
export async function claimableEntitlement(base44, userId) {
  const rows = await base44.asServiceRole.entities.SaleEntitlement.filter({
    user_id: userId,
    kind: GUEST_SALE_PACKAGE.kind,
    status: 'active',
  });
  const list = (rows || []).filter((r) => !r.bound_sale_id);
  list.sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')));
  return list[0] || null;
}

export async function pendingEntitlement(base44, userId) {
  const rows = await base44.asServiceRole.entities.SaleEntitlement.filter({
    user_id: userId,
    kind: GUEST_SALE_PACKAGE.kind,
    status: 'pending',
  });
  return (rows || [])[0] || null;
}

/**
 * Server-side truth: may this sale be on the public listing at all?
 * A bound paid entitlement OR the owning company's live subscription. Nothing else.
 */
export async function verifySalePublishing(base44, sale) {
  if (!sale) return { ok: false, reason: 'sale_not_found' };

  const bound = await boundEntitlementForSale(base44, sale.id);
  if (bound && USABLE_ENTITLEMENT_STATUSES.includes(bound.status)) {
    return { ok: true, source: 'entitlement', entitlement: bound };
  }

  const sub = await hasPublishingSubscription(base44, { id: sale.operator_id });
  if (sub.allowed) return { ok: true, source: 'subscription', subscription: sub.subscription };

  return { ok: false, reason: 'no_paid_right' };
}

/** A paid featured placement is its own product and is never bundled with a sale. */
export async function hasPaidFeaturedPlacement(base44, saleId, kind) {
  const rows = await base44.asServiceRole.entities.SaleEntitlement.filter({
    bound_sale_id: saleId,
    kind,
  });
  const usable = (rows || []).filter((r) => USABLE_ENTITLEMENT_STATUSES.includes(r.status));
  return usable.length > 0;
}

/**
 * Decides whether this actor may put this sale on the public listing.
 */
export async function authorizePublish(base44, user, sale) {
  if (!canActForSale(user, sale)) {
    return { allowed: false, reason: 'not_your_sale' };
  }

  // 1) A sale that already owns an entitlement may be rescheduled and republished.
  const bound = await boundEntitlementForSale(base44, sale.id);
  if (bound && USABLE_ENTITLEMENT_STATUSES.includes(bound.status)) {
    if (['completed', 'archived'].includes(sale.status)) {
      return { allowed: false, reason: 'completed_sale_requires_new_purchase' };
    }
    return { allowed: true, source: 'entitlement', entitlement: bound, reuse: true };
  }

  // 2) Professional accounts publish on their company subscription.
  if (isProfessionalAccount(user)) {
    const ownerId = user.operator_id || user.id;
    const sub = await hasPublishingSubscription(base44, { id: ownerId });
    if (sub.allowed) return { allowed: true, source: 'subscription', subscription: sub.subscription };
    return { allowed: false, reason: 'no_active_subscription' };
  }

  // 3) Guest: needs an unused, paid sale package.
  const claimable = await claimableEntitlement(base44, user.id);
  if (claimable) {
    return { allowed: true, source: 'entitlement', entitlement: claimable, reuse: false };
  }
  return { allowed: false, reason: 'sale_package_required', purchase_url: '/DIYSaleSignup' };
}

export async function bindEntitlement(base44, entitlement, sale, actor, source) {
  const audit = appendAudit(entitlement, {
    action: 'bound_to_sale',
    status_from: entitlement.status,
    status_to: 'bound',
    actor_id: actor?.id || 'system',
    actor_name: actor?.full_name || 'System',
    sale_id: sale.id,
    note: `Permanently bound on first publish (${source}).`,
  });
  return await base44.asServiceRole.entities.SaleEntitlement.update(entitlement.id, {
    status: 'bound',
    bound_sale_id: sale.id,
    bound_at: entitlement.bound_at || nowIso(),
    first_published_at: entitlement.first_published_at || nowIso(),
    last_published_at: nowIso(),
    publish_count: (entitlement.publish_count || 0) + 1,
    audit,
  });
}

export async function recordRepublication(base44, entitlement, sale, actor) {
  const audit = appendAudit(entitlement, {
    action: 'republished_same_sale',
    actor_id: actor?.id || 'system',
    actor_name: actor?.full_name || 'System',
    sale_id: sale.id,
    note: 'Reschedule or republish of the same paid weekend — no new charge.',
  });
  return await base44.asServiceRole.entities.SaleEntitlement.update(entitlement.id, {
    last_published_at: nowIso(),
    publish_count: (entitlement.publish_count || 0) + 1,
    audit,
  });
}

/**
 * Retires an entitlement (refund, dispute, revocation) and pulls its bound sale
 * out of public listing without deleting the sale, its photos, transactions or
 * reports — post-sale reconciliation and historical access stay intact.
 */
export async function retireEntitlement(base44, entitlement, { status, reason, actorName, note }) {
  const audit = appendAudit(entitlement, {
    action: status,
    status_from: entitlement.status,
    status_to: status,
    actor_name: actorName || 'Admin',
    sale_id: entitlement.bound_sale_id || '',
    note: note || reason || status,
  });
  const patch = { status, audit, revoke_reason: reason || entitlement.revoke_reason || '' };
  if (status === 'refunded') patch.refunded_at = nowIso();
  else patch.revoked_at = nowIso();
  if (actorName) patch.revoked_by_name = actorName;
  const updated = await base44.asServiceRole.entities.SaleEntitlement.update(entitlement.id, patch);

  if (entitlement.bound_sale_id) {
    const sale = await loadSale(base44, entitlement.bound_sale_id);
    if (sale && PUBLISHED_SALE_STATUSES.includes(sale.status)) {
      await base44.asServiceRole.entities.EstateSale.update(sale.id, { status: 'draft' });
    }
  }
  return updated;
}