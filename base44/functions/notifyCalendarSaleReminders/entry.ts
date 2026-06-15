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

    // Group today's sales by user_id
    const userSales = {};
    for (const e of entries) {
      const dates = e.sale_dates || [];
      if (!dates.some(d => d.date === todayStr)) continue;
      if (!userSales[e.user_id]) userSales[e.user_id] = [];
      const info = dates.find(d => d.date === todayStr);
      userSales[e.user_id].push({
        id: e.sale_id,
        title: e.sale_title || 'Estate Sale',
        address: e.sale_address,
        start_time: info?.start_time || '',
        end_time: info?.end_time || '',
      });
    }

    let count = 0;
    for (const [userId, sales] of Object.entries(userSales)) {
      // Dedup: check if we already sent a daily reminder to this user today
      const prev = await base44.asServiceRole.entities.Notification.filter({
        user_id: userId,
        type: 'reminder',
        related_entity_type: 'MyCalendar',
      }, '-created_date', 5);

      const alreadySent = prev.some(
        n => new Date(n.created_date).toISOString().split('T')[0] === todayStr
      );
      if (alreadySent) continue;

      const saleCount = sales.length;
      const title = saleCount === 1
        ? `Sale Today: ${sales[0].title}`
        : `${saleCount} Sales Today`;

      let message;
      if (saleCount === 1) {
        const s = sales[0];
        const time = s.start_time ? ` starting at ${s.start_time}` : '';
        message = `"${s.title}" is happening today${time}.${s.address ? ' Located at ' + s.address + '.' : ''} View your calendar for details.`;
      } else {
        const items = sales.map(s => {
          const time = s.start_time ? ` at ${s.start_time}` : '';
          const loc = s.address ? ` — ${s.address}` : '';
          return `• ${s.title}${time}${loc}`;
        }).join('\n');
        message = `You have ${saleCount} sales today:\n${items}\n\nView your calendar for full details.`;
      }

      await base44.asServiceRole.entities.Notification.create({
        user_id: userId,
        type: 'reminder',
        title,
        message,
        link_to_page: 'MyCalendar',
        related_entity_type: 'MyCalendar',
        related_entity_id: todayStr,
      });
      count++;
    }

    return Response.json({ success: true, usersNotified: count, date: todayStr });
  } catch (err) {
    console.error(err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});