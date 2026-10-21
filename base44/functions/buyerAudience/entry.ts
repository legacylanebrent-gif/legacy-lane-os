// Chapter 7 P2 / Chapter 18 P1 — OPERATOR BUYER-AUDIENCE VIEW.
// A SAFE PROJECTION over the buyer data that ALREADY exists — no new buyer
// database, no new consent system. The operator sees only relationships with
// THEIR OWN sales/events (EarlySignIn, Offer, CheckIn, Purchase, VIPInvite,
// follower subscriptions for this operator). Consumer-side records
// (ConsumerMarketingProfile, EmailPreferences, NotificationPreference,
// BuyerIntent, WantedItem) are read server-side and returned ONLY as safe
// derived flags/interest categories — consumer PII (phone, address, zip) is
// never returned.
//
// Chapter 18 P1 additions:
//   - CONSENT IS EXPLICIT-ONLY (buyerConsent): attendance/purchase/offer/
//     sign-in NEVER create consent; email and SMS consent are separate;
//     unknown = not eligible. Consent provenance is reported when recorded.
//   - IDENTITY RECONCILIATION (P1-6..P1-9): user-id records and email-only
//     records for the same person are merged by SAME VERIFIED EMAIL /
//     SAME AUTHENTICATED USER — deterministic reasons only. Name similarity
//     NEVER merges. Merges never make consent more permissive.
//   - EXPLAINABLE BUYER MATCH (P1-20/21/22): deterministic, per-signal
//     reasons from declared interests, Offers and purchase history — no
//     opaque AI score. RELEVANT is always separate from CONTACTABLE.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { normEmail, emailConsentFromRecords, smsConsentFromRecords } from '../../shared/buyerConsent.ts';
import { jerr } from '../../shared/saleAccess.ts';

const pageOf = (p) => p.items || p;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401 });
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';

    if (action === 'list') return await list(service, user);
    if (action === 'detail') return await detail(service, user, body);
    if (action === 'match') return await match(service, user, body);
    return jerr('unknown_action', 'Supported actions: list, detail, match', 400);
  } catch (error) {
    console.error('buyerAudience error:', error && error.message);
    return Response.json({ error: { code: 'internal_error', message: 'Unexpected' } }, { status: 500 });
  }
}

function keyOf(userId, email) {
  if (userId) return `u:${userId}`;
  if (email) return `e:${normEmail(email)}`;
  return null;
}

// Operator-scoped relationship records ONLY — the audience boundary.
async function operatorRecords(service, user) {
  const salesPage = await service.entities.EstateSale.filter({ operator_id: user.id }, { limit: 500 });
  const sales = pageOf(salesPage);
  const saleIds = sales.map(s => s.id);
  const saleById = new Map(sales.map(s => [s.id, s]));

  const [signIns, offers, checkIns, vipInvites, follows, purchases, orders] = await Promise.all([
    service.entities.EarlySignIn.filter({ operator_id: user.id }, { limit: 1000, sort: '-signed_at' }).then(pageOf),
    service.entities.Offer.filter({ operator_id: user.id }, { limit: 1000 }).then(pageOf),
    saleIds.length
      ? service.entities.CheckIn.filter({ check_in_type: 'sale_visit', location_id: { $in: saleIds } }, { limit: 1000 }).then(pageOf)
      : Promise.resolve([]),
    service.entities.VIPInvite.filter({ operator_id: user.id }, { limit: 1000 }).then(pageOf),
    service.entities.OperatorFollowerSubscription.filter({ operator_id: user.id }, { limit: 1000 }).then(pageOf),
    service.entities.Purchase.filter({ seller_id: user.id }, { limit: 1000 }).then(pageOf),
    service.entities.Order.filter({ 'items.seller_id': user.id }, { limit: 1000 }).then(pageOf).catch(() => []),
  ]);
  return { sales, saleById, signIns, offers, checkIns, vipInvites, follows, purchases, orders };
}

function blankCard() {
  return {
    key: null, user_id: null, display_name: null, email: null,
    email_ok: false, sms_ok: false, consent: { email: { eligible: false, source: null, at: null }, sms: { eligible: false, source: null, at: null } },
    consent_source: null,
    vip: false, follower: false,
    identity_note: null, merged_count: 1,
    explicit_interests: [],
    observed: { sign_ins: 0, check_ins: 0, offers: 0, offer_items: [], offer_item_ids: [], purchases: 0, purchase_item_ids: [], vip_events: 0, sales_attended: 0 },
    first_activity: null, last_activity: null
  };
}

