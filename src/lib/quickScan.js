import { base44 } from '@/api/base44Client';

// Each photo is a single AI vision call. A stalled call must never freeze the whole
// run, so every photo is bounded by a timeout and failures simply stay unscanned.
const PHOTO_TIMEOUT_MS = 60000;
const CONCURRENCY = 8;

async function scanPhoto(img) {
  const call = base44.integrations.Core.InvokeLLM({
    prompt: `Look at this photo. Answer only: is this a photo of MULTIPLE different items (like a shelf of books, a table of mugs, a cabinet of pans, a pile of tools, boxes of misc items, etc)? Or is it a SINGLE identifiable item?\n\nReply with JSON only.`,
    file_urls: [img.url],
    response_json_schema: {
      type: 'object',
      properties: {
        is_multi_item: { type: 'boolean' },
        reason: { type: 'string' },
      },
    },
  });

  const res = await Promise.race([
    call,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Quick scan timed out')), PHOTO_TIMEOUT_MS)
    ),
  ]);
  return res.is_multi_item === true;
}

/**
 * Scans photos for "multiple items in one photo".
 * Photos that never finish stay unflagged, so re-running resumes exactly where it stopped.
 */
export async function runQuickScan({ entries, onResult, onProgress, shouldCancel }) {
  const total = entries.length;
  let done = 0;

  for (let b = 0; b < total; b += CONCURRENCY) {
    if (shouldCancel?.()) break;
    const chunk = entries.slice(b, b + CONCURRENCY);
    await Promise.all(
      chunk.map(async ({ img, i }) => {
        try {
          const isMulti = await scanPhoto(img);
          onResult(i, isMulti);
        } catch (e) {
          console.warn(`Quick scan failed for image ${i}:`, e.message);
        }
        done += 1;
        onProgress(done, total);
      })
    );
  }
}