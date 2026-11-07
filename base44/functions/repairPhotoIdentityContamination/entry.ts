import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { mutateSalePhotos, photoError } from '../../shared/photoStore.ts';
import { sharedTitleCountFor, looksLikeInventedSeoCopy } from '../../shared/photoFields.ts';
import { verifiedPrivateSnapshot } from '../../shared/photoRepairBackup.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    if (!body.sale_id) return Response.json({ error: 'An explicit sale_id is required. No broad repair.' }, { status: 400 });
    if (body.restore) return Response.json({ error: 'Earlier cleared values have no recoverable backup. Future snapshots must be reviewed explicitly before restoring.' }, { status: 409 });
    const initialized = await mutateSalePhotos(base44.asServiceRole, body.sale_id, user, () => null);
    const { sale, images } = initialized;
    const candidates = images.filter(p => p.name && !p.pipeline.operator_fields?.includes('name') && (looksLikeInventedSeoCopy(p, sale, sharedTitleCountFor(p, images)) || sharedTitleCountFor(p, images) >= 3 || /mid.century.*(credenza|sideboard)|vintage.*(credenza|sideboard)/i.test(p.name)));
    const report = { sale_id: sale.id, dry_run: body.dry_run !== false, suspected_count: candidates.length, candidates: candidates.map(p => ({ photo_id: p.pipeline.id, image_revision: p.pipeline.revision, url: p.url, name: p.name })), prior_cleared_values_recoverable: false };
    if (body.dry_run !== false || !candidates.length) return Response.json(report);
    // Back up and read back the complete snapshot BEFORE any content mutation.
    const backup = await verifiedPrivateSnapshot(base44.asServiceRole, { version: 1, sale_id: sale.id, at: new Date().toISOString(), images });
    const confirmed = new Set(body.confirm_photo_ids || []);
    const at = new Date().toISOString();
    const backupRecord = await base44.asServiceRole.entities.PhotoRepairBackup.create({ sale_id: sale.id, file_uri: backup.file_uri, sha256: backup.sha256, verified_at: at, verified_by: user.id, photo_ids: images.map(p => p.pipeline.id) });
    const durableReference = await base44.asServiceRole.entities.PhotoRepairBackup.get(backupRecord.id);
    if (durableReference.sha256 !== backup.sha256 || durableReference.file_uri !== backup.file_uri) throw new Error('Durable backup reference verification failed; no repair performed.');
    await mutateSalePhotos(base44.asServiceRole, sale.id, user, current => {
      for (const candidate of candidates) {
        const photo = current.find(p => p.pipeline.id === candidate.pipeline.id);
        if (!photo || JSON.stringify(photo) !== JSON.stringify(candidate)) throw photoError('Photo changed after backup; repair refused. Create a fresh backup.');
        photo.pipeline.review_required = true;
        photo.pipeline.jobs.repair = { backup_id: backupRecord.id, sha256: backup.sha256, at };
        photo.pipeline.repair_backup_sha256 = backup.sha256;
        // Suspected labels stay visible unless individually confirmed for clearing.
        if (confirmed.has(photo.pipeline.id)) {
          photo.name = ''; photo.pipeline.repaired_at = at;
          photo.pipeline.edit_revision = crypto.randomUUID();
        }
      }
    });
    return Response.json({ ...report, ...backup, backup_record_id: backupRecord.id, labels_cleared: candidates.filter(p => confirmed.has(p.pipeline.id)).length, labels_retained_for_review: candidates.filter(p => !confirmed.has(p.pipeline.id)).length });
  } catch (error) { return Response.json({ error: error.message }, { status: error.status || 500 }); }
}