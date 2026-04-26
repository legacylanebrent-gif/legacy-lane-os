/**
 * Reverse Webhook Receiver
 * 
 * Called by external sale sites to push updates back to the OS.
 * Authenticates via API key, then applies changes to Item or EstateSale records.
 * 
 * Expected POST body:
 * {
 *   api_key: string,          // the operator's API key from CompanyApiKey
 *   event: "item_status_update" | "item_sold" | "sale_view",
 *   item_id?: string,         // for item events
 *   sale_id?: string,         // for sale events
 *   status?: string,          // "sold" | "reserved" | "available" | "pending"
 *   buyer_name?: string,      // optional buyer info for sold items
 *   buyer_email?: string,
 *   sale_price?: number,      // actual sold price if different from listing
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
  }

  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));

  const { api_key, event, item_id, sale_id, status, buyer_name, buyer_email, sale_price } = body;

  // Validate API key
  if (!api_key) {
    return Response.json({ error: 'Missing api_key' }, { status: 401, headers });
  }

  const apiKeys = await base44.asServiceRole.entities.CompanyApiKey.filter({ api_key, is_active: true });
  if (apiKeys.length === 0) {
    return Response.json({ error: 'Invalid or inactive api_key' }, { status: 403, headers });
  }

  const apiKeyRecord = apiKeys[0];
  const operatorId = apiKeyRecord.operator_id;

  // Handle events
  if (event === 'item_status_update' || event === 'item_sold') {
    if (!item_id) {
      return Response.json({ error: 'Missing item_id' }, { status: 400, headers });
    }

    // Verify item belongs to this operator
    const items = await base44.asServiceRole.entities.Item.filter({ id: item_id });
    if (items.length === 0) {
      return Response.json({ error: 'Item not found' }, { status: 404, headers });
    }

    const item = items[0];

    // Confirm the item belongs to a sale owned by this operator
    if (item.estate_sale_id) {
      const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: item.estate_sale_id, operator_id: operatorId });
      if (sales.length === 0) {
        return Response.json({ error: 'Unauthorized: item does not belong to your operator account' }, { status: 403, headers });
      }
    } else if (item.seller_id !== operatorId) {
      return Response.json({ error: 'Unauthorized: item does not belong to your operator account' }, { status: 403, headers });
    }

    // Build update payload
    const updateData = {};
    if (status) updateData.status = status;
    if (sale_price !== undefined) updateData.price = sale_price;

    await base44.asServiceRole.entities.Item.update(item_id, updateData);

    // If sold, record a transaction
    if ((event === 'item_sold' || status === 'sold') && item.estate_sale_id) {
      await base44.asServiceRole.entities.Transaction.create({
        sale_id: item.estate_sale_id,
        item_name: item.title,
        quantity: 1,
        price: sale_price || item.price || 0,
        total: sale_price || item.price || 0,
        payment_method: 'credit_card',
        notes: `Online sale via external site${buyer_name ? ' — Buyer: ' + buyer_name : ''}`,
        transaction_date: new Date().toISOString(),
        seller_amount: Math.round((sale_price || item.price || 0) * 0.8 * 100) / 100,
        company_amount: Math.round((sale_price || item.price || 0) * 0.2 * 100) / 100,
      });
    }

    return Response.json({ success: true, event, item_id, updated: updateData }, { headers });
  }

  if (event === 'sale_view') {
    if (!sale_id) {
      return Response.json({ error: 'Missing sale_id' }, { status: 400, headers });
    }

    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id, operator_id: operatorId });
    if (sales.length === 0) {
      return Response.json({ error: 'Sale not found or unauthorized' }, { status: 404, headers });
    }

    const currentViews = sales[0].views || 0;
    await base44.asServiceRole.entities.EstateSale.update(sale_id, { views: currentViews + 1 });

    return Response.json({ success: true, event, sale_id }, { headers });
  }

  return Response.json({ error: `Unknown event: ${event}` }, { status: 400, headers });
});