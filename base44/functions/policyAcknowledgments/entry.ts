import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Chapter 6 P1 — worker-side policy acknowledgment seam.
// Workers cannot read BusinessDocument records (operator/admin-only RLS by
// design), so this seam returns ONLY the policies assigned to the CALLING
// user, with a short-lived signed URL for viewing. Self-service
// acknowledgment happens ONLY here: the seam verifies the caller owns the
// assignment, requires the document to be ACTIVE, and snapshots the CURRENT
// document version at acknowledge time — the version actually viewed.
// Workers never write acknowledgment records through RLS, so they cannot
// tamper with versions or statuses.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    if (body.action === 'list') {
      const acks = await base44.asServiceRole.entities.PolicyAcknowledgment.filter({ user_id: user.id });
      const results = [];
      for (const ack of acks) {
        const docRes = await base44.asServiceRole.entities.BusinessDocument.filter({ id: ack.business_document_id });
        const doc = docRes[0];
        if (!doc) continue;
        let signed_url = null;
        if (doc.status === 'ACTIVE' && doc.file_uri) {
          try {
            const res = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
              file_uri: doc.file_uri,
              expires_in: 900,
            });
            signed_url = res.signed_url;
          } catch (e) {
            console.error('policyAcknowledgments: signed URL failed', e);
          }
        }
        results.push({
          id: ack.id,
          status: ack.status,
          document_title: doc.title,
          policy_type: doc.policy_type || null,
          category: doc.category,
          document_status: doc.status,
          current_version: doc.version,
          assigned_at: ack.assigned_at,
          assigned_version: ack.document_version,
          acknowledged_at: ack.acknowledged_at,
          acknowledged_version: ack.acknowledged_version || null,
          // A record is up to date only when it was acknowledged AT the current version.
          acknowledged_current: ack.status === 'ACKNOWLEDGED' && (ack.acknowledged_version || 0) === doc.version,
          signed_url,
        });
      }
      return Response.json({ success: true, items: results });
    }

    if (body.action === 'acknowledge') {
      const ackId = body.acknowledgment_id;
      if (!ackId) return Response.json({ error: 'acknowledgment_id required' }, { status: 400 });
      const ackRes = await base44.asServiceRole.entities.PolicyAcknowledgment.filter({ id: ackId });
      const ack = ackRes[0];
      if (!ack || ack.user_id !== user.id) return Response.json({ error: 'Not found' }, { status: 404 });
      if (ack.status === 'ACKNOWLEDGED') return Response.json({ success: true, already_acknowledged: true });

      const docRes = await base44.asServiceRole.entities.BusinessDocument.filter({ id: ack.business_document_id });
      const doc = docRes[0];
      if (!doc || doc.status !== 'ACTIVE') {
        return Response.json({ error: 'This policy is no longer active' }, { status: 409 });
      }

      // Snapshot truth: the version acknowledged is the CURRENT document version.
      await base44.asServiceRole.entities.PolicyAcknowledgment.update(ack.id, {
        status: 'ACKNOWLEDGED',
        acknowledged_at: new Date().toISOString(),
        acknowledged_version: doc.version,
      });
      return Response.json({ success: true, acknowledged_version: doc.version });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('policyAcknowledgments failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}