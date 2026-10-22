import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { runWithdrawalRelay } from '../../shared/withdrawalRelayEngine.ts';
import { withdrawalRelayStorage } from '../../shared/withdrawalRelayStorage.ts';

// No implicit withdrawal action. Operators may report; only a designated
// administrator can confirm. Production dependencies cannot be caller-overridden.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const body = await req.json();
    const result = await runWithdrawalRelay(user, body, withdrawalRelayStorage(base44.asServiceRole));
    return Response.json(result);
  } catch (error) {
    console.error('withdrawal relay failed:', error.message);
    return Response.json({ ok: false, error: error.message }, { status: error.status || 500 });
  }
}