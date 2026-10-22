import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// linkLegacyTransitionRecords — Chapter 22 P0-1/P0-2 conservative backfill.
//   - Links legacy Donation/Cleanout records to their canonical EstateSale by
//     DETERMINISTIC exact normalized-address match, scoped to the record's own
//     operator. Exactly one sale match → link. Zero or multiple matches →
//     leave UNRESOLVED and report for review — never guess.
//   - Backfills operator_id on legacy DonationResponse/CleanoutBid from
//     their parent event (RLS anchor).
// Address remains descriptive; sale_id is the relational identity.
// ─────────────────────────────────────────────

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const keyOf = (a) => [norm(a?.street), norm(a?.city), norm(a?.state), norm(a?.zip)].join('|');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { operator_id } = body;
    const targetOperator = user.role === 'admin' ? (operator_id || user.id) : user.id;
    if (user.role !== 'admin' && operator_id && operator_id !== user.id) {
      return Response.json({ error: 'Operators may only backfill their own records.' }, { status: 403 });
    }

    const [donations, cleanouts, sales] = await Promise.all([
      base44.asServiceRole.entities.Donation.filter({ operator_id: targetOperator }),
      base44.asServiceRole.entities.Cleanout.filter({ operator_id: targetOperator }),
      base44.asServiceRole.entities.EstateSale.filter({ operator_id: targetOperator }),
    ]);
    const donationRows = Array.isArray(donations) ? donations : donations.items || [];
    const cleanoutRows = Array.isArray(cleanouts) ? cleanouts : cleanouts.items || [];
    const saleRows = Array.isArray(sales) ? sales : sales.items || [];

    const salesByAddress = {};
    for (const s of saleRows) {
      const k = keyOf(s.property_address);
      if (!k || k === '|||') continue;
      (salesByAddress[k] = salesByAddress[k] || []).push(s.id);
    }

    const report = { linked: [], unresolved: [], response_anchors: [], bid_anchors: [] };

    for (const rec of [...donationRows, ...cleanoutRows]) {
      if (rec.sale_id) continue;
      const k = keyOf(rec.property_address);
      const matches = salesByAddress[k] || [];
      const type = rec.awarded_bid_amount !== undefined || rec.cleanout_deadline ? 'cleanout' : 'donation';
      if (matches.length === 1) {
        await base44.asServiceRole.entities[type === 'cleanout' ? 'Cleanout' : 'Donation'].update(rec.id, { sale_id: matches[0] });
        report.linked.push({ id: rec.id, type, sale_id: matches[0] });
      } else {
        report.unresolved.push({ id: rec.id, type, reason: matches.length === 0 ? 'No exact address match among this operator\'s sales.' : 'Ambiguous address match (multiple sales) — left unresolved for review.' });
      }
    }

    // RLS anchors for legacy child records
    const [responses, bids] = await Promise.all([
      base44.asServiceRole.entities.DonationResponse.filter({}),
      base44.asServiceRole.entities.CleanoutBid.filter({}),
    ]);
    const responseRows = Array.isArray(responses) ? responses : responses.items || [];
    const bidRows = Array.isArray(bids) ? bids : bids.items || [];
    const donationById = {};
    for (const d of donationRows) donationById[d.id] = d;
    const cleanoutById = {};
    for (const c of cleanoutRows) cleanoutById[c.id] = c;

    for (const r of responseRows) {
      if (r.operator_id) continue;
      const parent = donationById[r.donation_id];
      if (parent) {
        await base44.asServiceRole.entities.DonationResponse.update(r.id, { operator_id: parent.operator_id });
        report.response_anchors.push(r.id);
      }
    }
    for (const b of bidRows) {
      if (b.operator_id) continue;
      const parent = cleanoutById[b.cleanout_id];
      if (parent) {
        await base44.asServiceRole.entities.CleanoutBid.update(b.id, { operator_id: parent.operator_id });
        report.bid_anchors.push(b.id);
      }
    }

    console.log(`[linkLegacyTransitionRecords] operator ${targetOperator}: linked ${report.linked.length}, unresolved ${report.unresolved.length}, anchors ${report.response_anchors.length + report.bid_anchors.length}`);
    return Response.json({ success: true, report });
  } catch (error) {
    console.error('linkLegacyTransitionRecords error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});