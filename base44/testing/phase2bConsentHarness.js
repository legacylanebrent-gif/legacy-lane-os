// LOCAL harness ONLY — never imported by app or backend code. Runs under the
// platform Node sandbox with in-memory storage, mocked forwarding, a
// deterministic clock and mocked notification delivery. No production data.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

const SHARED = path.resolve(process.cwd(), 'base44/shared');
const loaded = {};
function load(name) {
  if (loaded[name]) return loaded[name].exports;
  const file = path.join(SHARED, name);
  const src = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { target: 'ES2022', module: 'CommonJS' } }).outputText;
  const m = new Module(file);
  m.filename = file;
  m.paths = Module._nodeModulePaths(SHARED);
  loaded[name] = m;
  m._compile(js, file);
  return m.exports;
}
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('.ts') && parent && parent.filename && parent.filename.startsWith(SHARED)) {
    return load(path.basename(request));
  }
  return origLoad(request, parent, isMain);
};

const engine = load('consentIntakeEngine.ts');
const relay = load('withdrawalRelayEngine.ts');
const control = load('referralEligibilityControl.ts');
const consentControl = load('sellerConsentControl.ts');
const { validateEligibilityResponse } = (() => {
  const src = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/eligibilityResponse.js'), 'utf8');
  const m = new Module('eligibilityResponse.js');
  m._compile(ts.transpileModule(src, { compilerOptions: { target: 'ES2022', module: 'CommonJS' } }).outputText, 'eligibilityResponse.js');
  return m.exports;
})();

// ── deterministic clock ──
let clockNow = Date.parse('2026-10-22T12:00:00Z');
const clock = () => new Date(clockNow).toISOString();
const tick = (ms) => { clockNow += ms; };

// ── in-memory storage ──
function memoryStorage() {
  const state = { leads: [], consents: [], events: [], notifications: [], order: [], nextId: 1 };
  const storage = {
    state,
    clock: () => new Date(clockNow).toISOString(),
    findLead: async (id) => state.leads.find((l) => l.partner_submission_id === id) || null,
    createLead: (i) => { const lead = { id: `lead-${state.nextId++}`, created_date: clock(), ...i,
      partner_submission_id: i.submission_id };
      state.leads.push(lead); state.order.push('lead'); return lead; },
    findConsent: async (id) => state.consents.find((c) => c.submission_id === id) || null,
    createConsent: async (record) => {
      const c = { id: `consent-${state.nextId++}`, processing_lock: false, processing_version: 0,
        intake_tracking: { forwarding_attempts: 0 }, downstream_notifications: [], ...record };
      state.consents.push(c); state.order.push('consent'); return c; },
    claim: async (record, nowIso) => {
      const r = state.consents.find((c) => c.id === record.id);
      if (!r || r.status !== 'granted' || r.processing_lock) return false;
      r.processing_lock = true; r.processing_locked_at = nowIso; r.processing_version++;
      state.order.push(`claim:${r.id}`); return true; },
    finish: async (record, patch) => {
      const r = state.consents.find((c) => c.id === record.id);
      r.processing_lock = false; r.processing_locked_at = null; r.processing_version++;
      r.intake_tracking = { ...r.intake_tracking, ...patch,
        forwarding_attempts: (r.intake_tracking.forwarding_attempts || 0) + 1 };
      state.order.push(`finish:${r.id}`); return r; },
    releasePropagation: async (c) => { const r = state.consents.find((x) => x.id === c.id); if (r) r.propagation_lock = false; },
    claimPropagation: async (c) => { const r = state.consents.find((x) => x.id === c.id);
      if (r.propagation_lock) return false; r.propagation_lock = true; return true; },
    getEvent: async (id) => state.events.find((e) => e.id === id) || null,
    append: async (e) => { const rec = { id: `event-${state.nextId++}`, ...e }; state.events.push(rec); return rec; },
    notify: async (userId, consent) => {
      if (storage.failNotifyFor && storage.failNotifyFor.has(userId)) throw new Error('simulated_notify_failure');
      const n = { id: `notif-${state.nextId++}`, user_id: userId, consent: consent.consent_id };
      state.notifications.push(n); return n; },
    notificationHistory: async (id) => state.events.filter((e) => e.consent_record_id === id),
    actualRecipients: async (c) => c.intake_tracking && c.intake_tracking.deal_id
      ? { ids: ['operator-1'], unresolved: false } : { ids: [], unresolved: true },
    confirm: async (consent, event) => {
      const r = state.consents.find((c) => c.id === consent.id);
      if (r.withdrawal_confirmation) return false;
      Object.assign(r, { status: 'withdrawn', withdrawn_at: event.at, withdrawn_by: event.actor_id,
        withdrawn_by_name: event.actor_name, withdrawal_confirmation: event });
      r.withdrawal_history = [...(r.withdrawal_history || []), event];
      return true; },
    findConsentById: async (cid) => state.consents.find((c) => c.consent_id === cid) || null,
    list: async () => ({ requests: state.events.filter((e) => e.event_type === 'request_received'), has_more: false, next_cursor: null }),
  };
  return storage;
}
function relayAdapter(storage) {
  return {
    clock: storage.clock,
    findConsent: storage.findConsentById,
    getEvent: storage.getEvent,
    append: storage.append,
    actualRecipients: storage.actualRecipients,
    confirm: storage.confirm,
    claimPropagation: storage.claimPropagation,
    releasePropagation: storage.releasePropagation,
    notificationHistory: storage.notificationHistory,
    notify: storage.notify,
    list: storage.list,
  };
}

