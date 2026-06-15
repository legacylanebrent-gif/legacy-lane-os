import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Paginate all calendar entries
    let entries = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.UserCalendarEntry.list('-created_date', 200, skip);
      entries = entries.concat(batch);
      if (batch.length < 200) break;
      skip += 200;
    }

    let count = 0;
    for (const e of entries) {
      const dates = e.sale_dates || [];
      if (!dates.some(d => d.date === todayStr)) continue;

      // Check for existing notification today
      const prev = await base44.asServiceRole.entities.Notification.filter({
        user_id: e.user_id, type: 'reminder', related_entity_id: e.sale_id,
      }, '-created_date', 5);

      const alreadySent = prev.some(n => new Date(n.created_date).toISOString().split('T')[0] === todayStr);
      if (alreadySent) continue;

      const info = dates.find(d => d.date === todayStr);
      const time = info?.start_time ? ` starting at ${info.start_time}` : '';

      await base44.asServiceRole.entities.Notification.create({
        user_id: e.user_id,
        type: 'reminder',
        title: `Sale Today: ${e.sale_title || 'Estate Sale'}`,
        message: `"${e.sale_title}" is happening today${time}.${e.sale_address ? ' Located at ' + e.sale_address + '.' : ''} Tap to view.`,
        link_to_page: 'EstateSaleDetail',
        link_params: `saleId=${e.sale_id}`,
        related_entity_type: 'EstateSale',
        related_entity_id: e.sale_id,
      });
      count++;
    }

    return Response.json({ success: true, notified: count, date: todayStr });
  } catch (err) {
    console.error(err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});