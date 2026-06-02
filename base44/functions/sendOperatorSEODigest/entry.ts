import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const operators = await base44.asServiceRole.entities.User.filter(
      { primary_account_type: 'estate_sale_operator' },
      '-created_date', 500
    );

    const allSales = await base44.asServiceRole.entities.EstateSale.filter(
      { status: { $in: ['upcoming', 'active', 'completed'] } },
      '-created_date', 1000
    );

    const salesByOperator = {};
    for (const sale of allSales) {
      if (!sale.operator_id) continue;
      if (!salesByOperator[sale.operator_id]) salesByOperator[sale.operator_id] = [];
      salesByOperator[sale.operator_id].push(sale);
    }

    let sent = 0;
    let skipped = 0;

    for (const op of operators) {
      const opSales = salesByOperator[op.id] || [];
      if (opSales.length === 0 || !op.email) { skipped++; continue; }

      const totalViews = opSales.reduce((s, sale) => s + (sale.views || 0), 0);
      const totalSaves = opSales.reduce((s, sale) => s + (sale.saves || 0), 0);
      const totalImpressions = opSales.reduce((s, sale) => s + (sale.seo_impressions_28d || 0), 0);
      const totalClicks = opSales.reduce((s, sale) => s + (sale.seo_clicks_28d || 0), 0);
      const activeSales = opSales.filter(s => ['upcoming', 'active'].includes(s.status));

      const saleRows = activeSales.slice(0, 5).map(sale => {
        const impressions = sale.seo_impressions_28d || 0;
        const clicks = sale.seo_clicks_28d || 0;
        const position = sale.seo_avg_position ? `#${sale.seo_avg_position}` : '—';
        const city = sale.property_address?.city || '';
        const state = sale.property_address?.state || '';
        const saleUrl = `https://estatesalen.com/EstateSaleDetail?id=${sale.id}`;
        return `<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 8px;font-size:13px;"><a href="${saleUrl}" style="color:#f97316;text-decoration:none;">${sale.title}</a><br><span style="color:#94a3b8;font-size:11px;">${city}${city && state ? ', ' : ''}${state}</span></td>
          <td style="padding:10px 8px;text-align:center;font-size:13px;font-weight:700;">${impressions.toLocaleString()}</td>
          <td style="padding:10px 8px;text-align:center;font-size:13px;">${clicks.toLocaleString()}</td>
          <td style="padding:10px 8px;text-align:center;font-size:13px;">${position}</td>
          <td style="padding:10px 8px;text-align:center;font-size:13px;">${sale.views || 0}</td>
        </tr>`;
      }).join('');

      const hasSearchData = totalImpressions > 0;
      const seoSection = hasSearchData
        ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px 20px;margin:20px 0;"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#166534;">🔍 Google Search Performance (Last 28 Days)</p><p style="margin:0;font-size:12px;color:#15803d;">Your sale pages appeared in Google search ${totalImpressions.toLocaleString()} times and received ${totalClicks.toLocaleString()} organic clicks.</p></div>`
        : `<div style="background:#fefce8;border:1px solid #fde047;border-radius:12px;padding:16px 20px;margin:20px 0;"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#854d0e;">📈 SEO is building for your sales</p><p style="margin:0;font-size:12px;color:#92400e;">Google is indexing your listings. Adding rich photos with AI descriptions grows rankings over time.</p></div>`;

      const emailHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;padding:28px;margin-bottom:20px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Your Weekly Search Report</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">EstateSalen.com — Traffic & Visibility Update</p>
  </div>
  <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:16px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 12px;color:#334155;font-size:15px;">Hi ${op.full_name?.split(' ')[0] || 'there'},</p>
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Here's how your estate sales are performing on EstateSalen.com and in Google search this week.</p>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:16px;">
    <div style="flex:1;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#ea580c;">${totalViews.toLocaleString()}</div>
      <div style="font-size:11px;color:#9a3412;font-weight:600;">PAGE VIEWS</div>
    </div>
    <div style="flex:1;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#0369a1;">${totalSaves.toLocaleString()}</div>
      <div style="font-size:11px;color:#0c4a6e;font-weight:600;">SAVES</div>
    </div>
    <div style="flex:1;background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#15803d;">${totalImpressions.toLocaleString()}</div>
      <div style="font-size:11px;color:#14532d;font-weight:600;">GOOGLE IMPRESSIONS</div>
    </div>
  </div>
  ${seoSection}
  ${activeSales.length > 0 ? `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;">
    <div style="padding:14px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;"><p style="margin:0;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;">Active Sales — Search Performance</p></div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f1f5f9;">
        <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;font-weight:600;">Sale</th>
        <th style="padding:10px 8px;text-align:center;font-size:11px;color:#64748b;font-weight:600;">Impressions</th>
        <th style="padding:10px 8px;text-align:center;font-size:11px;color:#64748b;font-weight:600;">Clicks</th>
        <th style="padding:10px 8px;text-align:center;font-size:11px;color:#64748b;font-weight:600;">Position</th>
        <th style="padding:10px 8px;text-align:center;font-size:11px;color:#64748b;font-weight:600;">Views</th>
      </tr></thead>
      <tbody>${saleRows}</tbody>
    </table>
  </div>` : ''}
  <div style="background:linear-gradient(135deg,#f97316,#ea580c);border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:16px;">
    <p style="margin:0 0 12px;color:#fff;font-size:15px;font-weight:700;">Boost Your Rankings</p>
    <a href="https://estatesalen.com/MySales" style="background:#fff;color:#ea580c;font-weight:800;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Manage My Sales →</a>
  </div>
  <div style="text-align:center;padding:16px;"><p style="margin:0;color:#94a3b8;font-size:11px;">© 2026 EstateSalen.com</p></div>
</div></body></html>`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: op.email,
          subject: `📊 Your Weekly Search Report — ${totalViews.toLocaleString()} views this week`,
          html: emailHtml
        });
        sent++;
      } catch (e) {
        console.error(`Email failed for ${op.email}:`, e.message);
        skipped++;
      }

      await new Promise(r => setTimeout(r, 200));
    }

    return Response.json({ status: 'success', sent, skipped });

  } catch (error) {
    console.error('sendOperatorSEODigest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});