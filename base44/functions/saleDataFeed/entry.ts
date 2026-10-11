/**
 * REST Pull Endpoint — Estate Sale Data Feed
 * 
 * Usage: POST /saleDataFeed
 * Body: { api_key: "their-key" }
 * 
 * Returns full sale details + all inventory items for the company.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  // Allow CORS so external websites can call this
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const body = await req.json();
  const { api_key } = body;

  if (!api_key) {
    return Response.json({ error: 'api_key is required' }, { status: 400, headers: corsHeaders });
  }

  const base44 = createClientFromRequest(req);

  // Look up the API key
  const apiKeys = await base44.asServiceRole.entities.CompanyApiKey.filter({ api_key, is_active: true });

  if (apiKeys.length === 0) {
    return Response.json({ error: 'Invalid or inactive API key' }, { status: 401, headers: corsHeaders });
  }

  const apiKeyRecord = apiKeys[0];
  const operatorId = apiKeyRecord.operator_id;

  // Canonical EstateSalen company identity (Phase 1) — additive, backward compatible.
  // Primary source: company_id on the sale records (backfilled). Fallback: Company registry lookup.
  let companyId = (sales.length > 0 && sales[0].company_id) ? sales[0].company_id : null;
  let companyName = apiKeyRecord.operator_name || null;
  if (!companyId) {
    try {
      const companies = await base44.asServiceRole.entities.Company.filter({ primary_contact_user_id: operatorId, status: 'active' });
      if (companies.length > 0) {
        companyId = companies[0].id;
        companyName = companies[0].display_name || companies[0].legal_name;
      }
    } catch (e) {
      console.error('Company lookup failed for feed:', e.message);
    }
  }

  // Fetch all sales for this Estate Sale Company Owner
  const sales = await base44.asServiceRole.entities.EstateSale.filter({ operator_id: operatorId });

  // Fetch all inventory items for this Estate Sale Company Owner's sales
  const saleIds = sales.map(s => s.id);
  let items = [];
  for (const saleId of saleIds) {
    const saleItems = await base44.asServiceRole.entities.Item.filter({ estate_sale_id: saleId });
    items = items.concat(saleItems);
  }

  // Structure the response
  const feed = {
    generated_at: new Date().toISOString(),
    operator_id: operatorId,
    operator_name: apiKeyRecord.operator_name,
    company_id: companyId,
    company_name: companyName,
    sales: sales.map(sale => ({
      id: sale.id,
      company_id: companyId,
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
      created_date: sale.created_date,
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
          subcategory: item.subcategory,
          condition: item.condition,
          status: item.status,
          images: item.images || [],
          quantity: item.quantity,
          sku: item.sku,
          tags: item.tags || [],
          fulfillment_options: item.fulfillment_options || [],
          created_date: item.created_date,
          updated_date: item.updated_date
        }))
    }))
  };

  return Response.json({ success: true, data: feed }, { status: 200, headers: corsHeaders });
});