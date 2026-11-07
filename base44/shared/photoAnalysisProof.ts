/**
 * 200-photo proof suite for the canonical photo analysis pipeline.
 *
 * Every call goes through the SAME production functions the app runs
 * (runPhotoAnalysis + mutateSalePhotos + the real stage machine). Only the
 * providers and the storage transport are mocked, so this proves routing,
 * checkpointing, idempotence and contamination safety — it does not certify
 * real database atomicity or real provider behaviour.
 */
import { runPhotoAnalysis, JOB_KEY } from './photoAnalysis.ts';

const clone = value => structuredClone(value);

export async function photoAnalysisProof() {
  const checks = [];
  const assert = (condition, message) => { if (!condition) throw new Error(`FAILED: ${message}`); checks.push(message); };

  const user = { id: 'proof-operator', role: 'admin' };
  const SALE = 'proof-sale';

  /* ── mock storage with the same conditional-write contract ── */
  let record;
  let version = 0;
  let conflicts = 0;
  let dbFailures = 0;
  let failDbWrites = 0;

  const makePhotos = () => Array.from({ length: 200 }, (_, i) => ({
    url: `https://example.test/${i}.jpg`,
    name: i % 17 === 0 ? `Operator title ${i}` : '',
    description: '',
    price: i % 17 === 0 ? 42 : null,
    pipeline: {
      id: `p${i}`,
      revision: `r${i}`,
      edit_revision: 'initial',
      operator_fields: i % 17 === 0 ? ['name', 'price'] : [],
      jobs: {},
    },
  }));

  const service = {
    entities: {
      EstateSale: {
        get: async () => clone(record),
        filter: async () => [clone(record)],
        updateMany: async (query, update) => {
          await Promise.resolve();
          if (query.id !== SALE || !query.updated_date) throw new Error('Unversioned storage write');
          if (failDbWrites > 0) {
            failDbWrites -= 1;
            dbFailures += 1;
            throw Object.assign(new Error('database throttled'), { status: 429 });
          }
          if (query.updated_date !== record.updated_date) { conflicts += 1; return { updated: 0 }; }
          record = { ...record, ...clone(update.$set), updated_date: `v${++version}` };
          return { updated: 1 };
        },
      },
    },
  };

  /* ── mock providers ── */
  const calls = { describe: 0, research: 0, lens: 0 };
  let throttleDescribes = 0;
  const kindOf = id => {
    const i = Number(id.slice(1));
    if (i % 5 === 0) return 'group';
    if (i % 11 === 0) return 'single';
    if (i % 23 === 0) return 'uncertain';
    return 'single';
  };

  const describe = async photo => {
    calls.describe += 1;
    const id = photo.pipeline.id;
    if (throttleDescribes > 0) {
      throttleDescribes -= 1;
      throw Object.assign(new Error('provider rate limited'), { status: 429, retry_after: 1 });
    }
    await new Promise(r => setTimeout(r, Number(id.slice(1)) % 4));
    const kind = kindOf(id);
    if (kind === 'group') {
      return { photo_type: 'group', title: `Assorted goods ${id}`, description: `Includes mixed household items ${id}.`, subject_keywords: [], visible_facts: ['shelving with mixed items'], confidence: 'medium', uncertain: false, provider: 'mock' };
    }
    return { photo_type: 'single', title: `Basic item ${id}`, description: `A single photographed item ${id}.`, subject_keywords: [`keyword ${id}`], visible_facts: ['visible form'], confidence: kind === 'uncertain' ? 'low' : 'medium', uncertain: kind === 'uncertain', provider: 'mock' };
  };

  const lens = async photo => {
    calls.lens += 1;
    return { matches: [{ title: `Comparable ${photo.pipeline.id}`, price: 60, source: 'mock', link: 'https://example.test/c' }], price_note: 'Mock asking prices' };
  };

  const research = async (photo, basic) => {
    calls.research += 1;
    const id = photo.pipeline.id;
    await new Promise(r => setTimeout(r, Number(id.slice(1)) % 3));
    const unsure = Number(id.slice(1)) % 29 === 0;
    return {
      identified: !unsure,
      title: unsure ? basic.title : `Research item ${id}`,
      description: unsure ? basic.description : `Researched description ${id}.`,
      suggested_price: unsure ? null : 24,
      price_low: unsure ? null : 18,
      price_high: unsure ? null : 30,
      price_basis: unsure ? '' : 'Mock comparables priced far below online asking.',
      confidence: unsure ? 'low' : 'medium',
      review_reasons: unsure ? ['Search results did not clearly match the item'] : [],
      evidence: { source: 'mock_lens', match_count: 1, avg_asking: 60, min_asking: 60, max_asking: 60, note: 'Mock asking prices', matches: [], retrieved_at: new Date().toISOString() },
      provider: 'mock',
    };
  };

  let creditRemaining = 1000;
  const credits = async () => ({ allowed: creditRemaining > 0, remaining: creditRemaining });
  const spendCredit = async () => {
    if (creditRemaining <= 0) return { allowed: false, remaining: 0 };
    creditRemaining -= 1;
    return { allowed: true, remaining: creditRemaining };
  };

  const invoke = body => runPhotoAnalysis({ service, user, saleId: SALE, body, describe, research, lens, credits, spendCredit });

  /** Runs the same bounded-concurrency loop the browser runs. */
  async function drain(lanes = 3) {
    let processed = 0;
    await Promise.all(Array.from({ length: lanes }, async () => {
      for (;;) {
        const result = await invoke({ action: 'next' });
        if (result.photo) processed += 1;
        if (result.done) return;
      }
    }));
    return processed;
  }

  const photoOf = id => record.images.find(p => p.pipeline.id === id);
  const jobOf = id => photoOf(id)?.pipeline?.jobs?.[JOB_KEY];

  /* ── 1. fresh 200-photo run, mixed kinds ── */
  record = { id: SALE, operator_id: user.id, updated_date: 'v0', images: makePhotos() };
  const processed = await drain(3);
  const afterFirst = clone(calls);
  assert(processed === 200, 'all 200 photos were processed exactly once');
  assert(calls.describe === 200, 'one description call per photo');
  assert(calls.research > 0 && calls.research < 200, 'research ran only for single-item photos');

  let groupWithPrice = 0;
  let contaminated = 0;
  let operatorLost = 0;
  let listingPriceTouched = 0;
  for (let i = 0; i < 200; i += 1) {
    const photo = photoOf(`p${i}`);
    const job = jobOf(`p${i}`);
    const isOperator = i % 17 === 0;
    const kind = kindOf(`p${i}`);
    if (!photo.name) contaminated += 1;
    if (!isOperator && !photo.name.includes(`p${i}`)) contaminated += 1;
    if (isOperator && photo.name !== `Operator title ${i}`) operatorLost += 1;
    if (kind === 'group') {
      if (job.research) groupWithPrice += 1;
      if (photo.ai_first_search_price != null) groupWithPrice += 1;
    }
    if (!isOperator && photo.price != null) listingPriceTouched += 1;
  }
  assert(contaminated === 0, 'no cross-photo title or description contamination');
  assert(operatorLost === 0, 'operator titles were never overwritten');

  /* ── 2. group photos never researched or priced ── */
  assert(groupWithPrice === 0, 'group photos were never researched or priced');
  assert(listingPriceTouched === 0, 'AI never wrote the operator listing price');

  /* ── 3. re-running reuses finished work (resume after reload) ── */
  const reloadProcessed = await drain(3);
  assert(reloadProcessed === 0, 'reopening the tab reuses every completed result');
  assert(calls.describe === afterFirst.describe && calls.research === afterFirst.research, 'no provider was called again on resume');

  /* ── 4. duplicate clicks cannot double-charge or double-apply ── */
  const dupTargets = ['p1', 'p2', 'p3', 'p4', 'p6'];
  for (const id of dupTargets) await invoke({ action: 'reanalyze', photo_id: id });
  const beforeDup = clone(calls);
  await Promise.all(Array.from({ length: 8 }, () => invoke({ action: 'next' })));
  await Promise.all(Array.from({ length: 8 }, () => invoke({ action: 'next' })));
  const dupDescribes = calls.describe - beforeDup.describe;
  assert(dupDescribes <= 5, 'simultaneous clicks claimed each photo once');
  await drain(3);

  /* ── 5. provider throttling: capped retry with backoff, then recovery ── */
  for (const id of ['p30', 'p31']) await invoke({ action: 'reanalyze', photo_id: id });
  throttleDescribes = 1;
  const throttled = await invoke({ action: 'next' });
  assert(throttled.state === 'failed' && throttled.error, 'a throttled photo stops with an actionable reason');
  const throttledJob = jobOf(throttled.photo.pipeline.id);
  assert(throttledJob.retryable === true && !!throttledJob.retry_at, 'transient failure is scheduled for retry, not dropped');
  await invoke({ action: 'retry_failed' });
  await drain(3);
  assert(jobOf(throttled.photo.pipeline.id).state !== 'failed', 'retried photo recovers without losing work');

  /* ── 6. database throttling during the save: research is not repeated ── */
  await invoke({ action: 'reanalyze', photo_id: 'p40' });
  await invoke({ action: 'next' });
  const beforeSaveFail = clone(calls);
  await invoke({ action: 'reanalyze', photo_id: 'p41' });
  failDbWrites = 2;
  await invoke({ action: 'next' });
  await drain(3);
  const researchAfterDbFail = calls.research - beforeSaveFail.research;
  assert(dbFailures > 0, 'database throttling was actually exercised');
  assert(researchAfterDbFail <= 2, 'a failed save retried the write, not the paid search');
  assert(!!jobOf('p41')?.research, 'paid research survived the failed save');

  /* ── 7. operator edit during processing is preserved ── */
  await invoke({ action: 'reanalyze', photo_id: 'p50' });
  await invoke({ action: 'next' });
  const p50 = photoOf('p50');
  await invoke({ action: 'save_fields', photo_id: 'p50', image_revision: p50.pipeline.revision, edit_revision: p50.pipeline.edit_revision, fields: { name: 'Operator wins', description: 'Operator description' } });
  await invoke({ action: 'reanalyze', photo_id: 'p50' });
  await drain(3);
  assert(photoOf('p50').name === 'Operator wins', 'a later AI run never overwrites an operator edit');

  /* ── 8. operator classification change routes the next run ── */
  const groupPhoto = 'p100'; // 100 % 5 === 0 -> group
  assert(!jobOf(groupPhoto).research, 'target photo starts as a group');
  const beforeReclass = clone(calls);
  await invoke({ action: 'classify', photo_id: groupPhoto, classification: 'single' });
  assert(jobOf(groupPhoto).review_flags.some(f => /research not run yet/i.test(f)), 'switching to single says research has not run');
  await invoke({ action: 'next' });
  await drain(3);
  assert(calls.research === beforeReclass.research + 1, 'researching a group photo costs exactly one search');
  assert(jobOf(groupPhoto).research?.suggested_price === 24, 'researched group photo receives a suggested price');
  await invoke({ action: 'classify', photo_id: groupPhoto, classification: 'group' });
  assert(jobOf(groupPhoto).research === null, 'switching back to group drops the item-level research claim');

  /* ── 9. applying a suggested price is an explicit operator action ── */
  const priceTarget = 'p1';
  const suggested = jobOf(priceTarget)?.research?.suggested_price;
  assert(typeof suggested === 'number', 'a suggested price exists to apply');
  assert(photoOf(priceTarget).price == null, 'suggested price is not the listing price');
  await invoke({ action: 'apply_price', photo_id: priceTarget });
  assert(photoOf(priceTarget).price === suggested, 'applying the suggested price writes the listing price once asked');

  /* ── 10. replaced image invalidates the stale result ── */
  const replacedPhoto = clone(photoOf('p70'));
  const staleResult = jobOf('p70');
  record = { ...record, updated_date: `v${++version}`, images: record.images.map(p => p.pipeline.id === 'p70' ? { ...p, url: 'https://example.test/replaced-70.jpg', pipeline: { ...p.pipeline, revision: 'r70-new', jobs: {} } } : p) };
  assert(staleResult.revision !== photoOf('p70').pipeline.revision, 'image revision changed before the stale write');
  await invoke({ action: 'save_fields', photo_id: 'p70', image_revision: replacedPhoto.pipeline.revision, edit_revision: replacedPhoto.pipeline.edit_revision, fields: { name: 'Stale edit' } }).then(() => { throw new Error('FAILED: stale image write was accepted'); }).catch(error => { assert(/revision|replaced|reload/i.test(error.message), 'stale image revision is rejected'); });
  await invoke({ action: 'next' });
  await drain(3);
  assert(jobOf('p70') && jobOf('p70').revision === 'r70-new', 'replaced image was re-analyzed against its new revision');

  /* ── 11. exhausted credits keep completed work and basic descriptions ── */
  const creditScope = new Set(Array.from({ length: 40 }, (_, i) => `p${i}`));
  record = {
    ...record,
    updated_date: `v${++version}`,
    images: record.images.map(p => creditScope.has(p.pipeline.id) ? { ...p, name: '', description: '', ai_first_search_price: null, ai_deep_search_price: null, synopsis: '', pipeline: { ...p.pipeline, jobs: {}, operator_fields: (p.pipeline.operator_fields || []).filter(f => f !== 'name') } } : p),
  };
  creditRemaining = 3;
  await drain(3);
  const awaiting = record.images.filter(p => jobOf(p.pipeline.id)?.state === 'awaiting_credits');
  const groupsDone = record.images.filter(p => jobOf(p.pipeline.id)?.state === 'ready' && jobOf(p.pipeline.id)?.classification === 'group');
  assert(awaiting.length > 0, 'photos needing research are marked as awaiting credits');
  assert(groupsDone.length > 0, 'group photos still finish with a description when credits run out');
  assert(awaiting.every(p => !!p.description), 'awaiting-credit photos keep their basic description');
  assert(awaiting.every(p => p.ai_first_search_price == null), 'awaiting-credit photos never carry an invented price');
  creditRemaining = 1000;
  await invoke({ action: 'next' });
  await drain(3);
  assert(record.images.filter(p => jobOf(p.pipeline.id)?.state === 'awaiting_credits').length === 0, 'topping up credits finishes the remaining research');

  /* ── 12. interrupted search is disclosed, never silently re-billed ── */
  await invoke({ action: 'reanalyze', photo_id: 'p80' });
  const claim = await invoke({ action: 'next' });
  const interruptedId = claim.photo?.pipeline.id || 'p80';
  const interruptedJob = jobOf(interruptedId);
  if (interruptedJob) {
    interruptedJob.state = 'running';
    interruptedJob.stage = 'researching';
    interruptedJob.claimed_at = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    record = { ...record, updated_date: `v${++version}` };
  }
  await invoke({ action: 'next' });
  assert(jobOf(interruptedId).state === 'outcome_unknown', 'an interrupted paid search is disclosed as outcome unknown');

  return {
    scope: '200 mocked photos driven through the production analysis function and conditional-write store',
    checks_passed: checks,
    check_count: checks.length,
    mock_calls: calls,
    conditional_conflicts: conflicts,
    database_throttle_events: dbFailures,
    live_provider_calls: 0,
    live_database_atomicity_verified: false,
  };
}