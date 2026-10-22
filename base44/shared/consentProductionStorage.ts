// Real dependency adapter. The public handler cannot replace any dependency.
export function consentProductionStorage(service) {
  const E = service.entities;
  const first = (page) => (page.items || page || [])[0] || null;
  return {
    findLead: async (submissionId) => first(await E.EstateTransitionLead.filter({ partner_submission_id: submissionId })),
    createLead: (i) => E.EstateTransitionLead.create({ first_name: i.first_name, last_name: i.last_name || null,
      email: i.email, phone: i.phone || null, city: i.city || null, county: i.county || null,
      state: i.state, zip_code: i.zip_code || null, life_event_type: 'other', needs_estate_sale: true,
      source_page_type: 'partner_referral', source_url: i.source_url || null, notes: i.need_notes || null,
      partner_submission_id: i.submission_id || null, partner_submission_identity: i.partner_submission_identity }),
    findConsent: async (id) => first(await E.SellerConsent.filter({ submission_id: id })),
    createConsent: (record) => E.SellerConsent.create(record),
    claim: async (record) => {
      const r = await E.SellerConsent.updateMany({ id: record.id, status: 'granted',
        processing_lock: false, processing_version: record.processing_version || 0 },
      { $set: { processing_lock: true }, $inc: { processing_version: 1 } });
      return r.updated === 1;
    },
    finish: async (record, patch) => {
      const r = await E.SellerConsent.updateMany({ id: record.id, processing_lock: true,
        processing_version: (record.processing_version || 0) + 1 },
      { $set: { processing_lock: false, intake_tracking: { ...record.intake_tracking, ...patch,
        forwarding_attempts: (record.intake_tracking?.forwarding_attempts || 0) + 1 } },
        $inc: { processing_version: 1 } });
      if (r.updated !== 1) throw new Error('forwarding_state_save_conflict');
    },
  };
}