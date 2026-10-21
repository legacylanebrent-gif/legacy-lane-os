import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Chapter 6 P1 — business document expiration reminder engine.
// The DOCUMENT owns expiration_date; this daily job only reads it and creates
// operator notifications. Factual wording only: "expires in N days" /
// "has expired" — never a legal conclusion (the system knows the stored date,
// not the legal consequence). No expiration date = NO EXPIRATION KNOWN → no
// reminder. Idempotent: each warning window (60 / 30 / 7 / expired) fires at
// most once per document via the reminders_sent ledger on the record.

const DAY_MS = 86400000;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const docs = await base44.asServiceRole.entities.BusinessDocument.filter({ status: 'ACTIVE' });
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(todayStr + 'T00:00:00Z').getTime();
    const sent = [];

    for (const doc of docs) {
      if (!doc.expiration_date) continue; // unknown ≠ never — no reminder, no assumption
      const exp = new Date(doc.expiration_date + 'T00:00:00Z').getTime();
      if (Number.isNaN(exp)) continue;
      const daysLeft = Math.round((exp - todayStart) / DAY_MS);

      // Tightest current window only
      let windowKey = null;
      if (daysLeft < 0) windowKey = 'expired';
      else if (daysLeft <= 7) windowKey = '7';
      else if (daysLeft <= 30) windowKey = '30';
      else if (daysLeft <= 60) windowKey = '60';
      if (!windowKey) continue;

      const ledger = doc.reminders_sent || [];
      if (ledger.some(r => r.window === windowKey)) continue; // already sent — idempotent

      const message = daysLeft < 0
        ? `"${doc.title}" has expired (expiration date ${doc.expiration_date}).`
        : `"${doc.title}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (on ${doc.expiration_date}).`;

      await base44.asServiceRole.entities.Notification.create({
        user_id: doc.operator_id,
        type: 'reminder',
        title: daysLeft < 0 ? 'Document expired' : 'Document expiring soon',
        message,
        link_to_page: 'BusinessDocuments',
        related_entity_type: 'BusinessDocument',
        related_entity_id: doc.id,
      });

      await base44.asServiceRole.entities.BusinessDocument.update(doc.id, {
        reminders_sent: [...ledger, { window: windowKey, sent_date: todayStr }],
      });

      sent.push({ id: doc.id, title: doc.title, window: windowKey, days_left: daysLeft });
    }

    return Response.json({ success: true, checked: docs.length, reminders_created: sent.length, sent });
  } catch (error) {
    console.error('businessDocumentExpirationCheck failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}