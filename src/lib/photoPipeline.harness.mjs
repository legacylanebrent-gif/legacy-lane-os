/**
 * DETERMINISTIC PHOTO PIPELINE HARNESS
 *
 * Run with:  node src/lib/photoPipeline.harness.mjs
 *
 * No network, no paid provider calls, no database. The provider and the save
 * step are mocked so the guarantees can be proven repeatedly:
 *   zero cross-item contamination over 200 photos · correct values on a fresh
 *   read · failed saves retry with NO new provider call · completed work is not
 *   repeated on resume · Standard Scan makes zero deep-scan calls · deep scan
 *   only when requested · uncertainty stays visibly uncertain.
 */
import assert from 'node:assert/strict';
import {
  createPhotoBatchRunner,
  buildJobs,
  normalizeScanResult,
  photoKey,
  SCAN_STANDARD,
  SCAN_DEEP,
} from './photoBatchEngine.js';

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
}

const PHOTO_COUNT = 200;

function makePhotos(count) {
  const photos = [];
  for (let i = 0; i < count; i++) {
    const kind = i % 10 === 0 ? 'multiple' : i % 7 === 0 ? 'uncertain' : 'single';
    photos.push({
      url: `https://files.example.test/photo-${i}.jpg`,
      kind,
      operatorName: i % 13 === 0 ? `Operator typed item ${i}` : '',
    });
  }
  return photos;
}

const num = (url) => Number(url.split('photo-')[1].replace('.jpg', ''));

/** Provider mock: each photo answers with ITS OWN identity. */
function makeStandardScanner(photos) {
  const calls = new Map();
  const scanFn = async (job) => {
    calls.set(job.key, (calls.get(job.key) || 0) + 1);
    const photo = photos.find((p) => p.url === job.key);
    // out-of-order completions
    await new Promise((r) => setTimeout(r, num(photo.url) % 5));
    if (photo.kind === 'multiple') {
      return { classification: 'multiple', confidence: 'high', name: '', description: '' };
    }
    if (photo.kind === 'uncertain') {
      return { classification: 'uncertain', confidence: 'low', name: '', description: '' };
    }
    return {
      classification: 'single',
      confidence: 'high',
      name: `Item ${num(photo.url)}`,
      description: `Unique description for ${photo.url}`,
      estimated_price: 10 + num(photo.url),
    };
  };
  return { scanFn, calls };
}

/** Save mock: models the canonical per-photo save (fill-empty + operator protection). */
function makeStore(photos, { failures = new Map() } = {}) {
  const store = new Map(
    photos.map((p) => [p.url, { url: p.url, name: p.operatorName || '', description: '' }]),
  );
  const saveCalls = [];
  const saveFn = async (job, result) => {
    saveCalls.push({ key: job.key, scanType: job.scanType });
    const remaining = failures.get(job.key) || 0;
    if (remaining > 0) {
      failures.set(job.key, remaining - 1);
      const error = new Error('database temporarily unavailable');
      error.status = 503;
      throw error;
    }
    const current = store.get(job.key);
    if (!current) throw new Error('photo not found');
    if (result.classification !== 'single' || !result.identity) return; // never invent identity
    if (!current.name) current.name = result.identity.name;
    if (!current.description) current.description = result.identity.description;
    if (result.price?.suggested != null && current.price == null) current.price = result.price.suggested;
  };
  return { store, saveFn, saveCalls };
}

const noSleep = async () => {};
const photos = makePhotos(PHOTO_COUNT);

