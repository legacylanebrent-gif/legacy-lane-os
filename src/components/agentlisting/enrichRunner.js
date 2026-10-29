import { enrichment } from './listingApi';

// Drives one enrichment job to completion in bounded batches so the browser never
// holds a long request. The job itself lives on the server, so leaving the page is safe.
export async function runEnrichJob(scopePayload, onProgress) {
  const started = await enrichment.start(scopePayload);
  let job = started.job;
  onProgress?.(job);
  if (started.already_running) return { job, alreadyRunning: true };

  for (let step = 0; step < 60; step += 1) {
    if (!job || job.status === 'completed' || job.status === 'partial' || job.status === 'failed') break;
    const res = await enrichment.process(job.id, 15);
    job = res.job;
    onProgress?.(job);
    if (res.done) break;
  }
  return { job };
}

// Continues an existing job (e.g. after returning to the screen or a failed batch).
export async function continueEnrichJob(jobId, onProgress) {
  let job = null;
  for (let step = 0; step < 60; step += 1) {
    const res = await enrichment.process(jobId, 15);
    job = res.job;
    onProgress?.(job);
    if (res.done) break;
  }
  return job;
}