import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TERRITORIES_API_URL = 'https://api.base44.app/api/apps/697206f0efd7bfde6e06b474/functions/territoriesApi';

async function housioFetch(action, apiKey) {
  const res = await fetch(TERRITORIES_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ action, offset: 0, limit: 9999 }),
  });
  if (!res.ok) throw new Error(`Housio API error (${action}): ${res.status}`);
  return res.json();
}

// Normalize cities — API returns either strings or {name: "..."} objects
function normalizeCities(cities) {
  if (!Array.isArray(cities)) return [];
  return cities.map(c => typeof c === 'string' ? c : (c?.name || '')).filter(Boolean);
}

// State bounding boxes: [minLat, minLng, maxLat, maxLng]
const STATE_BBOX = {
  AL: [30.2, -88.5, 35.0, -84.9], AK: [54.0, -179.1, 71.4, -129.9], AZ: [31.3, -114.8, 37.0, -109.0],
  AR: [33.0, -94.6, 36.5, -89.6], CA: [32.5, -124.4, 42.0, -114.1], CO: [37.0, -109.0, 41.0, -102.0],
  CT: [40.9, -73.7, 42.0, -71.8], DE: [38.4, -75.7, 39.8, -75.0], FL: [24.5, -87.6, 31.0, -80.0],
  GA: [30.3, -85.6, 35.0, -80.8], HI: [18.9, -160.2, 22.2, -154.8], ID: [42.0, -117.2, 49.0, -111.0],
  IL: [37.0, -91.5, 42.5, -87.5], IN: [37.8, -88.1, 41.8, -84.8], IA: [40.4, -96.6, 43.5, -90.1],
  KS: [37.0, -102.0, 40.0, -94.6], KY: [36.5, -89.6, 39.1, -82.0], LA: [28.9, -94.0, 33.0, -88.8],
  ME: [43.1, -71.1, 47.5, -66.9], MD: [38.0, -79.5, 39.7, -75.0], MA: [41.2, -73.5, 42.9, -69.9],
  MI: [41.7, -90.4, 48.3, -82.4], MN: [43.5, -97.2, 49.4, -89.5], MS: [30.2, -91.7, 35.0, -88.1],
  MO: [36.0, -95.8, 40.6, -89.1], MT: [44.4, -116.1, 49.0, -104.0], NE: [40.0, -104.1, 43.0, -95.3],
  NV: [35.0, -120.0, 42.0, -114.0], NH: [42.7, -72.6, 45.3, -70.6], NJ: [38.9, -75.6, 41.4, -73.9],
  NM: [31.3, -109.1, 37.0, -103.0], NY: [40.5, -79.8, 45.0, -71.9], NC: [33.8, -84.3, 36.6, -75.5],
  ND: [45.9, -104.0, 49.0, -96.6], OH: [38.4, -84.8, 42.0, -80.5], OK: [33.6, -103.0, 37.0, -94.4],
  OR: [42.0, -124.6, 46.3, -116.5], PA: [39.7, -80.5, 42.3, -74.7], RI: [41.1, -71.9, 42.0, -71.1],
  SC: [32.0, -83.4, 35.2, -78.5], SD: [42.5, -104.1, 45.9, -96.4], TN: [35.0, -90.3, 36.7, -81.7],
  TX: [25.8, -106.7, 36.5, -93.5], UT: [37.0, -114.1, 42.0, -109.0], VT: [42.7, -73.5, 45.0, -71.5],
  VA: [36.5, -83.7, 39.5, -75.2], WA: [45.5, -124.8, 49.0, -116.9], WV: [37.2, -82.7, 40.6, -77.7],
  WI: [42.5, -92.9, 47.1, -86.8], WY: [41.0, -111.1, 45.0, -104.0], DC: [38.8, -77.1, 39.0, -76.9]
};

