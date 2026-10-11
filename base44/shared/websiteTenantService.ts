// Shared Website Tenant control-plane service (Phase 3B).
// Single source of truth for: slug/hostname normalization, reserved names,
// company membership authorization, entitlement evaluation, lifecycle rules,
// and uniqueness arbitration. Imported by provisionWebsiteTenant,
// reserveWebsiteDomain and submitWebsiteTenantLead functions.
// NOTE: Base44 entities have no database-level unique indexes — uniqueness is
// enforced check-then-create with an immediate post-create arbitration step
// (oldest record wins, losers compensate-deleted). Documented limitation.

export const SITES_HOST = 'estatesalen.com'; // operator website subdomain host (Brent decision pending — centralized here)

export const RESERVED_SLUGS = [
  'admin', 'api', 'app', 'login', 'signup', 'www', 'support', 'help', 'billing',
  'account', 'estatesalen', 'blog', 'items', 'companies', 'probate', 'learn',
  'mobile', 'settings', 'profile', 'dashboard', 'marketplace', 'checkout',
  'payment', 'payments', 'static', 'assets', 'cdn', 'mail', 'smtp', 'ftp',
  'ns1', 'ns2', 'null', 'root', 'test', 'staging', 'demo', 'status', 'docs',
  'developer', 'developers', 'careers', 'legal', 'privacy', 'terms', 'webmail'
];

// Semantic entitlement: subscription tier → max concurrent (non-archived) website tenants.
// No pricing here. 'unlimited' supported for future tiers. Unknown/absent tier → 0 (fail closed).
export const WEBSITE_ENTITLEMENT_TIER_LIMITS = {
  elite: 2,
  premium: 1,
  enterprise: 1,
  professional: 1,
  growth: 1,
  pro: 1,
  basic: 0,
  starter: 0
};

const TIER_RANK = { starter: 0, basic: 0, pro: 1, growth: 1, professional: 1, premium: 2, elite: 3, enterprise: 2 };

export function normalizeSlug(raw) {
  let s = String(raw || '').trim().toLowerCase();
  s = s.replace(/https?:\/\//g, '');
  s = s.replace(/[^a-z0-9\s._-]/g, '');
  s = s.replace(/[\s._]+/g, '-');
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!s || s.length < 3 || s.length > 63) return null;
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s)) return null;
  return s;
}

export function normalizeHostname(raw) {
  let h = String(raw || '').trim().toLowerCase();
  h = h.replace(/^https?:\/\//, '');
  h = h.split(/[/?#]/)[0];
  h = h.replace(/:.*$/, '');
  h = h.replace(/\.+$/, '');
  if (!h || h.length > 253) return null;
  const labels = h.split('.');
  if (labels.length < 2) return null;
  for (const l of labels) {
    if (!l || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l)) return null;
  }
  if (!/^[a-z]{2,}$/.test(labels[labels.length - 1])) return null;
  return h;
}

// Company membership authorization. STRICT: platform admins do NOT bypass —
// platform-admin powers remain distinct from company-member powers.
export async function getCompanyForMember(service, user, companyId) {
  if (companyId) {
    const company = await service.entities.Company.get(companyId).catch(() => null);
    if (!company) return { error: { code: 'company_not_found', message: 'Company not found' }, status: 404 };
    const members = company.member_user_ids || [];
    const isMember = members.includes(user.id) || company.primary_contact_user_id === user.id;
    if (!isMember) return { error: { code: 'not_company_member', message: 'Caller is not a member of this Company' }, status: 403 };
    return { company };
  }
  // No company specified: derive from membership.
  const byMember = await service.entities.Company.filter({ member_user_ids: user.id }, { limit: 50 });
  const byPrimary = await service.entities.Company.filter({ primary_contact_user_id: user.id }, { limit: 50 });
  const all = [...(byMember.items || byMember), ...(byPrimary.items || byPrimary)];
  if (all.length === 0) return { error: { code: 'no_company_membership', message: 'Caller has no Company membership' }, status: 403 };
  return { company: all[0], all_companies: all };
}

// Tenant authorization chain: authenticated user → membership projection on the
// tenant (a copy of Company membership written only by provisioning) or platform admin.
export function assertTenantAccess(user, tenant) {
  if (!tenant) return { error: { code: 'tenant_not_found', message: 'Website tenant not found' }, status: 404 };
  if (user.role === 'admin') return { ok: true };
  const members = tenant.member_user_ids || [];
  if (members.includes(user.id)) return { ok: true };
  return { error: { code: 'not_tenant_member', message: 'Caller is not authorized for this website tenant' }, status: 403 };
}

export async function evaluateWebsiteEntitlement(service, company) {
  const members = Array.from(new Set([...(company.member_user_ids || []), company.primary_contact_user_id].filter(Boolean)));
  if (members.length === 0) return { allowed: false, reason: 'no_company_members' };
  const subsPage = await service.entities.Subscription.filter({ user_id: { $in: members } }, { limit: 200 });
  const subs = subsPage.items || subsPage;
  const active = subs.filter(s => s.status === 'active' || s.status === 'pending');
  if (active.length === 0) return { allowed: false, reason: 'website_entitlement_required' };
  let best = null;
  for (const s of active) {
    if (!best || (TIER_RANK[s.tier] || -1) > (TIER_RANK[best.tier] || -1)) best = s;
  }
  const tier = best.tier || null;
  if (tier === 'unlimited') return { allowed: true, tier, allowance: 'unlimited' };
  const allowance = WEBSITE_ENTITLEMENT_TIER_LIMITS[tier];
  if (typeof allowance !== 'number' || allowance <= 0) {
    return { allowed: false, reason: 'website_entitlement_required', tier };
  }
  return { allowed: true, tier, allowance };
}

const LIFECYCLE = {
  setup: ['active', 'archived'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: []
};

export function validateLifecycleTransition(from, to) {
  if (!LIFECYCLE[from]) return { ok: false, reason: 'unknown_current_status' };
  if (!LIFECYCLE[to]) return { ok: false, reason: 'unknown_target_status' };
  if (!LIFECYCLE[from].includes(to)) return { ok: false, reason: `invalid_transition_${from}_to_${to}` };
  return { ok: true };
}

// Post-create arbitration: for a uniqueness key, keep the OLDEST record; if the
// caller's record is not the oldest, delete it and report the collision.
export async function arbitrateUniqueness(service, entityName, filter, createdId, errorCode, status) {
  const page = await service.entities[entityName].filter(filter, { limit: 25, sort: 'created_date' });
  const rows = page.items || page;
  if (rows.length > 1) {
    const oldest = rows[0];
    if (oldest.id !== createdId) {
      await service.entities[entityName].delete(createdId);
      return { collided: true, error: { code: errorCode, message: `${errorCode.replace(/_/g, ' ')} — already taken` } };
    }
  }
  return { collided: false };
}