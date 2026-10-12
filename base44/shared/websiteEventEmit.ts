// Phase 4E (Parts 32/33/35) — canonical lead funnel analytics events.
// seller_lead / buyer_signup are recorded ONLY here, at the moment a canonical
// WebsiteLead is actually created — attribution is server-derived from the
// resolved tenant, never client-supplied. Analytics failures never break lead
// capture.
export async function emitLeadFunnelEvent(service, ctx, eventType, opts = {}) {
  try {
    await service.entities.WebsiteEvent.create({
      website_tenant_id: ctx.tenant.id,
      company_id: ctx.company.id,
      event_type: eventType,
      hostname: ctx.hostname,
      page: opts.page || null,
      sale_public_id: opts.sale_public_id || null,
      member_user_ids: ctx.tenant.member_user_ids || []
    });
  } catch (e) {
    console.error('[websiteEventEmit] event not recorded:', e && e.message);
  }
}