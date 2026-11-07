import { mutateSalePhotos, locatePhoto, photoError } from './photoStore.ts';

// Step 1 assessment: is this photograph suitable for scanning ONE item (or one
// coherent set) in Step 2?
//
// The assessment is a durable per-photo receipt in the photo's existing pipeline
// (pipeline.jobs.assessment) so it travels with the stable photo id and image
// revision and is written through the same compare-and-swap path as every other
// photo change. Nothing else on the photo (name, description, price, AI prices,
// operator edits) is ever touched.

// An LLM answer takes seconds. A claim older than this never recorded one
// (closed tab, dropped request) and must not block the photo forever.
const LEASE_MS = 2 * 60 * 1000;

export const ASSESSMENT_CLASSIFICATIONS = ['single_item', 'coherent_set', 'multiple_items', 'uncertain'];

// The Step 2 decision is DERIVED from the classification, never taken from the
// model, so a malformed answer can never quietly turn into Scan.
const DECISION_BY_CLASSIFICATION = {
  single_item: 'scan',
  coherent_set: 'scan',
  multiple_items: 'skip',
  uncertain: 'needs_review',
};

// Existing consumers (Step 2 identification) read pipeline.classification.
const CLASSIFICATION_FOR_SCAN = {
  single_item: 'single',
  coherent_set: 'single',
  multiple_items: 'multiple',
  uncertain: 'uncertain',
};

function receiptFor(photo) {
  const receipt = photo?.pipeline?.jobs?.assessment;
  if (!receipt || receipt.revision !== photo?.pipeline?.revision) return null;
  return receipt;
}

/** Normalised view of a photo's assessment, for responses and gating. */
export function assessmentOf(photo) {
  const receipt = receiptFor(photo);
  if (!receipt) return { status: 'none', decision: null, classification: null, source: null, reason: '' };
  const operator = receipt.operator?.decision ? receipt.operator : null;
  const decided = receipt.state === 'result_ready' ? receipt.result : null;
  if (!operator && !decided) {
    return {
      status: receipt.state === 'failed' ? 'failed' : 'pending',
      decision: null,
      classification: null,
      source: null,
      reason: '',
      error: receipt.error || '',
      retryable: receipt.retryable !== false,
      revision: receipt.revision,
      at: receipt.at || null,
    };
  }
  const result = decided || {};
  return {
    status: 'assessed',
    decision: operator?.decision || result.decision || null,
    classification: result.classification || null,
    source: operator ? 'operator' : 'ai',
    reason: operator ? receipt.operator_reason || result.reason || 'Set by the operator.' : result.reason || '',
    revision: receipt.revision,
    at: operator?.at || receipt.at || null,
  };
}

/**
 * Step 2 eligibility. Skip and unresolved Needs Review are excluded, as are
 * failed assessments (a failure is never a silent Scan). Photos assessed before
 * this pipeline existed keep their historical behaviour.
 */
export function step2Eligible(photo) {
  const assessment = assessmentOf(photo);
  if (assessment.status === 'none') {
    // A photo that WAS assessed keeps an older classification after its image is
    // replaced; that is a stale result, not a current decision. Only photos that
    // never had an assessment fall back to the historical classification.
    if (photo?.pipeline?.jobs?.assessment) return false;
    return photo?.pipeline?.classification === 'single';
  }
  return assessment.status === 'assessed' && assessment.decision === 'scan';
}

// AI may ADD a do-not-search hold but never removes one; only an explicit
// operator choice clears a hold.
function applyDecision(photo, decision, { clearHold = false } = {}) {
  const at = new Date().toISOString();
  if (decision === 'skip') {
    photo.skip_serp_search = true;
    photo.serp_search_status = 'do_not_search';
    photo.skip_updated_at = at;
    return;
  }
  if (decision === 'scan' && clearHold) {
    photo.skip_serp_search = false;
    photo.serp_search_status = 'search_allowed';
    photo.skip_updated_at = at;
  }
}

async function markFailed(service, saleId, user, photoId, id, error) {
  const status = Number(error?.status) || 0;
  const message = String(error?.message || error || 'Assessment failed').slice(0, 300);
  const retryable = status === 0 || status === 429 || status >= 500;
  const saved = await mutateSalePhotos(service, saleId, user, images => {
    const photo = locatePhoto(images, { photo_id: photoId });
    const receipt = receiptFor(photo);
    if (!receipt || receipt.id !== id) return photo;
    photo.pipeline.jobs = {
      ...photo.pipeline.jobs,
      assessment: { ...receipt, state: 'failed', error: message, retryable, at: new Date().toISOString() },
    };
    return photo;
  });
  return { photo: saved.value, assessment: assessmentOf(saved.value), error: message, retryable };
}

