// PUBLIC website lead ingestion seam (Phase 3D.1 — Parts 30-34).
// Phase 3B kept the public seam closed; the certified 3C runtime now provides
// the trusted tenant-resolution boundary, so this function opens it SAFELY:
//   request hostname → WebsiteTenant → Company  (clients NEVER supply
//   company_id / website_tenant_id — always derived server-side)
//   sale attribution resolved ONLY among publication-visible sales of the
//   hostname-resolved Company (cross-tenant attribution impossible)
//   consent is EXPLICIT only — form submission never implies consent
//   events go to the durable IdentityActivityOutbox — NO direct Customer.io
//   writes (guarded by existing architecture)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveWebsiteTenant, getPublishedSales } from '../../shared/websiteRuntimeService.ts';
import { enqueueActivity, resolveMasterUserID } from '../../shared/identityActivityOutbox.ts';

const MVP_LEAD_TYPES = ['seller_inquiry', 'contact', 'sale_question'];

function err(code, message, status) {
  return Response.json({ error: { code, message: message || code } }, { status: status || 400 });
}

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
      console.error(`[submitPublicWebsiteLead] resolution denied (${ctx.error})`);
      if (ctx.error === 'unknown_host') return err('unknown_host', 'Unknown website', 404);
      if (ctx.error === 'malformed_host') return err('malformed_host', 'Malformed hostname', 400);
      return err('site_unavailable', 'Website unavailable', 503); // neutral — never leak lifecycle reasons
    }

    const leadType = body.lead_type;
    if (!MVP_LEAD_TYPES.includes(leadType)) {
      return err('invalid_lead_type', `lead_type must be one of: ${MVP_LEAD_TYPES.join(', ')}`, 400);
    }

    // Part 32 — sale attribution resolved ONLY within the hostname-resolved
    // Company's publication-visible sales. A cross-tenant identifier resolves
    // to nothing.
    let sale = null;
    if (leadType === 'sale_question' || body.sale) {
      const wanted = String(body.sale || '').trim().toLowerCase();
      if (!wanted) return err('sale_required', 'A sale reference is required for this lead type', 400);
      const sales = await getPublishedSales(service, ctx);
      const match = sales.find(s => s._raw && (
        (s._raw.website_slug || '').toLowerCase() === wanted ||
        (s._raw.seo_slug || '').toLowerCase() === wanted ||
        s._raw.id === body.sale));
      if (!match) return err('sale_not_found', 'Referenced sale not found on this website', 404);
      sale = match._raw;
    }

    const email = String(body.contact_email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return err('contact_email_required', 'A valid contact email is required', 400);
    }
    const message = String(body.message || '').trim();
    if (!message) return err('message_required', 'A message is required', 400);

    // Part 33 — explicit consent only, recorded verbatim. NEVER inferred from
    // form submission.
    const marketing = body.marketing_opt_in === true;
    const sms = body.sms_opt_in === true;
    const anyConsent = marketing || sms;

    const created = await service.entities.WebsiteLead.create({
      company_id: ctx.company.id,        // derived server-side from the tenant
      website_tenant_id: ctx.tenant.id,  // derived server-side from the hostname
      sale_id: sale ? sale.id : null,
      lead_type: leadType,
      contact_first_name: String(body.contact_first_name || '').trim() || null,
      contact_last_name: String(body.contact_last_name || '').trim() || null,
      contact_email: email,
      contact_phone: String(body.contact_phone || '').trim() || null,
      message,
      source: 'operator_website',
      source_url: String(body.source_url || '').trim() || null,
      referrer: String(body.referrer || '').trim() || null,
      status: 'new',
      marketing_opt_in: marketing,
      vip_opt_in: false, // NO VIP expansion in Phase 3D.1
      sms_opt_in: sms,
      consent_captured_at: anyConsent ? new Date().toISOString() : null,
      member_user_ids: ctx.tenant.member_user_ids || []
    });

    // Part 34 — durable event via the existing outbox architecture. Canonical
    // vocabulary names deliver; anything else quarantines as registry_gap for
    // admin review (never delivered, never retried, payload stripped). No
    // direct Customer.io writes anywhere in this path.
    const masterUserID = await resolveMasterUserID(base44, { email });
    await enqueueActivity(base44, {
      masterUserID,
      event_type: leadType === 'seller_inquiry' ? 'seller_inquiry' : 'website_lead',
      identity_context: {
        email,
        first_name: created.contact_first_name,
        last_name: created.contact_last_name,
        phone: created.contact_phone
      },
      product_context: sale ? { product_id: sale.id, relationship_type: 'sale_question' } : {},
      consent_context: {
        marketing,
        sms,
        explicit: true,
        captured_at: created.consent_captured_at
      },
      payload: {
        company_id: ctx.company.id,
        website_tenant_id: ctx.tenant.id,
        sale_id: sale ? sale.id : null,
        lead_type: leadType,
        source: 'operator_website',
        source_url: created.source_url,
        lead_record_id: created.id
      }
    });

    return Response.json({ ok: true, lead_id: created.id });
  } catch (error) {
    console.error('submitPublicWebsiteLead error:', error && error.message);
    return err('internal_error', 'Unexpected error', 500);
  }
}