const ENABLED = { rollout_enabled: true, text_version: 'TEST-V1', text: 'Synthetic broker/legal-pending test text.' };
const seller = { first_name: 'Test', last_name: 'Seller', email: 'seller@example.test', state: 'NJ',
  phone: '', city: '', county: '', zip_code: '', need_notes: '', source_url: '',
  submission_id: 'sub-1', operator_id: 'operator-1', referrer_id: 'referrer-1' };
let idSeq = 0;
const newId = () => `SC-T-${++idSeq}`;
const mkDeps = (storage, extra = {}) => ({ config: ENABLED, storage, clock, newId, ...extra });
const results = [];
const test = (name, fn) => Promise.resolve().then(fn)
  .then((detail) => results.push({ name, pass: true, detail: detail ?? '' }))
  .catch((e) => results.push({ name, pass: false, detail: e.message }));

// ── Consent intake tests ──
await test('missing acceptance: rejected before ANY storage write', async () => {
  const s = memoryStorage();
  await engine.runConsentIntake({ ...seller, consent_accepted: false, consent_text_version: 'TEST-V1' },
    { config: ENABLED, storage: s, clock, forward: async () => { throw new Error('forward must not run'); } })
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'consent_acceptance_required') throw e; });
  if (s.state.leads.length || s.state.consents.length) throw new Error('storage was written');
});
await test('stale version rejected', async () => {
  const s = memoryStorage();
  await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'OLD-V0' },
    { config: ENABLED, storage: s, clock, forward: async () => ({}) })
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'consent_version_mismatch') throw e; });
});
await test('empty configured text fails closed', async () => {
  const s = memoryStorage();
  await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' },
    { config: { rollout_enabled: true, text_version: 'TEST-V1', text: ' ' }, storage: s, clock, forward: async () => ({}) })
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'consent_text_unconfigured') throw e; });
});
await test('consent-storage failure BLOCKS forwarding; lead reusable', async () => {
  const s = memoryStorage();
  let forwarded = false;
  const failing = { ...s };
  failing.createConsent = async () => { throw new Error('simulated_storage_failure'); };
  await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' },
    mkDeps(failing, { forward: async () => { forwarded = true; return { ok: true }; } }))
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'simulated_storage_failure') throw e; });
  if (forwarded) throw new Error('forwarding ran');
  if (s.state.leads.length !== 1) throw new Error('lead not retained');
});
await test('consent stored BEFORE forwarding', async () => {
  const s = memoryStorage();
  await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' },
    mkDeps(s, { forward: async () => { if (!s.state.consents.length) throw new Error('forward ran before consent stored'); return { ok: true, created: true, deal_id: 'deal-1' }; } }));
  if (s.state.order[0] !== 'lead' || s.state.order[1] !== 'consent') throw new Error(`order: ${s.state.order}`);
});
await test('failed forwarding -> retry_required; retry forwards ONLY, no duplicates', async () => {
  const s = memoryStorage();
  let fail = true;
  const deps = mkDeps(s, { forward: async () => { if (fail) throw new Error('bridge_down'); return { ok: true, created: true, deal_id: 'deal-9' }; } });
  const r1 = await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps);
  if (r1.ok || r1.error !== 'forwarding_failed' || !r1.consent_recorded) throw new Error('bad failure result');
  const c1 = s.state.consents[0];
  if (c1.intake_tracking.forwarding_status !== 'retry_required' || c1.intake_tracking.forwarding_attempts !== 1) throw new Error('retry state wrong');
  if (c1.processing_lock) throw new Error('lock not released');
  fail = false; tick(1000);
  const r2 = await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps);
  if (!r2.ok || r2.replayed) throw new Error('retry did not complete');
  if (s.state.consents.length !== 1 || s.state.leads.length !== 1) throw new Error('duplicates created');
  if (s.state.consents[0].intake_tracking.deal_id !== 'deal-9' || s.state.consents[0].intake_tracking.forwarding_attempts !== 2) throw new Error('retry truth wrong');
});
await test('sequential duplicate submission: idempotent replay', async () => {
  const s = memoryStorage();
  const deps = mkDeps(s, { forward: async () => ({ ok: true, created: true, deal_id: 'd' }) });
  await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps);
  const r2 = await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps);
  if (!r2.ok || !r2.replayed || s.state.consents.length !== 1 || s.state.leads.length !== 1) throw new Error('duplicate not deduped');
});
await test('concurrent CAS: only ONE forwarding proceeds on the same consent', async () => {
  const s = memoryStorage();
  let forwards = 0;
  const deps = mkDeps(s, { forward: async () => { forwards++; tick(50); return { ok: true, created: true, deal_id: 'd' }; } });
  await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps);
  s.state.consents[0].intake_tracking.forwarding_status = 'retry_required';
  s.state.consents[0].intake_tracking.deal_id = null;
  const race = await Promise.allSettled([
    engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps),
    engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps),
  ]);
  const busy = race.filter((r) => r.status === 'fulfilled' && !r.value.ok).length;
  const replayed = race.filter((r) => r.status === 'fulfilled' && r.value.ok && r.value.replayed).length;
  // 1 forward from the setup call + exactly 1 from the CAS winner. The loser
  // either hits the lock (busy) or sees the completed state (replayed) —
  // both are correct deduplication.
  if (forwards !== 2) throw new Error(`forwards=${forwards} — CAS did not serialize`);
  if (busy + replayed < 1) throw new Error(`no busy or replayed loser (busy=${busy}, replayed=${replayed})`);
  if (s.state.consents.length !== 1) throw new Error('consent duplicated');
});
await test('RESIDUAL RACE (documented): interleaved FIRST creates duplicate consents — no platform unique-create primitive', async () => {
  const s = memoryStorage();
  // Deterministic barrier: both calls read findConsent BEFORE either creates.
  // This forces the exact window a concurrent duplicate hit in production.
  let finds = 0; let openBarrier;
  const barrierPromise = new Promise((res) => { openBarrier = res; });
  const racing = { ...s, findConsent: async (id) => {
    finds += 1; if (finds === 2) openBarrier(); await barrierPromise;
    return s.findConsent(id); } };
  const deps = mkDeps(racing, { forward: async () => ({ ok: true, created: true, deal_id: 'd' }) });
  await Promise.allSettled([
    engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps),
    engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps),
  ]);
  if (s.state.consents.length !== 2) throw new Error(`expected 2 duplicate consents, got ${s.state.consents.length}`);
  if (s.state.leads.length !== 2) throw new Error(`expected 2 duplicate leads, got ${s.state.leads.length}`);
});
await test('submission id reused for DIFFERENT seller info: rejected via stored identity', async () => {
  const s = memoryStorage();
  const deps = mkDeps(s, { forward: async () => ({ ok: true, created: true, deal_id: 'd' }) });
  await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps);
  await engine.runConsentIntake({ ...seller, email: 'impostor@example.test', consent_accepted: true, consent_text_version: 'TEST-V1' }, deps)
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'submission_id_conflict') throw e; });
});
await test('consent retained accurately when forwarding fails', async () => {
  const s = memoryStorage();
  let fail = true;
  const deps = mkDeps(s, { forward: async () => { if (fail) throw new Error('x'); return { ok: true, created: true, deal_id: 'd' }; } });
  const before = clock();
  await engine.runConsentIntake({ ...seller, consent_accepted: true, consent_text_version: 'TEST-V1' }, deps);
  const c = s.state.consents[0];
  if (c.consent_text_version !== 'TEST-V1' || c.consent_text_snapshot !== ENABLED.text) throw new Error('consent truth altered');
  if (!c.submitted_at || c.submitted_at < before) throw new Error('server timestamp wrong');
  if (c.intake_tracking.lead_id !== s.state.leads[0].id) throw new Error('lead link lost');
});
await test('production configuration remains DISABLED; disabled path records no consent', async () => {
  const cfg = consentControl.getSellerConsentConfig();
  if (cfg.rollout_enabled !== false || cfg.text !== '') throw new Error('production config enabled');
  const s = memoryStorage();
  const r = await engine.runConsentIntake({ ...seller }, mkDeps(s, { config: cfg,
    forward: async () => ({ ok: true, created: true, deal_id: 'd' }) }));
  if (r.ok !== true || r.consent_recorded !== false || s.state.consents.length !== 0) throw new Error('disabled path changed');
});

