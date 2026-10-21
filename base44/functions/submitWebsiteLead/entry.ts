// WebsiteLead submission seam (Phase 3B).
// In 3B this is the OPERATOR/AUTHENTICATED seam: invariants, attribution and
// explicit-consent model are certified here. The PUBLIC ingestion mode is
// deliberately disabled (returns 401 with public_ingestion_not_enabled) until
// the Phase 3 runtime provides the trusted tenant-resolution boundary.
// Invariants enforced server-side: company_id is ALWAYS derived from the
// website tenant (client value ignored); sale ownership must match the tenant's
// Company; consent is explicit-only (never inferred from submission).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { bridgeSellerInquiry, websiteLeadToBridgeInput, resolveCompanyOperator } from '../../shared/sellerInquiryBridge.ts';

const LEAD_TYPES = ['seller_inquiry', 'contact', 'vip_signup', 'sale_question', 'consultation_request'];

function err(code, message, status) {
  return Response.json({ error: { code, message: message || code } }, { status: status || 400 });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      // Public seam boundary — designed, intentionally closed in Phase 3B.
      return err('public_ingestion_not_enabled', 'Public website lead ingestion is not enabled yet', 401);
    }
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const leadType = body.lead_type;
    if (!LEAD_TYPES.includes(leadType)) return err('invalid_lead_type', `lead_type must be one of: ${LEAD_TYPES.join(', ')}`, 400);

    const tenantPage = await service.entities.WebsiteTenant.filter({ id: body.website_tenant_id }, { limit: 1 });
    const tenant = (tenantPage.items || tenantPage)[0];
    if (!tenant) return err('tenant_not_found', 'Website tenant not found', 404);
    if (tenant.status === 'archived') return err('tenant_archived', 'Archived tenants do not accept leads', 409);

    // Attribution: company_id derived from tenant; client company_id IGNORED.
    const companyId = tenant.company_id;

    // Sale invariant: a referenced Sale must belong to the tenant's Company.
    if (body.sale_id) {
      const salePage = await service.entities.EstateSale.filter({ id: body.sale_id }, { limit: 1 });
      const sale = (salePage.items || salePage)[0];
      if (!sale) return err('sale_not_found', 'Referenced sale not found', 404);
      if (sale.company_id !== companyId) {
        return err('cross_company_sale', 'Referenced sale belongs to a different Company — lead denied', 403);
      }
    }

    // Explicit consent only — recorded verbatim; never inferred.
    const marketing = body.marketing_opt_in === true;
    const vip = body.vip_opt_in === true;
    const sms = body.sms_opt_in === true;
    const anyConsent = marketing || vip || sms;

    const email = String(body.contact_email || '').trim().toLowerCase();
    if (!email && leadType !== 'sale_question') {
      return err('contact_email_required', 'A contact email is required for this lead type', 400);
    }

    const created = await service.entities.WebsiteLead.create({
      company_id: companyId,
      website_tenant_id: tenant.id,
      sale_id: body.sale_id || null,
      lead_type: leadType,
      contact_first_name: String(body.contact_first_name || '').trim() || null,
      contact_last_name: String(body.contact_last_name || '').trim() || null,
      contact_email: email || null,
      contact_phone: String(body.contact_phone || '').trim() || null,
      message: String(body.message || '').trim() || null,
      source: 'operator_website',
      source_url: String(body.source_url || '').trim() || null,
      referrer: String(body.referrer || '').trim() || null,
      status: 'new',
      marketing_opt_in: marketing,
      vip_opt_in: vip,
      sms_opt_in: sms,
      consent_captured_at: anyConsent ? new Date().toISOString() : null,
      member_user_ids: tenant.member_user_ids || []
    });

    // Event-compatible attribution for the future outbox path (no Customer.io writes).
    const outboxAttribution = {
      company_id: companyId,
      website_tenant_id: tenant.id,
      sale_id: body.sale_id || null,
      lead_type: leadType,
      source: 'operator_website',
      consent: { marketing, vip, sms, captured_at: created.consent_captured_at }
    };

    return Response.json({ ok: true, lead: created, event_attribution: outboxAttribution });
  } catch (error) {
    console.error('submitWebsiteTenantLead error:', error && error.message);
    return err('internal_error', 'Unexpected error', 500);
  }
}