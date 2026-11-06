import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { estimatePropertyValue } from '../../shared/referralValueEstimate.ts';

// On-demand valuation for a referral that was saved before valuations existed
// (or whose estimate could not be produced). Only the referring operator, the
// assigned agent/operator, or an admin may trigger it.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const leadKey = String(body.lead_id || '').trim();
    if (!leadKey) return Response.json({ error: 'lead_id is required' }, { status: 400 });

    const found = await base44.asServiceRole.entities.ReferralLead.filter({ lead_id: leadKey }, { limit: 1 });
    const lead = Array.isArray(found) ? found[0] : found?.items?.[0];
    if (!lead) return Response.json({ error: 'Referral not found' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const allowed = isAdmin || [lead.source_user_id, lead.assigned_operator_id, lead.assigned_agent_id].includes(user.id);
    if (!allowed) return Response.json({ error: 'Not allowed' }, { status: 403 });

    const valuation = await estimatePropertyValue(base44, {
      address: lead.property_address,
      city: lead.property_city,
      state: lead.property_state,
      zip: lead.property_zip,
    });

    await base44.asServiceRole.entities.ReferralLead.update(lead.id, valuation);

    return Response.json({ ok: true, lead_id: lead.lead_id, valuation });
  } catch (error) {
    console.error('estimateReferralHomeValue error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}