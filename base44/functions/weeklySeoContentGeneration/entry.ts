import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const results = {
      pages_generated: 0,
      pages_submitted: 0,
      errors: [],
    };

    // ── 1. Find SEOPages that haven't been updated in over 30 days ──
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stalePages = await base44.asServiceRole.entities.SEOPage.filter(
      { generated_status: 'generated' },
      '-created_date',
      20
    );

    const recentPages = stalePages.filter(p => {
      if (!p.updated_date) return true;
      return new Date(p.updated_date) < thirtyDaysAgo;
    });

    // ── 2. Find TerritoryLaunch records that are published but have no recent SEO content ──
    const publishedTerritories = await base44.asServiceRole.entities.TerritoryLaunch.filter(
      { launch_status: 'published' },
      '-created_date',
      10
    );

    // ── 3. Generate fresh content for stale pages ──
    for (const page of recentPages.slice(0, 3)) {
      try {
        await base44.asServiceRole.functions.invoke('generateSeoContent', {
          page_type: page.page_type || 'county',
          entity_data: {
            title: page.seo_title || page.h1 || 'Estate Sale Guide',
            description: page.meta_description || '',
            location: page.location_name || '',
            page_url: page.page_url || '',
          },
        });
        results.pages_generated++;
      } catch (e) {
        results.errors.push(`generateSeoContent failed for ${page.id}: ${e.message}`);
      }
    }

    // ── 4. Submit any pages with 'generated' status to Google ──
    const toSubmit = await base44.asServiceRole.entities.SEOPage.filter(
      { generated_status: 'generated', indexed_status: 'not_submitted' },
      '-created_date',
      10
    );

    for (const page of toSubmit.slice(0, 5)) {
      try {
        await base44.asServiceRole.functions.invoke('submitPageToIndex', {
          page_url: page.page_url,
          page_type: page.page_type || 'other',
          seo_title: page.seo_title || '',
          seo_description: page.meta_description || '',
          entity_id: page.id,
          entity_type: 'SEOPage',
        });
        results.pages_submitted++;
      } catch (e) {
        results.errors.push(`submitPageToIndex failed for ${page.page_url}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      summary: `Generated ${results.pages_generated} pages, submitted ${results.pages_submitted} pages to Google.`,
      details: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});