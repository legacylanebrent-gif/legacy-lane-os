// Chapter 10 P1 — manual/replay inquiry → opportunity bridge.
// Invoked from operator tooling (SDK) to convert a captured WebsiteLead or an
// assigned EstateTransitionLead into the canonical SaleConversionPipeline
// opportunity without retyping. Server-side identity/provenance/consent rules
// live in the shared bridge module — this function only authorizes and maps.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  bridgeSellerInquiry,
  websiteLeadToBridgeInput,
  estateTransitionLeadToBridgeInput,
  resolveCompanyOperator,
} from '../../shared/sellerInquiryBridge.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const sourceType = body.source_type;
    const sourceId = String(body.source_id || '').trim();
    if (!['website_lead', 'estate_transition_lead'].includes(sourceType)) {
      return Response.json({ error: 'invalid_source_type' }, { status: 400 });
    }
    if (!sourceId) return Response.json({ error: 'source_id_required' }, { status: 400 });

    let input;
    let operatorId;
    let notifyIds;

    if (sourceType === 'website_lead') {
      const page = await service.entities.WebsiteLead.filter({ id: sourceId }, { limit: 1 });
      const lead = (page.items || page)[0];
      if (!lead) return Response.json({ error: 'lead_not_found' }, { status: 404 });
      operatorId = await resolveCompanyOperator(service, lead.company_id);
      if (!operatorId) return Response.json({ error: 'operator_unresolved', message: 'No operator user found for this lead company' }, { status: 409 });
      input = websiteLeadToBridgeInput(lead);
      notifyIds = lead.member_user_ids || [];
    } else {
      const page = await service.entities.EstateTransitionLead.filter({ id: sourceId }, { limit: 1 });
      const lead = (page.items || page)[0];
      if (!lead) return Response.json({ error: 'lead_not_found' }, { status: 404 });
      operatorId = lead.assigned_operator_id || body.operator_id || null;
      if (!operatorId) return Response.json({ error: 'no_assigned_operator', message: 'This lead has no assigned operator yet' }, { status: 409 });
      input = estateTransitionLeadToBridgeInput(lead);
      notifyIds = [operatorId];
    }

    // Authorization: the calling user must be the opportunity owner or an admin.
    if (user.role !== 'admin' && user.id !== operatorId) {
      return Response.json({ error: 'forbidden', message: 'Only the assigned operator or an admin can bridge this inquiry' }, { status: 403 });
    }

    const result = await bridgeSellerInquiry(service, {
      ...input,
      operator_id: operatorId,
      notify_user_ids: body.notify === false ? [] : notifyIds,
    });
    if (!result.ok) return Response.json({ error: result.error || 'bridge_failed' }, { status: 409 });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('bridgeInquiryToDeal error:', error && error.message);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}