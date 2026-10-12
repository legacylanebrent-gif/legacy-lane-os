// Phase 4D — client onboarding, collaboration, review & approval seam.
// ONE server seam for: invitations (issue/preview/accept/revoke), the client
// "My Website" payload, review submission (readiness-enforced), request
// changes (note-required), approval (freshness-enforced, never publishes),
// review notes (open/resolve), activity history, the admin attention center,
// and client-safe sales/leads reads.
//
// Authorization truth (Parts 9/10/44): identity is ALWAYS derived server-side
// from the authenticated user → Company membership → Company → WebsiteTenant.
// Client-supplied company/tenant/role/approval fields are never trusted.
// No second identity system, no second login system, no direct Customer.io
// writes. Legacy Lane production tenants (created_via !== 'llbb') are frozen
// out of every Phase 4D action (Part 52).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SITES_HOST, assertTenantAccess } from '../../shared/websiteTenantService.ts';
import { getTenantSettings, projectPublicSettings } from '../../shared/websiteSettingsService.ts';
import { computeReadiness } from '../../shared/llbbSetupEngine.ts';
import {
  validateWorkflowTransition,
  allowedWorkflowTransitions,
  technicalStatusForWorkflow,
  inferWorkflowFromTechnical,
  WORKFLOW_LABELS
} from '../../shared/llbbWorkflowModel.ts';
import { validateLifecycleTransition } from '../../shared/websiteTenantService.ts';
import {
  generateInviteToken, hashToken, logActivity, notifyUsers, notifyPlatformAdmins,
  canManageWebsite, assertWebsiteManagement, canManageCollaborators,
  reviewIsStale, STALL_DAYS, DEFAULT_INVITE_EXPIRY_DAYS,
  jerr, collabOk, pageOf
} from '../../shared/websiteCollabShared.ts';

const INVITE_APP_URL = 'https://estatesalen.com/website-invite';
const ok = collabOk;
const normEmail = (v) => String(v || '').trim().toLowerCase();

async function authedUser(base44) {
  const user = await base44.auth.me().catch(() => null);
  return user || null;
}

async function loadContext(service, tenantId) {
  const tenant = await service.entities.WebsiteTenant.get(tenantId || '').catch(() => null);
  if (!tenant) return { error: jerr('tenant_not_found', 'Website not found', 404) };
  const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
  if (!company) return { error: jerr('company_not_found', 'Company not found', 404) };
  return { tenant, company };
}

async function reviewContext(service, tenant) {
  const domPage = await service.entities.WebsiteDomain.filter({ website_tenant_id: tenant.id }, { limit: 50 });
  const domains = pageOf(domPage);
  const destination = tenant.destination_id ? await service.entities.Destination.get(tenant.destination_id).catch(() => null) : null;
  const settingsRow = await getTenantSettings(service, tenant.id);
  const readiness = computeReadiness({ tenant, settings: projectPublicSettings(settingsRow, null), destination, domains });
  return { domains, destination, settingsRow, readiness };
}

function requireLlbb(tenant) {
  if (tenant.created_via !== 'llbb') {
    return { error: { code: 'not_llbb_tenant', message: 'Only Business Builder websites support client collaboration', status: 403 } };
  }
  return null;
}

async function applyWorkflow(service, tenant, user, to, extraPatch) {
  const from = tenant.workflow_status || inferWorkflowFromTechnical(tenant.status);
  const check = validateWorkflowTransition(from, to);
  if (!check.ok) return { error: { code: check.reason, message: `Cannot move ${from} → ${to}`, status: 409 } };
  const now = new Date().toISOString();
  const patch = { workflow_status: to, workflow_updated_at: now, workflow_updated_by: user ? user.id : 'system', ...(extraPatch || {}) };
  const desired = technicalStatusForWorkflow(to);
  if (desired && desired !== tenant.status) {
    const tech = validateLifecycleTransition(tenant.status, desired);
    if (!tech.ok) return { error: { code: tech.reason, message: `Technical lifecycle cannot move ${tenant.status} → ${desired}`, status: 409 } };
    patch.status = desired;
  }
  const updated = await service.entities.WebsiteTenant.update(tenant.id, patch);
  return { tenant: updated };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action || '';

    // ── Public action (no authentication required) ───────────────────────────
    if (action === 'invitation_preview') return await invitationPreview(service, body);

    const user = await authedUser(base44);
    if (!user) return jerr('unauthorized', 'Authentication required', 401);

    if (action === 'accept_invitation') return await acceptInvitation(base44, service, user, body);
    if (action === 'my_website') return await myWebsite(service, user, body);
    if (action === 'list_notes') return await listNotes(service, user, body);
    if (action === 'activity_list') return await activityList(service, user, body);
    if (action === 'sales_list') return await clientSalesList(service, user, body);
    if (action === 'leads_list') return await clientLeadsList(service, user, body);
    if (action === 'lead_detail') return await clientLeadDetail(service, user, body);

    const adminOnly = ['invite_client', 'list_invitations', 'revoke_invitation', 'request_changes', 'approve_website', 'set_management_mode', 'attention_center'];
    const ownerOrAdmin = ['revoke_access', 'list_access'];

    if (adminOnly.includes(action) && user.role !== 'admin') {
      return jerr('admin_only', 'This action is platform-admin only', 403);
    }
    if (action === 'invite_client') return await inviteClient(base44, service, user, body);
    if (action === 'list_invitations') return await listInvitations(service, user, body);
    if (action === 'revoke_invitation') return await revokeInvitation(service, user, body);
    if (action === 'request_changes') return await requestChanges(service, user, body);
    if (action === 'approve_website') return await approveWebsite(service, user, body);
    if (action === 'set_management_mode') return await setManagementMode(service, user, body);
    if (action === 'attention_center') return await attentionCenter(service, body);

    if (ownerOrAdmin.includes(action)) {
      const ctx = await loadContext(service, body.website_tenant_id);
      if (ctx.error) return ctx.error;
      if (!canManageCollaborators(user, ctx.tenant, ctx.company)) {
        return jerr('collaborator_admin_only', 'Only the company owner or a platform admin can manage website collaborators', 403);
      }
      if (action === 'revoke_access') return await revokeAccess(service, user, ctx.tenant, ctx.company, body);
      if (action === 'list_access') return await listAccess(service, user, ctx.tenant, ctx.company);
    }

    // Mutating note actions share one authorization block.
    if (['add_note', 'respond_note', 'resolve_note', 'submit_for_review'].includes(action)) {
      return await manageAction(base44, service, user, body, action);
    }

    return jerr('unknown_action', 'Unknown websiteCollab action', 400);
  } catch (error) {
    console.error('websiteCollab error:', error && error.message);
    return jerr('internal_error', 'Unexpected error', 500);
  }
}

