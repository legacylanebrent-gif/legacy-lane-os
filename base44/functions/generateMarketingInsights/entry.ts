import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─────────────────────────────────────────────
// Generate AI Marketing Insights
// Analyzes engagement data and produces recommendations
// ─────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { operator_id, sale_id } = body;

  // Operators can only access their own data
  const isAdmin = user.role === 'admin';
  if (!isAdmin && !operator_id) return Response.json({ error: 'operator_id required' }, { status: 400 });

  let salePerf = null;
  let operatorPerf = null;
  let engagementLogs = [];

  if (sale_id) {
    const results = await base44.asServiceRole.entities.SaleMarketingPerformance.filter({ sale_id }).catch(() => []);
    salePerf = results[0] || null;
    engagementLogs = await base44.asServiceRole.entities.MarketingEngagementLog.filter({ sale_id }).catch(() => []);
    // Security: ensure operator can only see their sale
    if (!isAdmin && salePerf && salePerf.operator_id !== operator_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (operator_id) {
    const results = await base44.asServiceRole.entities.OperatorMarketingPerformance.filter({ operator_id }).catch(() => []);
    operatorPerf = results[0] || null;
    if (!engagementLogs.length) {
      engagementLogs = await base44.asServiceRole.entities.MarketingEngagementLog.filter({ operator_id }).catch(() => []);
    }
  }

  // Build top clicked links
  const urlCounts = {};
  engagementLogs.filter(l => l.link_url).forEach(l => {
    urlCounts[l.link_url] = (urlCounts[l.link_url] || 0) + 1;
  });
  const topLinks = Object.entries(urlCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([url, count]) => ({ url, count }));

  // Top ZIP codes
  const zipCounts = {};
  engagementLogs.filter(l => l.zip_code).forEach(l => {
    zipCounts[l.zip_code] = (zipCounts[l.zip_code] || 0) + 1;
  });
  const topZips = Object.entries(zipCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([zip, count]) => ({ zip, count }));

  // Build prompt
  const perfContext = salePerf ? `
Sale: "${salePerf.sale_title}"
- Sent: ${salePerf.total_sent}, Delivered: ${salePerf.total_delivered}
- Human Opens: ${salePerf.total_human_opened} (${salePerf.total_delivered > 0 ? Math.round(salePerf.total_human_opened / salePerf.total_delivered * 100) : 0}%)
- Human Clicks: ${salePerf.total_human_clicked} (${salePerf.total_delivered > 0 ? Math.round(salePerf.total_human_clicked / salePerf.total_delivered * 100) : 0}%)
- Direction Clicks: ${salePerf.direction_clicks}
- Save Sale Clicks: ${salePerf.save_sale_clicks}
- Unsubscribes: ${salePerf.total_unsubscribed}, Bounces: ${salePerf.total_bounced}, Spam: ${salePerf.total_spam_complaints}
- Interest Score: ${salePerf.estimated_attendance_interest_score}/100
- Top ZIPs: ${topZips.map(z => z.zip).join(', ')}
- Top Links: ${topLinks.map(l => l.url).join(', ')}
` : '';

  const opContext = operatorPerf ? `
Operator: "${operatorPerf.operator_name}"
- Sales Promoted: ${operatorPerf.total_sales_promoted}
- Avg Human Open Rate: ${operatorPerf.average_human_open_rate}%
- Avg Human Click Rate: ${operatorPerf.average_human_click_rate}%
- Avg Unsubscribe Rate: ${operatorPerf.average_unsubscribe_rate}%
- Total Sent: ${operatorPerf.total_sent}, Bounced: ${operatorPerf.total_bounced}, Spam: ${operatorPerf.total_spam_complaints}
- Net Audience Growth: ${operatorPerf.net_audience_growth}
` : '';

  if (!perfContext && !opContext) {
    return Response.json({ success: false, message: 'No performance data found. Run recalculation first.' });
  }

  const prompt = `You are a marketing analytics expert specializing in estate sales and local event promotion.

Analyze the following email marketing performance data for a Legacy Lane OS operator:

${perfContext}${opContext}

Provide a practical, specific analysis in this exact JSON structure:
{
  "summary": "2-3 sentence plain-English overview of overall performance",
  "what_worked": ["list of 2-3 things that performed well"],
  "what_underperformed": ["list of 2-3 things that need improvement"],
  "recommended_next_action": "One specific, actionable next step",
  "suggested_followup_email": "A 2-3 sentence follow-up email to send to high-engagement subscribers",
  "suggested_social_post": "A 1-2 sentence social media post based on buyer interest signals",
  "operator_coaching_note": "A 2-3 sentence note the platform admin would share with the operator",
  "best_send_time": "Recommendation on when to send next email",
  "subject_line_suggestions": ["2 alternative subject lines to test"]
}

Be specific, use the actual data. Reference real ZIP codes or click types if available. Keep language practical and action-oriented.`;

  try {
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          what_worked: { type: 'array', items: { type: 'string' } },
          what_underperformed: { type: 'array', items: { type: 'string' } },
          recommended_next_action: { type: 'string' },
          suggested_followup_email: { type: 'string' },
          suggested_social_post: { type: 'string' },
          operator_coaching_note: { type: 'string' },
          best_send_time: { type: 'string' },
          subject_line_suggestions: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    // Store AI results back to performance entities
    if (salePerf) {
      await base44.asServiceRole.entities.SaleMarketingPerformance.update(salePerf.id, {
        ai_summary: aiResponse.summary,
        ai_recommendations: JSON.stringify({ ...aiResponse }),
        updated_at: new Date().toISOString(),
      });
    }
    if (operatorPerf) {
      await base44.asServiceRole.entities.OperatorMarketingPerformance.update(operatorPerf.id, {
        ai_summary: aiResponse.summary,
        ai_recommendations: JSON.stringify({ ...aiResponse }),
        updated_at: new Date().toISOString(),
      });
    }

    return Response.json({ success: true, insights: aiResponse });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});