function touch(card, ts) {
  if (!ts) return;
  if (!card.first_activity || ts < card.first_activity) card.first_activity = ts;
  if (!card.last_activity || ts > card.last_activity) card.last_activity = ts;
}

// Build raw cards (pre-reconciliation) from relationship records.
function cardsFrom(records) {
  const cards = new Map();
  const cardFor = (userId, email, name) => {
    const key = keyOf(userId, email);
    if (!key) return null;
    if (!cards.has(key)) {
      const c = blankCard();
      c.key = key;
      c.user_id = userId || null;
      c.email = email ? normEmail(email) : null;
      c.display_name = name || null;
      cards.set(key, c);
    }
    const c = cards.get(key);
    if (!c.display_name && name) c.display_name = name;
    if (!c.email && email) c.email = normEmail(email);
    return c;
  };

  const attended = []; // { key, sale_id } — remapped during reconciliation
  for (const r of records.signIns) {
    const c = cardFor(r.user_id, r.user_email, r.user_name);
    if (!c) continue;
    c.observed.sign_ins += 1;
    if (r.sale_id) attended.push({ key: c.key, sale_id: r.sale_id });
    touch(c, r.signed_at || r.created_date);
  }
  for (const r of records.checkIns) {
    const c = cardFor(r.created_by_id, null, null);
    if (!c) continue;
    c.observed.check_ins += 1;
    if (r.location_id && records.saleById.has(r.location_id)) attended.push({ key: c.key, sale_id: r.location_id });
    touch(c, r.created_date);
  }
  // Offers are operator-recorded on behalf of buyers — buyer identity comes
  // from the offer's own fields, never from the operator who recorded it.
  for (const r of records.offers) {
    const c = cardFor(r.user_id, r.email, r.full_name);
    if (!c) continue;
    c.observed.offers += 1;
    if (r.item_name && c.observed.offer_items.length < 10) c.observed.offer_items.push(String(r.item_name).slice(0, 60));
    if (r.item_id && c.observed.offer_item_ids.length < 20) c.observed.offer_item_ids.push(String(r.item_id));
    touch(c, r.created_date);
  }
  for (const r of records.purchases) {
    const c = cardFor(r.buyer_id, null, null);
    if (!c) continue;
    c.observed.purchases += 1;
    touch(c, r.created_date);
  }
  for (const r of records.orders) {
    const c = cardFor(r.buyer_id, null, r.buyer_name);
    if (!c) continue;
    c.observed.purchases += 1;
    for (const it of (r.items || [])) if (it.item_id && c.observed.purchase_item_ids.length < 20) c.observed.purchase_item_ids.push(String(it.item_id));
    touch(c, r.created_date);
  }
  for (const r of records.vipInvites) {
    const c = cardFor(r.user_id, r.email, r.name);
    if (!c) continue;
    c.observed.vip_events += 1;
    if (r.status === 'accepted') c.vip = true;
    touch(c, r.responded_date || r.invited_date || r.created_date);
  }
  for (const r of records.follows) {
    const c = cardFor(r.consumer_user_id, r.consumer_email, null);
    if (!c) continue;
    if ((r.subscription_status || '') === 'active') c.follower = true;
    touch(c, r.subscribed_at || r.created_date);
  }
  return { cards, attended };
}