// State ZIP prefix ranges (first 3 digits) for ZIP mismatch detection
const STATE_ZIP_RANGES = {
  AL: [[350, 369]], AK: [[995, 999]], AZ: [[850, 865]], AR: [[716, 729]], CA: [[900, 961]],
  CO: [[800, 816]], CT: [[60, 69]], DE: [[197, 199]], FL: [[320, 339]], GA: [[300, 319]],
  HI: [[967, 968]], ID: [[832, 838]], IL: [[600, 629]], IN: [[460, 479]], IA: [[500, 528]],
  KS: [[660, 679]], KY: [[400, 427]], LA: [[700, 714]], ME: [[39, 41]], MD: [[206, 219]],
  MA: [[10, 27]], MI: [[480, 499]], MN: [[550, 567]], MS: [[386, 397]], MO: [[630, 658]],
  MT: [[590, 599]], NE: [[680, 693]], NV: [[889, 898]], NH: [[30, 38]], NJ: [[70, 89]],
  NM: [[870, 884]], NY: [[100, 149]], NC: [[270, 289]], ND: [[580, 588]], OH: [[430, 458]],
  OK: [[730, 749]], OR: [[970, 979]], PA: [[150, 196]], RI: [[28, 29]], SC: [[290, 299]],
  SD: [[570, 577]], TN: [[370, 385]], TX: [[739, 799]], UT: [[840, 847]], VT: [[50, 59]],
  VA: [[220, 246]], WA: [[980, 994]], WV: [[247, 268]], WI: [[530, 549]], WY: [[820, 831]],
  DC: [[200, 205]]
};

function isValidLat(lat) { const n = Number(lat); return !isNaN(n) && n >= 24 && n <= 72; }
function isValidLng(lng) { const n = Number(lng); return !isNaN(n) && n >= -180 && n <= -66; }

function isCoordInState(lat, lng, stateAbbr) {
  const bbox = STATE_BBOX[stateAbbr?.toUpperCase()];
  if (!bbox) return true; // Unknown state — don't flag
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return latNum >= bbox[0] && latNum <= bbox[2] && lngNum >= bbox[1] && lngNum <= bbox[3];
}

