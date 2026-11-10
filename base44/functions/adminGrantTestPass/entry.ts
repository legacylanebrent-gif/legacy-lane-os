// adminGrantTestPass — gives ONE chosen user a time-boxed, card-free test pass.
// The pass is an ordinary trial subscription record, so the same server rules that
// govern real trials govern it: publishing rights come from the subscription, the
// daily trial job expires it on its renewal date, and nothing is charged.
// Admin only. Every grant and end is written to the Subscription record so it is
// visible in the dashboard rather than silently flipped on the user.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const DEFAULT_DAYS = 7;

function expiryFor(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!admin) return Response.json({ error: 'unauthorized' }, { status: 401 });
    if (admin.role !== 'admin') return Response.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'grant';
    const userId = body.user_id;
    if (!userId) return Response.json({ error: 'user_id_required' }, { status: 400 });

    const target = await base44.asServiceRole.entities.User.get(userId).catch((e) =>
      e.status === 404 ? null : Promise.reject(e),
    );
    if (!target) return Response.json({ error: 'user_not_found' }, { status: 404 });

    const existingPasses = await base44.asServiceRole.entities.Subscription.filter({
      user_id: userId,
      plan_type: 'test_pass',
    });
    const pass = (existingPasses || [])[0];

    if (action === 'end') {
      if (pass) {
        await base44.asServiceRole.entities.Subscription.update(pass.id, {
          status: 'expired',
          end_date: new Date().toISOString(),
        });
      }
      await base44.asServiceRole.entities.User.update(userId, { subscription_status: 'none' });
      console.log(`[adminGrantTestPass] ended by ${admin.email} for ${target.email}`);
      return Response.json({ ok: true, ended: true, user_id: userId });
    }

    if (action !== 'grant') return Response.json({ error: 'unknown_action' }, { status: 400 });

    const days = Math.min(Math.max(parseInt(body.days, 10) || DEFAULT_DAYS, 1), 30);
    const expiresAt = expiryFor(days);
    const note = `Card-free test pass granted by ${admin.full_name || admin.email} on ${new Date().toISOString()}`;

    const payload = {
      user_id: userId,
      plan_type: 'test_pass',
      tier: target.subscription_tier || 'elite',
      price: 0,
      billing_period: 'monthly',
      status: 'pending',
      start_date: new Date().toISOString(),
      renewal_date: expiresAt,
      end_date: null,
      package_name: `${days}-Day Test Pass`,
      account_type: target.primary_account_type || 'consumer',
      features: ['full_service_test_pass', note],
    };

    const saved = pass
      ? await base44.asServiceRole.entities.Subscription.update(pass.id, payload)
      : await base44.asServiceRole.entities.Subscription.create(payload);

    await base44.asServiceRole.entities.User.update(userId, {
      subscription_status: 'trial',
      subscription_tier: target.subscription_tier || 'elite',
    });

    console.log(`[adminGrantTestPass] granted by ${admin.email} to ${target.email} until ${expiresAt}`);
    return Response.json({ ok: true, subscription_id: saved.id, expires_at: expiresAt, days });
  } catch (error) {
    console.error('[adminGrantTestPass] error:', error?.message || error);
    return Response.json({ error: error?.message || 'test_pass_failed' }, { status: 500 });
  }
}