// ═══════════════════════ INVITATIONS (Parts 3/4/5/6/42) ══════════════════════

async function inviteClient(base44, service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, company } = ctx;
  const freeze = requireLlbb(tenant);
  if (freeze) return jerr(freeze.error.code, freeze.error.message, freeze.error.status);

  const email = normEmail(body.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jerr('invalid_email', 'A valid email is required', 400);
  const displayName = String(body.display_name || '').trim().slice(0, 120) || null;
  const days = Number.isFinite(Number(body.expires_in_days)) && Number(body.expires_in_days) >= 1 && Number(body.expires_in_days) <= 90
    ? Number(body.expires_in_days) : DEFAULT_INVITE_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

  // Company-bound + tenant-bound by construction: company_id is derived from
  // the tenant server-side — an invitation can never bind to another Company.
  const token = generateInviteToken();
  const tokenHash = await hashToken(token);
  const invitation = await service.entities.WebsiteInvitation.create({
    website_tenant_id: tenant.id,
    company_id: tenant.company_id, // derived — never client-supplied
    email,
    display_name: displayName,
    role: 'website_manager',
    invited_by_user_id: user.id,
    management_mode_at_invite: tenant.management_mode || 'admin_managed',
    token_hash: tokenHash,
    status: 'pending',
    expires_at: expiresAt,
    member_user_ids: tenant.member_user_ids || []
  });

  // Canonical email delivery (Part 4) — no direct Customer.io writes. The
  // invitation exists regardless of delivery; the admin can share the link.
  let emailDelivered = false;
  let emailError = null;
  try {
    await service.integrations.Core.SendEmail({
      to: email,
      template_name: 'WebsiteInvite',
      from_name: 'EstateSalen',
      variables: {
        first_name: displayName ? displayName.split(' ')[0] : 'there',
        company_name: company.display_name || company.legal_name,
        website_name: tenant.name,
        invited_by_name: user.full_name || 'The EstateSalen team',
        expires_at: new Date(expiresAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }),
        invite_url: `${INVITE_APP_URL}?token=${token}`
      }
    });
    emailDelivered = true;
    await service.entities.WebsiteInvitation.update(invitation.id, { email_sent: true });
  } catch (e) {
    emailError = (e && e.message) ? String(e.message).slice(0, 300) : 'send_failed';
    console.error('[inviteClient] email delivery failed:', emailError);
  }

  await logActivity(service, tenant, {
    actorUser: user, role: 'admin', action: 'client_invited',
    section: 'team', detail: `${displayName || email} invited as website manager`
  });
  await notifyUsers(service, [company.primary_contact_user_id], {
    title: 'Client invited to your website',
    message: `${displayName || email} was invited to manage ${tenant.name}.`,
    linkPage: 'WebsiteManager', linkParams: `tenant=${tenant.id}`
  });

  return ok({
    invitation: { id: invitation.id, email, display_name: displayName, expires_at: expiresAt, email_sent: emailDelivered, email_error: emailError },
    invite_url: `${INVITE_APP_URL}?token=${token}` // shown once to the inviting admin
  });
}

// Public: masked invitation context for the acceptance page. Never returns
// the token hash, membership arrays or any technical identifiers.
async function invitationPreview(service, body) {
  const tokenHash = await hashToken(body.token || '');
  const page = await service.entities.WebsiteInvitation.filter({ token_hash: tokenHash }, { limit: 5 });
  const inv = pageOf(page)[0] || null;
  if (!inv) return jerr('invalid_invitation', 'This invitation link is not valid', 404);
  if (inv.status === 'expired' || (inv.status === 'pending' && inv.expires_at && new Date(inv.expires_at).getTime() < Date.now())) {
    if (inv.status === 'pending') await service.entities.WebsiteInvitation.update(inv.id, { status: 'expired' }).catch(() => {});
    return jerr('invitation_expired', 'This invitation has expired', 410);
  }
  if (inv.status === 'accepted') return jerr('invitation_used', 'This invitation has already been accepted', 409);
  if (inv.status !== 'pending') return jerr('invitation_unavailable', 'This invitation is no longer available', 409);
  const tenant = await service.entities.WebsiteTenant.get(inv.website_tenant_id).catch(() => null);
  const company = tenant ? await service.entities.Company.get(tenant.company_id).catch(() => null) : null;
  const inviter = await service.entities.User.get(inv.invited_by_user_id).catch(() => null);
  const masked = inv.email ? inv.email.replace(/^(.).*(@.*)$/, '$1***$2') : null;
  return ok({
    invitation: {
      website_name: tenant ? tenant.name : null,
      company_name: company ? (company.display_name || company.legal_name) : null,
      invited_by_name: inviter ? (inviter.full_name || 'The EstateSalen team') : 'The EstateSalen team',
      masked_email: masked,
      expires_at: inv.expires_at || null
    }
  });
}

