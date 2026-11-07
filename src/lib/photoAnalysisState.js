/**
 * Display-only mirror of the server's photo job state. The server stays the
 * authority (and sends the counts); this only labels each card.
 */
export const LEASE_MS = 4 * 60 * 1000;

export function jobOf(photo) {
  const job = photo?.pipeline?.jobs?.analysis;
  if (!job) return null;
  if (job.revision !== photo?.pipeline?.revision) return null;
  return job;
}

export function viewStateOf(photo, now = Date.now()) {
  if (photo?.skip_item || photo?.serp_search_status === 'do_not_search') return 'blocked';
  const job = jobOf(photo);
  if (!job) return 'pending';
  if (job.state === 'running') {
    if (job.stage === 'final') return 'inflight';
    return Date.parse(job.claimed_at || 0) > now - LEASE_MS ? 'inflight' : 'pending';
  }
  if (['ready', 'needs_review', 'awaiting_credits'].includes(job.state)) return job.state;
  if (job.state === 'failed' || job.state === 'outcome_unknown') return 'failed';
  return 'pending';
}