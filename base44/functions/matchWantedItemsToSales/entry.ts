import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { rematchAllActive, srOf } from '../../shared/isoMatching.ts';

/**
 * Daily ISO refresh (scheduled). Kept as the existing automation entry point so the
 * workflow and dashboard history stay intact, but the matching itself now runs in the
 * one shared engine — this function only starts it.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const stats = await rematchAllActive(srOf(base44), { limit: 200 });
    return Response.json({
      success: true,
      stats,
      message: `Refreshed ${stats.isos} ISO interests: ${stats.created} new matches, ${stats.updated} updated, ${stats.notified} notification batches.`,
    });
  } catch (error) {
    console.error('matchWantedItemsToSales error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}