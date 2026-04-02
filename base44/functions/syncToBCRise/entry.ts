import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BC_RISE_ENDPOINT = 'https://brent-rise-os.base44.app/api/functions/apiIngest';
const SOURCE_APP = 'legacy_lane_os';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const token = Deno.env.get('BCRISE_SECURE_TOKEN_9X3F2A7K8L1M5Q');

    if (!token) {
      return Response.json(
        { error: 'BC Rise token not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { record_type, force_sync } = body;

    if (!record_type) {
      return Response.json(
        { error: 'record_type required' },
        { status: 400 }
      );
    }

    // Fetch records from base44
    let records = [];
    const syncConfig = {
      kpis: { entity: 'KPI', fields: ['reporting_period_start', 'reporting_period_end', 'leads_count', 'opportunities_count', 'estate_sales_count', 'inventory_items_sold', 'revenue_total', 'average_sale_value', 'conversion_rate', 'territory'] },
      leads: { entity: 'Lead', fields: ['contact_id', 'source', 'source_details', 'intent', 'situation', 'property_address', 'estimated_value', 'timeline', 'routed_to', 'score', 'converted', 'conversion_date', 'revenue_generated'] },
      opportunities: { entity: 'Deal', fields: ['name', 'contact_id', 'property_id', 'estate_sale_id', 'owner_id', 'deal_type', 'stage', 'value', 'probability', 'expected_close_date', 'actual_close_date', 'notes'] },
      revenue: { entity: 'RevenueEvent', fields: ['user_id', 'revenue_type', 'amount', 'platform_fee', 'net_amount', 'transaction_date', 'status', 'is_recurring'] },
      activities: { entity: 'Activity', fields: ['contact_id', 'deal_id', 'property_id', 'user_id', 'activity_type', 'subject', 'description', 'status', 'scheduled_date', 'completed_date'] },
      users: { entity: 'User', fields: ['id', 'email', 'full_name', 'role'] },
      events: { entity: 'EstateSale', fields: ['id', 'title', 'operator_id', 'operator_name', 'status', 'sale_dates', 'location', 'total_items', 'estimated_value', 'actual_revenue', 'views', 'saves'] }
    };

    const config = syncConfig[record_type];
    if (!config) {
      return Response.json(
        { error: `Unknown record_type: ${record_type}` },
        { status: 400 }
      );
    }

    // Fetch from base44
    const entityData = await base44.entities[config.entity].list('-updated_date', 100);

    // Transform records for BC Rise
    records = (entityData || []).map(record => {
      const sourceId = record.id || record.contact_id;
      return {
        source_record_id: sourceId,
        app_name: SOURCE_APP,
        object_type: record_type.slice(0, -1), // Remove 's' suffix
        status: record.status || 'active',
        created_at: record.created_date,
        updated_at: record.updated_date,
        ...record
      };
    });

    // Send to BC Rise
    const response = await fetch(BC_RISE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BCRise-Token': token
      },
      body: JSON.stringify({
        source_app: SOURCE_APP,
        record_type,
        records
      })
    });

    const result = await response.json();

    return Response.json({
      source_app: SOURCE_APP,
      record_type,
      records_sent: records.length,
      records_succeeded: result.records_succeeded || 0,
      records_failed: result.records_failed || 0,
      result
    });
  } catch (error) {
    console.error('BC Rise sync error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});