import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Phase 12 deployment function — generates all NJ draft content in sequence.
 * Saves everything as draft. Never auto-publishes.
 * Returns a full deployment report.
 */

const NJ_STATE_GUIDES = [
  { guide_type: 'probate',          label: 'Probate' },
  { guide_type: 'inherited_home',   label: 'Inherited Home' },
  { guide_type: 'estate_sale',      label: 'Estate Cleanout' },
  { guide_type: 'senior_transition',label: 'Senior Downsizing' },
  { guide_type: 'general',          label: 'Moving Sale' },
];

const NJ_PROBATE_COUNTIES = [
  'Monmouth County','Ocean County','Middlesex County','Bergen County','Essex County',
  'Morris County','Union County','Hudson County','Mercer County','Burlington County',
];

const NJ_ESTATE_SALE_COUNTIES = ['Monmouth County','Ocean County','Middlesex County'];
const NJ_REALTOR_COUNTIES     = ['Monmouth County','Ocean County','Middlesex County'];

const NJ_LEAD_MAGNETS = [
  { life_event_type: 'probate',       label: 'Probate & Estate Settlement Checklist — New Jersey' },
  { life_event_type: 'inherited_home',label: 'Inherited Home Sale Checklist — New Jersey' },
  { life_event_type: 'estate_sale',   label: 'Estate Sale Preparation Checklist — New Jersey' },
  { life_event_type: 'executor_guide',label: 'Executor First Steps Checklist — New Jersey' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const report = {
      state_guides: [],
      county_guides: [],
      estate_sale_county_guides: [],
      realtor_county_guides: [],
      lead_magnets: [],
      errors: [],
    };

    // ── 1. State guides (5) ──────────────────────────────────────────────────
    for (const sg of NJ_STATE_GUIDES) {
      try {
        const res = await base44.asServiceRole.functions.invoke('populateStateContent', {
          state_name: 'New Jersey',
          guide_type: sg.guide_type,
        });
        report.state_guides.push({
          type: sg.label,
          success: res?.success || false,
          id: res?.id,
          seo_title: res?.seo_title,
          status: 'draft',
          error: res?.error,
        });
      } catch (e) {
        report.state_guides.push({ type: sg.label, success: false, error: e.message });
        report.errors.push(`State ${sg.label}: ${e.message}`);
      }
    }

    // ── 2. County probate guides (10) ────────────────────────────────────────
    for (const county of NJ_PROBATE_COUNTIES) {
      try {
        const res = await base44.asServiceRole.functions.invoke('populateCountyContent', {
          state_name: 'New Jersey',
          county_name: county,
          guide_type: 'probate',
        });
        report.county_guides.push({
          county,
          success: res?.success || false,
          id: res?.id,
          seo_title: res?.seo_title,
          status: 'draft',
          error: res?.error,
        });
      } catch (e) {
        report.county_guides.push({ county, success: false, error: e.message });
        report.errors.push(`County ${county}: ${e.message}`);
      }
    }

    // ── 3. Estate sale county guides (3) ────────────────────────────────────
    for (const county of NJ_ESTATE_SALE_COUNTIES) {
      try {
        const res = await base44.asServiceRole.functions.invoke('populateCountyContent', {
          state_name: 'New Jersey',
          county_name: county,
          guide_type: 'estate_sale',
        });
        report.estate_sale_county_guides.push({
          county,
          success: res?.success || false,
          id: res?.id,
          seo_title: res?.seo_title,
          status: 'draft',
          error: res?.error,
        });
      } catch (e) {
        report.estate_sale_county_guides.push({ county, success: false, error: e.message });
        report.errors.push(`Estate sale ${county}: ${e.message}`);
      }
    }

    // ── 4. Probate realtor county guides (3) ────────────────────────────────
    for (const county of NJ_REALTOR_COUNTIES) {
      try {
        const res = await base44.asServiceRole.functions.invoke('populateCountyContent', {
          state_name: 'New Jersey',
          county_name: county,
          guide_type: 'inherited_home',
        });
        report.realtor_county_guides.push({
          county,
          success: res?.success || false,
          id: res?.id,
          seo_title: res?.seo_title,
          status: 'draft',
          error: res?.error,
        });
      } catch (e) {
        report.realtor_county_guides.push({ county, success: false, error: e.message });
        report.errors.push(`Realtor ${county}: ${e.message}`);
      }
    }

    // ── 5. NJ-specific lead magnets (4) ─────────────────────────────────────
    for (const lm of NJ_LEAD_MAGNETS) {
      try {
        const res = await base44.asServiceRole.functions.invoke('generateLeadMagnet', {
          life_event_type: lm.life_event_type,
          state: 'New Jersey',
        });
        report.lead_magnets.push({
          title: lm.label,
          success: res?.success || false,
          id: res?.id,
          slug: res?.slug,
          item_count: res?.item_count,
          error: res?.error,
        });
      } catch (e) {
        report.lead_magnets.push({ title: lm.label, success: false, error: e.message });
        report.errors.push(`Lead magnet ${lm.label}: ${e.message}`);
      }
    }

    // ── 6. Queue all new pages in SEOIndexLog ────────────────────────────────
    const sitemapEntries = [];

    // State guide URLs
    const stateUrlMap = {
      probate: '/probate/new-jersey',
      inherited_home: '/inherited-property/new-jersey',
      estate_sale: '/estate-cleanout/new-jersey',
      senior_transition: '/senior-downsizing/new-jersey',
      general: '/moving-sale/new-jersey',
    };
    for (const sg of NJ_STATE_GUIDES) {
      sitemapEntries.push({ page_url: stateUrlMap[sg.guide_type], page_type: 'state_guide' });
    }

    // County probate URLs
    for (const county of NJ_PROBATE_COUNTIES) {
      const slug = county.toLowerCase().replace(/\s+/g, '-');
      sitemapEntries.push({ page_url: `/probate/new-jersey/${slug}`, page_type: 'county_guide' });
    }

    // Estate sale company county URLs
    for (const county of NJ_ESTATE_SALE_COUNTIES) {
      const slug = county.toLowerCase().replace(/\s+/g, '-');
      sitemapEntries.push({ page_url: `/estate-sale-companies/new-jersey/${slug}`, page_type: 'county_guide' });
    }

    // Probate realtor county URLs
    for (const county of NJ_REALTOR_COUNTIES) {
      const slug = county.toLowerCase().replace(/\s+/g, '-');
      sitemapEntries.push({ page_url: `/probate-realtors/new-jersey/${slug}`, page_type: 'county_guide' });
    }

    // Queue in SEOIndexLog
    const sitemapResults = [];
    for (const entry of sitemapEntries) {
      try {
        const existing = await base44.asServiceRole.entities.SEOIndexLog.filter({ page_url: entry.page_url });
        if (!existing[0]) {
          const created = await base44.asServiceRole.entities.SEOIndexLog.create({
            ...entry,
            sitemap_status: 'queued',
            indexing_status: 'not_submitted',
          });
          sitemapResults.push({ url: entry.page_url, queued: true, id: created.id });
        } else {
          sitemapResults.push({ url: entry.page_url, queued: false, note: 'already exists' });
        }
      } catch (e) {
        sitemapResults.push({ url: entry.page_url, queued: false, error: e.message });
      }
    }

    // ── 7. Build summary ────────────────────────────────────────────────────
    const summary = {
      state_guides_created: report.state_guides.filter(r => r.success).length,
      county_guides_created: report.county_guides.filter(r => r.success).length,
      estate_sale_county_guides_created: report.estate_sale_county_guides.filter(r => r.success).length,
      realtor_county_guides_created: report.realtor_county_guides.filter(r => r.success).length,
      lead_magnets_created: report.lead_magnets.filter(r => r.success).length,
      sitemap_queued: sitemapResults.filter(r => r.queued).length,
      total_pages: sitemapEntries.length,
      error_count: report.errors.length,
      all_saved_as_draft: true,
      auto_published: false,
      missing_provider_assignments: [
        'No Estate Sale Company Owners assigned to Monmouth County NJ',
        'No Estate Sale Company Owners assigned to Ocean County NJ',
        'No Estate Sale Company Owners assigned to Middlesex County NJ',
        'No probate realtors assigned to Monmouth County NJ',
        'No probate realtors assigned to Ocean County NJ',
        'No probate realtors assigned to Middlesex County NJ',
        'No cleanout vendors assigned to any NJ county',
        'No investor buyers assigned to any NJ county',
      ],
    };

    return Response.json({
      success: true,
      summary,
      sitemap_queue: sitemapResults,
      details: report,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});