// Part 6 — acceptance reuses the EXISTING EstateSalen account + membership
// architecture. No separate LLBB login. Fail closed on every attack vector.
async function acceptInvitation(base44, service, user, body) {
  const tokenHash = await hashToken(body.token || '');
  const page = await service.entities.WebsiteInvitation.filter({ token_hash: tokenHash }, { limit: 5 });
  const inv = pageOf(page)[0] || null;
  if (!inv) return jerr('invalid_invitation', 'This invitation link is not valid', 404);

  const expired = inv.expires_at && new Date(inv.expires_at).getTime() < Date.now();
  if (inv.status === 'expired' || (inv.status === 'pending' && expired)) {
    if (inv.status === 'pending') await service.entities.WebsiteInvitation.update(inv.id, { status: 'expired' }).catch(() => {});
    return jerr('invitation_expired', 'This invitation has expired', 410);
  }
  if (inv.status === 'accepted') return jerr('invitation_used', 'This invitation has already been accepted', 409);
  if (inv.status !== 'pending') return jerr('invitation_unavailable', 'This invitation is no longer available', 409);

  // Email-bound: the authenticated account must match the invited address.
  const userEmail = normEmail(user.email);
  if (userEmail !== inv.email) {
    return jerr('email_mismatch', `This invitation was sent to a different email address. Please sign in with ${inv.email ? inv.email.replace(/^(.).*(@.*)$/, '$1***$2') : 'the invited email'}.`, 403);
  }

  const tenant = await service.entities.WebsiteTenant.get(inv.website_tenant_id).catch(() => null);
  if (!tenant || tenant.status === 'archived') return jerr('invitation_unavailable', 'This website is no longer available', 409);
  const company = await service.entities.Company.get(inv.company_id).catch(() => null);
  if (!company) return jerr('internal_error', 'Company not found', 500);

  const now = new Date().toISOString();
  // Establish membership through the EXISTING architecture (Company is truth).
  if (!(company.member_user_ids || []).includes(user.id)) {
    await service.entities.Company.update(company.id, { member_user_ids: [...(company.member_user_ids || []), user.id] });
  }
  if (!(tenant.member_user_ids || []).includes(user.id)) {
    await service.entities.WebsiteTenant.update(tenant.id, { member_user_ids: [...(tenant.member_user_ids || []), user.id] });
  }
  // Grant the website_manage capability (Part 10).
  if (!(tenant.website_manager_user_ids || []).includes(user.id)) {
    await service.entities.WebsiteTenant.update(tenant.id, { website_manager_user_ids: [...(tenant.website_manager_user_ids || []), user.id] });
  }
  // Refresh RLS read projections on existing scoped records.
  const settingsRow = await getTenantSettings(service, tenant.id);
  if (settingsRow && !(settingsRow.member_user_ids || []).includes(user.id)) {
    await service.entities.WebsiteTenantSettings.update(settingsRow.id, { member_user_ids: [...(settingsRow.member_user_ids || []), user.id] });
  }
  await service.entities.WebsiteReviewNote.updateMany(
    { website_tenant_id: tenant.id }, { $addToSet: { member_user_ids: user.id } });

  await service.entities.WebsiteInvitation.update(inv.id, { status: 'accepted', accepted_at: now, accepted_by_user_id: user.id });

  await logActivity(service, tenant, {
    actorUser: user, role: 'client', action: 'invitation_accepted', section: 'team',
    detail: `${user.full_name || user.email} accepted the website invitation`
  });
  await notifyPlatformAdmins(service, {
    title: 'Invitation accepted',
    message: `${user.full_name || user.email} now manages ${tenant.name}.`,
    linkPage: 'WebsiteManager', linkParams: `tenant=${tenant.id}`
  });

  return ok({
    website: { id: tenant.id, name: tenant.name },
    company_name: company.display_name || company.legal_name
  });
}

async function listInvitations(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, company } = ctx;
  if (!canManageCollaborators(user, tenant, company)) return jerr('collaborator_admin_only', 'Not authorized', 403);
  // Lazy expiry: stamp stale pending invitations on read.
  const page = await service.entities.WebsiteInvitation.filter({ website_tenant_id: tenant.id }, { limit: 100, sort: '-created_date' });
  const invs = pageOf(page);
  const now = Date.now();
  const rows = [];
  for (const inv of invs) {
    if (inv.status === 'pending' && inv.expires_at && new Date(inv.expires_at).getTime() < now) {
      await service.entities.WebsiteInvitation.update(inv.id, { status: 'expired' }).catch(() => {});
      inv.status = 'expired';
    }
    const inviter = inv.invited_by_user_id ? await service.entities.User.get(inv.invited_by_user_id).catch(() => null) : null;
    rows.push({
      id: inv.id, email: inv.email, display_name: inv.display_name || null, role: inv.role || 'website_manager',
      status: inv.status, expires_at: inv.expires_at || null, created_date: inv.created_date || null,
      email_sent: inv.email_sent === true,
      invited_by_name: inviter ? (inviter.full_name || 'Admin') : null,
      accepted_by_user_id: inv.accepted_by_user_id || null
    });
  }
  return ok({ invitations: rows });
}

async function revokeInvitation(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, company } = ctx;
  if (!canManageCollaborators(user, tenant, company)) return jerr('collaborator_admin_only', 'Not authorized', 403);
  const inv = await service.entities.WebsiteInvitation.get(body.invitation_id || '').catch(() => null);
  if (!inv || inv.website_tenant_id !== tenant.id) return jerr('invitation_not_found', 'Invitation not found for this website', 404);
  if (inv.status !== 'pending') return jerr('invitation_not_pending', 'Only pending invitations can be revoked', 409);
  await service.entities.WebsiteInvitation.update(inv.id, { status: 'revoked' });
  await logActivity(service, tenant, { actorUser: user, role: user.role === 'admin' ? 'admin' : 'client', action: 'invitation_revoked', section: 'team', detail: inv.email });
  return ok({});
}

// Part 32 — revoke website-management capability WITHOUT deleting the user,
// Company, tenant, content, sales or leads. Membership and audit stay intact.
async function revokeAccess(service, user, tenant, company, body) {
  const targetId = body.user_id || '';
  const target = await service.entities.User.get(targetId).catch(() => null);
  if (!target) return jerr('user_not_found', 'User not found', 404);
  if (targetId === company.primary_contact_user_id) {
    return jerr('owner_not_revocable', 'The company owner cannot be removed from website management', 409);
  }
  const granted = (tenant.website_manager_user_ids || []).filter(id => id !== targetId);
  await service.entities.WebsiteTenant.update(tenant.id, { website_manager_user_ids: granted });
  // Also revoke any still-pending invitations bound to that user's email.
  const invPage = await service.entities.WebsiteInvitation.filter(
    { website_tenant_id: tenant.id, email: normEmail(target.email), status: 'pending' }, { limit: 20 });
  for (const inv of pageOf(invPage)) {
    await service.entities.WebsiteInvitation.update(inv.id, { status: 'revoked' }).catch(() => {});
  }
  await logActivity(service, tenant, {
    actorUser: user, role: user.role === 'admin' ? 'admin' : 'client', action: 'access_revoked',
    section: 'team', detail: `${target.full_name || target.email} removed from website management`
  });
  return ok({ website_manager_user_ids: granted });
}

