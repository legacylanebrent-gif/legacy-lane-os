// Chapter 7 P2 — OPERATOR BUYER-AUDIENCE VIEW. A SAFE PROJECTION over the
// buyer data that ALREADY exists — no new buyer database, no new consent
// system. The operator sees only relationships with THEIR OWN sales/events
// (EarlySignIn, Offer, CheckIn, Purchase, VIPInvite, follower subscriptions
// for this operator). Consumer-side records (ConsumerMarketingProfile,
// EmailPreferences, NotificationPreference, BuyerIntent, WantedItem) are
// read server-side and returned ONLY as safe derived flags/interest
// categories — consumer PII (phone, address, zip) is never returned.
//
// Doctrine: EXPLICIT interest and OBSERVED behavior stay visibly distinct,
// and attendance / purchase / offer / sign-in NEVER create consent. Consent
// is read from its own explicit records only.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const pageOf = (p) => p.items || p;
const normEmail = (v) => String(v || '').trim().toLowerCase();

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
    return Response.json({ error: { code: 'unknown_action', message: 'Supported actions: list, detail' } }, { status: 400 });
  } catch (error) {
    console.error('buyerAudience error:', error && error.message);
    return Response.json({ error: { code: 'internal_error', message: 'Unexpected error' } }, { status: 500 });
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

  const [signIns, offers, checkIns, vipInvites, follows, purchases] = await Promise.all([
    service.entities.EarlySignIn.filter({ operator_id: user.id }, { limit: 1000, sort: '-signed_at' }).then(pageOf),
    service.entities.Offer.filter({ operator_id: user.id }, { limit: 1000 }).then(pageOf),
    saleIds.length
      ? service.entities.CheckIn.filter({ check_in_type: 'sale_visit', location_id: { $in: saleIds } }, { limit: 1000 }).then(pageOf)
      : Promise.resolve([]),
    service.entities.VIPInvite.filter({ operator_id: user.id }, { limit: 1000 }).then(pageOf),
    service.entities.OperatorFollowerSubscription.filter({ operator_id: user.id }, { limit: 1000 }).then(pageOf),
    service.entities.Purchase.filter({ seller_id: user.id }, { limit: 1000 }).then(pageOf)
  ]);
  return { sales, saleById, signIns, offers, checkIns, vipInvites, follows, purchases };
}

function blankCard() {
  return {
    key: null, user_id: null, display_name: null, email: null,
    email_ok: false, sms_ok: false, consent_source: null,
    vip: false, follower: false,
    explicit_interests: [],
    observed: { sign_ins: 0, check_ins: 0, offers: 0, offer_items: [], purchases: 0, vip_events: 0, sales_attended: 0 },
    first_activity: null, last_activity: null
  };
}

function touch(card, ts) {
  if (!ts) return;
  if (!card.first_activity || ts < card.first_activity) card.first_activity = ts;
  if (!card.last_activity || ts > card.last_activity) card.last_activity = ts;
}

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

  const attended = new Map();
  for (const r of records.signIns) {
    const c = cardFor(r.user_id, r.user_email, r.user_name);
    if (!c) continue;
    c.observed.sign_ins += 1;
    if (r.sale_id) attended.add(`${c.key}|${r.sale_id}`);
    touch(c, r.signed_at || r.created_date);
  }
  for (const r of records.checkIns) {
    const c = cardFor(r.created_by_id, null, null);
    if (!c) continue;
    c.observed.check_ins += 1;
    if (r.location_id && records.saleById.has(r.location_id)) attended.add(`${c.key}|${r.location_id}`);
    touch(c, r.created_date);
  }
  // Offers are operator-recorded on behalf of buyers — buyer identity comes
  // from the offer's own fields (user_id/email/full_name), never from the
  // operator who recorded it.
  for (const r of records.offers) {
    const c = cardFor(r.user_id, r.email, r.full_name);
    if (!c) continue;
    c.observed.offers += 1;
    if (r.item_name && c.observed.offer_items.length < 10) c.observed.offer_items.push(String(r.item_name).slice(0, 60));
    touch(c, r.created_date);
  }
  for (const r of records.purchases) {
    const c = cardFor(r.buyer_id, null, null);
    if (!c) continue;
    c.observed.purchases += 1;
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
  // Distinct sales attended, per card (early sign-ins + check-ins).
  const perCard = new Map();
  for (const k of attended.keys()) {
    const [ck, sid] = k.split('|');
    perCard.set(ck, (perCard.get(ck) || 0) + 1);
  }
  for (const c of cards.values()) c.observed.sales_attended = perCard.get(c.key) || 0;
  return cards;
}


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
    const profile = (c.user_id && profileByUid.get(c.user_id)) || (c.email && profileByEmail.get(c.email)) || null;
    const notif = c.user_id ? notifByUid.get(c.user_id) : null;
    const ep = c.user_id ? emailPrefByUid.get(c.user_id) : null;

    // EXPLICIT consent records only — observed behavior never flips these.
    if (profile && (profile.global_marketing_opt_in || profile.estate_sale_alerts_opt_in)) c.email_ok = true;
    if (notif && notif.marketing_email) c.email_ok = true;
    if (ep && ep.local_sale_notifications) { c.email_ok = true; c.consent_source = c.consent_source || 'sale notification opt-in'; }
    if (notif && notif.marketing_sms) { c.sms_ok = true; c.consent_source = 'SMS opt-in'; }

    // EXPLICIT interests — declared by the buyer, never inferred.
    const interests = new Set();
    for (const cat of ((profile && profile.interest_categories) || [])) interests.add(String(cat).slice(0, 40));
    for (const it of intents) if (it.buyer_id === c.user_id && it.category) interests.add(String(it.category).slice(0, 40));
    for (const w of wanted) if (w.buyer_id === c.user_id && (w.category || w.title)) interests.add(String(w.category || w.title).slice(0, 60));
    c.explicit_interests = [...interests].slice(0, 12);
  }
  return { intents, wanted };
}