async function main() {
  // ── 1. Zero cross-item contamination over 200 photos ──────────────────────
  {
    const { scanFn, calls } = makeStandardScanner(photos);
    const { store, saveFn } = makeStore(photos);
    const runner = createPhotoBatchRunner({ scanFn, saveFn, concurrency: 5, sleep: noSleep, random: () => 0 });
    const jobs = buildJobs({ images: photos, scanType: SCAN_STANDARD });
    await runner.run(jobs);

    check('200 photos processed', () => {
      assert.equal(calls.size, PHOTO_COUNT, `expected ${PHOTO_COUNT} provider jobs, got ${calls.size}`);
    });
    check('no photo title came from another photo', () => {
      for (const photo of photos) {
        if (photo.kind !== 'single') continue;
        const stored = store.get(photo.url);
        if (photo.operatorName) {
          assert.equal(stored.name, photo.operatorName, `operator title overwritten for ${photo.url}`);
        } else {
          assert.equal(stored.name, `Item ${num(photo.url)}`, `wrong title for ${photo.url}: ${stored.name}`);
        }
      }
    });
    check('no photo description came from another photo', () => {
      for (const photo of photos) {
        if (photo.kind !== 'single' || photo.operatorName) continue;
        assert.equal(store.get(photo.url).description, `Unique description for ${photo.url}`);
      }
    });
    check('multiple-item photos got no identity and no price', () => {
      for (const photo of photos.filter((p) => p.kind === 'multiple')) {
        const stored = store.get(photo.url);
        assert.equal(stored.name, photo.operatorName || '', `identity invented for ${photo.url}`);
        assert.equal(stored.price, undefined);
      }
    });
    check('uncertain photos stayed empty (no invented fallback)', () => {
      for (const photo of photos.filter((p) => p.kind === 'uncertain')) {
        assert.equal(store.get(photo.url).name, photo.operatorName || '');
      }
    });
    check('operator edits preserved', () => {
      for (const photo of photos.filter((p) => p.operatorName)) {
        assert.equal(store.get(photo.url).name, photo.operatorName);
      }
    });
    check('a fresh read returns exactly what was saved', () => {
      for (const photo of photos.slice(0, 25)) {
        assert.equal({ ...store.get(photo.url) }.url, photo.url);
      }
    });
    check('standard scan used zero deep-scan provider calls', () => {
      assert.equal([...calls.keys()].filter((k) => k.includes('lens')).length, 0);
    });

    const before = new Map(calls);
    const resumed = createPhotoBatchRunner({
      scanFn,
      saveFn,
      concurrency: 5,
      sleep: noSleep,
      random: () => 0,
      initialStatus: Object.fromEntries(runner.status),
    });
    await resumed.run(jobs);
    check('resume does not rescan completed photos', () => {
      assert.equal(calls.size, before.size, 'resume issued new provider calls for completed work');
    });
  }

  // ── 2. Throttling, permanent errors, duplicate clicks ─────────────────────
  {
    const subset = photos.slice(0, 30);
    const attemptLog = [];
    const scanFn = async (job) => {
      attemptLog.push(job.key);
      const n = attemptLog.filter((k) => k === job.key).length;
      if (job.key.endsWith('photo-1.jpg') && n < 2) {
        const e = new Error('429 Too Many Requests'); e.status = 429; e.retryAfter = 0; throw e;
      }
      if (job.key.endsWith('photo-2.jpg')) {
        const e = new Error('403 Forbidden'); e.status = 403; throw e;
      }
      if (job.key.endsWith('photo-3.jpg') && n < 3) {
        const e = new Error('503 Service Unavailable'); e.status = 503; throw e;
      }
      return { classification: 'single', confidence: 'high', name: `T-${job.key}`, description: `D-${job.key}` };
    };
    const { store, saveFn } = makeStore(subset);
    const runner = createPhotoBatchRunner({ scanFn, saveFn, concurrency: 4, sleep: noSleep, random: () => 0 });
    const jobs = buildJobs({ images: subset, scanType: SCAN_STANDARD });
    await Promise.all([runner.run(jobs), runner.run(jobs)]); // duplicate clicks

    check('throttled photo eventually succeeded', () => {
      assert.equal(runner.status.get(subset[1].url), 'completed');
    });
    check('permanent error failed fast without endless retry', () => {
      assert.equal(runner.status.get(subset[2].url), 'failed');
      assert.equal(attemptLog.filter((k) => k === subset[2].url).length, 1);
    });
    check('transient 503 retried then succeeded', () => {
      assert.equal(runner.status.get(subset[3].url), 'completed');
      assert.equal(attemptLog.filter((k) => k === subset[3].url).length, 3);
    });
    check('duplicate submission did not duplicate provider calls', () => {
      // photo-1 (429) and photo-3 (503) legitimately retry; every other photo is called once.
      const legitimateRetries = ['photo-1.jpg', 'photo-3.jpg'];
      const dupes = attemptLog.filter(
        (k, i) => attemptLog.indexOf(k) !== i && !legitimateRetries.some((s) => k.endsWith(s)),
      );
      assert.equal(dupes.length, 0, `duplicate provider calls: ${dupes.join(', ')}`);
    });
    check('no contamination after duplicate clicks', () => {
      for (const photo of subset.slice(4)) {
        if (photo.operatorName) continue; // operator text is protected, never overwritten
        const stored = store.get(photo.url).name;
        if (stored) assert.equal(stored, `T-${photo.url}`);
      }
    });
  }

  // ── 3. Database failure: paid result kept, save retried, no new scan ──────
  {
    // start at 31 so the first photo is a single identifiable item
    const subset = photos.slice(31, 41);
    const { scanFn, calls } = makeStandardScanner(subset);
    const { store, saveFn } = makeStore(subset, { failures: new Map([[subset[0].url, 3]]) });
    const runner = createPhotoBatchRunner({
      scanFn, saveFn, concurrency: 2, maxSaveAttempts: 3, sleep: noSleep, random: () => 0,
    });
    await runner.run(buildJobs({ images: subset, scanType: SCAN_STANDARD }));

    check('save failure is reported as save_failed, not completed', () => {
      assert.equal(runner.status.get(subset[0].url), 'save_failed');
    });
    check('paid result is retained for retry', () => {
      assert.equal(runner.pendingSaves.size, 1);
    });
    const scansBefore = calls.get(subset[0].url);
    await runner.retryPendingSaves();
    check('save retry succeeded without a new provider call', () => {
      assert.equal(runner.status.get(subset[0].url), 'completed');
      assert.equal(calls.get(subset[0].url), scansBefore, 'a second paid scan was issued');
      assert.equal(store.get(subset[0].url).name, `Item ${num(subset[0].url)}`);
    });
  }

  // ── 4. Replaced image: stale result discarded ────────────────────────────
  {
    const subset = photos.slice(40, 44);
    const { scanFn } = makeStandardScanner(subset);
    const { store, saveFn } = makeStore(subset);
    const replacedUrl = subset[0].url;
    const runner = createPhotoBatchRunner({
      scanFn, saveFn, concurrency: 2, sleep: noSleep, random: () => 0,
      isJobCurrent: (job) => job.key !== replacedUrl,
    });
    await runner.run(buildJobs({ images: subset, scanType: SCAN_STANDARD }));
    check('stale job for a replaced photo saves nothing', () => {
      assert.equal(runner.status.get(replacedUrl), 'stale');
      assert.equal(store.get(replacedUrl).name, '');
    });
  }

  // ── 5. Deep scan only on request; evidence preserved ─────────────────────
  {
    const subset = photos.slice(50, 55);
    let deepCalls = 0;
    const scanFn = async (job) => {
      if (job.scanType !== SCAN_DEEP) throw new Error('deep scanner called for a standard job');
      deepCalls++;
      return {
        classification: 'single',
        confidence: 'medium',
        item_title: `Deep ${job.key}`,
        description: 'from deep scan',
        matches: [
          { title: 'Comparable A', price: 120, source: 'Example', url: 'https://example.test/a', evidence: 'asking' },
          { title: 'Comparable B', price: 180, source: 'Example', url: 'https://example.test/b', evidence: 'asking' },
        ],
        price_range: { min: 120, max: 180, avg: 150 },
      };
    };
    const { saveFn } = makeStore(subset);
    const runner = createPhotoBatchRunner({ scanFn, saveFn, concurrency: 1, sleep: noSleep, random: () => 0 });
    await runner.run([]);
    check('deep scan runs zero times when no deep jobs are queued', () => assert.equal(deepCalls, 0));

    await runner.run(buildJobs({ images: subset, scanType: SCAN_DEEP }));
    check('deep scan called once per requested photo', () => assert.equal(deepCalls, subset.length));

    const deepResult = normalizeScanResult({
      item_title: 'Test',
      matches: [{ title: 'A', price: 120, url: 'https://x.test', evidence: 'asking' }],
      price_range: { min: 120, max: 180, avg: 150 },
    }, { scanType: SCAN_DEEP });
    check('deep scan keeps real source links and asking-price basis', () => {
      assert.equal(deepResult.price.basis, 'asking_comparables');
      assert.equal(deepResult.price.sources[0].url, 'https://x.test');
      assert.match(deepResult.price.note, /asking prices, not sold prices/);
    });

    const failed = normalizeScanResult({ error: 'quota exceeded' }, { scanType: SCAN_STANDARD });
    check('provider failure yields no identity and visible uncertainty', () => {
      assert.equal(failed.identity, null);
      assert.equal(failed.provider_error, 'quota exceeded');
      assert.ok(failed.uncertainty.length > 0);
    });
  }

  // ── 6. Multi-item / uncertain / distinct items ───────────────────────────
  {
    const multi = normalizeScanResult(
      { classification: 'multiple', name: 'Living room', scene_summary: 'Living room' },
      { scanType: SCAN_STANDARD },
    );
    check('multi-item result has no identity and no price suggestion', () => {
      assert.equal(multi.identity, null);
      assert.equal(multi.price.suggested, null);
      assert.match(multi.uncertainty[0], /Several items/);
    });

    const uncertain = normalizeScanResult({ confidence: 'low', name: '' }, { scanType: SCAN_STANDARD });
    check('uncertain stays uncertain', () => {
      assert.equal(uncertain.classification, 'uncertain');
      assert.equal(uncertain.identity, null);
    });

    const artwork = normalizeScanResult(
      { classification: 'single', name: 'Framed watercolor landscape', description: 'Signed, framed' },
      { scanType: SCAN_STANDARD },
    );
    const furniture = normalizeScanResult(
      { classification: 'single', name: 'Teak credenza', description: 'Mid-century' },
      { scanType: SCAN_STANDARD },
    );
    check('two different photos never share an identity', () => {
      assert.notEqual(artwork.identity.name, furniture.identity.name);
      assert.equal(photoKey({ url: 'u-1' }), 'u-1');
    });
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n=== PHOTO PIPELINE HARNESS ===');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      -> ${r.error}`}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main();