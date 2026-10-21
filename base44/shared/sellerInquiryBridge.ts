// Chapter 10 P1 — inquiry → canonical seller opportunity bridge.
// The ONE shared path every seller-inquiry seam uses to create or link the
// canonical SaleConversionPipeline opportunity WITHOUT retyping known facts.
//
// Doctrines enforced here:
// - Creating a CRM opportunity NEVER grants marketing consent. Consent lives
//   only on the source inquiry record, where it was explicitly captured.
// - Identity matching is EXACT ONLY (normalized email / existing links).
//   No fuzzy merging. If uncertain, records stay separate.
// - UNKNOWN stays UNKNOWN — missing values are never manufactured.
// - Provenance is preserved: source system, source record id, inquiry time.
// - New inquiries seed a deterministic first next action ("Respond to seller
//   inquiry") — never an AI-invented one.

export const TERMINAL_STAGES = ['completed', 'lost', 'referred'];

const normEmail = (v) => {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  return s || null;
};

// Resolve the accountable operator user for a Company (Chapter 10 P1 ownership).
export async function resolveCompanyOperator(service, companyId) {
  if (!companyId) return null;
  const page = await service.entities.Company.filter({ id: companyId }, { limit: 1 });
  const company = (page.items || page)[0];
  if (!company) return null;
  if (company.primary_contact_user_id) return company.primary_contact_user_id;
  const members = company.member_user_ids || [];
  return members[0] || null;
}

// Exact-identity replay protection: an existing OPEN opportunity for the same
// person is returned, never duplicated.
async function findOpenDeal(service, operatorId, email) {
  if (!email) return null;
  const page = await service.entities.SaleConversionPipeline.filter(
    { operator_id: operatorId, client_email: email });
  const deals = page.items || page;
  return (deals || []).find(d => !TERMINAL_STAGES.includes(d.stage) && d.stage !== 'nurture') || null;
}

// Exact email match against the operator's own contacts; otherwise create the
// canonical person record. Never fuzzy-merged.
async function findOrCreateContact(service, operatorId, client, inquirySourceType) {
  const email = normEmail(client.email);
  if (email) {
    const page = await service.entities.Contact.filter({ email });
    const contacts = page.items || page;
    const mine = (contacts || []).find(c => c.created_by_id === operatorId || c.assigned_to === operatorId);
    if (mine) return { id: mine.id, created: false };
  }
  const created = await service.entities.Contact.create({
    first_name: client.first_name || 'Unknown',
    last_name: client.last_name || '',
    email: email,
    phone: client.phone || null,
    roles: ['seller'],
    lead_source: inquirySourceType === 'professional_referral' ? 'referral' : 'organic',
    assigned_to: operatorId,
    status: 'new',
    notes: 'Created automatically from a seller inquiry (Chapter 10 P1 inquiry bridge).',
  });
  return { id: created.id, created: true };
}

// Smallest EXISTING notification architecture: in-app Notification records.
export async function notifyUsersOfInquiry(service, { userIds, dealId, clientName, city, sourceLabel }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return;
  const label = clientName || 'A seller';
  const where = city ? ` (${city})` : '';
  await Promise.allSettled(ids.map(user_id =>
    service.entities.Notification.create({
      user_id,
      type: 'new_seller_inquiry',
      title: 'New Seller Inquiry',
      message: `${label}${where} submitted a seller inquiry via ${sourceLabel}. Open the pipeline to respond — speed to lead matters.`,
      read: false,
      link_to_page: 'SaleConversionPipeline',
      related_entity_type: 'SaleConversionPipeline',
      related_entity_id: dealId,
    })
  ));
}

// Bridge a seller inquiry into the canonical opportunity record.
// Returns { ok, deal_id, created, replayed, contact_id }.
export async function bridgeSellerInquiry(service, input) {
  const email = normEmail(input.client && input.client.email);
  const operatorId = input.operator_id;
  if (!operatorId) return { ok: false, error: 'operator_unresolved' };

  const open = await findOpenDeal(service, operatorId, email);
  if (open) {
    return { ok: true, deal_id: open.id, created: false, replayed: true, contact_id: open.client_contact_id || null };
  }

  const contact = await findOrCreateContact(service, operatorId, input.client, input.source.inquiry_source_type);

  const receivedAt = input.source.inquiry_received_at || new Date().toISOString();
  const deal = await service.entities.SaleConversionPipeline.create({
    operator_id: operatorId,
    client_name: [input.client.first_name, input.client.last_name].filter(Boolean).join(' ') || 'Unnamed Seller',
    client_email: email,
    client_phone: (input.client && input.client.phone) || null,
    client_contact_id: contact.id,
    property_address: (input.property && input.property.address) || null,
    property_city: (input.property && input.property.city) || null,
    property_state: (input.property && input.property.state) || null,
    situation: input.situation || null,
    stage: 'new_lead',
    notes: input.notes || null,
    // Chapter 10 P1 — deterministic provenance + seeded first next action.
    inquiry_source_type: input.source.inquiry_source_type,
    inquiry_source_record_id: input.source.inquiry_source_record_id || null,
    inquiry_received_at: receivedAt,
    next_action: 'Respond to seller inquiry',
    // Same-day speed-to-lead window: due 4 hours after receipt — deterministic,
    // and a brand-new inquiry is never INSTANTLY "overdue".
    next_action_at: new Date(new Date(receivedAt).getTime() + 4 * 60 * 60 * 1000).toISOString(),
    // Chapter 2 structured source (self-reported; NOT click attribution).
    referral_source_type: input.source.referral_source_type || null,
    referral_source_name: input.source.referral_source_name || null,
  });

  if ((input.notify_user_ids || []).length > 0) {
    await notifyUsersOfInquiry(service, {
      userIds: input.notify_user_ids,
      dealId: deal.id,
      clientName: deal.client_name,
      city: (input.property && input.property.city) || null,
      sourceLabel: input.source.source_label || 'your website',
    });
  }

  return { ok: true, deal_id: deal.id, created: true, replayed: false, contact_id: contact.id };
}

