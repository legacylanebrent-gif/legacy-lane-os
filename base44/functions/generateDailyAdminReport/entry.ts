import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ── Gather Data ──

    // 1. Infrastructure Capacity
    const capacityRecords = await base44.asServiceRole.entities.InfrastructureCapacity.list();

    // 2. Users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const newUsers = allUsers.filter(u => new Date(u.created_date) >= twentyFourHoursAgo);
    const totalUsers = allUsers.length;

    // 3. Estate Sales
    const allSales = await base44.asServiceRole.entities.EstateSale.filter({});
    const newSales = allSales.filter(s => new Date(s.created_date) >= twentyFourHoursAgo);
    const activeSales = allSales.filter(s => s.status === 'active' || s.status === 'upcoming');

    // 4. Open Tickets
    const openTickets = await base44.asServiceRole.entities.Ticket.filter({ status: 'open' });

    // 5. New Leads (last 24h) — paginate to bypass 5k cap
    // Sorted newest-first, so we can stop once a batch falls entirely outside the 24h window
    const PAGE_SIZE = 5000;
    const recentLeads = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Lead.filter({}, '-created_date', PAGE_SIZE, skip);
      if (batch.length === 0) break;

      // Count leads from this batch that are within the 24h window
      for (const lead of batch) {
        if (new Date(lead.created_date) >= twentyFourHoursAgo) {
          recentLeads.push(lead);
        }
      }

      // If the OLDEST lead in this batch (last item, sorted desc) is already older than 24h,
      // all subsequent batches will also be outside the window — stop early
      const oldestInBatch = new Date(batch[batch.length - 1].created_date);
      if (oldestInBatch < twentyFourHoursAgo) break;

      if (batch.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    // 6. Credit Accounts
    const creditAccounts = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({ status: 'active' });
    const subscriptionCounts = { consumer: 0, starter: 0, growth: 0, professional: 0, elite: 0 };
    creditAccounts.forEach(acct => {
      const tier = acct.subscription_tier;
      if (tier && subscriptionCounts[tier] !== undefined) subscriptionCounts[tier]++;
    });
    const paidIds = new Set(creditAccounts.map(a => a.operator_id));
    subscriptionCounts.consumer = allUsers.filter(u => !paidIds.has(u.id)).length;

    // ── Build Report ──

    const formatNum = (n) => n?.toLocaleString() || '0';

    // Capacity summary
    let capacityRows = '';
    capacityRecords.forEach(cap => {
      const actualPct = cap.monthly_call_limit > 0 ? Math.round(((cap.current_month_usage || 0) / cap.monthly_call_limit) * 100) : 0;

      let estTotal = 0;
      const est = cap.estimated_usage_per_subscriber || {};
      Object.entries(subscriptionCounts).forEach(([tier, count]) => {
        estTotal += (est[tier] || 0) * count;
      });
      const projectedPct = cap.monthly_call_limit > 0 ? Math.round((estTotal / cap.monthly_call_limit) * 100) : 0;

      const status = Math.max(actualPct, projectedPct) >= 85 ? '🔴' : Math.max(actualPct, projectedPct) >= 70 ? '🟡' : '🟢';

      capacityRows += `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:13px">${status} ${cap.service_name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right">${formatNum(actualPct)}%</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right">${formatNum(projectedPct)}%</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right">${formatNum(cap.current_month_usage || 0)} / ${formatNum(cap.monthly_call_limit)}</td>
      </tr>`;
    });

    // New users summary
    let newUserList = '';
    if (newUsers.length > 0) {
      newUsers.slice(0, 10).forEach(u => {
        const role = u.primary_account_type || 'consumer';
        newUserList += `<tr>
          <td style="padding:4px 8px;font-size:12px">${u.full_name || 'N/A'}</td>
          <td style="padding:4px 8px;font-size:12px">${u.email}</td>
          <td style="padding:4px 8px;font-size:12px;text-transform:capitalize">${role}</td>
        </tr>`;
      });
      if (newUsers.length > 10) {
        newUserList += `<tr><td colspan="3" style="padding:4px 8px;font-size:12px;color:#6b7280">...and ${newUsers.length - 10} more</td></tr>`;
      }
    } else {
      newUserList = '<tr><td colspan="3" style="padding:4px 8px;font-size:12px;color:#6b7280">No new users in the past 24 hours</td></tr>';
    }

    // New sales summary
    let newSalesList = '';
    if (newSales.length > 0) {
      newSales.slice(0, 10).forEach(s => {
        const addr = s.property_address?.city || 'N/A';
        newSalesList += `<tr>
          <td style="padding:4px 8px;font-size:12px">${s.title || 'Untitled'}</td>
          <td style="padding:4px 8px;font-size:12px">${addr}, ${s.property_address?.state || ''}</td>
          <td style="padding:4px 8px;font-size:12px;text-transform:capitalize">${s.status || 'draft'}</td>
        </tr>`;
      });
      if (newSales.length > 10) {
        newSalesList += `<tr><td colspan="3" style="padding:4px 8px;font-size:12px;color:#6b7280">...and ${newSales.length - 10} more</td></tr>`;
      }
    } else {
      newSalesList = '<tr><td colspan="3" style="padding:4px 8px;font-size:12px;color:#6b7280">No new sales posted in the past 24 hours</td></tr>';
    }

    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

  <!-- Header -->
  <div style="background:#1e293b;padding:24px 28px">
    <h1 style="color:#ffffff;font-size:20px;margin:0">📊 Daily Platform Report</h1>
    <p style="color:#94a3b8;font-size:13px;margin:4px 0 0 0">${dateStr} at ${timeStr}</p>
  </div>

  <div style="padding:24px 28px">

    <!-- Summary Cards -->
    <div style="display:flex;gap:12px;margin-bottom:24px">
      <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center">
        <p style="font-size:24px;font-weight:700;color:#166534;margin:0">${totalUsers}</p>
        <p style="font-size:11px;color:#166534;margin:2px 0 0 0;text-transform:uppercase">Total Users</p>
      </div>
      <div style="flex:1;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;text-align:center">
        <p style="font-size:24px;font-weight:700;color:#1e40af;margin:0">${newUsers.length}</p>
        <p style="font-size:11px;color:#1e40af;margin:2px 0 0 0;text-transform:uppercase">New Users (24h)</p>
      </div>
      <div style="flex:1;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center">
        <p style="font-size:24px;font-weight:700;color:#92400e;margin:0">${newSales.length}</p>
        <p style="font-size:11px;color:#92400e;margin:2px 0 0 0;text-transform:uppercase">New Sales (24h)</p>
      </div>
      <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center">
        <p style="font-size:24px;font-weight:700;color:#991b1b;margin:0">${openTickets.length}</p>
        <p style="font-size:11px;color:#991b1b;margin:2px 0 0 0;text-transform:uppercase">Open Tickets</p>
      </div>
    </div>

    <!-- Additional Stats -->
    <div style="display:flex;gap:12px;margin-bottom:24px">
      <div style="flex:1;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:12px;text-align:center">
        <p style="font-size:20px;font-weight:700;color:#5b21b6;margin:0">${activeSales.length}</p>
        <p style="font-size:11px;color:#5b21b6;margin:2px 0 0 0;text-transform:uppercase">Active Sales</p>
      </div>
      <div style="flex:1;background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;padding:12px;text-align:center">
        <p style="font-size:20px;font-weight:700;color:#9d174d;margin:0">${recentLeads.length}</p>
        <p style="font-size:11px;color:#9d174d;margin:2px 0 0 0;text-transform:uppercase">New Leads (24h)</p>
      </div>
      <div style="flex:1;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;text-align:center">
        <p style="font-size:20px;font-weight:700;color:#075985;margin:0">${allSales.length}</p>
        <p style="font-size:11px;color:#075985;margin:2px 0 0 0;text-transform:uppercase">Total Sales</p>
      </div>
      <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center">
        <p style="font-size:20px;font-weight:700;color:#166534;margin:0">${Object.values(subscriptionCounts).reduce((a,b) => a+b, 0)}</p>
        <p style="font-size:11px;color:#166534;margin:2px 0 0 0;text-transform:uppercase">Subscribers</p>
      </div>
    </div>

    <!-- Subscriber Breakdown -->
    <h3 style="font-size:15px;color:#1e293b;margin:0 0 8px 0">👥 Subscriber Breakdown</h3>
    <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">
      ${Object.entries(subscriptionCounts).map(([tier, count]) => `
        <div style="background:#f1f5f9;border-radius:6px;padding:8px 14px;text-align:center;min-width:70px">
          <p style="font-size:18px;font-weight:700;color:#334155;margin:0">${count}</p>
          <p style="font-size:10px;color:#64748b;margin:0;text-transform:capitalize">${tier}</p>
        </div>
      `).join('')}
    </div>

    <!-- Infrastructure Capacity -->
    <h3 style="font-size:15px;color:#1e293b;margin:0 0 8px 0">⚡ Infrastructure Capacity</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:6px 8px;font-size:11px;color:#64748b;text-align:left;text-transform:uppercase">Service</th>
          <th style="padding:6px 8px;font-size:11px;color:#64748b;text-align:right;text-transform:uppercase">Actual</th>
          <th style="padding:6px 8px;font-size:11px;color:#64748b;text-align:right;text-transform:uppercase">Proj</th>
          <th style="padding:6px 8px;font-size:11px;color:#64748b;text-align:right;text-transform:uppercase">Usage</th>
        </tr>
      </thead>
      <tbody>${capacityRows}</tbody>
    </table>

    <!-- New Users -->
    <h3 style="font-size:15px;color:#1e293b;margin:0 0 8px 0">🆕 New Users (Last 24 Hours)</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:4px 8px;font-size:11px;color:#64748b;text-align:left;text-transform:uppercase">Name</th>
          <th style="padding:4px 8px;font-size:11px;color:#64748b;text-align:left;text-transform:uppercase">Email</th>
          <th style="padding:4px 8px;font-size:11px;color:#64748b;text-align:left;text-transform:uppercase">Role</th>
        </tr>
      </thead>
      <tbody>${newUserList}</tbody>
    </table>

    <!-- New Sales -->
    <h3 style="font-size:15px;color:#1e293b;margin:0 0 8px 0">🏷️ New Sales Posted (Last 24 Hours)</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:4px 8px;font-size:11px;color:#64748b;text-align:left;text-transform:uppercase">Title</th>
          <th style="padding:4px 8px;font-size:11px;color:#64748b;text-align:left;text-transform:uppercase">Location</th>
          <th style="padding:4px 8px;font-size:11px;color:#64748b;text-align:left;text-transform:uppercase">Status</th>
        </tr>
      </thead>
      <tbody>${newSalesList}</tbody>
    </table>

    <!-- Open Tickets -->
    <h3 style="font-size:15px;color:#1e293b;margin:0 0 8px 0">🎫 Open Support Tickets (${openTickets.length})</h3>
    ${openTickets.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:4px 8px;font-size:11px;color:#64748b;text-align:left;text-transform:uppercase">Subject</th>
          <th style="padding:4px 8px;font-size:11px;color:#64748b;text-align:left;text-transform:uppercase">Created</th>
        </tr>
      </thead>
      <tbody>
        ${openTickets.slice(0, 10).map(t => `
        <tr>
          <td style="padding:4px 8px;font-size:12px">${t.subject || 'No subject'}</td>
          <td style="padding:4px 8px;font-size:12px">${new Date(t.created_date).toLocaleDateString()}</td>
        </tr>`).join('')}
        ${openTickets.length > 10 ? `<tr><td colspan="2" style="padding:4px 8px;font-size:12px;color:#6b7280">...and ${openTickets.length - 10} more</td></tr>` : ''}
      </tbody>
    </table>` : '<p style="font-size:13px;color:#64748b;margin-bottom:24px">No open tickets — great job!</p>'}

    <!-- Footer -->
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;text-align:center">
      <p style="font-size:11px;color:#94a3b8;margin:0">
        Auto-generated by EstateSalen AdminOps • ${now.toLocaleDateString()}
      </p>
    </div>

  </div>
</div>
</body>
</html>`;

    // ── Send Email ──
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'legacylanebrent@gmail.com',
      subject: `📊 Daily Platform Report — ${dateStr}`,
      body: html,
    });

    return Response.json({
      success: true,
      summary: {
        totalUsers,
        newUsers: newUsers.length,
        newSales: newSales.length,
        activeSales: activeSales.length,
        openTickets: openTickets.length,
        newLeads: recentLeads.length,
        subscriberCount: Object.values(subscriptionCounts).reduce((a,b) => a+b, 0),
      }
    });

  } catch (error) {
    console.error('Daily report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});