async function listAccess(service, user, tenant, company) {
  const granted = tenant.website_manager_user_ids || [];
  const users = [];
  const seen = new Set();
  const resolve = async (uid) => {
    if (!uid || seen.has(uid)) return null;
    seen.add(uid);
    const u = await service.entities.User.get(uid).catch(() => null);
    if (!u) return null;
    users.push({ id: u.id, full_name: u.full_name || null, email: u.email || null });
    return u;
  };
  await resolve(company.primary_contact_user_id);
  for (const uid of granted) await resolve(uid);
  const memberIds = tenant.member_user_ids || [];
  for (const uid of memberIds) if (!seen.has(uid)) await resolve(uid);
  return ok({
    owner: company.primary_contact_user_id || null,
    website_managers: granted,
    members: users
  });
}

// ═══════════════════════ CLIENT PAYLOAD (Parts 7/11/36) ══════════════════════

async function myWebsite(service, user, body) {
  const isAdmin = user.role === 'admin';
  let tenant = null;
  if (body.website_tenant_id) {
    tenant = await service.entities.WebsiteTenant.get(body.website_tenant_id).catch(() => null);
  } else {
    // Derive from Company membership — never from a client-supplied id alone.
    const byMember = pageOf(await service.entities.Company.filter({ member_user_ids: user.id }, { limit: 50 }));
    const byPrimary = pageOf(await service.entities.Company.filter({ primary_contact_user_id: user.id }, { limit: 50 }));
    const companies = [...byMember, ...byPrimary];
    const ids = [...new Set(companies.map(c => c.id))];
    if (ids.length > 0) {
      const tPage = await service.entities.WebsiteTenant.filter({ company_id: { $in: ids } }, { limit: 50, sort: '-updated_date' });
      tenant = pageOf(tPage).find(t => t.status !== 'archived') || null;
    }
  }
  if (!tenant) return jerr('no_website', 'No website is available for this account', 404);
  const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
  if (!company) return jerr('company_not_found', 'Company not found', 404);

  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });
  const manage = canManageWebsite(user, tenant, company);
  const isOwner = canManageCollaborators(user, tenant, company);

  const { domains, destination, settingsRow, readiness } = await reviewContext(service, tenant);
  const workflow = tenant.workflow_status || inferWorkflowFromTechnical(tenant.status);
  const platformDomain = domains.find(d => d.domain_type === 'platform_subdomain' && d.status !== 'disconnected') || null;
  const customDomains = domains.filter(d => d.domain_type === 'custom_domain');
  const stale = reviewIsStale(tenant, settingsRow);

  // Client-safe readiness: hide the technical runtime section (Part 40).
  const clientSections = readiness.sections.filter(s => s.key !== 'runtime');

  let submittedByName = null;
  if (tenant.review_submitted_by) {
    const su = await service.entities.User.get(tenant.review_submitted_by).catch(() => null);
    submittedByName = su ? (su.full_name || su.email) : null;
  }

  const openNotes = pageOf(await service.entities.WebsiteReviewNote.filter(
    { website_tenant_id: tenant.id, status: 'open' }, { limit: 100, sort: 'created_date' }));

  const payload = {
    website: {
      id: tenant.id, name: tenant.name, slug: tenant.slug,
      status: tenant.status, workflow_status: workflow,
      management_mode: tenant.management_mode || 'admin_managed',
      created_via: tenant.created_via || 'legacy',
      platform_hostname: platformDomain ? platformDomain.hostname : `${tenant.slug}.${SITES_HOST}`,
      website_address: platformDomain ? `https://${platformDomain.hostname}` : `https://${tenant.slug}.${SITES_HOST}`
    },
    company: { id: company.id, display_name: company.display_name || company.legal_name },
    role: {
      admin: isAdmin,
      manage,
      owner: isOwner,
      label: isAdmin ? 'platform_admin' : (isOwner ? 'company_owner' : (manage ? 'website_manager' : 'viewer'))
    },
    readiness: { percent: readiness.percent, sections: clientSections, blockers: readiness.blockers, launch_ready: readiness.launch_ready },
    settings: settingsRow,
    review: {
      submitted_at: tenant.review_submitted_at || null,
      submitted_by_name: submittedByName,
      version: tenant.review_version || null,
      round: tenant.review_round || 0,
      approved_at: tenant.approved_at || null,
      approved_version: tenant.approved_version || null,
      stale
    },
    open_admin_notes: openNotes.filter(n => n.author_role === 'admin').length,
    open_notes_count: openNotes.length,
    domains: {
      platform_hostname: platformDomain ? platformDomain.hostname : `${tenant.slug}.${SITES_HOST}`,
      platform_status: platformDomain ? platformDomain.status : 'active',
      custom: customDomains.map(d => ({ hostname: d.hostname, status: d.status, verification_status: d.verification_status }))
    },
    allowed_transitions: allowedWorkflowTransitions(workflow),
    last_activity_at: tenant.last_activity_at || null
  };
  if (isOwner || isAdmin) {
    const invPage = await service.entities.WebsiteInvitation.filter({ website_tenant_id: tenant.id }, { limit: 100, sort: '-created_date' });
    payload.invitations = pageOf(invPage).map(inv => ({
      id: inv.id, email: inv.email, display_name: inv.display_name || null, status: inv.status,
      expires_at: inv.expires_at || null, email_sent: inv.email_sent === true
    }));
    const users = [];
    const seen = new Set();
    for (const uid of [company.primary_contact_user_id, ...(tenant.website_manager_user_ids || []), ...(tenant.member_user_ids || [])]) {
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      const u = await service.entities.User.get(uid).catch(() => null);
      if (u) users.push({ id: u.id, full_name: u.full_name || null, email: u.email || null, is_owner: uid === company.primary_contact_user_id, is_manager: (tenant.website_manager_user_ids || []).includes(uid) });
    }
    payload.collaborators = users;
  }
  return ok(payload);
}

