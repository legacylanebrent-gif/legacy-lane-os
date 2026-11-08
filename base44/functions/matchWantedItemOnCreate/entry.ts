import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { rematchIso, srOf, str } from '../../shared/isoMatching.ts';

/**
 * Entity-automation entry point: a new ISO is matched immediately instead of waiting
 * for the daily scan. Matching runs in the shared engine, so this path and the daily
 * scan produce identical, deduplicated results.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const record = payload.data || {};
    const isoId = str(record.id || payload.id || payload.entity_id);
    if (!isoId) return Response.json({ skipped: true, reason: 'No ISO id in payload' });
    if (str(record.status) && str(record.status) !== 'active') {
      return Response.json({ skipped: true, reason: `ISO is ${record.status}` });
    }
    const result = await rematchIso(srOf(base44), isoId, { notify: true });
    return Response.json({ success: true, result });
  } catch (error) {
    console.error('matchWantedItemOnCreate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}