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
    // STRICT CAS lock: only equality/$in/$ne conditions are re-checked at
    // write time (no $lt/$exists), so there is no time-based stale takeover.
    // A crash mid-forwarding leaves the lock set — a documented activation
    // blocker (an editor resets it); concurrent retries fail loudly. This is
    // still NOT a first-create uniqueness guard.
    claim: async (record, nowIso) => {
      const r = await E.SellerConsent.updateMany({ id: record.id, status: 'granted',
        processing_lock: { $ne: true } },
      { $set: { processing_lock: true, processing_locked_at: nowIso }, $inc: { processing_version: 1 } });
      return r.updated === 1;
    },
    finish: async (record, patch) => {
      const r = await E.SellerConsent.updateMany({ id: record.id, processing_lock: true },
      { $set: { processing_lock: false, processing_locked_at: null,
        intake_tracking: { ...record.intake_tracking, ...patch,
          forwarding_attempts: (record.intake_tracking?.forwarding_attempts || 0) + 1 } },
        $inc: { processing_version: 1 } });
      if (r.updated !== 1) throw new Error('forwarding_state_save_conflict');
    },
  };
}