// ═══════════════════════ REVIEW WORKFLOW (Parts 20/25/27/28/29) ══════════════

// Submit for review — admin OR authorized website manager. Client
// self-approval is impossible (approve is admin-only below).
async function submitForReview(service, user, tenant, company, body) {
  const freeze = requireLlbb(tenant);
  if (freeze) return jerr(freeze.error.code, freeze.error.message, freeze.error.status);
  const manage = assertWebsiteManagement(user, tenant, company);
  if (!manage.ok) return Response.json({ error: manage.error }, { status: manage.error.status || 403 });

  const { readiness, settingsRow } = await reviewContext(service, tenant);
  if (readiness.blockers.length > 0) {
    return Response.json({
      error: {
        code: 'setup_blockers',
        message: "Website isn't ready yet — complete these required items first",
        blockers: readiness.blockers.map(b => ({ key: b.key, label: b.label, reason: b.reason }))
      }
    }, { status: 409 });
  }

  const workflow = tenant.workflow_status || inferWorkflowFromTechnical(tenant.status);
  if (workflow === 'ready_for_review') return jerr('already_submitted', 'This website is already waiting for review', 409);
  if (workflow === 'approved') return jerr('already_approved', 'This website is already approved', 409);
  if (['live', 'suspended', 'archived'].includes(workflow)) {
    return jerr('invalid_state', 'This website is past the review stage', 409);
  }

  // Resubmission (Part 27): every open ADMIN note must be resolved or answered.
  const round = (tenant.review_round || 0);
  if (workflow === 'changes_requested') {
    const openAdmin = pageOf(await service.entities.WebsiteReviewNote.filter(
      { website_tenant_id: tenant.id, author_role: 'admin', status: 'open' }, { limit: 100 }));
    if (openAdmin.length > 0) {
      return Response.json({
        error: {
          code: 'unresolved_notes',
          message: 'Address the requested changes before resubmitting',
          open_notes: openAdmin.length
        }
      }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  if (workflow === 'draft') {
    const step = await applyWorkflow(service, tenant, user, 'setup_in_progress');
    if (step.error) return jerr(step.error.code, step.error.message, step.error.status);
    await logActivity(service, tenant, { actorUser: user, role: user.role === 'admin' ? 'admin' : 'client', action: 'setup_started' });
  }
  const settingsVersion = (settingsRow && settingsRow.settings_version) || 1;
  const step2 = await applyWorkflow(service, tenant, user, 'ready_for_review', {
    review_submitted_at: now,
    review_submitted_by: user.id,
    review_version: settingsVersion,
    review_round: round + 1
  });
  if (step2.error) return jerr(step2.error.code, step2.error.message, step2.error.status);
  const finalTenant = step2.tenant;

  await logActivity(service, tenant, {
    actorUser: user, role: user.role === 'admin' ? 'admin' : 'client',
    action: round > 0 ? 'review_resubmitted' : 'review_submitted',
    detail: `Review round ${round + 1} at settings version ${settingsVersion}`
  });
  await notifyPlatformAdmins(service, {
    title: round > 0 ? 'Website resubmitted for review' : 'Website submitted for review',
    message: `${tenant.name} (${company.display_name || company.legal_name}) is waiting for review — setup ${readiness.percent}%.`,
    linkPage: 'WebsiteManager', linkParams: `tenant=${tenant.id}&tab=review`
  });

  return ok({
    workflow_status: 'ready_for_review',
    review_round: finalTenant.review_round,
    review_version: finalTenant.review_version
  });
}

// Request changes (Part 25) — admin only, at least one note required.
async function requestChanges(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, company } = ctx;
  const freeze = requireLlbb(tenant);
  if (freeze) return jerr(freeze.error.code, freeze.error.message, freeze.error.status);
  const workflow = tenant.workflow_status || inferWorkflowFromTechnical(tenant.status);
  if (workflow !== 'ready_for_review' && workflow !== 'changes_requested') {
    return jerr('invalid_state', 'Changes can only be requested on a submitted website', 409);
  }
  const noteText = String(body.note || '').trim();
  if (!noteText) return jerr('note_required', 'At least one review note is required', 400);
  const section = typeof body.section === 'string' && body.section.length <= 60 ? body.section : null;

  const note = await service.entities.WebsiteReviewNote.create({
    website_tenant_id: tenant.id,
    company_id: tenant.company_id,
    section,
    author_user_id: user.id,
    author_display: user.full_name || user.email || 'EstateSalen',
    author_role: 'admin',
    body: noteText.slice(0, 4000),
    status: 'open',
    review_round: tenant.review_round || 1,
    member_user_ids: tenant.member_user_ids || []
  });

  if (workflow === 'ready_for_review') {
    const step = await applyWorkflow(service, tenant, user, 'changes_requested');
    if (step.error) return jerr(step.error.code, step.error.message, step.error.status);
  }
  await logActivity(service, tenant, {
    actorUser: user, role: 'admin', action: 'changes_requested', section,
    detail: noteText.slice(0, 200)
  });
  // Part 26 — canonical in-app notification to the client users. No direct
  // marketing-provider writes.
  await notifyUsers(service, [...(tenant.website_manager_user_ids || []), company.primary_contact_user_id], {
    title: 'Changes requested on your website',
    message: `The EstateSalen team requested changes on ${tenant.name}. Open your website to review them.`,
    linkPage: 'ClientWebsiteManager', linkParams: `tenant=${tenant.id}&tab=review`
  });
  return ok({ note_id: note.id, workflow_status: 'changes_requested' });
}

// Approve (Part 28) — admin only. Reruns required checks, refuses stale
// reviews, records the approved version. Approval NEVER publishes (Part 29).
async function approveWebsite(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, company } = ctx;
  const freeze = requireLlbb(tenant);
  if (freeze) return jerr(freeze.error.code, freeze.error.message, freeze.error.status);
  const workflow = tenant.workflow_status || inferWorkflowFromTechnical(tenant.status);
  if (workflow !== 'ready_for_review') {
    return jerr(workflow === 'approved' ? 'already_approved' : 'invalid_state',
      workflow === 'approved' ? 'This website is already approved' : 'Approval requires a current READY_FOR_REVIEW submission', 409);
  }
  if (!tenant.review_submitted_at || !tenant.review_version) {
    return jerr('not_submitted', 'No review submission on record', 409);
  }

  // Automated checks (Part 24): readiness + correct company/template + no
  // placeholders (readiness includes placeholder detection).
  const { readiness, settingsRow } = await reviewContext(service, tenant);
  if (readiness.blockers.length > 0) {
    return Response.json({
      error: {
        code: 'setup_blockers',
        message: 'Required checks failed — the website cannot be approved yet',
        blockers: readiness.blockers.map(b => ({ key: b.key, label: b.label, reason: b.reason }))
      }
    }, { status: 409 });
  }
  if (tenant.template_id && tenant.template_id !== 'operator_template_1') {
    return jerr('template_mismatch', 'Unknown template binding', 409);
  }
  const currentVersion = (settingsRow && settingsRow.settings_version) || 1;
  if (currentVersion > tenant.review_version) {
    // Part 21/28/48 — never approve stale content silently.
    return Response.json({
      error: {
        code: 'review_stale',
        message: 'The website changed after it was submitted for review — a refreshed review is required',
        reviewed_version: tenant.review_version,
        current_version: currentVersion
      }
    }, { status: 409 });
  }

  const now = new Date().toISOString();
  const step = await applyWorkflow(service, tenant, user, 'approved', {
    approved_at: now,
    approved_by: user.id,
    approved_version: currentVersion
  });
  if (step.error) return jerr(step.error.code, step.error.message, step.error.status);

  await logActivity(service, tenant, {
    actorUser: user, role: 'admin', action: 'review_approved',
    detail: `Approved at settings version ${currentVersion} (publication is a separate step)`
  });
  await notifyUsers(service, [...(tenant.website_manager_user_ids || []), company.primary_contact_user_id], {
    title: 'Website approved',
    message: `${tenant.name} passed review and is approved. Publication is a separate next step.`,
    linkPage: 'ClientWebsiteManager', linkParams: `tenant=${tenant.id}`
  });
  return ok({ workflow_status: 'approved', approved_version: currentVersion });
}

// ═══════════════════════ REVIEW NOTES (Parts 17/18/19) ═══════════════════════

async function addNote(service, user, tenant, company, body) {
  const manage = assertWebsiteManagement(user, tenant, company);
  if (!manage.ok) return Response.json({ error: manage.error }, { status: manage.error.status || 403 });
  const text = String(body.note || '').trim();
  if (!text) return jerr('note_required', 'A note is required', 400);
  const section = typeof body.section === 'string' && body.section.length <= 60 ? body.section : null;
  const role = user.role === 'admin' ? 'admin' : 'client';
  const note = await service.entities.WebsiteReviewNote.create({
    website_tenant_id: tenant.id,
    company_id: tenant.company_id,
    section,
    author_user_id: user.id,
    author_display: user.full_name || user.email || 'User',
    author_role: role,
    body: text.slice(0, 4000),
    status: 'open',
    review_round: tenant.review_round || null,
    member_user_ids: tenant.member_user_ids || []
  });
  await logActivity(service, tenant, { actorUser: user, role, action: 'review_note_added', section, detail: text.slice(0, 200) });
  if (role === 'admin') {
    await notifyUsers(service, [...(tenant.website_manager_user_ids || []), company.primary_contact_user_id], {
      title: 'New review note', message: `${tenant.name}: ${text.slice(0, 120)}`,
      linkPage: 'ClientWebsiteManager', linkParams: `tenant=${tenant.id}&tab=review`
    });
  } else {
    await notifyPlatformAdmins(service, {
      title: 'New client note', message: `${tenant.name}: ${text.slice(0, 120)}`,
      linkPage: 'WebsiteManager', linkParams: `tenant=${tenant.id}&tab=review`
    });
  }
  return ok({ note_id: note.id });
}

async function listNotes(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant } = ctx;
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });
  const page = await service.entities.WebsiteReviewNote.filter(
    { website_tenant_id: tenant.id }, { limit: 200, sort: '-created_date' });
  const notes = pageOf(page);
  const includeResolved = body.include_resolved === true;
  const rows = notes
    .filter(n => includeResolved || n.status !== 'resolved')
    .map(n => ({
      id: n.id, section: n.section || null, body: n.body,
      author_display: n.author_display || null, author_role: n.author_role || 'admin',
      status: n.status || 'open', review_round: n.review_round || null,
      response_text: n.response_text || null, response_by_user_id: n.response_by_user_id || null,
      response_at: n.response_at || null, resolved_at: n.resolved_at || null,
      created_date: n.created_date || null
    }));
  return ok({ notes: rows });
}

