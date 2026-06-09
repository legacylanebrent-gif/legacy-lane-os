import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const normalizeAddr = s => (s || '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();

function calcScore(r) {
  let s = 0;
  const reasons = [];
  const yrs = parseFloat(r.ownership_length_years) || 0;

  if (yrs >= 20) { s += 35; reasons.push(`Long-term ownership: ${yrs.toFixed(0)} years`); }
  else if (yrs >= 10) { s += 25; reasons.push(`Extended ownership: ${yrs.toFixed(0)} years`); }
  else if (yrs > 0 && yrs <= 3) { s -= 20; reasons.push('Short ownership period (negative)'); }

  if (r.senior_owner_indicator) { s += 20; reasons.push('Senior owner indicator'); }
  if (r.probate_indicator) { s += 25; reasons.push('Probate indicator'); }
  if (r.inherited_indicator) { s += 20; reasons.push('Inherited property'); }
  if (r.absentee_owner) { s += 15; reasons.push('Absentee owner'); }
  if (r.vacant) { s += 15; reasons.push('Vacant property'); }
  if ((parseFloat(r.square_feet) || 0) >= 2500) { s += 10; reasons.push(`Large home: ${r.square_feet} sqft`); }
  if ((parseInt(r.year_built) || 9999) < 1980) { s += 10; reasons.push(`Older home (built ${r.year_built})`); }

  const pa = normalizeAddr((r.property_address || '') + ' ' + (r.zip || ''));
  const ma = normalizeAddr((r.owner_mailing_address || '') + ' ' + (r.owner_mailing_zip || ''));
  if (pa && ma && pa !== ma) { s += 10; reasons.push('Owner mails to a different address'); }

  if (r.preforeclosure_indicator || r.lien_indicator || r.tax_delinquent_indicator) {
    s += 15; reasons.push('Financial distress indicators');
  }
  if ((r.property_type || '').toLowerCase().includes('single')) { s += 10; reasons.push('Single-family residence'); }

  const remarks = (r.listing_remarks || '').toLowerCase();
  const kws = ['estate', 'contents', 'as-is', 'cleanout', 'inherited', 'downsizing', 'moving sale', 'original owner', 'needs updating', 'vacant', 'family home'];
  const found = kws.filter(k => remarks.includes(k));
  if (found.length) { s += 10; reasons.push(`Estate keywords: ${found.join(', ')}`); }

  if (['llc', 'inc', 'corp', 'trust', 'holdings', 'investments'].some(t => (r.owner_name || '').toLowerCase().includes(t))) {
    s -= 25; reasons.push('Corporate owner (negative)');
  }
  if (remarks.includes('new construction') || remarks.includes('builder')) { s -= 15; reasons.push('New construction (negative)'); }
  if (['flip', 'investor special', 'total renovation'].some(t => remarks.includes(t))) { s -= 10; reasons.push('Investor flip language (negative)'); }

  s = Math.max(0, Math.min(100, s));
  const label = s >= 80 ? 'Priority' : s >= 60 ? 'Strong' : s >= 30 ? 'Moderate' : 'Low';
  return { score: s, label, reasons };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { batch_id, rescore_all } = body;

    let listings;
    if (batch_id) {
      listings = await base44.asServiceRole.entities.PropstreamREListing.filter({ import_batch_id: batch_id }, '-created_date', 2000);
    } else {
      listings = await base44.asServiceRole.entities.PropstreamREListing.list('-created_date', 2000);
      if (!rescore_all) {
        listings = listings.filter(l => !l.estate_sale_score || l.estate_sale_score === 0);
      }
    }

    let scored = 0;
    for (const listing of listings) {
      const { score, label, reasons } = calcScore(listing);
      await base44.asServiceRole.entities.PropstreamREListing.update(listing.id, {
        estate_sale_score: score,
        estate_sale_score_label: label,
        score_reasons: reasons
      });
      scored++;
    }

    return Response.json({ success: true, scored });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});