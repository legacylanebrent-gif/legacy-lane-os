// Phase 4D shared collaboration helpers — imported by websiteCollab,
// websiteTenantSettingsAdmin and websiteMediaAdmin. Never a second identity
// system: Company membership remains the single source of truth, and
// website-management capability is the smallest safe extension (a per-tenant
// grant list). No direct Customer.io writes anywhere here.
import { assertTenantAccess } from './websiteTenantService.ts';

// ── HTTP helpers shared by the LLBB seams (llbbAdmin + websiteCollab) ────────
export function jerr(code, message, status) {
  return Response.json({ error: { code, message: message || code } }, { status: status || 400 });
}
export function collabOk(data) { return Response.json({ ok: true, ...data }); }
export function pageOf(res) {
  return (res && res.items) ? res.items : (res || []);
}

// ── Invitation tokens ────────────────────────────────────────────────────────
// Raw token: 64 hex chars of CSPRNG output, shown to the inviting admin once
// and never stored. Only the SHA-256 digest is persisted.
export function generateInviteToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(token)));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Activity history (Part 16) ───────────────────────────────────────────────
// Meaningful actions only. Also stamps tenant.last_activity_at (stalled-setup
// detection) and keeps the stamp OUT of routine notification reads.
export async function logActivity(service, tenant, { actorUser, role, action, section, detail, skipTouch }) {
  try {
    await service.entities.WebsiteActivity.create({
      website_tenant_id: tenant.id,
      company_id: tenant.company_id,
      actor_user_id: actorUser ? actorUser.id : 'system',
      actor_display: actorUser ? (actorUser.full_name || actorUser.email || 'User') : 'System',
      actor_role: role || (actorUser && actorUser.role === 'admin' ? 'admin' : 'client'),
      action,
      section: section ? String(section).slice(0, 60) : null,
      detail: detail ? String(detail).slice(0, 500) : null,
      member_user_ids: tenant.member_user_ids || []
    });
  } catch (e) {
    console.error('[logActivity] failed:', e && e.message); // never block the main action
  }
  if (!skipTouch && tenant.id) {
    await service.entities.WebsiteTenant.update(tenant.id, {
      last_activity_at: new Date().toISOString(),
      last_activity_by: actorUser ? actorUser.id : 'system'
    }).catch(() => {});
  }
}

// ── Notifications (Part 26/37) ────────────────────────────────────────────────
// Canonical in-app Notification entity — no direct marketing-provider writes.
export async function notifyUsers(service, userIds, { title, message, linkPage, linkParams, type }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  for (const uid of ids) {
    await service.entities.Notification.create({
      user_id: uid,
      type: type || 'system',
      title: String(title || '').slice(0, 200),
      message: String(message || '').slice(0, 1000),
      link_to_page: linkPage || null,
      link_params: linkParams || null
    }).catch(() => {});
  }
}

export async function notifyPlatformAdmins(service, payload) {
  // NOTE: the built-in User entity does not support the options/page form —
  // plain filter returns the record array directly.
  const admins = (await service.entities.User.filter({ role: 'admin' })).map(u => u.id);
  await notifyUsers(service, admins, payload);
}

// ── Website-management capability (Part 9/10/30) ─────────────────────────────
// Reuses Company membership (assertTenantAccess chain). `website_manager_user_ids`
// is the smallest safe extension: per-tenant delegated managers written only by
// the server. Empty list → legacy-compatible: any tenant member manages.
// Company owner (primary contact) always manages.
export function canManageWebsite(user, tenant, company) {
  if (!user || !tenant) return false;
  if (user.role === 'admin') return true;
  if (!company) return false;
  const isMember = (company.member_user_ids || []).includes(user.id) || company.primary_contact_user_id === user.id;
  if (!isMember) return false;
  if (company.primary_contact_user_id === user.id) return true;
  const granted = tenant.website_manager_user_ids || [];
  if (granted.length === 0) return (tenant.member_user_ids || []).includes(user.id);
  return granted.includes(user.id);
}

// Full edit authorization: capability + management-mode gating (Part 2/13/30).
// A granted website manager may edit even on an admin_managed tenant (that IS
// the "invite client to manage" handoff). Everyone else on an admin_managed
// tenant is read-only.
export function assertWebsiteManagement(user, tenant, company) {
  const base = assertTenantAccess(user, tenant);
  if (!base.ok) return base;
  if (!canManageWebsite(user, tenant, company)) {
    return { ok: false, error: { code: 'not_website_manager', message: 'Website management capability required', status: 403 } };
  }
  if (user.role !== 'admin'
    && tenant.management_mode === 'admin_managed'
    && !(tenant.website_manager_user_ids || []).includes(user.id)) {
    return { ok: false, error: { code: 'admin_managed_mode', message: 'The Legacy Lane team is currently building this website', status: 403 } };
  }
  return { ok: true };
}

// Company owner or platform admin: collaborator management (Part 3/30/32).
export function canManageCollaborators(user, tenant, company) {
  if (!user || !company) return false;
  if (user.role === 'admin') return true;
  return company.primary_contact_user_id === user.id;
}

// ── Review freshness (Part 21/28) ────────────────────────────────────────────
// A review is stale when the settings record moved past the reviewed version.
export function reviewIsStale(tenant, settings) {
  if (!tenant.review_submitted_at || !tenant.review_version) return false;
  const currentVersion = (settings && settings.settings_version) || 1;
  return currentVersion > tenant.review_version;
}

export const STALL_DAYS = 7;
export const DEFAULT_INVITE_EXPIRY_DAYS = 14;