import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { enqueueActivity } from '../../shared/identityActivityOutbox.ts';

// Manual "Send to Customer.io" for a single PropstreamAgentEmailDraft.
// Admin-only. Sends the composed email to Customer.io (identify + track
// event) and marks the draft as sent so future runs treat the agent as
// already contacted (reminder variant) for 30 days.

const EVENT_NAME = 'propstream_agent_new_listing_congrats';

function getCioConfig(base44) {
  return {
    enabled: Deno.env.get('CUSTOMERIO_ENABLED') === 'true',
    pipelinesWriteKey: Deno.env.get('CUSTOMERIO_PIPELINES_WRITE_KEY') || '',
    base44,
  };
}

// Phase 7D.1A: direct CIO identify RETIRED — canonical outbox enqueue
async function cioIdentify(userId, email, traits, config) {
  await enqueueActivity(config.base44, {
    event_type: "profile_sync",
    identity_context: { email, first_name: traits.first_name || '' },
    product_context: { product_id: "estatesalen" },
    payload: { source: 'propstream_agent_lead', agent_name: traits.agent_name || '', city: traits.city || '', state: traits.state || '' },
  });
  return { sent: true };
}

// Phase 7D.1A: direct CIO track RETIRED — canonical outbox enqueue.
// Privacy filter: listings array, email subject/body and phone are NEVER forwarded.
async function cioTrack(userId, email, eventName, data, config) {
  await enqueueActivity(config.base44, {
    event_type: eventName,
    identity_context: { email },
    product_context: { product_id: "estatesalen" },
    payload: {
      variant: data.variant,
      agent_name: data.agent_name,
      listing_count: data.listing_count,
      primary_city: data.primary_city,
      state: data.state,
      matched_operator_name: data.matched_operator_name || '',
      triggered_at: new Date().toISOString(),
    },
  });
  return { sent: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const draftId = body.draft_id;
    if (!draftId) return Response.json({ error: 'Missing draft_id' }, { status: 400 });

    const draft = await base44.asServiceRole.entities.PropstreamAgentEmailDraft.get(draftId);
    if (!draft) return Response.json({ error: 'Draft not found' }, { status: 404 });
    if (draft.status === 'sent') return Response.json({ error: 'Draft already sent' }, { status: 400 });

    const config = getCioConfig(base44);
    const userId = `propstream_agent:${draft.agent_email}`;
    const listings = draft.listings || [];

    try {
      await cioIdentify(userId, draft.agent_email, {
        first_name: firstNameOf(draft.agent_name),
        agent_name: draft.agent_name || '',
        city: draft.primary_city || '',
        state: draft.state || '',
        source: 'propstream_agent_lead',
        updated_at: new Date().toISOString(),
      }, config);
      const trackRes = await cioTrack(userId, draft.agent_email, EVENT_NAME, {
        variant: draft.variant,
        agent_name: draft.agent_name,
        listing_count: draft.listing_count || listings.length,
        listings,
        primary_city: draft.primary_city,
        state: draft.state,
        matched_operator_name: draft.matched_operator_name || '',
        matched_operator_phone: draft.matched_operator_phone || '',
        email_subject: draft.email_subject,
        email_body: draft.email_body,
      }, config);

      await base44.asServiceRole.entities.PropstreamAgentEmailDraft.update(draftId, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: user.email,
        customerio_response: { sent: true, ...(trackRes || {}) },
        error_message: '',
      });

      return Response.json({ success: true, status: 'sent', draft_id: draftId, agent_email: draft.agent_email });
    } catch (err) {
      console.error(`sendPropstreamAgentEmailDraft CIO error for ${draft.agent_email}: ${err.message}`);
      await base44.asServiceRole.entities.PropstreamAgentEmailDraft.update(draftId, {
        status: 'failed',
        error_message: err.message,
      });
      return Response.json({ error: err.message }, { status: 500 });
    }
  } catch (error) {
    console.error('sendPropstreamAgentEmailDraft error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function firstNameOf(full) {
  if (!full) return 'there';
  return full.trim().split(/\s+/)[0];
}