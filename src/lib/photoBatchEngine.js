/**
 * Photo AI job engine — the single orchestration path for Standard Scan and
 * Deep Scan results.
 *
 * Guarantees (all covered by the deterministic harness in
 * base44/testing/photoPipeline.harness.mjs):
 *
 *  - Results belong to ONE photo: every job carries its own stable key (the
 *    photo's url). Nothing is associated by array position, completion order,
 *    or a shared "current item" pointer.
 *  - A provider result is never substituted with text from another item or a
 *    fallback. Unidentified work stays unidentified and needs review.
 *  - Provider and save steps retry independently: a provider success followed
 *    by a database failure keeps the paid result and retries ONLY the save.
 *  - Bounded concurrency, capped retries with exponential backoff + jitter and
 *    Retry-After support, permanent errors are not retried forever.
 *  - Duplicate submissions are ignored, already-completed work is skipped on
 *    resume, and a stale result for a replaced image is discarded.
 */

export const SCAN_STANDARD = 'standard';
export const SCAN_DEEP = 'deep';

export function photoKey(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  const url = image.url;
  if (typeof url === 'object' && url) return url.url || '';
  return url || '';
}

export function photoUrlOf(image) {
  return photoKey(image);
}

function blank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

const MULTI_WORDS = /multi|several|group|lot|room|contents/i;

/**
 * Turns a raw provider answer into a validated, self-describing result.
 * Unknown values stay unknown — nothing is invented.
 */
export function normalizeScanResult(raw, { scanType = SCAN_STANDARD } = {}) {
  const result = {
    scan_type: scanType,
    classification: 'uncertain',
    confidence: 'unknown',
    identity: null,
    price: null,
    uncertainty: [],
    provider_error: null,
  };

  if (!raw || typeof raw !== 'object') {
    result.provider_error = 'No usable provider response';
    result.uncertainty.push('Identification unavailable');
    return result;
  }
  if (raw.error) {
    result.provider_error = String(raw.error);
    result.uncertainty.push('Identification unavailable');
    return result;
  }

  let classification = String(raw.classification || '').toLowerCase();
  if (!['single', 'multiple', 'uncertain'].includes(classification)) {
    if (raw.identified === false) classification = 'uncertain';
    else if (raw.multi_item === true || MULTI_WORDS.test(String(raw.scene_type || ''))) classification = 'multiple';
    else if (!blank(raw.item_title) || !blank(raw.name)) classification = 'single';
    else classification = 'uncertain';
  }
  result.classification = classification;
  result.confidence = String(raw.confidence || 'unknown').toLowerCase();

  const title = (raw.item_title || raw.name || '').toString().trim();
  const description = (raw.description || '').toString().trim();

  // A photo with several items is NEVER given one identity and one price.
  if (classification === 'single' && !blank(title)) {
    result.identity = {
      name: title,
      description: description || '',
    };
  } else if (classification !== 'single') {
    result.uncertainty.push(
      classification === 'multiple'
        ? 'Several items in this photo — needs operator review, cropping or an intentional lot'
        : 'Item not confidently identified',
    );
  }

  if (scanType === SCAN_DEEP) {
    const matches = Array.isArray(raw.matches) ? raw.matches : [];
    const sources = matches
      .filter((m) => m && !blank(m.title) && (m.price || m.price === 0))
      .slice(0, 6)
      .map((m) => ({
        title: String(m.title),
        price: Number(m.price) || null,
        currency: m.currency || 'USD',
        source: m.source || 'unknown',
        url: m.url || m.link || null,
        evidence: m.evidence || m.listing_type || 'asking',
        match_quality: m.match_quality || 'unknown',
      }));

    const avg = raw.price_range?.avg ?? null;
    result.price = {
      basis: sources.length > 0 ? 'asking_comparables' : 'model_estimate',
      suggested: avg !== null ? Number(avg) : null,
      low: raw.price_range?.min ?? null,
      high: raw.price_range?.max ?? null,
      sources,
      note:
        sources.length > 0
          ? 'Suggested price for a 2–3 day local estate sale; comparable listings are asking prices, not sold prices.'
          : 'Model estimate only — no verified comparable listings were returned.',
    };
    if (sources.length === 0) result.uncertainty.push('No comparable listings returned');
    if (sources.some((s) => s.evidence === 'unknown')) result.uncertainty.push('Some matches have unknown evidence type');
  } else {
    const suggested = raw.estimated_price ?? raw.used_price ?? raw.estate_sale_price ?? null;
    result.price = {
      basis: 'model_estimate',
      suggested: suggested === null ? null : Number(suggested),
      low: raw.price_low ?? null,
      high: raw.price_high ?? null,
      sources: [],
      note: 'Estimated by the model for a local estate sale. Not an appraisal and not based on verified listings.',
    };
    if (!blank(raw.price_basis_note)) result.uncertainty.push(String(raw.price_basis_note));
  }

  if (!blank(raw.uncertainty_note)) result.uncertainty.push(String(raw.uncertainty_note));
  return result;
}

/** Builds jobs for the photos that are eligible for a given scan type. */
export function buildJobs({ images, scanType = SCAN_STANDARD, isBlocked = () => false }) {
  const jobs = [];
  (images || []).forEach((img) => {
    const key = photoKey(img);
    if (!key) return;
    if (typeof img === 'object' && img && isBlocked(img)) return;
    jobs.push({
      key,
      scanType,
      photoUrl: key,
      index_hint: jobs.length, // display only — never used to associate results
    });
  });
  return jobs;
}