/**
 * action 'run'      — assess one photo (durable claim → LLM → persist).
 * action 'override' — record the operator's own Scan / Skip / Needs Review.
 */
export async function runPhotoAssessment({ service, user, saleId, target, action = 'run', retryFailed = false, assess }) {
  if (!target?.photo_id) throw photoError('A stable photo id is required', 400);

  if (action === 'override') {
    const decision = ['scan', 'skip', 'needs_review'].includes(target.decision) ? target.decision : null;
    if (!decision) throw photoError('Decision must be scan, skip or needs_review', 400);
    const saved = await mutateSalePhotos(service, saleId, user, images => {
      const photo = locatePhoto(images, target);
      const previous = receiptFor(photo) || {};
      photo.pipeline.jobs = {
        ...photo.pipeline.jobs,
        assessment: {
          ...previous,
          revision: photo.pipeline.revision,
          operator: { decision, at: new Date().toISOString(), by: user.id, by_name: user.full_name || '' },
          operator_reason: String(target.reason || '').slice(0, 200),
        },
      };
      applyDecision(photo, decision, { clearHold: true });
      // Keep the existing Step 2 consumers consistent with the operator's choice.
      photo.pipeline.classification = decision === 'scan' ? 'single' : decision === 'skip' ? 'multiple' : 'uncertain';
      if (!photo.pipeline.classification_reason) photo.pipeline.classification_reason = 'Set by the operator.';
      return photo;
    });
    return { photo: saved.value, assessment: assessmentOf(saved.value) };
  }

  const id = crypto.randomUUID();
  const claim = await mutateSalePhotos(service, saleId, user, images => {
    const photo = locatePhoto(images, target);
    const previous = receiptFor(photo);
    // An operator decision is final for this image revision — never re-billed.
    if (previous?.operator?.decision) return { owner: false, cached: true, photo };
    if (previous?.state === 'result_ready') return { owner: false, cached: true, photo };
    if (previous?.state === 'calling' && Date.parse(previous.at || 0) > Date.now() - LEASE_MS) {
      return { owner: false, busy: true, photo };
    }
    if (previous?.state === 'failed' && retryFailed !== true) return { owner: false, failed: true, photo };
    const receipt = {
      id,
      revision: photo.pipeline.revision,
      state: 'calling',
      attempts: (previous?.attempts || 0) + 1,
      at: new Date().toISOString(),
    };
    photo.pipeline.jobs = { ...photo.pipeline.jobs, assessment: receipt };
    return { owner: true, photo: structuredClone(photo), receipt };
  });

  const value = claim.value;
  if (!value.owner) {
    if (value.busy) throw photoError('This photo is already being sorted. Wait for it to finish.', 423);
    if (value.failed) throw photoError(receiptFor(value.photo)?.error || 'This photo assessment failed. Retry it to try again.', 422);
    return { photo: value.photo, assessment: assessmentOf(value.photo), cached: true };
  }

  let answer;
  try {
    answer = await assess(value.photo);
  } catch (error) {
    return markFailed(service, saleId, user, value.photo.pipeline.id, id, error);
  }

  const classification = ASSESSMENT_CLASSIFICATIONS.includes(answer?.classification) ? answer.classification : null;
  if (!classification) {
    const unusable = Object.assign(new Error('The AI did not return a usable classification'), { status: 502 });
    return markFailed(service, saleId, user, value.photo.pipeline.id, id, unusable);
  }
  const reason = String(answer.reason || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  const decision = DECISION_BY_CLASSIFICATION[classification];

  const saved = await mutateSalePhotos(service, saleId, user, images => {
    const photo = locatePhoto(images, { photo_id: value.photo.pipeline.id });
    const receipt = receiptFor(photo);
    if (!receipt || receipt.id !== id) throw photoError('Photo changed while it was being sorted', 409);
    photo.pipeline.jobs = {
      ...photo.pipeline.jobs,
      assessment: {
        ...receipt,
        state: 'result_ready',
        result: { classification, decision, reason },
        at: new Date().toISOString(),
        error: null,
        retryable: false,
      },
    };
    // Keep the existing Step 2 consumers in step with the assessment.
    photo.pipeline.classification = CLASSIFICATION_FOR_SCAN[classification];
    photo.pipeline.classification_reason = reason;
    applyDecision(photo, decision);
    return photo;
  });

  return { photo: saved.value, assessment: assessmentOf(saved.value), cached: false };
}