async function list(service, user) {
  const records = await operatorRecords(service, user);
  const cards = cardsFrom(records);
  await applyConsentAndInterests(service, cards);
  const buyers = [...cards.values()].sort((a, b) => (b.last_activity || '').localeCompare(a.last_activity || ''));
  return Response.json({
    ok: true,
    buyers,
    totals: {
      audience: buyers.length,
      email_eligible: buyers.filter(b => b.email_ok).length,
      sms_eligible: buyers.filter(b => b.sms_ok).length,
      vip: buyers.filter(b => b.vip).length,
      followers: buyers.filter(b => b.follower).length
    }
  });
}

async function detail(service, user, body) {
  const records = await operatorRecords(service, user);
  const cards = cardsFrom(records);
  const card = cards.get(String(body.key || '')) || [...cards.values()].find(c => c.user_id === body.user_id || c.email === normEmail(body.email));
  if (!card) return Response.json({ error: { code: 'buyer_not_in_audience', message: 'This buyer has no relationship with your sales or events' } }, { status: 404 });

  const extra = await applyConsentAndInterests(service, new Map([[card.key, card]]));

  // Timeline from the operator's own records only.
  const timeline = [];
  const matchKey = (uid, email) => keyOf(uid, email) === card.key || (card.user_id && uid === card.user_id) || (!card.user_id && email && normEmail(email) === card.email);
  for (const r of records.signIns) if (matchKey(r.user_id, r.user_email))
    timeline.push({ type: 'early_sign_in', date: r.signed_at || r.created_date, detail: r.sale_title || null, sale_id: r.sale_id || null });
  for (const r of records.checkIns) if (matchKey(r.created_by_id, null))
    timeline.push({ type: 'check_in', date: r.created_date, detail: (records.saleById.get(r.location_id) || {}).title || r.location_name || null, sale_id: records.saleById.has(r.location_id) ? r.location_id : null });
  for (const r of records.offers) if (matchKey(r.user_id || r.created_by_id, r.email))
    timeline.push({ type: 'offer', date: r.created_date, detail: `${r.item_name || 'Item'}${r.offer_amount ? ` — $${r.offer_amount}` : ''}`, status: r.status || null, sale_id: r.sale_id || null });
  for (const r of records.purchases) if (matchKey(r.buyer_id, null))
    timeline.push({ type: 'purchase', date: r.created_date, detail: r.marketplace_item_id || null });
  for (const r of records.vipInvites) if (matchKey(r.user_id, r.email))
    timeline.push({ type: 'vip_invite', date: r.responded_date || r.invited_date || r.created_date, detail: r.status || 'pending' });
  for (const r of records.follows) if (matchKey(r.consumer_user_id, r.consumer_email))
    timeline.push({ type: 'follow', date: r.subscribed_at || r.created_date, detail: r.subscription_status || null });
  timeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const wantedTitles = (extra.wanted || []).filter(w => w.buyer_id === card.user_id)
    .map(w => ({ title: String(w.title || '').slice(0, 80), category: w.category || null, status: w.status || null }));

  return Response.json({ ok: true, buyer: card, timeline: timeline.slice(0, 100), wanted: wantedTitles });
}