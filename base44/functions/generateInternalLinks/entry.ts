import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Static link blocks always included ──
const STATIC_LINKS = {
  estate_sale_directory: { text: 'Find estate sale companies near you', path: '/estate-sale-companies' },
  realtor_directory:     { text: 'Find a probate realtor', path: '/probate-realtors' },
  estate_checklist:      { text: 'Free estate settlement checklist', path: '/estate-checklist' },
  planner:               { text: 'Estate settlement planner', path: '/estate-settlement-planner' },
  probate_hub:           { text: 'Probate guide', path: '/probate' },
  executor_guide:        { text: 'Executor guide', path: '/executor-guide' },
  heir_guide:            { text: 'Heir guide', path: '/heir-guide' },
  learn:                 { text: 'Estate Sale University', path: '/learn' },
};

// ── Event type → hub path mapping ──
const EVENT_TO_HUB = {
  probate: '/probate',
  downsizing: '/senior-downsizing',
  divorce: '/divorce-property-sale',
  relocation: '/moving-sale',
  senior_transition: '/assisted-living-transition',
  inherited_home: '/inherited-property',
  estate_settlement: '/executor-guide',
  bankruptcy: '/foreclosure-cleanout',
  foreclosure: '/foreclosure-cleanout',
};

// ── Guide type → hub path mapping ──
const GUIDE_TO_HUB = {
  probate: '/probate',
  'inherited-property': '/inherited-property',
  'senior-downsizing': '/senior-downsizing',
  'assisted-living-transition': '/assisted-living-transition',
  'divorce-property-sale': '/divorce-property-sale',
  'foreclosure-cleanout': '/foreclosure-cleanout',
  'estate-cleanout': '/estate-cleanout',
  'moving-sale': '/moving-sale',
};

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      page_type,      // 'hub' | 'state_guide' | 'county_guide' | 'item' | 'article' | 'provider_directory' | 'probate_state' | 'probate_county'
      event_type,     // for hubs
      guide_type,     // for state/county guides
      state_name,
      state_slug,
      county_name,
      county_slug,
      item_slug,
      item_category,
      article_slug,
      article_category,
    } = body;

    const links = { ...STATIC_LINKS };

    // ── 1. Parent hub link ──
    if (event_type && EVENT_TO_HUB[event_type]) {
      links.parent_hub = { text: `${event_type.replace(/_/g,' ')} guide`, path: EVENT_TO_HUB[event_type] };
    }
    if (guide_type && GUIDE_TO_HUB[guide_type]) {
      links.parent_hub = { text: `${guide_type.replace(/-/g,' ')} guide`, path: GUIDE_TO_HUB[guide_type] };
    }

    // ── 2. State page link ──
    if (state_slug && guide_type) {
      links.state_page = { text: `${guide_type.replace(/-/g,' ')} in ${state_name || state_slug}`, path: `/${guide_type}/${state_slug}` };
    }
    if (state_slug && !guide_type) {
      links.state_probate = { text: `Probate in ${state_name || state_slug}`, path: `/probate/${state_slug}` };
    }

    // ── 3. County page link ──
    if (county_slug) {
      links.county_page = { text: `${county_name || county_slug} guide`, path: `/${county_slug}` };
    }
    if (state_slug && !county_slug) {
      // Link to the estate sale company directory for this state
      links.state_companies = { text: `Estate sale companies in ${state_name || state_slug}`, path: `/estate-sale-companies/${state_slug}` };
      links.state_realtors  = { text: `Probate realtors in ${state_name || state_slug}`, path: `/probate-realtors/${state_slug}` };
    }

    // ── 4. Related item guides (by category) ──
    if (item_category) {
      const related = await base44.asServiceRole.entities.ItemKnowledgeBase.filter({ category: item_category, status: 'published' });
      const relatedItems = related.filter(i => i.item_slug !== item_slug).slice(0, 4);
      if (relatedItems.length > 0) {
        links.related_items = relatedItems.map(i => ({ text: i.item_name, path: `/items/${i.item_slug}` }));
      }
    }

    // ── 5. Related learning articles (by category) ──
    if (article_category) {
      const related = await base44.asServiceRole.entities.EstateSaleUniversityArticle.filter({ category: article_category, status: 'published' });
      const relatedArticles = related.filter(a => a.slug !== article_slug).slice(0, 4);
      if (relatedArticles.length > 0) {
        links.related_articles = relatedArticles.map(a => ({ text: a.title, path: `/learn/${a.slug}` }));
      }
    } else {
      // Default: pull a few popular learn articles
      const topArticles = await base44.asServiceRole.entities.EstateSaleUniversityArticle.filter({ status: 'published' }, '-created_date', 3);
      if (topArticles.length > 0) {
        links.featured_articles = topArticles.map(a => ({ text: a.title, path: `/learn/${a.slug}` }));
      }
    }

    // ── 6. Breadcrumbs ──
    const breadcrumbs = [{ label: 'Home', path: '/' }];

    if (page_type === 'hub' && event_type) {
      breadcrumbs.push({ label: 'Life Events', path: '/learn' });
      breadcrumbs.push({ label: event_type.replace(/_/g, ' '), path: EVENT_TO_HUB[event_type] || '/' });
    }
    if (page_type === 'state_guide' && guide_type) {
      breadcrumbs.push({ label: guide_type.replace(/-/g, ' '), path: GUIDE_TO_HUB[guide_type] || '/' });
      if (state_name) breadcrumbs.push({ label: state_name, path: `/${guide_type}/${state_slug}` });
    }
    if (page_type === 'county_guide' && guide_type) {
      breadcrumbs.push({ label: guide_type.replace(/-/g, ' '), path: GUIDE_TO_HUB[guide_type] || '/' });
      if (state_name) breadcrumbs.push({ label: state_name, path: `/${guide_type}/${state_slug}` });
      if (county_name) breadcrumbs.push({ label: county_name, path: `/${county_slug}` });
    }
    if (page_type === 'item') {
      breadcrumbs.push({ label: 'Items', path: '/items' });
      if (item_category) breadcrumbs.push({ label: item_category, path: `/items` });
    }
    if (page_type === 'article') {
      breadcrumbs.push({ label: 'Estate Sale University', path: '/learn' });
      if (article_category) breadcrumbs.push({ label: article_category.replace(/_/g, ' '), path: '/learn' });
    }
    if (page_type === 'probate_state') {
      breadcrumbs.push({ label: 'Probate', path: '/probate' });
      if (state_name) breadcrumbs.push({ label: state_name, path: `/probate/${state_slug}` });
    }
    if (page_type === 'probate_county') {
      breadcrumbs.push({ label: 'Probate', path: '/probate' });
      if (state_name) breadcrumbs.push({ label: state_name, path: `/probate/${state_slug}` });
      if (county_name) breadcrumbs.push({ label: county_name });
    }

    // ── 7. BreadcrumbList schema ──
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: crumb.label,
        ...(crumb.path ? { item: `https://www.estatesalen.com${crumb.path}` } : {}),
      })),
    };

    return Response.json({ links, breadcrumbs, breadcrumb_schema: breadcrumbSchema });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});