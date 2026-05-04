import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await base44.asServiceRole.entities.AdminAISettings.list('-created_date', 1);
  const s = settings[0] || {};
  if (!s.allow_social_publishing) {
    return Response.json({
      success: false,
      message: 'Direct publishing is disabled. Use approved scheduling through Make/Integromat or connected social APIs. Enable allow_social_publishing in Admin AI Settings to unlock this feature.',
    }, { status: 403 });
  }

  return Response.json({
    success: false,
    message: 'Direct social API publishing is not yet implemented. Please use scheduleSocialPost with Make/Integromat webhook.',
  }, { status: 501 });
});