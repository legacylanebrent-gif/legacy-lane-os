// LLBB product workflow model (Phase 4A).
// One source of truth for the BUSINESS-BUILDER product workflow and its exact
// mapping onto the CERTIFIED technical WebsiteTenant lifecycle. Two concerns,
// two fields: `workflow_status` (product) and `status` (technical runtime
// lifecycle). The technical field is NEVER derived from client input.

export const LLBB_WORKFLOW_STATUSES = [
  'draft',
  'setup_in_progress',
  'ready_for_review',
  'changes_requested',
  'approved',
  'live',
  'suspended',
  'archived'
];

export const WORKFLOW_LABELS = {
  draft: 'Draft',
  setup_in_progress: 'Setup In Progress',
  ready_for_review: 'Ready for Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  live: 'Live',
  suspended: 'Suspended',
  archived: 'Archived'
};

// Allowed product transitions (server-validated; last word is authoritative).
const LLBB_TRANSITIONS = {
  draft: ['setup_in_progress', 'archived'],
  setup_in_progress: ['ready_for_review', 'archived'],
  ready_for_review: ['approved', 'changes_requested', 'archived'],
  changes_requested: ['ready_for_review', 'archived'],
  approved: ['live', 'archived'],
  live: ['suspended', 'archived'],
  suspended: ['live', 'archived'],
  archived: []
};

export function validateWorkflowTransition(from, to) {
  if (!LLBB_TRANSITIONS[from]) return { ok: false, reason: 'unknown_current_workflow' };
  if (!LLBB_TRANSITIONS[to]) return { ok: false, reason: 'unknown_target_workflow' };
  if (!LLBB_TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `invalid_transition_${from}_to_${to}` };
  }
  return { ok: true };
}

export function allowedWorkflowTransitions(from) {
  return LLBB_TRANSITIONS[from] || [];
}

// Product workflow → technical lifecycle mapping (single source of truth).
export function technicalStatusForWorkflow(wf) {
  return {
    draft: 'setup',
    setup_in_progress: 'setup',
    ready_for_review: 'setup',
    changes_requested: 'setup',
    approved: 'setup',
    live: 'active',
    suspended: 'suspended',
    archived: 'archived'
  }[wf] || null;
}

// Technical lifecycle → product workflow (for legacy tenants created before
// LLBB — never written back to them, only displayed).
export function inferWorkflowFromTechnical(technical) {
  return {
    setup: 'draft',
    active: 'live',
    suspended: 'suspended',
    archived: 'archived'
  }[technical] || 'draft';
}