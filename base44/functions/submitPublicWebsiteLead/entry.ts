// PUBLIC website lead ingestion seam (Phase 3D.1 + Phase 4C extensions).
// Phase 4C: canonical WebsiteLead gains STRUCTURED seller-funnel fields
// (service_requested, property_info, timeline, preferred_contact_method) and
// PRIVATE seller photo URIs — still ONE canonical lead entity, no parallel
// lead entities. Attribution, consent discipline and outbox behavior unchanged.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveWebsiteTenant, getPublishedSales } from '../../shared/websiteRuntimeService.ts';
import { enqueueActivity, resolveMasterUserID } from '../../shared/identityActivityOutbox.ts';

const MVP_LEAD_TYPES = ['seller_inquiry', 'contact', 'sale_question'];
const SERVICES = ['estate_sale', 'downsizing', 'cleanout', 'probate_estate', 'moving', 'consignment', 'real_estate', 'valuation', 'not_sure', 'other'];
const TIMELINES = ['asap', 'within_30_days', '1_to_3_months', '3_plus_months', 'researching'];
const CONTACT_METHODS = ['any', 'email', 'phone', 'text'];
const MAX_PHOTOS = 8;
const URI_MAX = 512;

function err(code, message, status) {
  return Response.json({ error: { code, message: message || code } }, { status: status || 400 });
}

const str = (v, max) => {
  const s = String(v == null ? '' : v).trim();
  return s ? s.slice(0, max || 200) : null;
};

// Public-safe structured seller capture (Part 15/16) — validated server-side.
function sanitizePropertyInfo(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return {
    city: str(raw.city, 100),
    state: str(raw.state, 50),
    zip: str(raw.zip, 20),
    property_type: str(raw.property_type, 60),
    approx_size: str(raw.approx_size, 60),
    occupancy: str(raw.occupancy, 40),
    situation: str(raw.situation, 2000)
  };
}

// Seller photos were uploaded by the form to PRIVATE storage via
// UploadPrivateFile. Only private-storage URIs are accepted; public URLs are
// rejected so private inquiry photos can never leak into public rendering.
function sanitizePhotoUris(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(u => typeof u === 'string' && u.length > 0 && u.length <= URI_MAX && !/^https?:\/\//i.test(u))
    .slice(0, MAX_PHOTOS);
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
    // to nothing; forged Sale IDs cannot attach to another Company.
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
    // form submission. Marketing/SMS flags are independent of the inquiry.
    const marketing = body.marketing_opt_in === true;
    const sms = body.sms_opt_in === true;
    const anyConsent = marketing || sms;

    // Phase 4C structured fields — controlled vocabulary, server-validated.
    const serviceRequested = body.service_requested == null ? null
      : (SERVICES.includes(body.service_requested) ? body.service_requested : 'other');
    const timeline = body.timeline == null ? null
      : (TIMELINES.includes(body.timeline) ? body.timeline : null);
    const contactMethod = CONTACT_METHODS.includes(body.preferred_contact_method)
      ? body.preferred_contact_method : 'any';

    const created = await service.entities.WebsiteLead.create({
      company_id: ctx.company.id,        // derived server-side from the tenant
      website_tenant_id: ctx.tenant.id,  // derived server-side from the hostname
      sale_id: sale ? sale.id : null,
      lead_type: leadType,
      request_id: str(body.request_id, 100),
      service_requested: serviceRequested,
      property_info: sanitizePropertyInfo(body.property_info),
      timeline,
      preferred_contact_method: contactMethod,
      photo_file_uris: sanitizePhotoUris(body.photo_file_uris),
      contact_first_name: str(body.contact_first_name, 100),
      contact_last_name: str(body.contact_last_name, 100),
      contact_email: email,
      contact_phone: str(body.contact_phone, 40),
      message: message.slice(0, 5000),
      source: 'operator_website',
      source_url: str(body.source_url, 500),
      referrer: str(body.referrer, 500),
      status: 'new',
      marketing_opt_in: marketing,
      vip_opt_in: false,
      sms_opt_in: sms,
      consent_captured_at: anyConsent ? new Date().toISOString() : null,
      member_user_ids: ctx.tenant.member_user_ids || []
    });

    // Part 34 — durable event via the existing outbox architecture. No direct
    // Customer.io writes anywhere in this path.
    //
    // Canonical lead event mapping (Phase 3D.4): every supported website lead
    // maps to the ONE canonical inquiry event ('seller_inquiry') with the
    // exact WebsiteLead.lead_type preserved as relationship_type so downstream
    // marketing can distinguish. No new vocabulary entries, no registry gaps.
    const masterUserID = await resolveMasterUserID(base44, { email });
    await enqueueActivity(base44, {
      request_id: str(body.request_id, 100) || undefined,
      masterUserID,
      event_type: 'seller_inquiry',
      identity_context: {
        email,
        first_name: created.contact_first_name,
        last_name: created.contact_last_name,
        phone: created.contact_phone
      },
      product_context: sale
        ? { product_id: sale.id, relationship_type: leadType }
        : { relationship_type: leadType, service_requested: serviceRequested },
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
        service_requested: serviceRequested,
        timeline,
        property_city: (created.property_info || {}).city || null,
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