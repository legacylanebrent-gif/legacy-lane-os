import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TERRITORIES_API_URL = 'https://api.base44.app/api/apps/697206f0efd7bfde6e06b474/functions/territoriesApi';
const HOUSIO_BASE_URL = 'https://api.base44.app/api/apps/697206f0efd7bfde6e06b474';

async function housioFetch(action, apiKey) {
  const res = await fetch(TERRITORIES_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ action, offset: 0, limit: 9999 }),
  });
  if (!res.ok) throw new Error(`Housio API error (${action}): ${res.status}`);
  return res.json();
}

// Valid US state abbreviations for coordinate validation
const US_STATES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']);

// Rough bounding box check: lat 24-72, lng -180 to -66 (US range)
function isValidLat(lat) {
  const n = Number(lat);
  return !isNaN(n) && n >= 24 && n <= 72;
}
function isValidLng(lng) {
  const n = Number(lng);
  return !isNaN(n) && n >= -180 && n <= -66;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const apiKey = Deno.env.get('HOUSIO_TERRITORIES_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'HOUSIO_TERRITORIES_API_KEY not configured' }, { status: 500 });
    }

    console.log('[territoryMigrationAudit] Starting audit...');

    // ── 1. Fetch all territories and micro-territories from Housio API ──
    const [terrData, microData] = await Promise.all([
      housioFetch('list', apiKey),
      housioFetch('micro_list', apiKey),
    ]);

    const territories = (terrData?.territories || []).map(t => ({
      territory_id: t.id || t.territory_id || '',
      name: t.name || t.county || '',
      state: t.state || '',
      state_name: t.state_name || '',
      county: t.county || '',
      county_fips: t.county_fips || '',
      status: t.status || 'ACTIVE',
      zip_codes: t.zip_codes || [],
      total_agent_count: t.total_agent_count || 0,
      active_listings: t.active_listings || 0,
      avg_listing_price: t.avg_listing_price || 0,
    }));

    const microTerritories = (microData?.micro_territories || []).map(mt => ({
      micro_territory_id: mt.micro_territory_id || mt.id || '',
      territory_id: mt.territory_id || '',
      name: mt.name || '',
      state: mt.state || '',
      county: mt.county || '',
      cities: mt.cities || [],
      status: mt.status || 'ACTIVE',
      lat: mt.lat || mt.latitude || null,
      lng: mt.lng || mt.longitude || null,
    }));

    console.log(`[territoryMigrationAudit] Fetched ${territories.length} territories, ${microTerritories.length} micro-territories`);

    // Also fetch local entity copies for cross-reference
    const localMicros = await base44.entities.HousioMicroTerritory.filter({}, '-synced_at', 9999);
    const localTerritories = await base44.entities.HousioTerritory.filter({}, '-synced_at', 9999);
    console.log(`[territoryMigrationAudit] Local: ${localTerritories.length} territories, ${localMicros.length} micro-territories`);

    // ── 2. Build territory ID set for orphan check ──
    const territoryIdSet = new Set(territories.map(t => t.territory_id).filter(Boolean));

    // ── 3. Duplicate detection — territories ──
    const terrByKey = {};
    territories.forEach(t => {
      const key = `${t.state}|${t.county}`.toLowerCase();
      if (!terrByKey[key]) terrByKey[key] = [];
      terrByKey[key].push(t.territory_id);
    });
    const duplicateTerritories = Object.entries(terrByKey)
      .filter(([_, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ record_type: 'territory', key, count: ids.length, record_ids: ids }));

    // ── 4. Duplicate detection — micro-territories ──
    const microByKey = {};
    microTerritories.forEach(mt => {
      const key = `${mt.territory_id}|${mt.state}|${mt.county}|${mt.name}`.toLowerCase();
      if (!microByKey[key]) microByKey[key] = [];
      microByKey[key].push(mt.micro_territory_id);
    });
    const duplicateMicros = Object.entries(microByKey)
      .filter(([_, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ record_type: 'micro_territory', key, count: ids.length, record_ids: ids }));

    // ── 5. Missing data detection ──
    const missingData = [];
    territories.forEach(t => {
      const missing = [];
      if (!t.territory_id) missing.push('territory_id');
      if (!t.state) missing.push('state');
      if (!t.county) missing.push('county');
      if (!t.name) missing.push('name');
      if (missing.length) missingData.push({ record_type: 'territory', record_id: t.territory_id || '(no ID)', missing_fields: missing });
    });
    microTerritories.forEach(mt => {
      const missing = [];
      if (!mt.micro_territory_id) missing.push('micro_territory_id');
      if (!mt.territory_id) missing.push('territory_id');
      if (!mt.state) missing.push('state');
      if (!mt.county) missing.push('county');
      if (!mt.cities || mt.cities.length === 0) missing.push('cities');
      if (missing.length) missingData.push({ record_type: 'micro_territory', record_id: mt.micro_territory_id || '(no ID)', missing_fields: missing });
    });

    // ── 6. Orphaned micro-territories (parent territory doesn't exist) ──
    const orphanedMicros = microTerritories
      .filter(mt => mt.territory_id && !territoryIdSet.has(mt.territory_id))
      .map(mt => ({
        micro_territory_id: mt.micro_territory_id,
        territory_id: mt.territory_id,
        state: mt.state,
        county: mt.county,
      }));

    // ── 7. Geocoding audit ──
    const geocodingIssues = [];
    let microsWithValidGeocoding = 0;

    microTerritories.forEach(mt => {
      let hasIssue = false;

      if (!mt.lat || mt.lat === null) {
        geocodingIssues.push({ micro_territory_id: mt.micro_territory_id, state: mt.state, county: mt.county, issue_type: 'missing_lat', details: 'No latitude stored' });
        hasIssue = true;
      }
      if (!mt.lng || mt.lng === null) {
        geocodingIssues.push({ micro_territory_id: mt.micro_territory_id, state: mt.state, county: mt.county, issue_type: 'missing_lng', details: 'No longitude stored' });
        hasIssue = true;
      }
      if (mt.lat && !isValidLat(mt.lat)) {
        geocodingIssues.push({ micro_territory_id: mt.micro_territory_id, state: mt.state, county: mt.county, issue_type: 'invalid_coords', details: `Invalid latitude: ${mt.lat}` });
        hasIssue = true;
      }
      if (mt.lng && !isValidLng(mt.lng)) {
        geocodingIssues.push({ micro_territory_id: mt.micro_territory_id, state: mt.state, county: mt.county, issue_type: 'invalid_coords', details: `Invalid longitude: ${mt.lng}` });
        hasIssue = true;
      }

      if (!hasIssue && mt.lat && mt.lng) {
        microsWithValidGeocoding++;
      }
    });

    const microsMissingGeocoding = microTerritories.length - microsWithValidGeocoding;

    // ── 8. Territory-to-micro-territory count ──
    const microCountByTerritory = {};
    microTerritories.forEach(mt => {
      const tid = mt.territory_id;
      if (tid) {
        microCountByTerritory[tid] = (microCountByTerritory[tid] || 0) + 1;
      }
    });

    const territoryMicroCounts = territories.map(t => ({
      territory_id: t.territory_id,
      territory_name: t.name,
      state: t.state,
      county: t.county,
      micro_count: microCountByTerritory[t.territory_id] || 0,
      has_micros: (microCountByTerritory[t.territory_id] || 0) > 0,
    }));

    const territoriesWithZeroMicros = territoryMicroCounts.filter(t => !t.has_micros).length;

    // ── 9. State breakdown ──
    const stateMap = {};
    territories.forEach(t => {
      if (!t.state) return;
      if (!stateMap[t.state]) stateMap[t.state] = { state: t.state, territory_count: 0, micro_count: 0, geocoded_count: 0, missing_geocoding: 0, orphaned_micros: 0, duplicates: 0 };
      stateMap[t.state].territory_count++;
    });
    microTerritories.forEach(mt => {
      if (!mt.state) return;
      if (!stateMap[mt.state]) stateMap[mt.state] = { state: mt.state, territory_count: 0, micro_count: 0, geocoded_count: 0, missing_geocoding: 0, orphaned_micros: 0, duplicates: 0 };
      stateMap[mt.state].micro_count++;
      if (mt.lat && mt.lng && isValidLat(mt.lat) && isValidLng(mt.lng)) {
        stateMap[mt.state].geocoded_count++;
      } else {
        stateMap[mt.state].missing_geocoding++;
      }
    });
    orphanedMicros.forEach(o => {
      if (o.state && stateMap[o.state]) stateMap[o.state].orphaned_micros++;
    });
    duplicateTerritories.forEach(d => {
      // Try to attribute to state from the key
      const parts = d.key.split('|');
      const st = parts[0]?.toUpperCase();
      if (st && stateMap[st]) stateMap[st].duplicates++;
    });
    const stateBreakdown = Object.values(stateMap).sort((a, b) => b.territory_count - a.territory_count);

    // ── 10. County breakdown ──
    const countyMap = {};
    territories.forEach(t => {
      const key = `${t.state}|${t.county}`;
      if (!countyMap[key]) countyMap[key] = { state: t.state, county: t.county, territory_count: 0, micro_count: 0 };
      countyMap[key].territory_count++;
    });
    microTerritories.forEach(mt => {
      const key = `${mt.state}|${mt.county}`;
      if (!countyMap[key]) countyMap[key] = { state: mt.state, county: mt.county, territory_count: 0, micro_count: 0 };
      countyMap[key].micro_count++;
    });
    const countyBreakdown = Object.values(countyMap).sort((a, b) => a.state.localeCompare(b.state) || a.county.localeCompare(b.county));

    // ── 11. Export readiness ──
    const totalActive = territories.filter(t => t.status === 'ACTIVE').length;
    const totalInactive = territories.length - totalActive;
    const totalMicroActive = microTerritories.filter(mt => mt.status === 'ACTIVE').length;
    const totalMicroInactive = microTerritories.length - totalMicroActive;

    const allDuplicates = [...duplicateTerritories, ...duplicateMicros];

    // A micro-territory is ready for export if: has ID, has valid parent, has state/county/cities, has valid geocoding
    const exportPreview = [];
    let recordsReady = 0;
    let recordsBlocked = 0;

    territories.forEach(t => {
      const micros = microTerritories.filter(mt => mt.territory_id === t.territory_id);
      const cities = micros.flatMap(mt => mt.cities || []);

      if (cities.length === 0) {
        // Export the territory itself even without micros
        const ready = !!(t.territory_id && t.state && t.county);
        if (ready) recordsReady++; else recordsBlocked++;
        exportPreview.push({
          territory_id: t.territory_id,
          territory_name: t.name,
          state: t.state,
          county: t.county,
          micro_territory_id: '',
          city: '',
          latitude: null,
          longitude: null,
          is_active: t.status === 'ACTIVE',
          ready_for_export: ready,
          block_reason: ready ? '' : 'Missing required fields',
        });
      } else {
        micros.forEach(mt => {
          (mt.cities || []).forEach(cityName => {
            const hasValidGeo = mt.lat && mt.lng && isValidLat(mt.lat) && isValidLng(mt.lng);
            const hasValidParent = territoryIdSet.has(mt.territory_id);
            const ready = !!(mt.micro_territory_id && mt.territory_id && mt.state && mt.county && hasValidParent && hasValidGeo);
            if (ready) recordsReady++; else recordsBlocked++;
            exportPreview.push({
              territory_id: t.territory_id,
              territory_name: t.name,
              state: t.state,
              county: t.county,
              micro_territory_id: mt.micro_territory_id,
              city: cityName,
              latitude: mt.lat ? Number(mt.lat) : null,
              longitude: mt.lng ? Number(mt.lng) : null,
              is_active: mt.status === 'ACTIVE',
              ready_for_export: ready,
              block_reason: ready ? '' : [
                !mt.micro_territory_id ? 'Missing micro_territory_id' : '',
                !mt.territory_id ? 'Missing territory_id' : '',
                !hasValidParent ? 'Orphaned — parent territory not found' : '',
                !hasValidGeo ? 'Missing/invalid geocoding' : '',
              ].filter(Boolean).join(', '),
            });
          });
        });
      }
    });

    // ── 12. Fixes needed ──
    const fixesNeeded = [];
    if (territories.some(t => !t.territory_id)) fixesNeeded.push('Some territories are missing stable unique IDs');
    if (microTerritories.some(mt => !mt.micro_territory_id)) fixesNeeded.push('Some micro-territories are missing stable unique IDs');
    if (orphanedMicros.length > 0) fixesNeeded.push(`${orphanedMicros.length} micro-territories are orphaned — parent territory not found`);
    if (microsMissingGeocoding > 0) fixesNeeded.push(`${microsMissingGeocoding} micro-territories are missing valid geocoding (lat/lng)`);
    if (territoriesWithZeroMicros > 0) fixesNeeded.push(`${territoriesWithZeroMicros} territories have zero micro-territories`);
    if (duplicateTerritories.length > 0) fixesNeeded.push(`${duplicateTerritories.length} duplicate territory groups detected`);
    if (duplicateMicros.length > 0) fixesNeeded.push(`${duplicateMicros.length} duplicate micro-territory groups detected`);
    if (missingData.some(m => m.record_type === 'territory')) fixesNeeded.push('Some territories are missing required fields (state, county, or name)');
    if (missingData.some(m => m.record_type === 'micro_territory')) fixesNeeded.push('Some micro-territories are missing required fields');

    // ── 13. Export readiness score ──
    const hasCriticalIssues =
      territories.some(t => !t.territory_id) ||
      microTerritories.some(mt => !mt.micro_territory_id) ||
      orphanedMicros.length > 0 ||
      microsMissingGeocoding > microTerritories.length * 0.1; // >10% missing geocoding = critical

    const hasWarnings =
      territoriesWithZeroMicros > 0 ||
      allDuplicates.length > 0 ||
      missingData.length > 0 ||
      microsMissingGeocoding > 0;

    let exportReadiness = 'red';
    let readinessLabel = 'Blocked — critical issues must be fixed before export';

    if (!hasCriticalIssues && !hasWarnings) {
      exportReadiness = 'green';
      readinessLabel = 'Ready for export — all checks passed';
    } else if (!hasCriticalIssues) {
      exportReadiness = 'yellow';
      readinessLabel = 'Export possible but cleanup recommended';
    }

    const readyForExport = exportReadiness === 'green';

    // ── 14. Store audit result ──
    const auditDate = new Date().toISOString();

    const auditRecord = await base44.asServiceRole.entities.TerritoryMigrationAuditResult.create({
      audit_date: auditDate,
      audited_by: user.email || user.id,
      total_territories: territories.length,
      total_active_territories: totalActive,
      total_inactive_territories: totalInactive,
      total_micro_territories: microTerritories.length,
      total_active_micro_territories: totalMicroActive,
      total_inactive_micro_territories: totalMicroInactive,
      territories_with_zero_micros: territoriesWithZeroMicros,
      orphaned_micro_territories: orphanedMicros.length,
      duplicate_territories: duplicateTerritories.length,
      duplicate_micro_territories: duplicateMicros.length,
      micros_missing_geocoding: microsMissingGeocoding,
      micros_with_valid_geocoding: microsWithValidGeocoding,
      records_ready_for_export: recordsReady,
      records_blocked_from_export: recordsBlocked,
      state_breakdown: stateBreakdown,
      county_breakdown: countyBreakdown,
      territory_micro_counts: territoryMicroCounts,
      missing_data: missingData,
      geocoding_issues: geocodingIssues,
      duplicate_records: allDuplicates,
      orphaned_records: orphanedMicros,
      fixes_needed: fixesNeeded,
      export_readiness: exportReadiness,
      export_readiness_label: readinessLabel,
      ready_for_houszu_export: readyForExport,
      export_preview: exportPreview.slice(0, 500), // Cap at 500 for storage
    });

    console.log(`[territoryMigrationAudit] Complete. Readiness: ${exportReadiness}, Ready: ${recordsReady}, Blocked: ${recordsBlocked}`);

    return Response.json({
      success: true,
      audit_id: auditRecord.id,
      audit_date: auditDate,
      summary: {
        total_territories: territories.length,
        total_active_territories: totalActive,
        total_inactive_territories: totalInactive,
        total_micro_territories: microTerritories.length,
        total_active_micro_territories: totalMicroActive,
        total_inactive_micro_territories: totalMicroInactive,
        territories_with_zero_micros: territoriesWithZeroMicros,
        orphaned_micro_territories: orphanedMicros.length,
        duplicate_territories: duplicateTerritories.length,
        duplicate_micro_territories: duplicateMicros.length,
        micros_missing_geocoding: microsMissingGeocoding,
        micros_with_valid_geocoding: microsWithValidGeocoding,
        records_ready_for_export: recordsReady,
        records_blocked_from_export: recordsBlocked,
      },
      state_breakdown: stateBreakdown,
      county_breakdown: countyBreakdown,
      territory_micro_counts: territoryMicroCounts,
      missing_data: missingData,
      geocoding_issues: geocodingIssues,
      duplicate_records: allDuplicates,
      orphaned_records: orphanedMicros,
      fixes_needed: fixesNeeded,
      export_readiness: exportReadiness,
      export_readiness_label: readinessLabel,
      ready_for_houszu_export: readyForExport,
      export_preview_count: exportPreview.length,
      export_preview_sample: exportPreview.slice(0, 50),
    });
  } catch (error) {
    console.error('[territoryMigrationAudit] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});