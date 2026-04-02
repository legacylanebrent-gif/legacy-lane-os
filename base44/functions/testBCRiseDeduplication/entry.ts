import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = Deno.env.get('BCRISE_SECURE_TOKEN_9X3F2A7K8L1M5Q');
    if (!token) {
      return Response.json({ error: 'BC Rise token not configured' }, { status: 500 });
    }

    const bcRiseEndpoint = 'https://brent-rise-os.base44.app/api/functions/apiIngest';
    const results = {
      timestamp: new Date().toISOString(),
      source_app: 'legacy_lane_os',
      test_phase: 'DEDUPLICATION TEST',
      records_sent: {},
      responses: {},
      dedup_analysis: {}
    };

    // Fetch test records from app
    const kpis = await base44.entities.KPI.filter({ notes: { $regex: 'BC TEST KPI' } });
    const leads = await base44.entities.Lead.filter({ source_details: 'BC RISE VALIDATION' });
    const opportunities = await base44.entities.Opportunity.filter({ notes: { $regex: 'Opportunity validation' } });
    const revenues = await base44.entities.RevenueEvent.filter({ notes: { $regex: 'BC TEST REVENUE' } });

    // Send KPIs with SAME source_record_id
    if (kpis.length > 0) {
      const kpiPayload = {
        source_app: 'legacy_lane_os',
        record_type: 'kpis',
        records: kpis.map(k => ({
          source_record_id: 'llos_test_kpi_1',  // SAME ID - deduplication test
          app_name: 'legacy_lane_os',
          object_type: 'kpi',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          reporting_period_start: k.reporting_period_start,
          reporting_period_end: k.reporting_period_end,
          leads_count: k.leads_count || 0,
          opportunities_count: k.opportunities_count || 0,
          estate_sales_count: k.estate_sales_count || 0,
          inventory_items_sold: k.inventory_items_sold || 0,
          revenue_total: k.revenue_total || 0,
          average_sale_value: k.average_sale_value || 0,
          conversion_rate: k.conversion_rate || 0,
          territory: k.territory,
          notes: k.notes
        }))
      };

      const kpiResponse = await fetch(bcRiseEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BCRise-Token': token
        },
        body: JSON.stringify(kpiPayload)
      });

      const kpiData = await kpiResponse.json();
      results.records_sent.kpi = kpis.length;
      results.responses.kpi = {
        status: kpiResponse.status,
        ok: kpiResponse.ok,
        data: kpiData
      };
      results.dedup_analysis.kpi = {
        created: kpiData.created,
        updated: kpiData.updated,
        duplicates_prevented: kpiData.updated > 0 ? 'YES' : 'NO'
      };
    }

    // Send Leads with SAME source_record_id
    if (leads.length > 0) {
      const leadPayload = {
        source_app: 'legacy_lane_os',
        record_type: 'leads',
        records: leads.map(l => ({
          source_record_id: 'llos_test_lead_1',  // SAME ID
          app_name: 'legacy_lane_os',
          object_type: 'lead',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lead_name: 'BC TEST LEAD 1',
          lead_email: 'test-lead@legacylaneos.com',
          lead_phone: '555-321-9876',
          lead_type: l.intent || 'estate_sale',
          lead_source: l.source || 'website',
          pipeline_stage: 'new',
          estimated_value: l.estimated_value || 0,
          assigned_operator: 'Test Operator',
          territory: 'Monmouth County',
          last_activity_date: new Date().toISOString(),
          next_follow_up_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          notes: 'Estate sale lead validation test'
        }))
      };

      const leadResponse = await fetch(bcRiseEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BCRise-Token': token
        },
        body: JSON.stringify(leadPayload)
      });

      const leadData = await leadResponse.json();
      results.records_sent.lead = leads.length;
      results.responses.lead = {
        status: leadResponse.status,
        ok: leadResponse.ok,
        data: leadData
      };
      results.dedup_analysis.lead = {
        created: leadData.created,
        updated: leadData.updated,
        duplicates_prevented: leadData.updated > 0 ? 'YES' : 'NO'
      };
    }

    // Send Opportunities with SAME source_record_id
    if (opportunities.length > 0) {
      const oppPayload = {
        source_app: 'legacy_lane_os',
        record_type: 'opportunities',
        records: opportunities.map(o => ({
          source_record_id: 'llos_test_opp_1',  // SAME ID
          app_name: 'legacy_lane_os',
          object_type: 'opportunity',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          opportunity_name: o.opportunity_name,
          opportunity_type: o.opportunity_type,
          pipeline_stage: o.pipeline_stage,
          estimated_revenue: o.estimated_revenue || 0,
          probability_to_close: o.probability_to_close || 0,
          next_step: o.next_step,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          assigned_owner: o.assigned_owner,
          territory: o.territory,
          notes: o.notes
        }))
      };

      const oppResponse = await fetch(bcRiseEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BCRise-Token': token
        },
        body: JSON.stringify(oppPayload)
      });

      const oppData = await oppResponse.json();
      results.records_sent.opportunity = opportunities.length;
      results.responses.opportunity = {
        status: oppResponse.status,
        ok: oppResponse.ok,
        data: oppData
      };
      results.dedup_analysis.opportunity = {
        created: oppData.created,
        updated: oppData.updated,
        duplicates_prevented: oppData.updated > 0 ? 'YES' : 'NO'
      };
    }

    // Send Revenue with SAME source_record_id
    if (revenues.length > 0) {
      const revenuePayload = {
        source_app: 'legacy_lane_os',
        record_type: 'revenue',
        records: revenues.map(r => ({
          source_record_id: 'llos_test_revenue_1',  // SAME ID
          app_name: 'legacy_lane_os',
          object_type: 'revenue',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          revenue_date: new Date().toISOString().split('T')[0],
          revenue_type: r.revenue_type,
          revenue_source: 'on_site_sale',
          gross_amount: r.amount || 0,
          net_amount: Math.round((r.amount || 0) * 0.6),
          recurring_or_one_time: 'one_time',
          forecasted_or_actual: 'actual',
          territory: 'Monmouth County',
          notes: r.notes
        }))
      };

      const revenueResponse = await fetch(bcRiseEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BCRise-Token': token
        },
        body: JSON.stringify(revenuePayload)
      });

      const revenueData = await revenueResponse.json();
      results.records_sent.revenue = revenues.length;
      results.responses.revenue = {
        status: revenueResponse.status,
        ok: revenueResponse.ok,
        data: revenueData
      };
      results.dedup_analysis.revenue = {
        created: revenueData.created,
        updated: revenueData.updated,
        duplicates_prevented: revenueData.updated > 0 ? 'YES' : 'NO'
      };
    }

    const allUpdated = Object.values(results.dedup_analysis).every(a => a.updated > 0);
    const noDuplicates = Object.values(results.dedup_analysis).every(a => a.duplicates_prevented === 'YES');

    results.summary = {
      total_records_sent: Object.values(results.records_sent).reduce((a, b) => a + b, 0),
      all_successful: Object.values(results.responses).every(r => r.ok),
      deduplication_working: noDuplicates,
      all_records_updated: allUpdated,
      test_status: noDuplicates ? '✓ DEDUPLICATION VERIFIED' : '✗ DEDUPLICATION FAILED'
    };

    return Response.json(results);
  } catch (error) {
    console.error('Test error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});