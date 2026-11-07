// Deterministic Step 1 sorting proof. The LLM is mocked; the REAL claim,
// revision check, persistence and retry policy (same as usePhotoSorting) are
// exercised against an in-memory single-record store. No providers, credits or
// real database writes.
import { runPhotoAssessment, assessmentOf, step2Eligible } from './photoAssessment.ts';

const CLASSIFICATION_FOR_INDEX = i => (i % 11 === 0 ? 'multiple_items' : i % 13 === 0 ? 'uncertain' : i % 5 === 0 ? 'coherent_set' : 'single_item');
const DECISION_FOR = { single_item: 'scan', coherent_set: 'scan', multiple_items: 'skip', uncertain: 'needs_review' };
const TRANSIENT_FAILURES = new Set([3, 57, 158]);
const PERMANENT_FAILURE = 42;

export async function photoAssessmentProof() {
  const clone = value => structuredClone(value);
  const user = { id: 'mock-operator', role: 'admin', full_name: 'Mock Operator' };
  let record = {
    id: 'mock-sale-200',
    operator_id: user.id,
    updated_date: 'v1',
    images: Array.from({ length: 200 }, (_, i) => ({
      url: `https://example.test/${i}.jpg`,
      name: i % 13 === 0 ? `Operator title ${i}` : '',
      description: i % 13 === 0 ? `Operator description ${i}` : '',
      price: i % 13 === 0 ? 777 : null,
      ai_first_search_price: i % 17 === 0 ? 1200 : null,
      skip_serp_search: false,
      serp_search_status: 'search_allowed',
      pipeline: {
        id: `p${i}`,
        revision: `r${i}`,
        edit_revision: 'initial',
        operator_fields: i % 13 === 0 ? ['name', 'description', 'price'] : [],
        jobs: i >= 20 && i < 25 ? { classify: { id: `c${i}`, revision: `r${i}`, state: 'completed', result: { classification: 'single' } } } : {},
      },
    })),
  };
  let version = 1;
  const service = { entities: { EstateSale: {
    get: async () => clone(record),
    updateMany: async (query, update) => {
      await Promise.resolve();
      if (query.id !== record.id || query.updated_date !== record.updated_date) return { updated: 0 };
      record = { ...record, ...clone(update.$set), updated_date: `v${++version}` };
      return { updated: 1 };
    },
  } } };

  // ---- mocked Base44 onboard LLM ----
  const llmCalls = [];
  const attempts = new Map();
  let active = 0;
  let maxActive = 0;
  const assess = async photo => {
    const i = Number(photo.pipeline.id.slice(1));
    llmCalls.push(photo.pipeline.id);
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active -= 1;
    const attempt = (attempts.get(photo.pipeline.id) || 0) + 1;
    attempts.set(photo.pipeline.id, attempt);
    if (i === PERMANENT_FAILURE) throw Object.assign(new Error('Mock provider rejected the request'), { status: 400 });
    if (TRANSIENT_FAILURES.has(i) && attempt === 1) throw Object.assign(new Error('Mock rate limit'), { status: 429 });
    return { classification: CLASSIFICATION_FOR_INDEX(i), reason: `Mock reason ${i}` };
  };

  const pool = async (items, worker) => {
    const queue = [...items];
    await Promise.all(Array.from({ length: Math.min(4, queue.length || 1) }, async () => {
      while (queue.length) await worker(queue.shift());
    }));
  };

  // Mirrors usePhotoSorting.assessOne exactly: capped retries for retryable failures only.
  const sortPhotos = async (photoIds, { retryFailed = false } = {}) => {
    const targets = photoIds
      .map(id => record.images.find(p => p.pipeline.id === id))
      .filter(Boolean)
      .map(p => ({ photo_id: p.pipeline.id, image_revision: p.pipeline.revision }));
    await pool(targets, async target => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await runPhotoAssessment({
          service, user, saleId: record.id, target,
          retryFailed: retryFailed || attempt > 1, assess,
        });
        const assessment = result.assessment || {};
        if (assessment.status === 'failed' && assessment.retryable && attempt < 3) continue;
        return assessment;
      }
    });
  };

  const checks = [];
  const check = async (name, fn) => {
    try { const detail = await fn(); checks.push({ name, ok: true, detail: detail === undefined ? 'ok' : detail }); }
    catch (error) { checks.push({ name, ok: false, detail: String(error.message || error) }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const allIds = record.images.map(p => p.pipeline.id);
  const photoById = id => record.images.find(p => p.pipeline.id === id);

  // 1. Full pass over 200 photos.
  await sortPhotos(allIds);
  const firstPassCalls = llmCalls.length;

  await check('200 photos sorted in one pass', () => {
    const assessed = allIds.filter(id => ['assessed', 'failed'].includes(assessmentOf(photoById(id)).status));
    assert(assessed.length === 200, `only ${assessed.length}/200 settled`);
    return '200/200 settled';
  });

  await check('decision mapping matches the persisted classification', () => {
    for (let i = 0; i < 200; i += 1) {
      const assessment = assessmentOf(photoById(`p${i}`));
      if (i === PERMANENT_FAILURE) continue;
      assert(assessment.classification === CLASSIFICATION_FOR_INDEX(i), `p${i} classification ${assessment.classification}`);
      assert(assessment.decision === DECISION_FOR[CLASSIFICATION_FOR_INDEX(i)], `p${i} decision ${assessment.decision}`);
      assert(assessment.source === 'ai', `p${i} source ${assessment.source}`);
    }
    return 'scan / skip / needs_review all derived correctly';
  });

  await check('failed assessment never becomes Scan or Skip', () => {
    const assessment = assessmentOf(photoById(`p${PERMANENT_FAILURE}`));
    assert(assessment.status === 'failed', `status ${assessment.status}`);
    assert(assessment.decision === null, `decision ${assessment.decision}`);
    assert(!step2Eligible(photoById(`p${PERMANENT_FAILURE}`)), 'failed photo became Step 2 eligible');
    return 'stays failed and out of Step 2';
  });

  await check('capped retries: transient failures retried once, permanent not retried', () => {
    assert(llmCalls.length === 200 + TRANSIENT_FAILURES.size, `${llmCalls.length} calls for 200 photos`);
    for (const i of TRANSIENT_FAILURES) {
      const count = llmCalls.filter(id => id === `p${i}`).length;
      assert(count === 2, `p${i} called ${count}×`);
    }
    assert(llmCalls.filter(id => id === `p${PERMANENT_FAILURE}`).length === 1, 'permanent failure retried');
    return `${llmCalls.length} calls = 200 + ${TRANSIENT_FAILURES.size} retries`;
  });

  await check('bounded concurrency (max 4 in flight)', () => {
    assert(maxActive <= 4, `max ${maxActive} concurrent`);
    return `max ${maxActive} concurrent LLM calls`;
  });

  // 2. Resume after interruption: everything settled → no repeat work.
  await sortPhotos(allIds.filter(id => ['none', 'pending'].includes(assessmentOf(photoById(id)).status)));
  await check('resume repeats no completed assessment', () => {
    assert(llmCalls.length === firstPassCalls, `${llmCalls.length - firstPassCalls} extra calls`);
    return '0 new LLM calls on resume';
  });

  // 3. Operator overrides persist and survive repeat sorting.
  await runPhotoAssessment({ service, user, saleId: record.id, target: { photo_id: 'p5', image_revision: 'r5' }, action: 'override', decision: 'skip' });
  await runPhotoAssessment({ service, user, saleId: record.id, target: { photo_id: 'p6', image_revision: 'r6' }, action: 'override', decision: 'scan' });
  await check('operator override is stored with its source', () => {
    const overridden = assessmentOf(photoById('p5'));
    assert(overridden.decision === 'skip' && overridden.source === 'operator', `p5 ${overridden.decision}/${overridden.source}`);
    const scanned = assessmentOf(photoById('p6'));
    assert(scanned.decision === 'scan' && scanned.source === 'operator', `p6 ${scanned.decision}/${scanned.source}`);
    assert(photoById('p6').pipeline.classification === 'single', 'operator scan did not align classification');
    return 'p5 skip / p6 scan, source operator';
  });

  const beforeOverrideResort = llmCalls.length;
  await sortPhotos(['p5', 'p6']);
  const cached = await runPhotoAssessment({ service, user, saleId: record.id, target: { photo_id: 'p5', image_revision: 'r5' }, assess });
  await check('override survives repeat sorting without re-billing', () => {
    assert(llmCalls.length === beforeOverrideResort, `${llmCalls.length - beforeOverrideResort} extra calls`);
    assert(cached.cached === true, 'repeat assessment was not served from the receipt');
    assert(assessmentOf(photoById('p5')).decision === 'skip', 'override lost');
    return 'no new LLM calls, override kept';
  });

  // 4. A changed image revision is re-assessed from scratch.
  const beforeRevision = llmCalls.length;
  record = {
    ...record,
    updated_date: `v${++version}`,
    images: record.images.map(photo => (['p10', 'p11'].includes(photo.pipeline.id)
      ? { ...photo, pipeline: { ...photo.pipeline, revision: `${photo.pipeline.revision}-new`, jobs: { ...photo.pipeline.jobs, assessment: photo.pipeline.jobs.assessment } }, name: '' }
      : photo)),
  };
  await check('stale assessment is ignored after an image revision change', () => {
    assert(assessmentOf(photoById('p10')).status === 'none', 'old revision still counted');
    assert(!step2Eligible(photoById('p10')), 'stale scan still eligible');
    return 'revision change invalidates the assessment';
  });
  await sortPhotos(['p10', 'p11']);
  await check('only the changed photos are re-assessed', () => {
    assert(llmCalls.length === beforeRevision + 2, `${llmCalls.length - beforeRevision} calls for 2 changed photos`);
    assert(assessmentOf(photoById('p10')).status === 'assessed', 'changed photo not re-assessed');
    return '+2 LLM calls for 2 changed photos';
  });

  // 5. Nothing else on the photos was touched.
  await check('names, descriptions, prices and other jobs are untouched', () => {
    for (const i of [0, 13, 26, 39]) {
      const photo = photoById(`p${i}`);
      assert(photo.name === `Operator title ${i}`, `p${i} name changed`);
      assert(photo.description === `Operator description ${i}`, `p${i} description changed`);
      assert(photo.price === 777, `p${i} price changed`);
    }
    for (const i of [17, 34]) assert(photoById(`p${i}`).ai_first_search_price === 1200, `p${i} AI price changed`);
    for (let i = 20; i < 25; i += 1) assert(photoById(`p${i}`).pipeline.jobs.classify?.state === 'completed', `p${i} classify receipt lost`);
    return 'operator content, AI prices and classify receipts intact';
  });

  // 6. Step 2 sees exactly the Scan set.
  await check('Step 2 eligible set equals the Scan decisions', () => {
    const eligible = record.images.filter(step2Eligible).map(p => p.pipeline.id).sort();
    const scans = record.images.filter(p => assessmentOf(p).decision === 'scan').map(p => p.pipeline.id).sort();
    assert(eligible.length === scans.length, `${eligible.length} eligible vs ${scans.length} scans`);
    assert(JSON.stringify(eligible) === JSON.stringify(scans), 'eligible set differs from scan set');
    assert(!eligible.includes(`p${PERMANENT_FAILURE}`), 'failed photo eligible');
    return `${eligible.length} eligible = ${scans.length} scan decisions`;
  });

  return {
    passed: checks.every(c => c.ok),
    checks,
    llm_calls: llmCalls.length,
    real_provider_calls: 0,
    real_database_writes: 0,
  };
}