// ── Withdrawal relay tests (mocked principals) ──
const admin = { id: '69471383fc72e5b50c72fcc8', role: 'admin', full_name: 'Designated Admin' };
const otherAdmin = { id: 'admin-2', role: 'admin', full_name: 'Other Admin' };
const operator = { id: 'operator-1', role: 'user', full_name: 'Operator One' };
const outsider = { id: 'outsider', role: 'user', full_name: 'Outsider' };
function consentFixture(s) {
  s.state.consents.push({ id: 'c1', consent_id: 'SC-TEST-1', submission_id: 'sub-2', status: 'granted',
    operator_id: 'operator-1', intended_recipient_ids: ['operator-1'], withdrawal_history: [],
    intake_tracking: { deal_id: 'deal-1', forwarding_status: 'completed' }, downstream_notifications: [] });
}
const reqBase = { consent_id: 'SC-TEST-1', request_received_at: '2026-10-22T10:00:00Z',
  channel: 'phone', requester_identity: 'Mary Seller', claimed_capacity: 'seller', reference_note: 'Callback verified.' };

await test('staff (operator) reports a request: recorded only, consent unchanged', async () => {
  const s = memoryStorage(); consentFixture(s); const deps = relayAdapter(s);
  const r = await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase }, deps);
  if (r.withdrawal_state !== 'pending_admin_review' || s.state.consents[0].status !== 'granted') throw new Error('report changed state');
  if (!s.state.events[0].request_received_at || !s.state.events[0].channel || !s.state.events[0].requester_identity) throw new Error('missing request metadata');
});
await test('operator CANNOT confirm — designated administrator only', async () => {
  const s = memoryStorage(); consentFixture(s);
  const req = await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase }, relayAdapter(s));
  await relay.runWithdrawalRelay(operator, { action: 'confirm_withdrawal', consent_id: 'SC-TEST-1', request_id: req.request_id,
    verification_method: 'callback', verification_reference: 'ref' }, relayAdapter(s))
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'designated_withdrawal_admin_required') throw e; });
});
await test('non-designated admin CANNOT confirm either', async () => {
  const s = memoryStorage(); consentFixture(s);
  const req = await relay.runWithdrawalRelay(otherAdmin, { action: 'report_request', ...reqBase }, relayAdapter(s));
  await relay.runWithdrawalRelay(otherAdmin, { action: 'confirm_withdrawal', consent_id: 'SC-TEST-1', request_id: req.request_id,
    verification_method: 'callback', verification_reference: 'ref' }, relayAdapter(s))
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'designated_withdrawal_admin_required') throw e; });
});
await test('unrelated user cannot even report', async () => {
  const s = memoryStorage(); consentFixture(s);
  await relay.runWithdrawalRelay(outsider, { action: 'report_request', ...reqBase }, relayAdapter(s))
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'not_authorized_for_this_consent') throw e; });
});
await test('future-dated request received date rejected; missing evidence note rejected', async () => {
  const s = memoryStorage(); consentFixture(s);
  await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase, request_received_at: '2027-01-01T00:00:00Z' }, relayAdapter(s))
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'valid_request_received_date_required') throw e; });
  await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase, reference_note: '' }, relayAdapter(s))
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'reference_note_required_or_too_long') throw e; });
});
await test('designated admin confirms: state + append-only history; repeat is idempotent', async () => {
  const s = memoryStorage(); consentFixture(s); const deps = relayAdapter(s);
  const req = await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase }, deps);
  const r = await relay.runWithdrawalRelay(admin, { action: 'confirm_withdrawal', consent_id: 'SC-TEST-1',
    request_id: req.request_id, verification_method: 'callback to seller', verification_reference: 'VR-1' }, deps);
  if (r.withdrawal_state !== 'confirmed' || r.notification_state !== 'not_attempted') throw new Error('confirm also propagated');
  const c = s.state.consents[0];
  if (c.status !== 'withdrawn' || !c.withdrawal_confirmation || c.withdrawal_history.length !== 1) throw new Error('history wrong');
  if (c.withdrawal_confirmation.actor_id !== admin.id) throw new Error('server identity not bound');
  const r2 = await relay.runWithdrawalRelay(admin, { action: 'confirm_withdrawal', consent_id: 'SC-TEST-1',
    request_id: req.request_id, verification_method: 'callback to seller', verification_reference: 'VR-2' }, deps);
  if (!r2.already_withdrawn || c.withdrawal_history.length !== 1) throw new Error('duplicate confirmation appended');
});
await test('representative capacity requires explicit authority verification', async () => {
  const s = memoryStorage(); consentFixture(s); const deps = relayAdapter(s);
  const req = await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase,
    claimed_capacity: 'daughter of seller' }, deps);
  await relay.runWithdrawalRelay(admin, { action: 'confirm_withdrawal', consent_id: 'SC-TEST-1', request_id: req.request_id,
    verification_method: 'call', verification_reference: 'r' }, deps)
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'representative_authority_verification_required') throw e; });
  const ok = await relay.runWithdrawalRelay(admin, { action: 'confirm_withdrawal', consent_id: 'SC-TEST-1',
    request_id: req.request_id, verification_method: 'call', verification_reference: 'r',
    representative_authority_verified: true }, deps);
  if (!ok.ok) throw new Error('verified rep confirm failed');
});
await test('propagation blocked before confirmed withdrawal', async () => {
  const s = memoryStorage(); consentFixture(s); const deps = relayAdapter(s);
  const req = await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase }, deps);
  await relay.runWithdrawalRelay(admin, { action: 'propagate', consent_id: 'SC-TEST-1' }, deps)
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'administrator_confirmed_withdrawal_required') throw e; });
});
await test('failed notification retry: failed recipient retried, queued never duplicated (mock that deliberately fails)', async () => {
  const s = memoryStorage(); consentFixture(s); const deps = relayAdapter(s);
  deps.actualRecipients = async () => ({ ids: ['op-a', 'op-b'], unresolved: false });
  let failB = true;
  deps.notify = async (userId, c) => { if (userId === 'op-b' && failB) throw new Error('queue down'); return { id: `n-${userId}` }; };
  const req = await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase }, deps);
  await relay.runWithdrawalRelay(admin, { action: 'confirm_withdrawal', consent_id: 'SC-TEST-1',
    request_id: req.request_id, verification_method: 'm', verification_reference: 'r' }, deps);
  const p1 = await relay.runWithdrawalRelay(admin, { action: 'propagate', consent_id: 'SC-TEST-1' }, deps);
  if (p1.notification_state !== 'retry_required' || p1.queued_this_attempt !== 1 || p1.failed_this_attempt !== 1) throw new Error('partial failure wrong');
  if (p1.delivery_state !== 'unconfirmed') throw new Error('delivery claimed');
  failB = false; tick(1000);
  const p2 = await relay.runWithdrawalRelay(admin, { action: 'propagate', consent_id: 'SC-TEST-1' }, deps);
  if (p2.notification_state !== 'all_queued_or_none_required' || p2.queued_this_attempt !== 1) throw new Error('retry wrong');
  const queued = s.state.events.filter((e) => e.event_type === 'notification_queued').map((e) => e.recipient_user_id).sort();
  if (JSON.stringify(queued) !== JSON.stringify(['op-a', 'op-b'])) throw new Error('queued set wrong');
  const failed = s.state.events.filter((e) => e.event_type === 'notification_failed').length;
  if (failed !== 1) throw new Error('failed log wrong');
});
await test('unresolved delivery records block propagation (never assumed empty)', async () => {
  const s = memoryStorage(); consentFixture(s); const deps = relayAdapter(s);
  s.state.consents[0].intake_tracking.deal_id = null; // unresolved
  const req = await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase }, deps);
  await relay.runWithdrawalRelay(admin, { action: 'confirm_withdrawal', consent_id: 'SC-TEST-1',
    request_id: req.request_id, verification_method: 'm', verification_reference: 'r' }, deps);
  await relay.runWithdrawalRelay(admin, { action: 'propagate', consent_id: 'SC-TEST-1' }, deps)
    .then(() => { throw new Error('should have thrown'); }, (e) => {
      if (e.message !== 'recipient_delivery_records_unresolved') throw e; });
});
await test('concurrent propagations: CAS single winner', async () => {
  const s = memoryStorage(); consentFixture(s); const deps = relayAdapter(s);
  const origClaim = deps.claimPropagation;
  deps.claimPropagation = async (c) => { const won = await origClaim(c); if (won) await new Promise((r) => setTimeout(r, 30)); return won; };
  const req = await relay.runWithdrawalRelay(operator, { action: 'report_request', ...reqBase }, deps);
  await relay.runWithdrawalRelay(admin, { action: 'confirm_withdrawal', consent_id: 'SC-TEST-1',
    request_id: req.request_id, verification_method: 'm', verification_reference: 'r' }, deps);
  const both = await Promise.allSettled([relay.runWithdrawalRelay(admin, { action: 'propagate', consent_id: 'SC-TEST-1' }, deps),
    relay.runWithdrawalRelay(admin, { action: 'propagate', consent_id: 'SC-TEST-1' }, deps)]);
  const busy = both.filter((b) => b.status === 'rejected' && b.reason.message === 'propagation_in_progress').length;
  const queued = s.state.events.filter((e) => e.event_type === 'notification_queued').length;
  if (queued !== 1 || busy !== 1) throw new Error(`queued=${queued} busy=${busy}`);
});