async function respondNote(service, user, tenant, company, body) {
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });
  const note = await service.entities.WebsiteReviewNote.get(body.note_id || '').catch(() => null);
  if (!note || note.website_tenant_id !== tenant.id) return jerr('note_not_found', 'Note not found for this website', 404);
  const text = String(body.response_text || '').trim();
  if (!text) return jerr('response_required', 'A response is required', 400);
  const updated = await service.entities.WebsiteReviewNote.update(note.id, {
    response_text: text.slice(0, 4000),
    response_by_user_id: user.id,
    response_at: new Date().toISOString()
  });
  const role = user.role === 'admin' ? 'admin' : 'client';
  await logActivity(service, tenant, { actorUser: user, role, action: 'review_note_responded', section: note.section || null, detail: text.slice(0, 200) });
  if (role === 'client') {
    await notifyPlatformAdmins(service, {
      title: 'Client responded to a review note', message: `${tenant.name}: ${text.slice(0, 120)}`,
      linkPage: 'WebsiteManager', linkParams: `tenant=${tenant.id}&tab=review`
    });
  } else {
    await notifyUsers(service, [...(tenant.website_manager_user_ids || []), company.primary_contact_user_id], {
      title: 'New response on a review note', message: `${tenant.name}: ${text.slice(0, 120)}`,
      linkPage: 'ClientWebsiteManager', linkParams: `tenant=${tenant.id}&tab=review`
    });
  }
  return ok({ note: { id: updated.id, response_text: updated.response_text, response_at: updated.response_at } });
}