const TRANSIENT = /429|rate|throttl|timeout|timed out|unavailable|temporar|network|502|503|504|500|fetch failed|ECONN/i;
const PERMANENT = /401|403|404|400|invalid|unauthorized|forbidden|not found/i;

export function isTransientError(error) {
  const message = String((error && (error.message || error.error)) || error || '');
  const status = Number(error && (error.status || error.statusCode));
  if (status === 429 || status >= 500) return true;
  if (status >= 400 && status < 500) return false;
  if (PERMANENT.test(message) && !TRANSIENT.test(message)) return false;
  return TRANSIENT.test(message);
}

function retryAfterMs(error) {
  const value = error && (error.retryAfter || error.retry_after);
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const when = Date.parse(value);
  if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
  return null;
}

export function createPhotoBatchRunner({
  scanFn,
  saveFn,
  concurrency = 3,
  maxScanAttempts = 4,
  maxSaveAttempts = 3,
  baseDelayMs = 500,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  isJobCurrent = () => true,
  onEvent = () => {},
  random = Math.random,
  initialStatus = null,
}) {
  if (typeof scanFn !== 'function' || typeof saveFn !== 'function') {
    throw new Error('createPhotoBatchRunner requires scanFn and saveFn');
  }

  const status = new Map(); // key -> queued|running|completed|needs_review|failed|save_failed|stale
  // Lets a caller resume after a refresh by handing back previously persisted statuses.
  if (initialStatus) {
    for (const [key, value] of Object.entries(initialStatus)) status.set(key, value);
  }
  const results = new Map();
  const pendingSaves = new Map();
  const inFlight = new Set();

  const emit = (type, payload) => {
    try { onEvent({ type, ...payload }); } catch { /* progress listeners must never break a job */ }
  };

  function setStatus(key, value, extra = {}) {
    status.set(key, value);
    emit('status', { key, status: value, ...extra });
  }

  async function withScanRetry(job) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxScanAttempts; attempt++) {
      try {
        return { ok: true, raw: await scanFn(job), attempts: attempt };
      } catch (error) {
        lastError = error;
        const transient = isTransientError(error);
        emit('scan_error', { key: job.key, attempt, transient, message: String(error?.message || error) });
        if (!transient || attempt === maxScanAttempts) break;
        const backoff = baseDelayMs * 2 ** (attempt - 1);
        const jitter = Math.floor(random() * baseDelayMs);
        await sleep(retryAfterMs(error) ?? backoff + jitter);
      }
    }
    return { ok: false, error: lastError };
  }

  async function attemptSave(job, result) {
    for (let attempt = 1; attempt <= maxSaveAttempts; attempt++) {
      try {
        await saveFn(job, result);
        return { ok: true };
      } catch (error) {
        emit('save_error', { key: job.key, attempt, message: String(error?.message || error) });
        if (attempt < maxSaveAttempts) {
          const backoff = baseDelayMs * 2 ** (attempt - 1);
          await sleep(retryAfterMs(error) ?? backoff + Math.floor(random() * baseDelayMs));
        }
      }
    }
    return { ok: false };
  }

  async function processJob(job) {
    const key = job.key;
    if (inFlight.has(key)) return; // duplicate submission
    if (['completed', 'needs_review', 'stale'].includes(status.get(key))) return; // resume: do not redo

    inFlight.add(key);
    setStatus(key, 'running');

    try {
      // A replaced photo invalidates the job before any money is spent.
      if (!isJobCurrent(job)) {
        setStatus(key, 'stale');
        return;
      }

      const scan = await withScanRetry(job);
      if (!scan.ok) {
        setStatus(key, 'failed', { message: String(scan.error?.message || scan.error) });
        return;
      }

      if (!isJobCurrent(job)) {
        setStatus(key, 'stale');
        return;
      }

      const result = normalizeScanResult(scan.raw, { scanType: job.scanType });
      results.set(key, result);

      const saved = await attemptSave(job, result);
      if (!saved.ok) {
        pendingSaves.set(key, { job, result });
        setStatus(key, 'save_failed');
        return;
      }
      pendingSaves.delete(key);
      setStatus(key, result.classification === 'single' ? 'completed' : 'needs_review');
    } catch (error) {
      setStatus(key, 'failed', { message: String(error?.message || error) });
    } finally {
      inFlight.delete(key);
    }
  }

  async function runWithConcurrency(jobs) {
    const queue = [...jobs];
    const workers = Array.from({ length: Math.max(1, Math.min(concurrency, queue.length || 1)) }, async () => {
      while (queue.length > 0) {
        const job = queue.shift();
        if (!job) return;
        await processJob(job);
      }
    });
    await Promise.all(workers);
  }

  return {
    get status() { return new Map(status); },
    get results() { return new Map(results); },
    get pendingSaves() { return new Map(pendingSaves); },

    async run(jobs) {
      const eligible = jobs.filter((job) => {
        const current = status.get(job.key);
        return !['completed', 'needs_review', 'stale', 'running'].includes(current);
      });
      await runWithConcurrency(eligible);
      return this.summary();
    },

    /** Retries ONLY the persistence step for paid results — no provider call. */
    async retryPendingSaves() {
      for (const [key, entry] of [...pendingSaves.entries()]) {
        const { job, result } = entry;
        const saved = await attemptSave(job, result);
        if (saved.ok) {
          pendingSaves.delete(key);
          setStatus(key, result.classification === 'single' ? 'completed' : 'needs_review');
        }
      }
      return this.summary();
    },

    summary() {
      const counts = {};
      for (const value of status.values()) counts[value] = (counts[value] || 0) + 1;
      return { counts, total: status.size, pending_saves: pendingSaves.size };
    },
  };
}