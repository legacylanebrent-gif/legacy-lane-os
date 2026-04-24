/**
 * Webhook Push Function
 * 
 * Called by automations when EstateSale or Item records change.
 * Pushes updated data to each company's registered webhook URL.
 * 
 * Can also be triggered manually via the admin UI.
 * Body: { operator_id?: string } — if provided, only push for that operator.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json().catch(() => ({}));
  const targetOperatorId = body?.data?.operator_id || body?.operator_id || null;

  // Get all active webhook-enabled API key records
  const query = { is_active: true, webhook_enabled: true };
  if (targetOperatorId) query.operator_id = targetOperatorId;

  const apiKeys = await base44.asServiceRole.entities.CompanyApiKey.filter(query);

  if (apiKeys.length === 0) {
    return Response.json({ success: true, message: 'No webhook-enabled companies found' });
  }

  const results = [];

  for (const apiKeyRecord of apiKeys) {
    if (!apiKeyRecord.webhook_url) continue;

    const operatorId = apiKeyRecord.operator_id;

    // Fetch all sales for this operator
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ operator_id: operatorId });
    const saleIds = sales.map(s => s.id);

    let items = [];
    for (const saleId of saleIds) {
      const saleItems = await base44.asServiceRole.entities.Item.filter({ estate_sale_id: saleId });
      items = items.concat(saleItems);
    }

    const payload = {
      event: 'data_updated',
      generated_at: new Date().toISOString(),
      operator_id: operatorId,
      operator_name: apiKeyRecord.operator_name,
      sales: sales.map(sale => ({
        id: sale.id,
        title: sale.title,
        description: sale.description,
        status: sale.status,
        sale_type: sale.sale_type,
        sale_dates: sale.sale_dates || [],
        address: sale.property_address,
        location: sale.location,
        images: sale.images || [],
        categories: sale.categories || [],
        payment_methods: sale.payment_methods || [],
        special_notes: sale.special_notes,
        total_items: sale.total_items,
        estimated_value: sale.estimated_value,
        updated_date: sale.updated_date,
        items: items
          .filter(item => item.estate_sale_id === sale.id)
          .map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            price: item.price,
            original_price: item.original_price,
            category: item.category,
            condition: item.condition,
            status: item.status,
            images: item.images || [],
            quantity: item.quantity,
            sku: item.sku,
            tags: item.tags || [],
            updated_date: item.updated_date
          }))
      }))
    };

    let pushStatus = 'failed';
    try {
      const response = await fetch(apiKeyRecord.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LegacyLane-Api-Key': apiKeyRecord.api_key
        },
        body: JSON.stringify(payload)
      });
      pushStatus = response.ok ? 'success' : 'failed';
    } catch (err) {
      console.error(`Webhook push failed for ${operatorId}:`, err.message);
      pushStatus = 'failed';
    }

    // Update the last push status
    await base44.asServiceRole.entities.CompanyApiKey.update(apiKeyRecord.id, {
      last_push_at: new Date().toISOString(),
      last_push_status: pushStatus
    });

    results.push({ operator_id: operatorId, status: pushStatus });
  }

  return Response.json({ success: true, results });
});