// ── P1-6..P1-9 IDENTITY RECONCILIATION ─────────────────────────────────────
// Deterministic merges ONLY. A normalized verified email shared by a user-id
// card and email-only cards means the same person (SAME VERIFIED EMAIL); all
// email-only cards fold into the strongest card (SAME AUTHENTICATED USER).
// Two authenticated user-id cards are NEVER merged. Name similarity NEVER
// merges. Merge is additive for history and never makes consent more
// permissive (consent is recomputed over ALL of the person's records, where
// suppression/opt-out always wins).
function reconcile(cards, attended) {
  const byEmail = new Map();
  for (const c of cards.values()) {
    if (!c.email) continue;
    if (!byEmail.has(c.email)) byEmail.set(c.email, []);
    byEmail.get(c.email).push(c);
  }
  const identityNotes = [];
  const removedKeys = new Set();
  for (const [email, group] of byEmail) {
    if (group.length < 2) continue;
    const withUid = group.filter(c => c.user_id);
    // Never merge two different authenticated users even with the same email.
    if (withUid.length > 1) continue;
    const canonical = withUid[0] || group[0];
    const others = group.filter(c => c !== canonical);
    for (const o of others) {
      canonical.observed.sign_ins += o.observed.sign_ins;
      canonical.observed.check_ins += o.observed.check_ins;
      canonical.observed.offers += o.observed.offers;
      canonical.observed.purchases += o.observed.purchases;
      canonical.observed.vip_events += o.observed.vip_events;
      for (const it of o.observed.offer_items) if (canonical.observed.offer_items.length < 10) canonical.observed.offer_items.push(it);
      for (const id of o.observed.offer_item_ids) if (canonical.observed.offer_item_ids.length < 20) canonical.observed.offer_item_ids.push(id);
      for (const id of o.observed.purchase_item_ids) if (canonical.observed.purchase_item_ids.length < 20) canonical.observed.purchase_item_ids.push(id);
      canonical.vip = canonical.vip || o.vip;
      canonical.follower = canonical.follower || o.follower;
      if (!canonical.display_name && o.display_name) canonical.display_name = o.display_name;
      if (!canonical.user_id && o.user_id) canonical.user_id = o.user_id;
      touch(canonical, o.first_activity);
      touch(canonical, o.last_activity);
      canonical.merged_count += o.merged_count;
      // remap attendance keys of the folded card
      for (const a of attended) if (a.key === o.key) a.key = canonical.key;
      removedKeys.add(o.key);
    }
    if (removedKeys.size) {
      canonical.identity_note = `Reconciled from ${canonical.merged_count} record(s) — same verified email`;
      identityNotes.push({ reason: 'SAME_VERIFIED_EMAIL', email, records_merged: canonical.merged_count, canonical_key: canonical.key });
    }
  }
  for (const k of removedKeys) cards.delete(k);

  const perCard = new Map();
  for (const a of attended) perCard.set(a.key, (perCard.get(a.key) || 0) + 1);
  for (const c of cards.values()) c.observed.sales_attended = perCard.get(c.key) || 0;
  return { cards, identityNotes };
}

// ── CONSENT + INTERESTS (explicit-only, P1-19/P1-22) ────────────────────────
async function applyConsentAndInterests(service, cards) {
  const userIds = [...new Set([...cards.values()].map(c => c.user_id).filter(Boolean))];
  const emails = [...new Set([...cards.values()].map(c => c.email).filter(Boolean))];

  const [profilesByUid, profilesByEmail, notifPrefs, emailPrefs, intents, wanted] = await Promise.all([
    userIds.length ? service.entities.ConsumerMarketingProfile.filter({ user_id: { $in: userIds } }, { limit: 1000 }).then(pageOf) : Promise.resolve([]),
    emails.length ? service.entities.ConsumerMarketingProfile.filter({ email: { $in: emails } }, { limit: 1000 }).then(pageOf) : Promise.resolve([]),
    userIds.length ? service.entities.NotificationPreference.filter({ user_id: { $in: userIds } }, { limit: 1000 }).then(pageOf) : Promise.resolve([]),
    userIds.length ? service.entities.EmailPreferences.filter({ user_id: { $in: userIds } }, { limit: 1000 }).then(pageOf) : Promise.resolve([]),
    userIds.length ? service.entities.BuyerIntent.filter({ buyer_id: { $in: userIds }, is_active: true }, { limit: 500 }).then(pageOf) : Promise.resolve([]),
    userIds.length ? service.entities.WantedItem.filter({ buyer_id: { $in: userIds } }, { limit: 500 }).then(pageOf) : Promise.resolve([])
  ]);

  const profileByUid = new Map(profilesByUid.map(p => [p.user_id, p]));
  const profileByEmail = new Map(profilesByEmail.map(p => [normEmail(p.email), p]));
  const notifByUid = new Map(notifPrefs.map(p => [p.user_id, p]));
  const emailPrefByUid = new Map(emailPrefs.map(p => [p.user_id, p]));

  for (const c of cards.values()) {
    // ALL profile records for this person (uid + email) — merge-safe consent:
    // suppression/opt-out on ANY record wins; affirmative on any record counts.
    const profs = [];
    const seen = new Set();
    const addP = (p) => { if (p && !seen.has(p.id)) { seen.add(p.id); profs.push(p); } };
    if (c.user_id && profileByUid.has(c.user_id)) addP(profileByUid.get(c.user_id));
    if (c.email && profileByEmail.has(c.email)) addP(profileByEmail.get(c.email));
    const notif = c.user_id ? notifByUid.get(c.user_id) : null;
    const ep = c.user_id ? emailPrefByUid.get(c.user_id) : null;

    const emailC = emailConsentFromRecords({ profiles: profs, emailPref: ep, notifPref: notif }, 'local_sales');
    const smsC = smsConsentFromRecords({ profiles: profs, notifPref: notif });
    const hasPhone = profs.some(p => p && p.phone);
    c.email_ok = emailC.eligible;
    // P1-4: SMS also requires a usable phone — but no phone PII is returned.
    c.sms_ok = smsC.eligible && hasPhone;
    c.consent = { email: emailC, sms: { ...smsC, eligible: c.sms_ok } };
    if (emailC.eligible && emailC.source) c.consent_source = emailC.source;

    // EXPLICIT interests — declared by the buyer, never inferred. Source stays
    // visible per signal (P1-19): declared ≠ offer ≠ purchase.
    const interests = new Set();
    for (const cat of profs.flatMap(p => (p && p.interest_categories) || [])) interests.add(String(cat).slice(0, 40));
    for (const it of intents) if (it.buyer_id === c.user_id && it.category) interests.add(String(it.category).slice(0, 40));
    for (const w of wanted) if (w.buyer_id === c.user_id && (w.category || w.title)) interests.add(String(w.category || w.title).slice(0, 60));
    c.explicit_interests = [...interests].slice(0, 12);
  }
  return { intents, wanted };
}

