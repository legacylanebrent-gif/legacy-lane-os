import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// P0 security — invite-code redemption seam. PendingTeamInvite records are no
// longer readable by arbitrary authenticated users (RLS), so invitees redeem
// their code through this server function: the code is the check, the lookup
// runs with the service role, and only the non-sensitive fields the invitee
// needs (operator to link, role, company name, note) are returned.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const inviteCode = (body.invite_code || '').trim().toUpperCase();
    if (!inviteCode) {
      return Response.json({ error: 'Invite code required' }, { status: 400 });
    }

    const invites = await base44.asServiceRole.entities.PendingTeamInvite.filter({
      invite_code: inviteCode,
      status: 'pending'
    }, '-created_date', 1);

    if (invites.length === 0) {
      return Response.json({ found: false });
    }

    const invite = invites[0];

    // Idempotent acceptance: if this user already redeemed, just return the info again
    if (invite.invited_user_id && invite.invited_user_id !== user.id) {
      return Response.json({ found: false, error: 'This invite has already been used' });
    }

    if (invite.invited_user_id !== user.id) {
      await base44.asServiceRole.entities.PendingTeamInvite.update(invite.id, {
        status: 'accepted',
        invited_user_id: user.id
      });
    }

    return Response.json({
      found: true,
      invite: {
        operator_id: invite.operator_id,
        role: invite.role,
        company_name: invite.company_name,
        personal_note: invite.personal_note
      }
    });
  } catch (error) {
    console.error('redeemTeamInvite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}