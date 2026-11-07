// Client-side view of the Step 1 photo assessment persisted on each photo
// (pipeline.jobs.assessment). The rules mirror base44/shared/photoAssessment.ts:
// the server is the authority; this only decides what Step 1 and Step 2 display.

export const CLASSIFICATION_LABELS = {
  single_item: 'Single item',
  coherent_set: 'Coherent set',
  multiple_items: 'Multiple items',
  uncertain: 'Uncertain',
};

export const DECISION_LABELS = {
  scan: 'Scan',
  skip: 'Skip',
  needs_review: 'Needs Review',
};

export function assessmentOf(photo) {
  const receipt = photo?.pipeline?.jobs?.assessment;
  if (!receipt || receipt.revision !== photo?.pipeline?.revision) {
    return { status: 'none', decision: null, classification: null, source: null, reason: '' };
  }
  const operator = receipt.operator?.decision ? receipt.operator : null;
  const result = receipt.state === 'result_ready' ? receipt.result || {} : null;
  if (!operator && !result) {
    return {
      status: receipt.state === 'failed' ? 'failed' : 'pending',
      decision: null,
      classification: null,
      source: null,
      reason: '',
      error: receipt.error || '',
      retryable: receipt.retryable !== false,
      at: receipt.at || null,
    };
  }
  return {
    status: 'assessed',
    decision: operator?.decision || result?.decision || null,
    classification: result?.classification || null,
    source: operator ? 'operator' : 'ai',
    reason: operator ? receipt.operator_reason || result?.reason || 'Set by you.' : result?.reason || '',
    at: operator?.at || receipt.at || null,
  };
}

/** True when Step 2 may scan this photo. */
export function step2Eligible(photo) {
  const assessment = assessmentOf(photo);
  if (assessment.status === 'none') return photo?.pipeline?.classification === 'single';
  return assessment.status === 'assessed' && assessment.decision === 'scan';
}