function audienceOf(records) {
  const { cards, attended } = cardsFrom(records);
  const { cards: merged, identityNotes } = reconcile(cards, attended);
  return { cards: merged, identityNotes };
}

async function list(service, user) {
  const records = await operatorRecords(service, user);
  const { cards, identityNotes } = audienceOf(records);
  await applyConsentAndInterests(service, cards);
  const buyers = [...cards.values()].sort((a, b) => (b.last_activity || '').localeCompare(a.last_activity || ''));
  return Response.json({
    ok: true,
    buyers,
    identity_notes: identityNotes,
    totals: {
      audience: buyers.length,
      email_eligible: buyers.filter(b => b.email_ok).length,
      sms_eligible: buyers.filter(b => b.sms_ok).length,
      vip: buyers.filter(b => b.vip).length,
      followers: buyers.filter(b => b.follower).length,
      interests_known: buyers.filter(b => (b.explicit_interests || []).length > 0).length,
      repeat_attendees: buyers.filter(b => (b.observed || {}).sales_attended > 1).length,
      purchasers: buyers.filter(b => (b.observed || {}).purchases > 0).length
    }
  });
}

async function detail(service, user, body) {
  const records = await operatorRecords(service, user);
  const { cards } = audienceOf(records);
  const card = cards.get(String(body.key || '')) || [...cards.values()].find(c => c.user_id === body.user_id || c.email === normEmail(body.email));
  if (!card) return jerr('buyer_not_in_audience', 'This buyer has no relationship with your sales or events', 404);

  const extra = await applyConsentAndInterests(service, new Map([[card.key, card]]));

  const timeline = [];
  const matchKey = (uid, email) => keyOf(uid, email) === card.key || (uid && card.user_id && uid === card.user_id) || (email && normEmail(email) === card.email);
  for (const r of records.signIns) if (matchKey(r.user_id, r.user_email))
    timeline.push({ type: 'early_sign_in', date: r.signed_at || r.created_date, detail: r.sale_title || null, sale_id: r.sale_id || null, source: r.discovery_source || 'unknown' });
  for (const r of records.checkIns) if (matchKey(r.created_by_id, null))
    timeline.push({ type: 'check_in', date: r.created_date, detail: (records.saleById.get(r.location_id) || {}).title || r.location_name || null, sale_id: records.saleById.has(r.location_id) ? r.location_id : null });
  for (const r of records.offers) if (matchKey(r.user_id, r.email))
    timeline.push({ type: 'offer', date: r.created_date, detail: `${r.item_name || 'Item'}${r.offer_amount ? ` — $${r.offer_amount}` : ''}`, status: r.status || null, sale_id: r.sale_id || null });
  for (const r of records.purchases) if (matchKey(r.buyer_id, null))
    timeline.push({ type: 'purchase', date: r.created_date, detail: r.marketplace_item_id || null });
  for (const r of records.orders) if (matchKey(r.buyer_id, null, r.buyer_name))
    timeline.push({ type: 'order', date: r.created_date, detail: ((r.items || [])[0] || {}).item_title || null });
  for (const r of records.vipInvites) if (matchKey(r.user_id, r.email, r.name))
    timeline.push({ type: 'vip_invite', date: r.responded_date || r.invited_date || r.created_date, detail: r.status || 'pending' });
  for (const r of records.follows) if (matchKey(r.consumer_user_id, r.consumer_email, null))
    timeline.push({ type: 'follow', date: r.subscribed_at || r.created_date, detail: r.subscription_status || null });
  timeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const wantedTitles = (extra.wanted || []).filter(w => w.buyer_id === card.user_id)
    .map(w => ({ title: String(w.title || '').slice(0, 80), category: w.category || null, status: w.status || null }));

  return Response.json({ ok: true, buyer: card, timeline: timeline.slice(0, 100), wanted: wantedTitles });
}

