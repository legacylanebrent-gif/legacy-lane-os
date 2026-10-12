// LLBB Setup Progress / Website Readiness engine (Phase 4A + 4B Part 28/29).
// Meaningful setup SECTIONS with weights — explicitly NOT a
// fields-populated percentage. Optional sections can never block launch;
// blocking sections are the explicit launch gate (enforced in llbbAdmin
// workflow 'live' transitions).
// Status vocabulary: complete | incomplete | warning | optional | blocking.
// Phase 4B: REQUIRED / RECOMMENDED / OPTIONAL classification is expressed by
// the blocking / weighted / optional flags (Overview groups on them), and
// obvious template placeholders become human-readable launch blockers.

const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// ── Part 29 — placeholder detection ──────────────────────────────────────────
// Scans website PRESENTATION copy only. Canonical Sale descriptions are never
// scanned as website-template placeholders.
const PLACEHOLDER_PATTERNS = [
  { re: /lorem ipsum/i, label: 'Lorem ipsum placeholder text' },
  { re: /^your company$/i, label: '"Your Company" placeholder' },
  { re: /^company name$/i, label: '"Company Name" placeholder' },
  { re: /^sample (testimonial|text|service|question)/i, label: '"Sample" placeholder' },
  { re: /^example (text|testimonial|service|question)/i, label: '"Example" placeholder' },
  { re: /\(555\) ?555-?5555|555-0123|555-0100|555-555-5555/, label: 'Placeholder phone number' },
  { re: /^(your(email|phone|name)|name@|email@)/i, label: 'Placeholder contact details' },
  { re: /\bsynthetic certification content\b/i, label: 'Synthetic certification content' },
  { re: /^coming soon$/i, label: '"Coming soon" placeholder' }
];

function collectTexts(settings) {
  const s = settings || {};
  const out = [];
  const add = (section, label, v) => { if (has(v)) out.push({ section, label, value: String(v) }); };
  add('identity', 'Business name', s.display_business_name);
  add('identity', 'Tagline', s.tagline);
  const c = s.contact || {};
  add('contact', 'Phone', c.phone); add('contact', 'Email', c.email);
  add('contact', 'Address', c.address_display); add('contact', 'Business hours', c.business_hours);
  const h = s.homepage || {};
  add('homepage', 'Hero headline', h.hero_headline); add('homepage', 'Hero subheadline', h.hero_subheadline);
  add('homepage', 'Intro copy', h.intro_copy); add('homepage', 'CTA label', h.cta_label);
  const ab = s.about || {};
  add('about', 'Headline', ab.headline); add('about', 'Body', ab.body); add('about', 'Mission', ab.mission);
  add('about', 'Owner bio', ab.owner_bio); add('about', 'Team intro', ab.team_intro);
  for (const it of (ab.team_members || [])) { add('about', 'Team member name', it && it.name); add('about', 'Team member bio', it && it.bio); }
  const biz = s.business || {};
  add('business', 'Short description', biz.short_description); add('business', 'Long description', biz.long_description);
  add('business', 'Owner name', biz.owner_name); add('business', 'Service area notes', biz.service_area_notes);
  for (const it of ((s.services || {}).items || [])) { add('services', 'Service title', it && it.title); add('services', 'Service description', it && it.description); }
  for (const it of ((s.why_choose_us || {}).items || [])) { add('why_choose_us', 'Value point title', it && it.title); add('why_choose_us', 'Value point description', it && it.description); }
  for (const it of ((s.how_it_works || {}).steps || [])) { add('how_it_works', 'Step title', it && it.title); add('how_it_works', 'Step description', it && it.description); }
  for (const it of ((s.trust || {}).items || [])) { add('trust', 'Trust indicator', it && it.label); }
  for (const it of ((s.testimonials || {}).items || [])) { add('testimonials', 'Testimonial', it && it.quote); }
  for (const it of ((s.faq || {}).items || [])) { add('faq', 'FAQ question', it && it.question); add('faq', 'FAQ answer', it && it.answer); }
  for (const it of ((s.gallery || {}).items || [])) { add('gallery', 'Gallery caption', it && it.caption); }
  for (const it of ((s.policies || {}).items || [])) { add('policies', 'Policy body', it && it.body); }
  add('footer', 'Footer description', (s.footer || {}).description);
  return out;
}

