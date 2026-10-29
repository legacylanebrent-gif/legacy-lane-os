import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { canAccessAgentRecord, ownershipForAgent, allowedFields, FALLBACK_CONFIG, isAdmin } from '../../shared/listingAccess.ts';

// Temporary release-verification harness: exercises the REAL authorization decision
// and the REAL agent-facing ownership projection with synthetic identities.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const agentA = { id: 'agent-a-fixture', role: 'user' };
  const agentB = { id: 'agent-b-fixture', role: 'user' };
  const admin = { id: 'admin-fixture', role: 'admin' };
  const recordOfA = { id: 'opp-a', agent_user_id: 'agent-a-fixture' };

  const matrix = {
    owner_reads_own: canAccessAgentRecord(recordOfA, agentA),
    other_agent_denied: canAccessAgentRecord(recordOfA, agentB),
    admin_oversight_allowed: canAccessAgentRecord(recordOfA, admin),
    anonymous_denied: canAccessAgentRecord(recordOfA, null),
    missing_record_denied: canAccessAgentRecord(null, agentA),
    foreign_row_denied_to_other_agent: canAccessAgentRecord({ agent_user_id: 'agent-a-fixture' }, agentB),
  };

  const hostileConfig = {
    ...FALLBACK_CONFIG,
    allowed_enrichment_fields: [...FALLBACK_CONFIG.allowed_enrichment_fields, 'owner_phone', 'owner_email'],
  };
  const view = ownershipForAgent(
    {
      ownership: {
        match_status: 'verified',
        owner_of_record: 'Rowan Pierce',
        owner_phone: '555-0100',
        owner_email: 'owner@example.com',
      },
      ai_match_hint: { summary: 'hint' },
    },
    hostileConfig,
  );
  const serialized = JSON.stringify(view);

  return Response.json({
    matrix,
    redaction: {
      effective_fields: allowedFields(hostileConfig),
      phone_leaked: serialized.includes('555-0100'),
      email_leaked: serialized.includes('owner@example.com'),
    },
    caller: { id: user.id, is_admin: isAdmin(user) },
  });
}