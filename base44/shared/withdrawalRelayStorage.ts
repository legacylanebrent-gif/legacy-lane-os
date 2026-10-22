export function withdrawalRelayStorage(service) {
  const E = service.entities;
  const rows = (page) => page.items || page || [];
  const all = async (entity, query) => {
    const items = []; let cursor;
    do { const page = await entity.filter(query, { limit: 100, cursor });
      items.push(...rows(page)); cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    return items;
  };
  return {
    clock: () => new Date().toISOString(),
    findConsent: async (id) => rows(await E.SellerConsent.filter({ consent_id: id }))[0] || null,
    getEvent: (id) => E.SellerConsentWithdrawalEvent.get(id),
    append: (event) => E.SellerConsentWithdrawalEvent.create(event),
    actualRecipients: async (consent) => {
      // Actual persisted destination, not intended_recipient_ids. Validate the
      // source lead -> deal link independently of the consent's tracking claim.
      const dealId = consent.intake_tracking?.deal_id;
      if (!dealId) return { ids: [], unresolved: true };
      const deal = await E.SaleConversionPipeline.get(dealId);
      if (!deal?.operator_id || deal.inquiry_source_record_id !== consent.source_id) {
        return { ids: [], unresolved: true };
      }
      return { ids: [deal.operator_id], unresolved: false };
    },
    // Only equality/$in/$ne-style conditions are re-evaluated at write time;
    // $exists does NOT match here. Absence idempotency is enforced by the
    // engine's pre-check plus this status-bounded single-record update.
    confirm: async (consent, event) => {
      const result = await E.SellerConsent.updateMany({ id: consent.id,
        status: { $in: ['granted', 'withdrawn'] } },
      { $set: { status: 'withdrawn', withdrawn_at: event.at, withdrawn_by: event.actor_id,
        withdrawn_by_name: event.actor_name, withdrawal_confirmation: event },
        $push: { withdrawal_history: event } });
      return result.updated === 1;
    },
    // CAS lock with bounded stale takeover so a crashed propagation cannot
    // wedge the record. A held lock serializes concurrent propagations.
    // Strict mutual exclusion: $ne is write-time checkable. A crash mid-
    // propagation leaves the lock set — a documented residual (editors can
    // reset it); retries fail loudly rather than double-queueing.
    claimPropagation: async (consent) => {
      const now = new Date().toISOString();
      const result = await E.SellerConsent.updateMany({ id: consent.id, status: 'withdrawn',
        propagation_lock: { $ne: true } },
      { $set: { propagation_lock: true, propagation_locked_at: now } });
      return result.updated === 1;
    },
    releasePropagation: (consent) => E.SellerConsent.updateMany({ id: consent.id, propagation_lock: true },
      { $set: { propagation_lock: false, propagation_locked_at: null } }),
    notificationHistory: (id) => all(E.SellerConsentWithdrawalEvent,
      { consent_record_id: id, event_type: { $in: ['notification_queued', 'notification_failed'] } }),
    notify: (userId, consent) => E.Notification.create({ user_id: userId, type: 'seller_consent_withdrawn',
      title: 'Seller Consent Withdrawal Confirmed', read: false,
      message: `An administrator verified withdrawal for consent ${consent.consent_id}. Stop introduction contact unless fresh consent is recorded.`,
      link_to_page: 'SaleConversionPipeline', related_entity_type: 'SellerConsent', related_entity_id: consent.id }),
    list: async (user) => {
      const page = await E.SellerConsentWithdrawalEvent.filter({ event_type: 'request_received',
        ...(user.role === 'admin' ? {} : { actor_id: user.id }) }, { sort: '-created_date', limit: 50 });
      const requests = rows(page);
      const ids = [...new Set(requests.map((r) => r.consent_record_id))];
      const consents = ids.length ? rows(await E.SellerConsent.filter({ id: { $in: ids } })) : [];
      return { requests: requests.map((r) => { const c = consents.find((c) => c.id === r.consent_record_id);
        return { ...r, confirmed: !!c?.withdrawal_confirmation, consent_status: c?.status || 'unknown' };
      }), has_more: !!page.has_more, next_cursor: page.next_cursor || null };
    },
  };
}