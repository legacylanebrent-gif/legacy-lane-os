import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const METHODS = ['call', 'text', 'email', 'in_person', 'other'];
const OUTCOMES = ['connected', 'left_message', 'no_answer', 'wrong_number', 'declined', 'other'];

function asList(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

// The agent-facing view of a referral: enough to know which client to call,
// without exposing the full internal lead record.
function publicLead(lead) {
  return {
    lead_id: lead.lead_id,
    client_name: lead.client_name || '',
    property_address: lead.property_address || '',
    property_city: lead.property_city || '',
    property_state: lead.property_state || '',
    property_zip: lead.property_zip || '',
    county: lead.county || '',
    client_email: lead.client_email || '',
    client_phone: lead.client_phone || '',
    timeline: lead.timeline || 'unknown',
    need_notes: lead.need_notes || '',
    submitted_by_name: lead.submitted_by_name || '',
    contact_attempts: Array.isArray(lead.contact_attempts) ? lead.contact_attempts : [],
    agent_engagement: lead.agent_engagement || 'not_contacted',
  };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'get');
    const leadId = String(body.lead_id || '').trim();
    if (!leadId) return Response.json({ error: 'lead_id is required' }, { status: 400 });

    const rows = asList(
      await base44.asServiceRole.entities.ReferralLead.filter({ lead_id: leadId }, { limit: 1 })
    );
    const lead = rows[0];
    if (!lead) return Response.json({ error: 'Referral not found' }, { status: 404 });

    const callerEmail = norm(user.email);
    const notifiedEmails = (lead.notified_agent_emails || []).map(norm);
    const isAdmin = user.role === 'admin';
    const isOwner = lead.source_user_id === user.id || lead.assigned_operator_id === user.id;
    const isAssignedAgent = lead.assigned_agent_id === user.id;
    const wasNotified = !!callerEmail && notifiedEmails.includes(callerEmail);
    const mayReport = isAdmin || isOwner || isAssignedAgent || wasNotified;

    if (!mayReport) {
      return Response.json(
        {
          error:
            'This referral was not sent to your account email. Sign in with the email the referral was sent to, or ask the referring company to share the lead with you.',
        },
        { status: 403 }
      );
    }

    if (action === 'get') {
      return Response.json({ lead: publicLead(lead), can_report: true });
    }

    if (action !== 'report') {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    const method = METHODS.includes(body.method) ? body.method : null;
    const outcome = OUTCOMES.includes(body.outcome) ? body.outcome : null;
    if (!method) return Response.json({ error: 'Choose how you reached out.' }, { status: 400 });
    if (!outcome) return Response.json({ error: 'Choose what happened.' }, { status: 400 });

    const reportedAt = body.at ? new Date(body.at) : new Date();
    if (Number.isNaN(reportedAt.getTime())) {
      return Response.json({ error: 'That contact date and time is not valid.' }, { status: 400 });
    }
    const now = new Date();
    if (reportedAt.getTime() > now.getTime() + 60 * 60 * 1000) {
      return Response.json({ error: 'Contact date cannot be in the future.' }, { status: 400 });
    }

    const agentName = String(body.agent_name || '').trim() || user.full_name || callerEmail || 'Agent';
    const attempt = {
      attempt_id: crypto.randomUUID(),
      at: reportedAt.toISOString(),
      recorded_at: now.toISOString(),
      agent_user_id: user.id,
      agent_name: agentName,
      agent_email: callerEmail,
      method,
      outcome,
      connected: outcome === 'connected',
      spoke_with: String(body.spoke_with || '').trim(),
      notes: String(body.notes || '').trim(),
    };

    const attempts = [...(Array.isArray(lead.contact_attempts) ? lead.contact_attempts : []), attempt];
    let agentEngagement = 'attempted';
    if (outcome === 'connected') agentEngagement = 'connected';
    else if (outcome === 'declined') agentEngagement = 'declined';

    await base44.asServiceRole.entities.ReferralLead.update(lead.id, {
      contact_attempts: attempts,
      last_contact_at: attempt.at,
      last_contact_outcome: outcome,
      agent_engagement: agentEngagement,
    });

    // Keep the referring company informed in-app the moment an agent reports.
    if (lead.source_user_id) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: lead.source_user_id,
          type: 'referral_contact_report',
          title: `${agentName} reported contact on ${lead.client_name || 'your referral'}`,
          message: `${agentName} logged a ${method.replace('_', ' ')} attempt (${outcome.replace('_', ' ')}). Open your submitted referrals to read the notes.`,
          related_entity_type: 'ReferralLead',
          related_entity_id: lead.id,
          read: false,
        });
      } catch (notifyError) {
        console.error('referralContactReport: operator notification failed:', notifyError?.message);
      }
    }

    return Response.json({ ok: true, attempt, lead: publicLead({ ...lead, contact_attempts: attempts, agent_engagement: agentEngagement }) });
  } catch (error) {
    console.error('referralContactReport error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}