async function resolveNote(service, user, tenant, company, body) {
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });
  const note = await service.entities.WebsiteReviewNote.get(body.note_id || '').catch(() => null);
  if (!note || note.website_tenant_id !== tenant.id) return jerr('note_not_found', 'Note not found for this website', 404);
  if (note.status === 'resolved') return jerr('already_resolved', 'This note is already resolved', 409);
  const updated = await service.entities.WebsiteReviewNote.update(note.id, {
    status: 'resolved',
    resolved_by_user_id: user.id,
    resolved_at: new Date().toISOString(),
    ...(body.resolution_text ? { response_text: String(body.resolution_text).slice(0, 4000), response_by_user_id: user.id, response_at: new Date().toISOString() } : {})
  });
  const role = user.role === 'admin' ? 'admin' : 'client';
  await logActivity(service, tenant, { actorUser: user, role, action: 'review_note_resolved', section: note.section || null, detail: (note.body || '').slice(0, 200) });
  if (role === 'client') {
    await notifyPlatformAdmins(service, {
      title: 'Review note resolved', message: `${tenant.name}: "${(note.body || '').slice(0, 100)}" was marked resolved.`,
      linkPage: 'WebsiteManager', linkParams: `tenant=${tenant.id}&tab=review`
    });
  }
  return ok({ note: { id: updated.id, status: updated.status, resolved_at: updated.resolved_at } });
}

async function manageAction(base44, service, user, body, action) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant, company } = ctx;
  if (action === 'submit_for_review') return await submitForReview(service, user, tenant, company, body);
  if (action === 'add_note') return await addNote(service, user, tenant, company, body);
  if (action === 'respond_note') return await respondNote(service, user, tenant, company, body);
  if (action === 'resolve_note') return await resolveNote(service, user, tenant, company, body);
  return jerr('unknown_action', 'Unknown action', 400);
}

// ═══════════════════════ ACTIVITY + ATTENTION (Parts 16/38/39) ═══════════════

async function activityList(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant } = ctx;
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });
  const limit = Math.min(Number(body.limit) || 50, 200);
  const page = await service.entities.WebsiteActivity.filter(
    { website_tenant_id: tenant.id }, { limit, sort: '-created_date' });
  return ok({
    activity: pageOf(page).map(a => ({
      id: a.id, action: a.action, section: a.section || null, detail: a.detail || null,
      actor_display: a.actor_display || null, actor_role: a.actor_role || 'client',
      created_date: a.created_date || null
    }))
  });
}

async function setManagementMode(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant } = ctx;
  const freeze = requireLlbb(tenant);
  if (freeze) return jerr(freeze.error.code, freeze.error.message, freeze.error.status);
  if (!['admin_managed', 'client_managed', 'collaborative'].includes(body.management_mode)) {
    return jerr('invalid_mode', 'management_mode must be admin_managed, client_managed or collaborative', 400);
  }
  const updated = await service.entities.WebsiteTenant.update(tenant.id, { management_mode: body.management_mode });
  await logActivity(service, tenant, { actorUser: user, role: 'admin', action: 'management_mode_changed', section: 'settings', detail: body.management_mode });
  return ok({ management_mode: updated.management_mode });
}

// Part 38 — the admin attention center. Buckets surface state without opening
// every tenant. Stalled detection uses last_activity_at (Part 39); reminders
// are NOT automated here (a future workflow can consume the same buckets).
async function attentionCenter(service, body) {
  const tenantPage = await service.entities.WebsiteTenant.filter({}, { limit: 500, sort: '-updated_date' });
  const tenants = pageOf(tenantPage).filter(t => t.status !== 'archived');
  const companyIds = [...new Set(tenants.map(t => t.company_id))];
  const companies = {};
  for (const cid of companyIds) {
    const c = await service.entities.Company.get(cid).catch(() => null);
    if (c) companies[cid] = c;
  }
  const invPage = await service.entities.WebsiteInvitation.filter({ status: { $in: ['pending', 'expired'] } }, { limit: 1000 });
  const invitations = pageOf(invPage);
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const BUCKETS = ['ready_for_review', 'resubmitted', 'changes_requested', 'ready_to_publish', 'waiting_for_client', 'client_started', 'invitation_expired', 'setup_stalled'];
  const buckets = {};
  for (const b of BUCKETS) buckets[b] = [];
  for (const t of tenants) {
    const company = companies[t.company_id] || null;
    const workflow = t.workflow_status || inferWorkflowFromTechnical(t.status);
    if (['live', 'suspended', 'archived'].includes(workflow)) continue;
    const row = {
      id: t.id, name: t.name,
      company: company ? (company.display_name || company.legal_name) : null,
      workflow_status: workflow,
      management_mode: t.management_mode || 'admin_managed',
      readiness_percent: null,
      last_activity_at: t.last_activity_at || null,
      days_idle: t.last_activity_at ? Math.floor((now - new Date(t.last_activity_at).getTime()) / DAY) : null,
      review_round: t.review_round || 0,
      review_submitted_at: t.review_submitted_at || null
    };
    const tInvs = invitations.filter(i => i.website_tenant_id === t.id);
    const pending = tInvs.filter(i => i.status === 'pending');
    const expired = tInvs.filter(i => i.status === 'expired');
    const idleDays = row.days_idle;
    if (workflow === 'ready_for_review') buckets[(t.review_round || 0) > 1 ? 'resubmitted' : 'ready_for_review'].push(row);
    else if (workflow === 'changes_requested') buckets.changes_requested.push(row);
    else if (workflow === 'approved') buckets.ready_to_publish.push(row);
    if (workflow === 'approved') continue; // approved sites only belong in one bucket
    if (expired.length > 0) buckets.invitation_expired.push(row);
    if (pending.length > 0 && ['draft', 'setup_in_progress'].includes(workflow) && t.management_mode !== 'admin_managed') buckets.waiting_for_client.push(row);
    if (['draft', 'setup_in_progress', 'changes_requested'].includes(workflow)
      && (!t.last_activity_at || idleDays >= STALL_DAYS)) buckets.setup_stalled.push(row);
    if (workflow === 'setup_in_progress' && t.last_activity_at && idleDays < STALL_DAYS
      && t.management_mode !== 'admin_managed' && pending.length === 0) buckets.client_started.push(row);
  }
  const counts = {};
  for (const b of BUCKETS) counts[b] = buckets[b].length;
  return ok({ buckets, counts });
}

