// LLBB Setup Progress / Website Readiness engine (Phase 4A).
// Meaningful setup SECTIONS with weights — explicitly NOT a
// fields-populated percentage. Optional sections can never block launch;
// blocking sections are the explicit launch gate (enforced in llbbAdmin
// workflow 'live' transitions).
// Status vocabulary: complete | incomplete | warning | optional | blocking.
//   complete   — section done (contributes weight)
//   incomplete — required for a meaningful site, not done (contributes 0)
//   blocking   — incomplete AND a launch blocker
//   warning    — partially configured
//   optional   — absence is acceptable by design

const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

export function computeReadiness({ tenant, settings, destination, domains }) {
  const s = settings || {};
  const branding = s.branding || {};
  const homepage = s.homepage || {};
  const contact = s.contact || {};
  const services = s.services || {};
  const about = s.about || {};
  const seo = s.seo || {};
  const testimonials = s.testimonials || {};
  const legal = s.legal || {};
  const platformDomain = (domains || []).find(
    (d) => d.domain_type === 'platform_subdomain' && d.status !== 'disconnected'
  ) || null;
  const customDomains = (domains || []).filter((d) => d.domain_type === 'custom_domain');
  const customVerified = customDomains.some((d) => d.status === 'verified' || d.status === 'active');
  const destOk = !!destination && destination.status === 'active';

  const sections = [];
  const push = (key, label, weight, blocking, optional, status, reason) => {
    sections.push({ key, label, weight, blocking: !!blocking, optional: !!optional, status, reason: reason || null });
  };

  // Business identity — the single hard identity anchor.
  push('business', 'Business Identity', 20, true, false,
    has(s.display_business_name) ? 'complete' : 'blocking',
    has(s.display_business_name) ? 'Business name is set.' : 'Business name shown on the website is required.');

  // Homepage hero — the primary public surface.
  if (has(homepage.hero_headline) && has(homepage.hero_subheadline)) {
    push('homepage', 'Homepage', 20, true, false, 'complete', 'Homepage hero is configured.');
  } else if (has(homepage.hero_headline) || has(homepage.hero_subheadline) || has(homepage.hero_image_url)) {
    push('homepage', 'Homepage', 20, true, false, 'blocking', 'Homepage hero is only partially configured — headline and subheadline are both required.');
  } else {
    push('homepage', 'Homepage', 20, true, false, 'blocking', 'Homepage hero headline and subheadline are required.');
  }

  // Contact — a website without a reachable contact fails its purpose.
  if (has(contact.phone) || has(contact.email)) {
    push('contact', 'Contact', 15, true, false, 'complete', 'Contact information resolves.');
  } else {
    push('contact', 'Contact', 15, true, false, 'blocking', 'At least one contact method (phone or email) is required.');
  }

  // Runtime — destination + platform hostname present and active.
  if (destOk && platformDomain) {
    push('runtime', 'Runtime', 10, true, false, 'complete', `Serving on ${platformDomain.hostname}.`);
  } else {
    push('runtime', 'Runtime', 10, true, false, 'blocking',
      !destOk ? 'Website destination is not attached or not active.' : 'Platform hostname is missing.');
  }

  // Services (non-blocking).
  if (Array.isArray(services.items) && services.items.length > 0) {
    push('services', 'Services', 10, false, false, 'complete', `${services.items.length} service(s) listed.`);
  } else if (has(services.headline) || has(services.intro)) {
    push('services', 'Services', 10, false, false, 'warning', 'Services section started but no service items yet.');
  } else {
    push('services', 'Services', 10, false, false, 'incomplete', 'No services configured yet.');
  }

  // SEO baseline (non-blocking).
  if (has(seo.default_title) && has(seo.default_description)) {
    push('seo', 'SEO Baseline', 10, false, false, 'complete', 'Default title and description set.');
  } else if (has(seo.default_title) || has(seo.default_description)) {
    push('seo', 'SEO Baseline', 10, false, false, 'warning', 'SEO baseline partially configured.');
  } else {
    push('seo', 'SEO Baseline', 10, false, false, 'incomplete', 'No default SEO title/description yet.');
  }

  // Branding (non-blocking).
  if (has(branding.logo_url) || has(branding.primary_color)) {
    push('branding', 'Branding', 10, false, false, 'complete', 'Brand identity present.');
  } else if (Object.values(branding).some(has)) {
    push('branding', 'Branding', 10, false, false, 'warning', 'Branding partially configured.');
  } else {
    push('branding', 'Branding', 10, false, false, 'incomplete', 'No logo or brand colors yet.');
  }

  // About (optional).
  if (has(about.body)) push('about', 'About', 5, false, true, 'complete', 'About copy present.');
  else push('about', 'About', 5, false, true, 'optional', 'Optional — About copy not yet written.');

  // Testimonials (optional).
  if (Array.isArray(testimonials.items) && testimonials.items.length > 0) {
    push('testimonials', 'Testimonials', 5, false, true, 'complete', `${testimonials.items.length} testimonial(s).`);
  } else push('testimonials', 'Testimonials', 5, false, true, 'optional', 'Optional — no testimonials yet.');

  // Policies (optional).
  if (has(legal.privacy_policy_text) || has(legal.terms_text)) {
    push('legal', 'Policies', 5, false, true, 'complete', 'Legal copy present.');
  } else push('legal', 'Policies', 5, false, true, 'optional', 'Optional — no privacy/terms copy yet.');

  // Custom domain (optional — platform hostname is always included).
  if (customVerified) push('domain', 'Custom Domain', 5, false, true, 'complete', 'Custom domain connected.');
  else if (customDomains.length > 0) push('domain', 'Custom Domain', 5, false, true, 'warning', 'Custom domain reserved but not verified yet.');
  else push('domain', 'Custom Domain', 5, false, true, 'optional', 'Optional — platform hostname is included.');

  // Sales integration (optional — runtime-served destination covers it).
  if (tenant.auto_publish_enabled !== false && destOk) {
    push('sales_integration', 'Estate Sales', 5, false, true, 'complete', 'Canonical sales publish automatically.');
  } else push('sales_integration', 'Estate Sales', 5, false, true, 'optional', 'Optional — sales publishing not enabled.');

  const totalWeight = sections.reduce((a, x) => a + x.weight, 0);
  const doneWeight = sections.filter((x) => x.status === 'complete').reduce((a, x) => a + x.weight, 0);
  const percent = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;
  const blockers = sections.filter((x) => x.status === 'blocking');

  return {
    percent,
    sections,
    blockers,
    launch_ready: blockers.length === 0
  };
}