// ── P1-20/21/22/42 — DETERMINISTIC, EXPLAINABLE, CONSENT-AWARE MATCH ────────
const STOP_TOKENS = new Set(['and', 'the', 'for', 'with', 'other', 'misc', 'general', 'sale', 'sales', 'item', 'items', 'set']);
const tokens = (v) => String(v || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP_TOKENS.has(w));
const overlap = (a, b) => {
  const bs = new Set(b);
  return a.filter(t => bs.has(t));
};

async function match(service, user, body) {
  const saleId = String(body.sale_id || '');
  if (!saleId) return jerr('sale_id_required', 'sale_id is required', 400);
  const sale = await service.entities.EstateSale.get(saleId).catch(() => null);
  if (!sale) return jerr('sale_not_found', 'Sale not found', 404);
  if (sale.operator_id !== user.id && user.role !== 'admin') {
    return jerr('not_authorized', 'Caller is not authorized for this sale', 403);
  }

  const itemsPage = await service.entities.Item.filter({ estate_sale_id: sale.id }, { limit: 500 });
  const saleItems = pageOf(itemsPage);
  const saleCategoryTokens = [
    ...new Set([
      ...(sale.categories || []).flatMap(c => tokens(c)),
      ...saleItems.map(i => i.category).flatMap(c => tokens(c)),
    ])
  ];

  const records = await operatorRecords(service, user);
  const { cards } = audienceOf(records);
  await applyConsentAndInterests(service, cards);

  // Resolve historical item categories for OFFER and PURCHASE signals.
  const itemIds = new Set();
  for (const c of cards.values()) {
    for (const id of (c.observed.offer_item_ids || [])) itemIds.add(id);
    for (const id of (c.observed.purchase_item_ids || [])) itemIds.add(id);
  }
  const idList = [...itemIds].slice(0, 300);
  const histItems = idList.length
    ? pageOf(await service.entities.Item.filter({ id: { $in: idList } }, { limit: 300 }).catch(() => []))
    : [];
  const histItemById = new Map(histItems.map(i => [i.id, i]));

  const matches = [];
  for (const c of cards.values()) {
    const reasons = [];
    const seenReasons = new Set();
    const addReason = (r) => { if (!seenReasons.has(r)) { seenReasons.add(r); reasons.push(r); } };

    // DECLARED INTEREST (buyer said so — strongest self-declared signal)
    for (const interest of (c.explicit_interests || [])) {
      const it = tokens(interest);
      if (it.length && overlap(it, saleCategoryTokens).length) {
        addReason(`Declared interest in ${interest}`);
      }
    }
    // OFFER — behavioral signal from this buyer's own offers
    for (const id of (c.observed.offer_item_ids || []).slice(0, 20)) {
      const it = histItemById.get(id);
      if (it && overlap(tokens(it.category), saleCategoryTokens).length) {
        addReason(`Made an offer on ${String(it.category || '').replace(/_/g, ' ')} merchandise`);
      }
    }
    for (const name of (c.observed.offer_items || []).slice(0, 10)) {
      if (overlap(tokens(name), saleCategoryTokens).length) {
        addReason(`Previously offered on "${name}"`);
      }
    }
    // PURCHASE — behavioral history; improves relevance, NEVER creates consent
    for (const id of (c.observed.purchase_item_ids || []).slice(0, 20)) {
      const it = histItemById.get(id);
      if (it && overlap(tokens(it.category), saleCategoryTokens).length) {
        addReason(`Previously purchased ${String(it.category || '').replace(/_/g, ' ')} from you`);
      }
    }

    if (reasons.length) {
      matches.push({
        key: c.key,
        display_name: c.display_name,
        email: c.email,
        reasons: reasons.slice(0, 6),
        // P1-22: RELEVANT is separate from CONTACTABLE.
        relevant: true,
        email_eligible: c.email_ok,
        sms_eligible: c.sms_ok,
        sales_attended: c.observed.sales_attended,
        vip: c.vip
      });
    }
  }

  return Response.json({
    ok: true,
    sale: { id: sale.id, title: sale.title, status: sale.status },
    sale_categories: (sale.categories || []).slice(0, 10),
    matches,
    totals: {
      relevant: matches.length,
      email_eligible: matches.filter(m => m.email_eligible).length,
      sms_eligible: matches.filter(m => m.sms_eligible).length
    }
  });
}