// ── Source mappers (each seam has a different schema — mapped, not assumed) ──

export function websiteLeadToBridgeInput(lead) {
  const info = lead.property_info || {};
  const timelineLabel = {
    asap: 'ASAP',
    within_30_days: 'within 30 days',
    '1_to_3_months': '1-3 months',
    '3_plus_months': '3+ months',
    researching: 'still researching',
  }[lead.timeline] || lead.timeline;
  const notesParts = ['Inquiry via operator website.'];
  if (lead.service_requested) notesParts.push(`Service requested: ${String(lead.service_requested).replace(/_/g, ' ')}.`);
  if (timelineLabel) notesParts.push(`Timing: ${timelineLabel}.`);
  if (lead.preferred_contact_method && lead.preferred_contact_method !== 'any') notesParts.push(`Preferred contact: ${lead.preferred_contact_method}.`);
  if (lead.message) notesParts.push(`Seller message: ${lead.message}`);
  return {
    client: {
      first_name: lead.contact_first_name,
      last_name: lead.contact_last_name,
      email: lead.contact_email,
      phone: lead.contact_phone,
    },
    property: { address: null, city: info.city || null, state: info.state || null },
    situation: lead.service_requested === 'probate_estate' ? 'probate' : null,
    notes: notesParts.join(' '),
    source: {
      inquiry_source_type: 'operator_website',
      inquiry_source_record_id: lead.id,
      inquiry_received_at: lead.created_date || new Date().toISOString(),
      referral_source_type: 'website',
      referral_source_name: 'Operator website inquiry',
      source_label: 'your operator website',
    },
  };
}

export function estateTransitionLeadToBridgeInput(lead) {
  const le = String(lead.life_event_type || '').toLowerCase();
  const situation = le.includes('probate') ? 'probate'
    : le.includes('divorce') ? 'divorce'
    : le.includes('downsiz') ? 'downsizing'
    : le.includes('mov') ? 'relocation'
    : le.includes('foreclos') ? 'foreclosure' : null;
  const notesParts = ['Inquiry via an EstateSalen estate-transition page.'];
  if (lead.life_event_type) notesParts.push(`Life event: ${String(lead.life_event_type).replace(/_/g, ' ')}.`);
  if (lead.urgency_level) notesParts.push(`Urgency: ${lead.urgency_level}.`);
  if (lead.has_real_estate) notesParts.push('Has real estate.');
  if (lead.has_personal_property_to_sell) notesParts.push('Has personal property to sell.');
  if (lead.estimated_contents_value) notesParts.push(`Estimated contents value: ${lead.estimated_contents_value}.`);
  if (lead.estimated_home_value) notesParts.push(`Estimated home value: ${lead.estimated_home_value}.`);
  if (lead.needs_probate_help) notesParts.push('Needs probate help.');
  if (lead.needs_cleanout) notesParts.push('Needs cleanout.');
  if (lead.wants_cash_offer) notesParts.push('Wants cash offer.');
  return {
    client: { first_name: lead.first_name, last_name: lead.last_name, email: lead.email, phone: lead.phone },
    property: {
      address: [lead.property_address, lead.zip_code].filter(Boolean).join(' ') || null,
      city: lead.city || null,
      state: lead.state || null,
    },
    situation,
    notes: notesParts.join(' '),
    source: {
      inquiry_source_type: 'estate_transition',
      inquiry_source_record_id: lead.id,
      inquiry_received_at: lead.created_date || new Date().toISOString(),
      referral_source_type: 'online_search',
      referral_source_name: 'EstateSalen estate-transition page',
      source_label: 'an EstateSalen estate-transition page',
    },
  };
}