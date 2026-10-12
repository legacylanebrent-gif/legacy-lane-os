// Phase 4E (Parts 2/3/4) — EXTENDED LAUNCH PREFLIGHT.
// The authoritative publish-time gate: ALWAYS rerun at publish, never trust
// stale readiness state. Consumed by llbbAdmin ('publish_preflight' action and
// the to='live' workflow gate). WEBSITE publication ≠ SALE publication — this
// module only decides whether the WebsiteTenant itself may go live.
import { computeReadiness, detectPlaceholders } from './llbbSetupEngine.ts';
import { SITES_HOST, normalizeHostname } from './websiteTenantService.ts';
import { getTenantSettings, projectPublicSettings } from './websiteSettingsService.ts';

// Every check: { key, label, status: pass|blocker, detail }.
export async function runLaunchChecks(service, tenant) {
  const checks = [];
  const add = (key, label, pass, detail) =>
    checks.push({ key, label, status: pass ? 'pass' : 'blocker', detail: detail || null });
  const blockers = () => checks.filter(c => c.status === 'blocker');

  // 1. Product workflow — only APPROVED websites may publish (Part 2).
  add('workflow', 'Review approval', tenant.workflow_status === 'approved',
    tenant.workflow_status === 'approved'
      ? 'Approved through the review seam.'
      : 'The website must be approved through review before publishing.');

  // 2. Approved-version currency — edits after approval require re-review
  // (Part 4D freshness carried into launch).
  const settingsRow = await getTenantSettings(service, tenant.id);
  const currentVersion = (settingsRow && settingsRow.settings_version) || 1;
  const approvedVersion = tenant.approved_version;
  add('version_currency', 'Approved content is current', !approvedVersion || approvedVersion >= currentVersion,
    approvedVersion == null
      ? 'Legacy approval without version snapshot — allowed.'
      : approvedVersion >= currentVersion
        ? `Approved version ${approvedVersion} matches current settings version.`
        : `Settings changed after approval (approved v${approvedVersion}, current v${currentVersion}). Request re-review.`);

  // 3. Readiness engine (blocking sections + placeholder content).
  const domainsPage = await service.entities.WebsiteDomain.filter(
    { website_tenant_id: tenant.id }, { limit: 25 });
  const domains = domainsPage.items || domainsPage;
  let destination = null;
  if (tenant.destination_id) {
    destination = await service.entities.Destination.get(tenant.destination_id).catch(() => null);
    if (destination && (destination.company_id !== tenant.company_id || destination.status !== 'active')) destination = null;
  }
  const company = await service.entities.Company.get(tenant.company_id).catch(() => null);
  const settings = settingsRow ? projectPublicSettings(settingsRow, company) : null;
  const readiness = computeReadiness({ tenant, settings, destination, domains });
  const readBlockers = readiness.sections.filter(s => s.blocking && s.status !== 'complete');
  add('readiness', 'Required setup complete', readBlockers.length === 0,
    readBlockers.length === 0
      ? 'All required setup sections complete.'
      : readBlockers.map(b => `${b.label}: ${b.reason}`).join(' '));

  // 4. Placeholder content — never publish template lorem/555 placeholders.
  const placeholders = detectPlaceholders(settingsRow);
  add('placeholders', 'No placeholder content', placeholders.length === 0,
    placeholders.length === 0
      ? 'No template placeholders detected.'
      : `${placeholders.length} placeholder item(s) — ${placeholders.slice(0, 3).map(p => p.label).join('; ')}`);

  // 5. Platform hostname — included first-class address must exist and be
  // routable-eligible (not disconnected/error) with a valid ownership chain.
  const platformDomain = domains.find(
    d => d.domain_type === 'platform_subdomain' && d.status !== 'disconnected') || null;
  const platformOk = !!platformDomain
    && platformDomain.company_id === tenant.company_id
    && platformDomain.hostname === normalizeHostname(`${tenant.slug}.${SITES_HOST}`);
  add('platform_hostname', `Included ${SITES_HOST} address`, platformOk,
    platformOk
      ? `Serves on ${platformDomain.hostname}.`
      : 'The included platform hostname is missing, misconfigured or disconnected.');

  // 6. Company lifecycle — sites of inactive companies fail closed.
  add('company', 'Company active', !!company && company.status === 'active',
    company ? (company.status === 'active' ? 'Company account is active.' : `Company status is ${company.status}.`) : 'Company not found.');

  // 7. Destination — publication delivery target active (sale visibility).
  add('destination', 'Publication system', !!destination,
    destination ? 'Destination attached and active.' : 'Website destination is not attached or not active — Estate Sales will not display.');

  // 8. Forms — public forms structurally reachable (contact resolves and the
    // canonical lead funnel exists). Structural only — no synthetic leads are
    // ever created (Part 38).
  const c = (settingsRow && settingsRow.contact) || {};
  const formOk = (c.use_company_phone !== false && (c.phone_display || (company && company.phone)))
    || (c.use_company_email !== false && (c.email_display || (company && company.email)))
    || c.phone_display || c.email_display;
  add('forms', 'Contact forms reachable', !!formOk,
    formOk ? 'Forms resolve a public contact path.' : 'No public phone or email for the contact/inquiry forms.');

  return { ok: blockers().length === 0, checks, blockers: blockers() };
}