import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { saleId } = body;

    if (!saleId) {
      return Response.json({ error: 'saleId is required' }, { status: 400 });
    }

    // Fetch all check-ins for this sale
    const allCheckins = await base44.asServiceRole.entities.CheckIn.filter({
      location_id: saleId,
      check_in_type: 'sale_visit',
    });

    // Only process QR check-ins by logged-in users (notes contains "QR check-in by")
    // Leave manual/guest check-ins (notes === "Manual count") untouched
    const qrLoggedInCheckins = allCheckins.filter(c => c.notes && c.notes.includes('QR check-in by'));

    // Group by (created_by, date) — keep the earliest, collect ids to delete
    const seen = {};
    const toDelete = [];

    // Sort oldest first so we keep the first occurrence
    const sorted = [...qrLoggedInCheckins].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    for (const checkin of sorted) {
      const day = checkin.created_date ? new Date(checkin.created_date).toISOString().split('T')[0] : 'unknown';
      const key = `${checkin.created_by}__${day}`;
      if (seen[key]) {
        toDelete.push(checkin.id);
      } else {
        seen[key] = true;
      }
    }

    // Delete duplicates
    for (const id of toDelete) {
      await base44.asServiceRole.entities.CheckIn.delete(id);
    }

    return Response.json({ deleted: toDelete.length, message: `Removed ${toDelete.length} duplicate check-in(s).` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});