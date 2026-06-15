import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action_id, reference_id, notes } = await req.json();
    if (!action_id) {
      return Response.json({ error: 'Missing action_id' }, { status: 400 });
    }

    // Look up the reward action
    const actions = await base44.asServiceRole.entities.RewardAction.filter({ action_id, is_active: true });
    if (actions.length === 0) {
      return Response.json({ error: 'Reward action not found' }, { status: 404 });
    }
    const action = actions[0];

    // For "once" actions, check if already completed
    if (action.frequency === 'once') {
      const existing = await base44.asServiceRole.entities.UserReward.filter({
        user_id: user.id,
        action_id,
      });
      if (existing.length > 0) {
        return Response.json({ 
          success: false, 
          message: 'Already completed this one-time reward',
          already_completed: true 
        });
      }
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    const reward = await base44.asServiceRole.entities.UserReward.create({
      user_id: user.id,
      action_id,
      action_name: action.action_name,
      points_earned: action.points,
      month: currentMonth,
      reference_id: reference_id || '',
      notes: notes || '',
    });

    return Response.json({ 
      success: true, 
      message: `Earned ${action.points} points for ${action.action_name}!`,
      reward,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});