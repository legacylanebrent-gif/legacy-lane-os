import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Publishes or unpublishes all county guide pages for a given territory launch.
 * Input: { territory_launch_id, action: 'publish' | 'unpublish' }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { territory_launch_id, action } = await req.json();
    if (!territory_launch_id || !action) {
      return Response.json({ error: 'territory_launch_id and action required' }, { status: 400 });
    }

    const launches = await base44.asServiceRole.entities.TerritoryLaunch.filter({ id: territory_launch_id });
    const launch = launches[0];
    if (!launch) return Response.json({ error: 'Territory launch not found' }, { status: 404 });

    const targetStatus = action === 'publish' ? 'published' : 'draft';
    const { county_slug } = launch;
    let updated = 0;

    // Update all county guides for this territory
    const countyGuides = await base44.asServiceRole.entities.CountyGuide.filter({ county_slug });
    for (const cg of countyGuides) {
      await base44.asServiceRole.entities.CountyGuide.update(cg.id, { status: targetStatus });
      updated++;
    }

    // Update the TerritoryLaunch status
    const newLaunchStatus = action === 'publish' ? 'published' : 'unpublished';
    await base44.asServiceRole.entities.TerritoryLaunch.update(territory_launch_id, {
      launch_status: newLaunchStatus,
      sitemap_status: action === 'publish' ? 'submitted' : 'queued',
      pages_created_json: (launch.pages_created_json || []).map(p => ({ ...p, status: targetStatus })),
    });

    return Response.json({
      success: true,
      territory_launch_id,
      action,
      county_guides_updated: updated,
      new_status: newLaunchStatus,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});