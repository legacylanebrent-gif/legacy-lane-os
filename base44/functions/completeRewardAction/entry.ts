import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action_id, reference_id, notes } = body || {};
    if (!action_id) {
      return Response.json({ error: 'Missing action_id' }, { status: 400 });
    }

    // ── Phase 1B: server-verified reward actions ──────────────────────────────
    // These actions grant points that the server DERIVES from a qualifying
    // record the user actually created. A client-supplied point value, a
    // forged reference, or a duplicate submission can never mint points:
    //   - the qualifying record must exist and belong to the caller,
    //   - points come from this server-side definition only,
    //   - one reward per (user, action, reference) — ever.
    const VERIFIED_ACTIONS = {
      purchase_reward: {
        entity: 'Income', label: 'Purchase Reward',
        compute: (r) => Math.floor(Math.abs(r.amount || 0) / 10),
      },
      purchase: {
        entity: 'Transaction', label: 'Purchase at Estate Sale',
        compute: () => 10,
      },
      qr_check_in: {
        entity: 'CheckIn', label: 'QR Code Check-in Bonus',
        compute: () => 15,
      },
      check_in: {
        entity: 'CheckIn', label: 'Check-in Bonus',
        compute: () => 10,
      },
      operator_referral_sent: {
        entity: 'Referral', label: 'Estate Sale Company Owner Referral Sent',
        compute: () => 100,
        requireOwnReferral: true,
      },
    };

    if (action_id in VERIFIED_ACTIONS) {
      const def = VERIFIED_ACTIONS[action_id];
      if (!reference_id) {
        return Response.json(
          { success: false, message: 'A qualifying record reference is required for this action' },
          { status: 400 }
        );
      }

      const records = await base44.asServiceRole.entities[def.entity]
        .filter({ id: reference_id });
      const record = records[0];
      if (!record) {
        return Response.json(
          { success: false, message: 'Qualifying record not found' },
          { status: 404 }
        );
      }

      // Ownership: the qualifying record must be the caller's own.
      if (def.requireOwnReferral) {
        if (record.referrer_id !== user.id) {
          return Response.json({ success: false, message: 'Not your referral record' }, { status: 403 });
        }
      } else if (record.created_by_id !== user.id) {
        return Response.json({ success: false, message: 'Not your record' }, { status: 403 });
      }

      // Duplicate prevention: one reward per (user, action, reference), ever.
      const already = await base44.asServiceRole.entities.UserReward.filter({
        user_id: user.id,
        action_id,
        reference_id,
      });
      if (already.length > 0) {
        return Response.json({ success: false, message: 'Already rewarded for this event' });
      }

      const month = new Date().toISOString().slice(0, 7);
      const points = def.compute(record);
      if (points <= 0) {
        return Response.json({ success: false, message: 'No points earned for this record' });
      }

      await base44.asServiceRole.entities.UserReward.create({
        user_id: user.id,
        action_id,
        action_name: def.label,
        points_earned: points,
        month,
        reference_id,
        notes: notes || '',
      });

      return Response.json({
        success: true,
        message: `+${points} points earned! (${def.label})`,
        points_earned: points,
      });
    }

    // Look up the reward action config
    const actions = await base44.asServiceRole.entities.RewardAction.filter({ action_id, is_active: true });
    if (!actions.length) {
      return Response.json({ success: false, message: 'Action not found or inactive' }, { status: 404 });
    }
    const action = actions[0];
    const points = action.points || 0;
    const frequency = action.frequency || 'unlimited';
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    // ── Deduplication: check existing rewards for same user+action+reference+month ──
    const existingFilters = { user_id: user.id, action_id, month };
    if (reference_id) {
      existingFilters.reference_id = reference_id;
    }
    const existing = await base44.asServiceRole.entities.UserReward.filter(existingFilters);

    // "once" frequency: block if any previous record exists across ALL months
    if (frequency === 'once') {
      const allTimeExisting = await base44.asServiceRole.entities.UserReward.filter({
        user_id: user.id,
        action_id,
      });
      if (allTimeExisting.length > 0) {
        return Response.json({ success: false, message: 'Already completed (one-time-only action)' });
      }
    }

    // For actions with a reference_id, block if already rewarded this month
    // (prevents save/unsave, re-documenting same purchase, re-adding same sale to calendar)
    if (reference_id && existing.length > 0) {
      return Response.json({ success: false, message: 'Already rewarded for this item this month' });
    }

    // For unlimited actions without reference_id, allow but note it
    // (e.g., share_app, feedback_submit — frontend should gate frequency)

    // ── Special handling: spend_100 / spend_500 mutual exclusion ──
    // If awarding spend_500 for a purchase that already got spend_100, only award the difference
    if (action_id === 'spend_500' && reference_id) {
      const spend100Existing = await base44.asServiceRole.entities.UserReward.filter({
        user_id: user.id,
        action_id: 'spend_100',
        reference_id,
        month,
      });
      if (spend100Existing.length > 0) {
        // Award only the difference (200 - 75 = 125)
        const spend100Action = await base44.asServiceRole.entities.RewardAction.filter({ action_id: 'spend_100', is_active: true });
        const spend100Points = spend100Action.length > 0 ? (spend100Action[0].points || 75) : 75;
        const adjustedPoints = points - spend100Points;
        if (adjustedPoints <= 0) {
          return Response.json({ success: false, message: 'Already received equivalent points from spend_100' });
        }
        await base44.asServiceRole.entities.UserReward.create({
          user_id: user.id,
          action_id,
          action_name: action.action_name,
          points_earned: adjustedPoints,
          month,
          reference_id,
          notes: notes || `Upgrade from spend_100 (+${adjustedPoints} extra points)`,
        });
        return Response.json({ success: true, message: `🎉 +${adjustedPoints} bonus points (spend_500 upgrade)!` });
      }
    }

    // Prevent spend_100 if spend_500 already claimed for same purchase
    if (action_id === 'spend_100' && reference_id) {
      const spend500Existing = await base44.asServiceRole.entities.UserReward.filter({
        user_id: user.id,
        action_id: 'spend_500',
        reference_id,
        month,
      });
      if (spend500Existing.length > 0) {
        return Response.json({ success: false, message: 'Already received spend_500 points for this purchase' });
      }
    }

    // ── Create the reward ──
    const rewardData = {
      user_id: user.id,
      action_id,
      action_name: action.action_name,
      points_earned: points,
      month,
      notes: notes || '',
    };
    if (reference_id) {
      rewardData.reference_id = reference_id;
    }

    await base44.asServiceRole.entities.UserReward.create(rewardData);

    return Response.json({
      success: true,
      message: `🎉 +${points} points earned! (${action.action_name})`,
      points_earned: points,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});