// ── Eligibility control tests ──
await test('admin cannot backdate: start before verified_at blocks eligibility', async () => {
  const p = { status: 'verified', self_submitted: {}, verified: { verified_at: '2026-10-22T12:00:00Z',
    eligibility_effective_start: '2026-10-01T00:00:00Z', license_status: 'active', brokerage_legal_name: 'X',
    agreement_references: ['A1'], approved_jurisdictions: ['NJ'],
    verified_snapshot: { license_expiration: '2030-01-01' } } };
  const r = control.computeEffectiveEligibility(p, 'NJ', '2026-10-22T13:00:00Z');
  if (r.eligible || !r.reasons.some((x) => x.code === 'eligibility_not_effective')) throw new Error('backdating allowed');
});
await test('future effective start blocks; ended window blocks', async () => {
  const base = { status: 'verified', self_submitted: {}, verified: { verified_at: '2026-10-22T12:00:00Z',
    license_status: 'active', brokerage_legal_name: 'X', agreement_references: ['A1'],
    approved_jurisdictions: ['NJ'], verified_snapshot: { license_expiration: '2030-01-01' } } };
  const future = control.computeEffectiveEligibility({ ...base, verified: { ...base.verified, eligibility_effective_start: '2026-11-01T00:00:00Z' } }, 'NJ', '2026-10-22T13:00:00Z');
  if (future.eligible || !future.reasons.some((x) => x.code === 'eligibility_not_effective')) throw new Error('future start allowed');
  const ended = control.computeEffectiveEligibility({ ...base, verified: { ...base.verified, eligibility_effective_start: '2026-10-01T00:00:00Z', eligibility_effective_end: '2026-10-02T00:00:00Z' } }, 'NJ', '2026-10-22T13:00:00Z');
  if (ended.eligible || !ended.reasons.some((x) => x.code === 'eligibility_ended')) throw new Error('ended window allowed');
});
await test('expiration read ONLY from pinned snapshot; missing snapshot expiration blocks', async () => {
  const base = { status: 'verified', self_submitted: { license_expiration: '2030-01-01' }, verified: {
    verified_at: '2026-10-22T12:00:00Z', eligibility_effective_start: '2026-10-22T12:00:00Z',
    license_status: 'active', brokerage_legal_name: 'X', agreement_references: ['A1'],
    approved_jurisdictions: ['NJ'], verified_snapshot: {} } };
  const r = control.computeEffectiveEligibility(base, 'NJ', '2026-10-22T13:00:00Z');
  if (r.eligible || !r.reasons.some((x) => x.code === 'verified_expiration_unknown')) throw new Error('live claim trusted');
});
await test('sanitized submission ignores verified/status fields', async () => {
  const out = control.sanitizeSelfSubmission({ legal_name: 'A', license_number: '1',
    status: 'verified', verified: { license_status: 'active' }, eligibility_history: [{ forged: true }],
    eligibility_effective_start: '2020-01-01T00:00:00Z' });
  if (out.status !== undefined || out.verified !== undefined || out.eligibility_history !== undefined ||
      out.eligibility_effective_start !== undefined) throw new Error('non-applicant fields leaked');
});

// ── Response contract tests ──
await test('list-shaped body for an approve action is a VISIBLE failure', async () => {
  const listBody = { ok: true, operation: 'list', build_version: '2B-REPAIR-2026-10-22.1', schema_version: 2,
    compensation_enabled: false, profiles: [{ id: 'p1', user_id: 'u1', status: 'verified' }] };
  try { validateEligibilityResponse(listBody, 'review.approve', 'u1'); throw new Error('list body accepted'); }
  catch (e) { if (!e.message || e.message === 'list body accepted') throw e; }
});
await test('valid approve body passes contract', async () => {
  const body = { ok: true, operation: 'review.approve', build_version: '2B-REPAIR-2026-10-22.1', schema_version: 2,
    compensation_enabled: false, profile: { id: 'p1', user_id: 'u1', status: 'verified' } };
  validateEligibilityResponse(body, 'review.approve', 'u1');
});

const failures = results.filter((r) => !r.pass);
return {
  total: results.length, passed: results.length - failures.length, failed: failures.length,
  results: results.map((r) => `${r.pass ? 'PASS' : 'FAIL'} — ${r.name}${r.pass ? '' : ' :: ' + r.detail}`),
};