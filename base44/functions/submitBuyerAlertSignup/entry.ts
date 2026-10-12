// PUBLIC buyer alert signup seam (Phase 4C — Parts 22/23/24/25/26/42).
// "Never Miss an Estate Sale" capture on operator websites.
//
// Canonical reuse (Part 23): the buyer identity is the EXISTING canonical
// ConsumerMarketingProfile (upsert by email) — never a new buyer database.
// VIP seam (Part 24): profile.vip_alerts_opt_in is the established VIP/
// presale consent field; identity flows through the canonical masterUserID
// resolution in the durable outbox. No direct Customer.io writes (Part 26).
//
// Attribution: hostname → WebsiteTenant → Company derived server-side.
// Consent (Part 25): sale-alerts consent is the explicit purpose of the form
// (must be checked); marketing and SMS consent are separate and never
// pre-checked or inferred. Existing opt-ins are NEVER downgraded.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveWebsiteTenant } from '../../shared/websiteRuntimeService.ts';
import { emitLeadFunnelEvent } from '../../shared/websiteEventEmit.ts';
import { enqueueActivity, resolveMasterUserID } from '../../shared/identityActivityOutbox.ts';

const INTERESTS = ['furniture', 'jewelry', 'vintage', 'coins', 'tools', 'vehicles', 'art', 'collectibles', 'designer', 'electronics', 'household', 'other'];

function err(code, message, status) {
  return Response.json({ error: { code, message: message || code } }, { status: status || 400 });
}

const str = (v, max) => {
  const s = String(v == null ? '' : v).trim();
  return s ? s.slice(0, max || 200) : null;
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const qp = new URL(req.url).searchParams;
    const routedHost = req.headers.get('x-forwarded-host') || null;
    const hostname = String(body.hostname || qp.get('hostname') || routedHost || '').trim().toLowerCase();
    if (!hostname) return err('hostname_required', 'Hostname required', 400);

    const ctx = await resolveWebsiteTenant(service, hostname);
    if (!ctx.ok) {
      console.error(`[submitBuyerAlertSignup] resolution denied (${ctx.error})`);
      if (ctx.error === 'unknown_host') return err('unknown_host', 'Unknown website', 404);
      if (ctx.error === 'malformed_host') return err('malformed_host', 'Malformed hostname', 400);
      return err('site_unavailable', 'Website unavailable', 503);
    }

    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return err('email_required', 'A valid email is required', 400);
    }
    // Part 25 — the alert consent checkbox IS the product; explicit only.
    const alerts = body.alerts_opt_in === true;
    if (!alerts) return err('consent_required', 'Please confirm you would like sale alerts', 400);
    const marketing = body.marketing_opt_in === true; // separate, optional, never pre-checked
    const sms = body.sms_opt_in === true;             // separate, optional, never pre-checked
    const radius = Number(body.preferred_radius_miles);
    const interests = Array.isArray(body.interest_categories)
      ? body.interest_categories.filter(i => INTERESTS.includes(i)).slice(0, 12)
      : [];

    // Canonical buyer identity: find-or-create ConsumerMarketingProfile by
    // email. Existing consent is never downgraded; only explicit new consent
    // upgrades a flag.
    const existingPage = await service.entities.ConsumerMarketingProfile.filter({ email }, { limit: 5 });
    const existing = (existingPage.items || existingPage)[0] || null;
    let profile;
    const now = new Date().toISOString();
    if (existing) {
      profile = await service.entities.ConsumerMarketingProfile.update(existing.id, {
        estate_sale_alerts_opt_in: existing.estate_sale_alerts_opt_in === true ? true : alerts,
        global_marketing_opt_in: existing.global_marketing_opt_in === true ? true : marketing,
        vip_alerts_opt_in: existing.vip_alerts_opt_in === true ? true : alerts,
        phone: str(body.phone, 40) || existing.phone || null,
        zip_code: str(body.zip_code, 20) || existing.zip_code || null,
        preferred_radius_miles: Number.isFinite(radius) && radius > 0 ? radius : (existing.preferred_radius_miles || 25),
        interest_categories: interests.length > 0 ? interests : (existing.interest_categories || []),
        updated_at: now
      });
    } else {
      profile = await service.entities.ConsumerMarketingProfile.create({
        email,
        first_name: str(body.first_name, 100),
        phone: str(body.phone, 40),
        zip_code: str(body.zip_code, 20),
        preferred_radius_miles: Number.isFinite(radius) && radius > 0 ? radius : 25,
        interest_categories: interests,
        estate_sale_alerts_opt_in: alerts,
        global_marketing_opt_in: marketing,
        vip_alerts_opt_in: alerts,
        source: 'operator_page',
        created_at: now,
        updated_at: now
      });
    }

    // Tenant-visible capture record: the ONE canonical WebsiteLead
    // (vip_signup). Safe-replay idempotency via request_id (Part 40).
    const requestId = str(body.request_id, 100) || null;
    if (requestId) {
      const dupPage = await service.entities.WebsiteLead.filter(
        { website_tenant_id: ctx.tenant.id, request_id: requestId }, { limit: 1 });
      if ((dupPage.items || dupPage).length > 0) {
        return Response.json({ ok: true, lead_id: (dupPage.items || dupPage)[0].id, replayed: true });
      }
    }
    const anyConsent = alerts || marketing || sms;
    const created = await service.entities.WebsiteLead.create({
      company_id: ctx.company.id,
      website_tenant_id: ctx.tenant.id,
      lead_type: 'vip_signup',
      request_id: requestId,
      contact_first_name: str(body.first_name, 100),
      contact_email: email,
      contact_phone: str(body.phone, 40),
      message: `Buyer alert signup — interests: ${interests.join(', ') || 'none'}`,
      source: 'operator_website',
      source_url: str(body.source_url, 500),
      referrer: str(body.referrer, 500),
      status: 'new',
      marketing_opt_in: marketing,
      vip_opt_in: alerts,
      sms_opt_in: sms,
      consent_captured_at: anyConsent ? now : null,
      member_user_ids: ctx.tenant.member_user_ids || []
    });

    // Durable canonical event — 'vip_signup' is in the FROZEN v1.6.0
    // vocabulary (canonicalContract). No registry gap, no direct write.
    const masterUserID = await resolveMasterUserID(base44, { email });
    await enqueueActivity(base44, {
      request_id: requestId || undefined,
      masterUserID,
      event_type: 'vip_signup',
      identity_context: { email, first_name: profile.first_name || null, phone: profile.phone || null },
      product_context: { relationship_type: 'vip_signup', product_id: 'operator_website_alerts' },
      consent_context: { marketing, sms, alerts, explicit: true, captured_at: now },
      payload: {
        company_id: ctx.company.id,
        website_tenant_id: ctx.tenant.id,
        profile_id: profile.id,
        lead_record_id: created.id,
        interests,
        zip_code: profile.zip_code || null,
        preferred_radius_miles: profile.preferred_radius_miles || null,
        source: 'operator_website'
      }
    });

    // Phase 4E (Parts 32/35) — canonical signup ⇄ analytics linkage.
    await emitLeadFunnelEvent(service, ctx, 'buyer_signup', {});
    return Response.json({ ok: true, lead_id: created.id });
  } catch (error) {
    console.error('submitBuyerAlertSignup error:', error && error.message);
    return err('internal_error', 'Unexpected error', 500);
  }
}