import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Nightly automation: snapshot engagement stats for all active marketing campaigns.
 * Runs at midnight ET. Stops tracking once sale_end_date has passed.
 * 
 * Stats are manually maintained (no live API connection yet), so this function
 * takes the current stats values and appends a daily snapshot to the log for trend tracking.
 * When a Facebook/Meta integration is connected in future, replace the snapshot logic here.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automation (no user auth needed — called by system)
    const today = new Date().toISOString().split('T')[0];

    // Fetch all in_progress marketing tasks that have a sale_end_date >= today
    const tasks = await base44.asServiceRole.entities.MarketingTask.filter({
      status: 'in_progress',
    });

    let processed = 0;
    let skipped = 0;

    for (const task of tasks) {
      // Skip if sale has ended
      if (task.sale_end_date && task.sale_end_date < today) {
        skipped++;
        continue;
      }

      // Skip if no launched_at (not actually launched yet)
      if (!task.launched_at) {
        skipped++;
        continue;
      }

      const stats = task.stats || {};
      const snapshotLog = stats.snapshot_log || [];

      // Don't double-snapshot same day
      if (snapshotLog.length > 0 && snapshotLog[snapshotLog.length - 1].date === today) {
        skipped++;
        continue;
      }

      // Append today's snapshot from current stat values
      const newSnapshot = {
        date: today,
        reach: stats.reach || 0,
        likes: stats.likes || 0,
        comments: stats.comments || 0,
        shares: stats.shares || 0,
        clicks: stats.clicks || 0,
      };

      const updatedLog = [...snapshotLog, newSnapshot].slice(-30); // keep max 30 days

      await base44.asServiceRole.entities.MarketingTask.update(task.id, {
        stats: {
          ...stats,
          snapshot_log: updatedLog,
          last_refreshed: new Date().toISOString(),
        },
      });

      processed++;
    }

    return Response.json({
      success: true,
      date: today,
      processed,
      skipped,
      message: `Snapshotted ${processed} active campaigns, skipped ${skipped}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});