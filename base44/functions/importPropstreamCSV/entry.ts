import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const normalizeAddr = s => (s || '').toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();

async function geocodeAddress(address, city, state, zip, apiKey) {
  const query = [address, city, state, zip].filter(Boolean).join(', ');
  if (!query) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:US&key=${apiKey}`
    );
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.[0]) return null;
    const { lat, lng } = data.results[0].geometry.location;
    // Extract county from address components
    const countyComp = data.results[0].address_components?.find(c => c.types.includes('administrative_area_level_2'));
    const county = countyComp ? countyComp.long_name.replace(/ County$/, '') : null;
    return { lat, lng, county };
  } catch {
    return null;
  }
}

function matchTerritory(row, territories) {
  const zip = (row.zip || '').trim();
  const city = (row.city || '').toLowerCase().trim();
  const county = (row.county || '').toLowerCase().replace(/ county$/, '').trim();
  const state = (row.state || '').toLowerCase().trim();

  if (zip) {
    const m = territories.find(t => (t.zip_codes_json || []).some(z => z.trim() === zip));
    if (m) return m;
  }
  if (city) {
    const m = territories.find(t => (t.cities_json || []).some(c => c.toLowerCase().trim() === city));
    if (m) return m;
  }
  return territories.find(t =>
    t.county?.toLowerCase().replace(/ county$/, '').trim() === county &&
    t.state?.toLowerCase().trim() === state
  ) || null;
}

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

    const { listings, filename } = await req.json();
    if (!Array.isArray(listings) || listings.length === 0) return Response.json({ error: 'No listings provided' }, { status: 400 });

    const batch = await base44.asServiceRole.entities.PropstreamImportBatch.create({
      uploaded_file_name: filename || 'import.csv',
      uploaded_by: user.id,
      total_rows: listings.length,
      import_status: 'processing'
    });

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    const [territories, existing] = await Promise.all([
      base44.asServiceRole.entities.TerritoryLaunch.list(),
      base44.asServiceRole.entities.PropstreamREListing.list('-created_date', 10000)
    ]);

    const exMLS = new Set(existing.map(l => l.mls_number).filter(Boolean));
    const exPID = new Set(existing.map(l => l.propstream_property_id).filter(Boolean));
    const exAddr = new Set(existing.map(l => normalizeAddr((l.property_address || '') + ' ' + (l.zip || ''))));

    let imported = 0, dupes = 0, errors = 0;

    for (const row of listings) {
      try {
        const addr = normalizeAddr((row.property_address || '') + ' ' + (row.zip || ''));
        const isDupe =
          (row.mls_number && exMLS.has(row.mls_number)) ||
          (row.propstream_property_id && exPID.has(row.propstream_property_id)) ||
          (addr && exAddr.has(addr));

        if (isDupe) { dupes++; continue; }

        // Geocode if lat/lng not already present in the CSV
        let lat = row.latitude;
        let lng = row.longitude;
        let geocodedCounty = null;
        if ((!lat || !lng) && googleApiKey) {
          const geo = await geocodeAddress(row.property_address, row.city, row.state, row.zip, googleApiKey);
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            if (!row.county && geo.county) geocodedCounty = geo.county;
          }
        }

        const enrichedRow = {
          ...row,
          ...(lat != null ? { latitude: lat } : {}),
          ...(lng != null ? { longitude: lng } : {}),
          ...(geocodedCounty ? { county: geocodedCounty } : {}),
        };

        const territory = matchTerritory(enrichedRow, territories);
        const { score, label, reasons } = calcScore(enrichedRow);

        await base44.asServiceRole.entities.PropstreamREListing.create({
          ...enrichedRow,
          import_batch_id: batch.id,
          source: 'PropStream',
          territory_id: territory?.id || '',
          territory_name: territory ? `${territory.county}, ${territory.state}` : '',
          matched_operator_ids: territory?.assigned_operator_id ? [territory.assigned_operator_id] : [],
          estate_sale_score: score,
          estate_sale_score_label: label,
          score_reasons: reasons,
          email_status: 'draft',
          operator_status: 'not_sent'
        });

        imported++;
        exAddr.add(addr);
        if (row.mls_number) exMLS.add(row.mls_number);
        if (row.propstream_property_id) exPID.add(row.propstream_property_id);
      } catch { errors++; }
    }

    await base44.asServiceRole.entities.PropstreamImportBatch.update(batch.id, {
      imported_count: imported,
      duplicate_count: dupes,
      error_count: errors,
      import_status: 'completed'
    });

    return Response.json({ success: true, batch_id: batch.id, imported, duplicates: dupes, errors, total: listings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});