export function detectPlaceholders(settings) {
  const found = [];
  for (const t of collectTexts(settings)) {
    for (const p of PLACEHOLDER_PATTERNS) {
      if (p.re.test(t.value)) {
        found.push({ section: t.section, label: t.label, where: t.label, detail: `${t.label} in "${t.section}" appears to be placeholder content.` });
        break; // one flag per text value
      }
    }
    if (found.length >= 8) break;
  }
  return found;
}

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

  // Services (recommended — at least one enabled service).
  const enabledServices = (Array.isArray(services.items) ? services.items : [])
    .filter(it => it && it.enabled !== false);
  if (enabledServices.length > 0) {
    push('services', 'Services', 10, false, false, 'complete', `${enabledServices.length} service(s) enabled.`);
  } else if (has(services.headline) || has(services.intro) || (services.items || []).length > 0) {
    push('services', 'Services', 10, false, false, 'warning', 'Services section started but no enabled service items yet.');
  } else {
    push('services', 'Services', 10, false, false, 'incomplete', 'No services configured yet.');
  }

  // SEO baseline (recommended).
  if (has(seo.default_title) && has(seo.default_description)) {
    push('seo', 'SEO Baseline', 10, false, false, 'complete', 'Default title and description set.');
  } else if (has(seo.default_title) || has(seo.default_description)) {
    push('seo', 'SEO Baseline', 10, false, false, 'warning', 'SEO baseline partially configured.');
  } else {
    push('seo', 'SEO Baseline', 10, false, false, 'incomplete', 'No default SEO title/description yet.');
  }

  // Branding (recommended — safe defaults exist without it).
  if (has(branding.logo_url) || has(branding.primary_color) || has(branding.design_preset)) {
    push('branding', 'Branding', 10, false, false, 'complete', 'Brand identity present.');
  } else if (Object.values(branding).some(has)) {
    push('branding', 'Branding', 10, false, false, 'warning', 'Branding partially configured.');
  } else {
    push('branding', 'Branding', 10, false, false, 'incomplete', 'No logo or brand colors yet — the template default design will be used.');
  }

  // About (optional).
  if (has(about.body)) push('about', 'About', 5, false, true, 'complete', 'About copy present.');
  else push('about', 'About', 5, false, true, 'optional', 'Optional — About copy not yet written.');

  // Testimonials (optional).
  if (Array.isArray(testimonials.items) && testimonials.items.length > 0) {
    push('testimonials', 'Testimonials', 5, false, true, 'complete', `${testimonials.items.length} testimonial(s).`);
  } else push('testimonials', 'Testimonials', 5, false, true, 'optional', 'Optional — no testimonials yet.');

  // Gallery (optional).
  const galleryItems = ((s.gallery || {}).items) || [];
  if (galleryItems.length > 0) push('gallery', 'Gallery', 5, false, true, 'complete', `${galleryItems.length} gallery item(s).`);
  else push('gallery', 'Gallery', 5, false, true, 'optional', 'Optional — no gallery yet.');

  // Social (optional).
  const socials = Object.values(s.social || {}).filter(has);
  if (socials.length > 0) push('social', 'Social Links', 0, false, true, 'complete', `${socials.length} social profile(s) linked.`);
  else push('social', 'Social Links', 0, false, true, 'optional', 'Optional — no social links yet.');

  // FAQ (optional).
  if (((s.faq || {}).items || []).length > 0) push('faq', 'FAQ', 0, false, true, 'complete', 'FAQ page active.');
  else push('faq', 'FAQ', 0, false, true, 'optional', 'Optional — no FAQ yet.');

  // Policies (optional).
  if (has(legal.privacy_policy_text) || has(legal.terms_text) || ((s.policies || {}).items || []).length > 0) {
    push('legal', 'Policies', 5, false, true, 'complete', 'Policy copy present.');
  } else push('legal', 'Policies', 5, false, true, 'optional', 'Optional — no privacy/terms copy yet.');

  // Custom domain (optional — platform hostname is always included).
  if (customVerified) push('domain', 'Custom Domain', 5, false, true, 'complete', 'Custom domain connected.');
  else if (customDomains.length > 0) push('domain', 'Custom Domain', 5, false, true, 'warning', 'Custom domain reserved but not verified yet.');
  else push('domain', 'Custom Domain', 5, false, true, 'optional', 'Optional — platform hostname is included.');

  // Sales integration (optional — runtime-served destination covers it).
  if (tenant.auto_publish_enabled !== false && destOk) {
    push('sales_integration', 'Estate Sales', 5, false, true, 'complete', 'Canonical sales publish automatically.');
  } else push('sales_integration', 'Estate Sales', 5, false, true, 'optional', 'Optional — sales publishing not enabled.');

  // Part 29 — placeholder content becomes a human-readable blocker.
  const placeholders = detectPlaceholders(s);
  if (placeholders.length > 0) {
    push('content_quality', 'Content Quality', 0, true, false, 'blocking',
      `Placeholder content detected — ${placeholders.slice(0, 3).map(p => p.label).join('; ')}${placeholders.length > 3 ? ` (+${placeholders.length - 3} more)` : ''}.`);
  }

  const totalWeight = sections.reduce((a, x) => a + x.weight, 0);
  const doneWeight = sections.filter((x) => x.status === 'complete').reduce((a, x) => a + x.weight, 0);
  const percent = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;
  const blockers = sections.filter((x) => x.status === 'blocking');

  return {
    percent,
    sections,
    blockers,
    placeholders,
    launch_ready: blockers.length === 0
  };
}