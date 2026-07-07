import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function toSlug(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').trim();
}

const BASE_URL = 'https://www.estatesalen.com';

const COUNTY_GUIDE_TYPES = [
  { guide_type: 'probate', url_prefix: 'probate' },
  { guide_type: 'inherited_home', url_prefix: 'inherited-property' },
  { guide_type: 'senior_transition', url_prefix: 'senior-downsizing' },
  { guide_type: 'estate_sale', url_prefix: 'estate-cleanout' },
  { guide_type: 'general', url_prefix: 'moving-sale' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      state, county,
      cities = [], zip_codes = [],
      assigned_operator_id, assigned_operator_name,
      assigned_agent_id, assigned_agent_name,
      assigned_cleanout_vendor_id, assigned_cleanout_vendor_name,
      assigned_investor_id, assigned_investor_name,
      launch_status = 'draft',
      notes = '',
      territory_launch_id = null, // if updating an existing launch
    } = body;

    if (!state || !county) {
      return Response.json({ error: 'state and county are required' }, { status: 400 });
    }

    const state_slug = toSlug(state);
    const county_slug = toSlug(county) + '-' + state_slug.substring(0, 2);
    const pages_created = [];
    const log = [];

    // ── Step 1: Ensure StateGuide exists ──
    const existingStateGuides = await base44.asServiceRole.entities.StateGuide.filter({
      state_slug,
    });

    let stateGuideId = existingStateGuides[0]?.id;

    if (!stateGuideId) {
      // Create a stub state guide for probate
      const sg = await base44.asServiceRole.entities.StateGuide.create({
        state_name: state,
        state_slug,
        state_abbreviation: state.substring(0, 2).toUpperCase(),
        guide_type: 'probate',
        title: `Probate in ${state}: A Complete Guide`,
        seo_title: `${state} Probate Guide — Estate Settlement Resources`,
        seo_description: `Learn how probate works in ${state}. Step-by-step guide, county courts, estate sale resources, and probate-friendly realtors.`,
        status: launch_status,
      });
      stateGuideId = sg.id;
      log.push(`Created StateGuide for ${state} (id: ${sg.id})`);
    } else {
      log.push(`StateGuide already exists for ${state}`);
    }

    // ── Step 2: Ensure CountyGuide records exist for all types ──
    for (const { guide_type, url_prefix } of COUNTY_GUIDE_TYPES) {
      const existing = await base44.asServiceRole.entities.CountyGuide.filter({
        county_slug,
        guide_type,
      });

      let countyGuideId = existing[0]?.id;

      if (!countyGuideId) {
        const cg = await base44.asServiceRole.entities.CountyGuide.create({
          state_id: stateGuideId,
          county_name: county,
          county_slug,
          guide_type,
          title: `${guide_type.replace(/_/g, ' ')} in ${county}, ${state}`,
          seo_title: `${county} County ${state} — ${guide_type.replace(/_/g, ' ')} Guide`,
          seo_description: `Resources, local experts, and step-by-step guidance for ${guide_type.replace(/_/g, ' ')} in ${county} County, ${state}.`,
          status: launch_status,
        });
        countyGuideId = cg.id;
        log.push(`Created CountyGuide: ${guide_type} for ${county}, ${state}`);
      } else {
        log.push(`CountyGuide already exists: ${guide_type} for ${county}`);
      }

      const pageUrl = `${BASE_URL}/${url_prefix}/${state_slug}/${county_slug}`;
      pages_created.push({
        url: pageUrl,
        page_type: guide_type,
        entity_id: countyGuideId,
        status: launch_status,
      });

      // Log to SEOIndexLog
      const existingSEO = await base44.asServiceRole.entities.SEOIndexLog.filter({ page_url: pageUrl });
      if (!existingSEO[0]) {
        await base44.asServiceRole.entities.SEOIndexLog.create({
          page_url: pageUrl,
          page_type: 'county_guide',
          sitemap_status: 'included',
          indexing_status: 'not_submitted',
        });
      }
    }

    // ── Step 3: Add directory pages ──
    const directoryPages = [
      { url: `${BASE_URL}/estate-sale-companies/${state_slug}/${county_slug}`, page_type: 'estate_sale_companies' },
      { url: `${BASE_URL}/probate-realtors/${state_slug}/${county_slug}`, page_type: 'probate_realtors' },
      { url: `${BASE_URL}/estate-checklist?state=${encodeURIComponent(state)}&county=${encodeURIComponent(county)}`, page_type: 'checklist' },
      { url: `${BASE_URL}/estate-settlement-planner?state=${encodeURIComponent(state)}&county=${encodeURIComponent(county)}`, page_type: 'planner' },
    ];

    for (const dp of directoryPages) {
      pages_created.push({ ...dp, entity_id: null, status: launch_status });
      if (!dp.url.includes('?')) {
        const existingSEO = await base44.asServiceRole.entities.SEOIndexLog.filter({ page_url: dp.url });
        if (!existingSEO[0]) {
          await base44.asServiceRole.entities.SEOIndexLog.create({
            page_url: dp.url,
            page_type: 'other',
            sitemap_status: 'included',
            indexing_status: 'not_submitted',
          });
        }
      }
    }

    // ── Step 4: Create provider routing rules ──
    let routing_rules_created = 0;
    const routingProviders = [
      { id: assigned_operator_id, type: 'estate_sale_operator' },
      { id: assigned_agent_id, type: 'realtor' },
      { id: assigned_cleanout_vendor_id, type: 'cleanout_vendor' },
      { id: assigned_investor_id, type: 'investor' },
    ].filter(p => p.id);

    for (const provider of routingProviders) {
      const existingRule = await base44.asServiceRole.entities.ProviderRoutingRule.filter({
        provider_id: provider.id,
        state,
        county,
      });

      if (!existingRule[0]) {
        await base44.asServiceRole.entities.ProviderRoutingRule.create({
          provider_id: provider.id,
          provider_type: provider.type,
          state,
          county,
          life_event_type: 'any',
          priority_order: 1,
          is_active: true,
        });
        routing_rules_created++;
        log.push(`Created routing rule: ${provider.type} for ${county}, ${state}`);
      }
    }

    // ── Step 5: Save or update TerritoryLaunch record ──
    // Preserve multi-assignee arrays from Territory Dashboard if not explicitly overridden
    let existingRecord = null;
    if (territory_launch_id) {
      const byId = await base44.asServiceRole.entities.TerritoryLaunch.filter({ id: territory_launch_id });
      existingRecord = byId[0];
    }
    if (!existingRecord) {
      const existing = await base44.asServiceRole.entities.TerritoryLaunch.filter({ state_slug, county_slug });
      existingRecord = existing[0];
    }

    const launchPayload = {
      state,
      state_slug,
      county,
      county_slug,
      fips_code: existingRecord?.fips_code || undefined,
      cities_json: cities.length > 0 ? cities : (existingRecord?.cities_json || []),
      zip_codes_json: zip_codes.length > 0 ? zip_codes : (existingRecord?.zip_codes_json || []),
      assigned_operator_id,
      assigned_operator_name,
      assigned_agent_id,
      assigned_agent_name,
      assigned_cleanout_vendor_id,
      assigned_cleanout_vendor_name,
      assigned_investor_id,
      assigned_investor_name,
      // Preserve multi-assignee arrays from the Territory Dashboard drawer
      assigned_operator_ids: existingRecord?.assigned_operator_ids || [],
      assigned_operator_names: existingRecord?.assigned_operator_names || [],
      assigned_agent_ids: existingRecord?.assigned_agent_ids || [],
      assigned_agent_names: existingRecord?.assigned_agent_names || [],
      launch_status,
      pages_created_json: pages_created,
      sitemap_status: 'queued',
      routing_rules_created,
      notes: notes || existingRecord?.notes || '',
    };

    let launch;
    if (existingRecord) {
      launch = await base44.asServiceRole.entities.TerritoryLaunch.update(existingRecord.id, launchPayload);
    } else {
      launch = await base44.asServiceRole.entities.TerritoryLaunch.create(launchPayload);
    }

    return Response.json({
      success: true,
      territory_launch_id: launch.id,
      state,
      county,
      state_slug,
      county_slug,
      pages_created: pages_created.length,
      routing_rules_created,
      sitemap_status: 'queued',
      log,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});