function isZipValidForState(zip, stateAbbr) {
  if (!zip || !stateAbbr) return true;
  const prefix3 = parseInt(zip.substring(0, 3));
  if (isNaN(prefix3)) return false;
  const ranges = STATE_ZIP_RANGES[stateAbbr?.toUpperCase()];
  if (!ranges) return true; // Unknown state
  return ranges.some(([min, max]) => prefix3 >= min && prefix3 <= max);
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

    console.log('[territoryMigrationAudit] Starting full audit...');

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
      synced_at: t.synced_at || null,
    }));

    const microTerritories = (microData?.micro_territories || []).map(mt => ({
      micro_territory_id: mt.micro_territory_id || mt.id || '',
      territory_id: mt.territory_id || '',
      name: mt.name || '',
      state: mt.state || '',
      county: mt.county || '',
      cities: normalizeCities(mt.cities),
      status: mt.status || 'ACTIVE',
      lat: mt.lat || mt.latitude || null,
      lng: mt.lng || mt.longitude || null,
      synced_at: mt.synced_at || null,
    }));

    console.log(`[territoryMigrationAudit] Fetched ${territories.length} territories, ${microTerritories.length} micro-territories`);

    // ── 2. Build territory ID set for orphan check ──
    const territoryIdSet = new Set(territories.map(t => t.territory_id).filter(Boolean));

    // ── 3. Duplicate detection — territories (same state + county) ──
    const terrByKey = {};
    territories.forEach(t => {
      const key = `${t.state}|${t.county}`.toLowerCase();
      if (!terrByKey[key]) terrByKey[key] = [];
      terrByKey[key].push(t.territory_id);
    });
    const duplicateTerritories = Object.entries(terrByKey)
      .filter(([_, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ record_type: 'territory', key, count: ids.length, record_ids: ids }));

    // ── 4. Duplicate detection — micro-territories (same parent + state + county + name) ──
    const microByKey = {};
    microTerritories.forEach(mt => {
      const key = `${mt.territory_id}|${mt.state}|${mt.county}|${mt.name}`.toLowerCase();
      if (!microByKey[key]) microByKey[key] = [];
      microByKey[key].push(mt.micro_territory_id);
    });
    const duplicateMicros = Object.entries(microByKey)
      .filter(([_, ids]) => ids.length > 1)
      .map(([key, ids]) => ({ record_type: 'micro_territory', key, count: ids.length, record_ids: ids }));

    // ── 5. Conflicting parent territories (same micro_territory_id → different territory_id) ──
    const microById = {};
    microTerritories.forEach(mt => {
      if (!mt.micro_territory_id) return;
      if (!microById[mt.micro_territory_id]) microById[mt.micro_territory_id] = new Set();
      microById[mt.micro_territory_id].add(mt.territory_id);
    });
    const conflictingParentRecords = Object.entries(microById)
      .filter(([_, parents]) => parents.size > 1)
      .map(([mtId, parents]) => ({
        micro_territory_id: mtId,
        parent_territory_ids: [...parents],
        state: microTerritories.find(mt => mt.micro_territory_id === mtId)?.state || '',
        county: microTerritories.find(mt => mt.micro_territory_id === mtId)?.county || '',
      }));

    // ── 6. Missing data detection ──
    const missingData = [];
    territories.forEach(t => {
      const missing = [];
      if (!t.territory_id) missing.push('territory_id');
      if (!t.state) missing.push('state');
      if (!t.county) missing.push('county');
      if (!t.name) missing.push('name');
      if (!t.zip_codes || t.zip_codes.length === 0) missing.push('zip_codes');
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

    // ── 7. Orphaned micro-territories ──
    const orphanedMicros = microTerritories
      .filter(mt => mt.territory_id && !territoryIdSet.has(mt.territory_id))
      .map(mt => ({
        micro_territory_id: mt.micro_territory_id,
        territory_id: mt.territory_id,
        state: mt.state,
        county: mt.county,
      }));

    // ── 8. Geocoding audit + duplicate coordinates + coords outside state ──
    const geocodingIssues = [];
    const coordsOutsideState = [];
    const coordMap = {}; // for duplicate coordinate detection
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

      // Check coordinates outside state bounding box
      if (mt.lat && mt.lng && isValidLat(mt.lat) && isValidLng(mt.lng) && mt.state) {
        if (!isCoordInState(mt.lat, mt.lng, mt.state)) {
          const bbox = STATE_BBOX[mt.state?.toUpperCase()];
          coordsOutsideState.push({
            micro_territory_id: mt.micro_territory_id,
            state: mt.state,
            lat: Number(mt.lat),
            lng: Number(mt.lng),
            expected_range: bbox ? `lat ${bbox[0]}–${bbox[2]}, lng ${bbox[1]}–${bbox[3]}` : 'unknown',
          });
        }

        // Track for duplicate coordinates (rounded to 4 decimal places ≈ ~11m)
        const coordKey = `${Number(mt.lat).toFixed(4)},${Number(mt.lng).toFixed(4)}`;
        if (!coordMap[coordKey]) coordMap[coordKey] = [];
        coordMap[coordKey].push(mt.micro_territory_id);
      }

      if (!hasIssue && mt.lat && mt.lng) {
        microsWithValidGeocoding++;
      }
    });

    const microsMissingGeocoding = microTerritories.length - microsWithValidGeocoding;

    // Duplicate coordinates — same lat/lng shared by 2+ micro-territories
    const duplicateCoordinateRecords = Object.entries(coordMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([coordKey, ids]) => {
        const [lat, lng] = coordKey.split(',').map(Number);
        return { lat, lng, count: ids.length, micro_territory_ids: ids };
      });

    // ── 9. ZIP code mismatch detection ──
    const zipMismatchRecords = [];
    let totalZipCodes = 0;
    territories.forEach(t => {
      if (!t.zip_codes || t.zip_codes.length === 0) return;
      totalZipCodes += t.zip_codes.length;
      const invalidZips = t.zip_codes.filter(z => !isZipValidForState(z, t.state));
      if (invalidZips.length > 0) {
        zipMismatchRecords.push({
          territory_id: t.territory_id,
          state: t.state,
          invalid_zips: invalidZips,
        });
      }
    });

    // ── 10. Territory-to-micro-territory count ──
    const microCountByTerritory = {};
    microTerritories.forEach(mt => {
      const tid = mt.territory_id;
      if (tid) microCountByTerritory[tid] = (microCountByTerritory[tid] || 0) + 1;
    });

    const territoryMicroCounts = territories.map(t => ({
      territory_id: t.territory_id,
      territory_name: t.name,
      state: t.state,
      county: t.county,
      zip_count: t.zip_codes?.length || 0,
      micro_count: microCountByTerritory[t.territory_id] || 0,
      has_micros: (microCountByTerritory[t.territory_id] || 0) > 0,
      is_active: t.status === 'ACTIVE',
    }));

    const territoriesWithZeroMicros = territoryMicroCounts.filter(t => !t.has_micros).length;
    const totalCities = microTerritories.reduce((sum, mt) => sum + (mt.cities?.length || 0), 0);

    // ── 11. State breakdown ──
    const stateMap = {};
    territories.forEach(t => {
      if (!t.state) return;
      if (!stateMap[t.state]) stateMap[t.state] = { state: t.state, territory_count: 0, micro_count: 0, zip_count: 0, geocoded_count: 0, missing_geocoding: 0, orphaned_micros: 0, duplicates: 0, coords_outside_state: 0 };
      stateMap[t.state].territory_count++;
      stateMap[t.state].zip_count += t.zip_codes?.length || 0;
    });
    microTerritories.forEach(mt => {
      if (!mt.state) return;
      if (!stateMap[mt.state]) stateMap[mt.state] = { state: mt.state, territory_count: 0, micro_count: 0, zip_count: 0, geocoded_count: 0, missing_geocoding: 0, orphaned_micros: 0, duplicates: 0, coords_outside_state: 0 };
      stateMap[mt.state].micro_count++;
      if (mt.lat && mt.lng && isValidLat(mt.lat) && isValidLng(mt.lng)) stateMap[mt.state].geocoded_count++;
      else stateMap[mt.state].missing_geocoding++;
    });
    orphanedMicros.forEach(o => { if (o.state && stateMap[o.state]) stateMap[o.state].orphaned_micros++; });
    duplicateTerritories.forEach(d => {
      const parts = d.key.split('|');
      const st = parts[0]?.toUpperCase();
      if (st && stateMap[st]) stateMap[st].duplicates++;
    });
    coordsOutsideState.forEach(c => { if (c.state && stateMap[c.state]) stateMap[c.state].coords_outside_state++; });
    const stateBreakdown = Object.values(stateMap).sort((a, b) => b.territory_count - a.territory_count);

    // ── 12. County breakdown ──
    const countyMap = {};
    territories.forEach(t => {
      const key = `${t.state}|${t.county}`;
      if (!countyMap[key]) countyMap[key] = { state: t.state, county: t.county, territory_count: 0, micro_count: 0, zip_count: 0 };
      countyMap[key].territory_count++;
      countyMap[key].zip_count += t.zip_codes?.length || 0;
    });
    microTerritories.forEach(mt => {
      const key = `${mt.state}|${mt.county}`;
      if (!countyMap[key]) countyMap[key] = { state: mt.state, county: mt.county, territory_count: 0, micro_count: 0, zip_count: 0 };
      countyMap[key].micro_count++;
    });
    const countyBreakdown = Object.values(countyMap).sort((a, b) => a.state.localeCompare(b.state) || a.county.localeCompare(b.county));

    // ── 13. Export readiness ──
    const totalActive = territories.filter(t => t.status === 'ACTIVE').length;
    const totalInactive = territories.length - totalActive;
    const totalMicroActive = microTerritories.filter(mt => mt.status === 'ACTIVE').length;
    const totalMicroInactive = microTerritories.length - totalMicroActive;

    const allDuplicates = [...duplicateTerritories, ...duplicateMicros];

    // Build export preview — one row per micro-territory city (or one row per micro if no cities)
    const exportPreview = [];
    let recordsReady = 0;
    let recordsBlocked = 0;

    // Build a lookup of territory by ID for quick access
    const territoryById = {};
    territories.forEach(t => { if (t.territory_id) territoryById[t.territory_id] = t; });

    territories.forEach(t => {
      const micros = microTerritories.filter(mt => mt.territory_id === t.territory_id);
      const zipStr = t.zip_codes?.join('; ') || '';
      const createdDate = t.synced_at || '';
      const updatedDate = t.synced_at || '';

      if (micros.length === 0) {
        // Territory with no micros — export the territory itself
        const ready = !!(t.territory_id && t.state && t.county);
        if (ready) recordsReady++; else recordsBlocked++;
        exportPreview.push({
          territory_id: t.territory_id,
          territory_name: t.name,
          territory_type: '',
          state: t.state,
          county: t.county,
          city: '',
          zip_codes: zipStr,
          micro_territory_id: '',
          micro_territory_name: '',
          parent_territory_id: t.territory_id,
          latitude: null,
          longitude: null,
          geocoding_source: '',
          last_geocoded_date: '',
          is_active: t.status === 'ACTIVE',
          created_date: createdDate,
          updated_date: updatedDate,
          ready_for_export: ready,
          block_reason: ready ? '' : 'Missing required fields',
        });
      } else {
        micros.forEach(mt => {
          const cities = mt.cities.length > 0 ? mt.cities : [''];
          cities.forEach(cityName => {
            const hasValidGeo = mt.lat && mt.lng && isValidLat(mt.lat) && isValidLng(mt.lng);
            const hasValidParent = territoryIdSet.has(mt.territory_id);
            const ready = !!(mt.micro_territory_id && mt.territory_id && mt.state && mt.county && hasValidParent && hasValidGeo);
            if (ready) recordsReady++; else recordsBlocked++;

            const blockReasons = [];
            if (!mt.micro_territory_id) blockReasons.push('Missing micro_territory_id');
            if (!mt.territory_id) blockReasons.push('Missing territory_id');
            if (!hasValidParent) blockReasons.push('Orphaned — parent territory not found');
            if (!hasValidGeo) blockReasons.push('Missing/invalid geocoding');

            exportPreview.push({
              territory_id: t.territory_id,
              territory_name: t.name,
              territory_type: '',
              state: mt.state || t.state,
              county: mt.county || t.county,
              city: cityName,
              zip_codes: zipStr,
              micro_territory_id: mt.micro_territory_id,
              micro_territory_name: mt.name,
              parent_territory_id: mt.territory_id,
              latitude: mt.lat ? Number(mt.lat) : null,
              longitude: mt.lng ? Number(mt.lng) : null,
              geocoding_source: '',
              last_geocoded_date: mt.synced_at || '',
              is_active: mt.status === 'ACTIVE',
              created_date: mt.synced_at || createdDate,
              updated_date: mt.synced_at || updatedDate,
              ready_for_export: ready,
              block_reason: blockReasons.join(', '),
            });
          });
        });
      }
    });

    // ── 14. Fixes needed ──
    const fixesNeeded = [];
    if (territories.some(t => !t.territory_id)) fixesNeeded.push('Some territories are missing stable unique IDs');
    if (microTerritories.some(mt => !mt.micro_territory_id)) fixesNeeded.push('Some micro-territories are missing stable unique IDs');
    if (orphanedMicros.length > 0) fixesNeeded.push(`${orphanedMicros.length} micro-territories are orphaned — parent territory not found`);
    if (microsMissingGeocoding > 0) fixesNeeded.push(`${microsMissingGeocoding} micro-territories are missing valid geocoding (lat/lng) — this is the critical blocker`);
    if (territoriesWithZeroMicros > 0) fixesNeeded.push(`${territoriesWithZeroMicros} territories have zero micro-territories`);
    if (duplicateTerritories.length > 0) fixesNeeded.push(`${duplicateTerritories.length} duplicate territory groups detected`);
    if (duplicateMicros.length > 0) fixesNeeded.push(`${duplicateMicros.length} duplicate micro-territory groups detected`);
    if (conflictingParentRecords.length > 0) fixesNeeded.push(`${conflictingParentRecords.length} micro-territories have conflicting parent territory IDs`);
    if (duplicateCoordinateRecords.length > 0) fixesNeeded.push(`${duplicateCoordinateRecords.length} coordinate clusters shared by multiple micro-territories`);
    if (coordsOutsideState.length > 0) fixesNeeded.push(`${coordsOutsideState.length} micro-territories have coordinates outside their state bounding box`);
    if (zipMismatchRecords.length > 0) fixesNeeded.push(`${zipMismatchRecords.length} territories have ZIP codes that don't match their state's ZIP range`);
    if (missingData.some(m => m.record_type === 'territory')) fixesNeeded.push('Some territories are missing required fields (state, county, name, or zip_codes)');
    if (missingData.some(m => m.record_type === 'micro_territory')) fixesNeeded.push('Some micro-territories are missing required fields (territory_id, state, county, or cities)');

    // ── 15. Export readiness score ──
    const hasCriticalIssues =
      territories.some(t => !t.territory_id) ||
      microTerritories.some(mt => !mt.micro_territory_id) ||
      orphanedMicros.length > 0 ||
      conflictingParentRecords.length > 0 ||
      microsMissingGeocoding > microTerritories.length * 0.05; // >5% missing geocoding = critical

    const hasWarnings =
      territoriesWithZeroMicros > 0 ||
      allDuplicates.length > 0 ||
      missingData.length > 0 ||
      microsMissingGeocoding > 0 ||
      duplicateCoordinateRecords.length > 0 ||
      coordsOutsideState.length > 0 ||
      zipMismatchRecords.length > 0;

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

    // ── 16. Data availability flags ──
    const geocodingSourceAvailable = microTerritories.some(mt => mt.geocoding_source);
    const lastGeocodedDateAvailable = microTerritories.some(mt => mt.geocoded_at || mt.geocode_last_run);
    const polygonDataAvailable = microTerritories.some(mt => mt.polygon || mt.boundary);
    const territoryTypeAvailable = territories.some(t => t.territory_type || t.type);

    // ── 17. Store audit result ──
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
      total_zip_codes: totalZipCodes,
      total_cities: totalCities,
      territories_with_zero_micros: territoriesWithZeroMicros,
      orphaned_micro_territories: orphanedMicros.length,
      duplicate_territories: duplicateTerritories.length,
      duplicate_micro_territories: duplicateMicros.length,
      conflicting_parent_count: conflictingParentRecords.length,
      duplicate_coordinates_count: duplicateCoordinateRecords.length,
      coords_outside_state_count: coordsOutsideState.length,
      zip_mismatch_count: zipMismatchRecords.length,
      micros_missing_geocoding: microsMissingGeocoding,
      micros_with_valid_geocoding: microsWithValidGeocoding,
      geocoding_source_available: geocodingSourceAvailable,
      last_geocoded_date_available: lastGeocodedDateAvailable,
      polygon_data_available: polygonDataAvailable,
      territory_type_available: territoryTypeAvailable,
      records_ready_for_export: recordsReady,
      records_blocked_from_export: recordsBlocked,
      state_breakdown: stateBreakdown,
      county_breakdown: countyBreakdown,
      territory_micro_counts: territoryMicroCounts,
      missing_data: missingData,
      geocoding_issues: geocodingIssues,
      duplicate_records: allDuplicates,
      orphaned_records: orphanedMicros,
      conflicting_parent_records: conflictingParentRecords,
      duplicate_coordinate_records: duplicateCoordinateRecords,
      coords_outside_state_records: coordsOutsideState,
      zip_mismatch_records: zipMismatchRecords,
      fixes_needed: fixesNeeded,
      export_readiness: exportReadiness,
      export_readiness_label: readinessLabel,
      ready_for_houszu_export: readyForExport,
      export_preview: exportPreview.slice(0, 500),
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
        total_zip_codes: totalZipCodes,
        total_cities: totalCities,
        territories_with_zero_micros: territoriesWithZeroMicros,
        orphaned_micro_territories: orphanedMicros.length,
        duplicate_territories: duplicateTerritories.length,
        duplicate_micro_territories: duplicateMicros.length,
        conflicting_parent_count: conflictingParentRecords.length,
        duplicate_coordinates_count: duplicateCoordinateRecords.length,
        coords_outside_state_count: coordsOutsideState.length,
        zip_mismatch_count: zipMismatchRecords.length,
        micros_missing_geocoding: microsMissingGeocoding,
        micros_with_valid_geocoding: microsWithValidGeocoding,
        geocoding_source_available: geocodingSourceAvailable,
        last_geocoded_date_available: lastGeocodedDateAvailable,
        polygon_data_available: polygonDataAvailable,
        territory_type_available: territoryTypeAvailable,
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
      conflicting_parent_records: conflictingParentRecords,
      duplicate_coordinate_records: duplicateCoordinateRecords,
      coords_outside_state_records: coordsOutsideState,
      zip_mismatch_records: zipMismatchRecords,
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