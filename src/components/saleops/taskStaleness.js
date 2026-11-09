// Staleness rule for sale tasks.
//
// The system does not guess what a task means. It uses one deterministic rule the
// operator can see and override: once the sale is COMPLETED, any still-open task in
// a PRE-SALE category (Planning, Preparation, Marketing, Execution) no longer
// pertains, so it is flagged "no longer needed". Post-Sale work (breakdown, donation,
// accounting, client payment) stays live. The flag never deletes or completes a task,
// and a human can clear it (stale_cleared) to keep add/edit available.

export const PRE_SALE_CATEGORIES = ['Planning', 'Preparation', 'Marketing', 'Execution'];

export const STALE_REASON = 'Sale completed — this pre-sale task no longer applies';

export function isOpenTask(task) {
  return task?.status !== 'completed';
}

/** TRUE when this task should carry the "no longer needed" flag right now. */
export function shouldFlagStale(task, saleCompleted) {
  if (!saleCompleted) return false;
  if (!isOpenTask(task)) return false;
  if (task.stale_cleared) return false;
  return PRE_SALE_CATEGORIES.includes(task.category);
}