// ═══════════════════════ CLIENT-SAFE SALES + LEADS (Parts 34/35/49/50) ═══════

// Read-only client view of canonical sales + publication state. Publish /
// unpublish and the publication-policy switch remain platform-admin actions
// (llbbAdmin). Operational Sale authority is NOT granted by website management.
async function clientSalesList(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant } = ctx;
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });

  const salePage = await service.entities.EstateSale.filter({ company_id: tenant.company_id }, { limit: 500, sort: '-updated_date' });
  const sales = pageOf(salePage);
  const tPubs = tenant.destination_id
    ? pageOf(await service.entities.Publication.filter({ destination_id: tenant.destination_id }, { limit: 1000 }))
    : [];
  const pubBySale = {};
  for (const p of tPubs) if (!pubBySale[p.sale_id]) pubBySale[p.sale_id] = p;

  const platformDomain = pageOf(await service.entities.WebsiteDomain.filter({ website_tenant_id: tenant.id }, { limit: 20 }))
    .find(d => d.domain_type === 'platform_subdomain' && d.status !== 'disconnected') || null;
  const siteBase = platformDomain ? `https://${platformDomain.hostname}` : null;

  const rows = sales.map(s => {
    const pub = pubBySale[s.id] || null;
    const visible = !!(pub && pub.status === 'published' && tenant.status === 'active' && s.status !== 'draft' && s.status !== 'archived');
    const thumbs = s.image_thumbnails || {};
    const thumbnail = (Object.values(thumbs)[0]) || ((s.images || [])[0] || {}).url || null;
    return {
      id: s.id, title: s.title, thumbnail,
      dates: s.sale_dates || [], status: s.status,
      publication: pub ? { status: pub.status, published_at: pub.published_at } : null,
      visible,
      website_url: visible && siteBase ? `${siteBase}/site/sale/${s.website_slug || s.id}` : null,
      updated_date: s.updated_date || null
    };
  });
  return ok({ auto_publish_enabled: tenant.auto_publish_enabled !== false, platform_hostname: siteBase, sales: rows });
}

async function clientLeadsList(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant } = ctx;
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });
  const leadPage = await service.entities.WebsiteLead.filter({ website_tenant_id: tenant.id }, { limit: 300, sort: '-created_date' });
  const leads = pageOf(leadPage);
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const within = (days) => leads.filter(l => l.created_date && (now - new Date(l.created_date).getTime()) <= days * DAY).length;
  const byType = {};
  for (const l of leads) byType[l.lead_type] = (byType[l.lead_type] || 0) + 1;
  return ok({
    summary: { today: within(1), this_week: within(7), this_month: within(30), total: leads.length, by_type: byType },
    recent: leads.slice(0, 100).map(l => ({
      id: l.id, lead_type: l.lead_type, service_requested: l.service_requested || null,
      name: [l.contact_first_name, l.contact_last_name].filter(Boolean).join(' ') || null,
      email: l.contact_email || null, phone: l.contact_phone || null,
      city: (l.property_info || {}).city || null, created_date: l.created_date || null,
      preferred_contact_method: l.preferred_contact_method || 'any', status: l.status || 'new'
    }))
  });
}

// Part 34 — WebsiteLead access is Company/tenant-scoped; cross-tenant ids
// resolve to nothing (the lead must belong to THIS website).
async function clientLeadDetail(service, user, body) {
  const ctx = await loadContext(service, body.website_tenant_id);
  if (ctx.error) return ctx.error;
  const { tenant } = ctx;
  const access = assertTenantAccess(user, tenant);
  if (!access.ok) return Response.json({ error: access.error }, { status: access.error.status || 403 });
  const lead = await service.entities.WebsiteLead.get(body.lead_id || '').catch(() => null);
  if (!lead || lead.website_tenant_id !== tenant.id) return jerr('forbidden', 'Lead does not belong to this website', 403);
  const photos = [];
  for (const uri of (lead.photo_file_uris || []).slice(0, 8)) {
    try {
      const r = await service.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 });
      photos.push({ uri, signed_url: (r && r.signed_url) || null });
    } catch (e) {
      photos.push({ uri, signed_url: null });
    }
  }
  let saleTitle = null;
  if (lead.sale_id) {
    const s = await service.entities.EstateSale.get(lead.sale_id).catch(() => null);
    if (s && s.company_id === tenant.company_id) saleTitle = s.title;
  }
  return ok({
    lead: {
      id: lead.id, lead_type: lead.lead_type, service_requested: lead.service_requested || null,
      timeline: lead.timeline || null, property_info: lead.property_info || {},
      preferred_contact_method: lead.preferred_contact_method || 'any',
      contact_first_name: lead.contact_first_name, contact_last_name: lead.contact_last_name,
      contact_email: lead.contact_email, contact_phone: lead.contact_phone,
      message: lead.message, status: lead.status,
      marketing_opt_in: !!lead.marketing_opt_in, vip_opt_in: !!lead.vip_opt_in, sms_opt_in: !!lead.sms_opt_in,
      consent_captured_at: lead.consent_captured_at || null,
      source_url: lead.source_url || null, created_date: lead.created_date || null,
      sale_title: saleTitle, photos
    }
  });
}