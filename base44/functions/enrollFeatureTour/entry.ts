import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// enrollFeatureTour
// Called from the operator signup flow when a new account is created.
// Idempotently creates (or reactivates) the FeatureTourEnrollment record that
// the daily "Operator Feature Tour (Daily)" workflow uses to send the
// 10-day feature-tour email sequence.
// ─────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const userId = body.user_id;
    const email = (body.email || '').trim().toLowerCase();
    const firstName = body.first_name || '';

    if (!userId || !email) {
      return Response.json({ error: 'user_id and email are required' }, { status: 400 });
    }

    // Idempotent upsert — don't restart the sequence for existing enrollments
    const existing = await base44.asServiceRole.entities.FeatureTourEnrollment.filter({
      user_id: userId,
    });

    if (existing.length > 0) {
      const record = existing[0];
      if (record.status === 'unsubscribed') {
        return Response.json({ success: true, enrolled: false, reason: 'unsubscribed' });
      }
      if (record.status === 'active') {
        return Response.json({ success: true, enrolled: false, reason: 'already_enrolled' });
      }
      // completed — leave as-is
      return Response.json({ success: true, enrolled: false, reason: 'already_completed' });
    }

    const created = await base44.asServiceRole.entities.FeatureTourEnrollment.create({
      user_id: userId,
      email,
      first_name: firstName,
      enrolled_at: new Date().toISOString(),
      emails_sent: 0,
      status: 'active',
    });

    return Response.json({ success: true, enrolled: true, id: created.id });
  } catch (error) {
    console.error('enrollFeatureTour error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});