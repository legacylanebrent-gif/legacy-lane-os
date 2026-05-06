import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─────────────────────────────────────────────
// Recalculate Marketing Stats — Admin Only
// Aggregates MarketingEngagementLog into performance entities
// ─────────────────────────────────────────────

function safeRate(numerator, denominator) {
  if (!denominator || denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100; // return as percentage, 2dp
}

function calculateInterestScore({ human_opened, human_clicked, direction_clicks, save_clicks, delivered }) {
  if (!delivered) return 0;
  let raw = (human_opened || 0) * 2 + (human_clicked || 0) * 5
    + (direction_clicks || 0) * 10 + (save_clicks || 0) * 8;
  const max = delivered * 10;
  return Math.min(100, Math.round((raw / Math.max(max, 1)) * 100));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { operator_id, sale_id, territory_id, date_start, date_end } = body;

  const now = new Date().toISOString();

  // Fetch all relevant engagement logs
  let logs = await base44.asServiceRole.entities.MarketingEngagementLog.list('-created_at', 5000);

  // Apply filters
  if (operator_id) logs = logs.filter(l => l.operator_id === operator_id);
  if (sale_id) logs = logs.filter(l => l.sale_id === sale_id);
  if (territory_id) logs = logs.filter(l => l.territory_id === territory_id);
  if (date_start) logs = logs.filter(l => l.event_timestamp >= date_start);
  if (date_end) logs = logs.filter(l => l.event_timestamp <= date_end + 'T23:59:59Z');

  // ── Group by sale_id ──
  const bySale = {};
  for (const log of logs) {
    if (!log.sale_id) continue;
    if (!bySale[log.sale_id]) bySale[log.sale_id] = { sale_id: log.sale_id, sale_title: log.sale_title, operator_id: log.operator_id, operator_name: log.operator_name, territory_id: log.territory_id, logs: [] };
    bySale[log.sale_id].logs.push(log);
  }

  const saleResults = [];
  for (const [sid, group] of Object.entries(bySale)) {
    const L = group.logs;
    const count = (type) => L.filter(l => l.normalized_event_type === type).length;
    const linkTypeCount = (linkType) => L.filter(l => l.metadata_json?.link_type === linkType).length;

    const sent = count('email_sent');
    const delivered = count('email_delivered');
    const opened = count('email_opened');
    const humanOpened = count('email_human_opened');
    const clicked = count('email_clicked');
    const humanClicked = count('email_human_clicked');
    const bounced = count('email_bounced');
    const unsubs = count('email_unsubscribed');
    const spam = count('email_spam_complaint');
    const dirClicks = linkTypeCount('directions');
    const pageClicks = linkTypeCount('sale_page');
    const galleryClicks = linkTypeCount('image_gallery');
    const saveClicks = linkTypeCount('save_sale');
    const shareClicks = linkTypeCount('share');

    const uniqueClickers = new Set(L.filter(l => l.normalized_event_type === 'email_clicked' && l.consumer_email).map(l => l.consumer_email)).size;

    // Top clicked URL
    const urlCounts = {};
    L.filter(l => l.link_url).forEach(l => { urlCounts[l.link_url] = (urlCounts[l.link_url] || 0) + 1; });
    const topClickedUrl = Object.entries(urlCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Top zip codes
    const zipCounts = {};
    L.filter(l => l.zip_code).forEach(l => { zipCounts[l.zip_code] = (zipCounts[l.zip_code] || 0) + 1; });

    const interestScore = calculateInterestScore({ human_opened: humanOpened, human_clicked: humanClicked, direction_clicks: dirClicks, save_clicks: saveClicks, delivered });

    // Upsert SaleMarketingPerformance
    const existing = await base44.asServiceRole.entities.SaleMarketingPerformance.filter({ sale_id: sid }).catch(() => []);
    const perfData = {
      sale_id: sid,
      sale_title: group.sale_title,
      operator_id: group.operator_id,
      operator_name: group.operator_name,
      territory_id: group.territory_id,
      total_recipients: sent,
      total_sent: sent,
      total_delivered: delivered,
      total_opened: opened,
      total_human_opened: humanOpened,
      total_clicked: clicked,
      total_human_clicked: humanClicked,
      total_unique_clickers: uniqueClickers,
      total_bounced: bounced,
      total_unsubscribed: unsubs,
      total_spam_complaints: spam,
      direction_clicks: dirClicks,
      sale_page_clicks: pageClicks,
      image_gallery_clicks: galleryClicks,
      save_sale_clicks: saveClicks,
      share_clicks: shareClicks,
      estimated_attendance_interest_score: interestScore,
      top_clicked_url: topClickedUrl,
      top_zip_codes_json: zipCounts,
      last_calculated_at: now,
      updated_at: now,
    };

    if (existing[0]) {
      await base44.asServiceRole.entities.SaleMarketingPerformance.update(existing[0].id, perfData);
    } else {
      await base44.asServiceRole.entities.SaleMarketingPerformance.create({ ...perfData, created_at: now });
    }
    saleResults.push({ sale_id: sid, interest_score: interestScore });
  }

  // ── Group by operator_id ──
  const byOperator = {};
  for (const log of logs) {
    if (!log.operator_id) continue;
    if (!byOperator[log.operator_id]) byOperator[log.operator_id] = { operator_id: log.operator_id, operator_name: log.operator_name, territory_id: log.territory_id, logs: [] };
    byOperator[log.operator_id].logs.push(log);
  }

  const operatorResults = [];
  for (const [oid, group] of Object.entries(byOperator)) {
    const L = group.logs;
    const count = (type) => L.filter(l => l.normalized_event_type === type).length;
    const sent = count('email_sent');
    const delivered = count('email_delivered');
    const opened = count('email_opened');
    const humanOpened = count('email_human_opened');
    const clicked = count('email_clicked');
    const humanClicked = count('email_human_clicked');
    const bounced = count('email_bounced');
    const unsubs = count('email_unsubscribed');
    const spam = count('email_spam_complaint');
    const salesPromoted = new Set(L.filter(l => l.sale_id).map(l => l.sale_id)).size;

    const zipCounts = {};
    L.filter(l => l.zip_code).forEach(l => { zipCounts[l.zip_code] = (zipCounts[l.zip_code] || 0) + 1; });

    const existing = await base44.asServiceRole.entities.OperatorMarketingPerformance.filter({ operator_id: oid }).catch(() => []);
    const perfData = {
      operator_id: oid,
      operator_name: group.operator_name,
      territory_id: group.territory_id,
      period_start: date_start || null,
      period_end: date_end || null,
      total_sales_promoted: salesPromoted,
      total_sent: sent,
      total_delivered: delivered,
      total_opened: opened,
      total_human_opened: humanOpened,
      total_clicked: clicked,
      total_human_clicked: humanClicked,
      total_bounced: bounced,
      total_unsubscribed: unsubs,
      total_spam_complaints: spam,
      average_open_rate: safeRate(opened, delivered),
      average_human_open_rate: safeRate(humanOpened, delivered),
      average_click_rate: safeRate(clicked, delivered),
      average_human_click_rate: safeRate(humanClicked, delivered),
      average_unsubscribe_rate: safeRate(unsubs, delivered),
      net_audience_growth: -unsubs,
      audience_loss_count: unsubs,
      top_zip_codes_json: zipCounts,
      updated_at: now,
      last_calculated_at: now,
    };

    if (existing[0]) {
      await base44.asServiceRole.entities.OperatorMarketingPerformance.update(existing[0].id, perfData);
    } else {
      await base44.asServiceRole.entities.OperatorMarketingPerformance.create({ ...perfData, created_at: now });
    }
    operatorResults.push({ operator_id: oid, sent, delivered, human_open_rate: safeRate(humanOpened, delivered) });
  }

  return Response.json({
    success: true,
    sales_updated: saleResults.length,
    operators_updated: operatorResults.length,
    total_logs_processed: logs.length,
    calculated_at: now,
  });
});