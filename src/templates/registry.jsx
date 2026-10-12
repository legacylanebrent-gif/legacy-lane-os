// Centralized TEMPLATE REGISTRY (Phase 3D.1 + Phase 4B pages).
// Templates are PLATFORM-CONTROLLED code — never tenant-supplied. Tenant
// binding stores only an id + version that resolve HERE. No tenant-specific
// code branches anywhere; future Template #2 registers as a new entry without
// redesign.
import Template1 from './operatorTemplate1/Template1Root.jsx';

export const DEFAULT_TEMPLATE_ID = 'operator_template_1';

export const TEMPLATES = {
  operator_template_1: {
    id: 'operator_template_1',
    name: 'Operator Website Template #1',
    version: 1,
    component: Template1,
    // Settings categories this template consumes (mirrors WebsiteTenantSettings).
    settingsCategories: [
      'identity', 'branding', 'contact', 'social', 'business', 'homepage',
      'why_choose_us', 'how_it_works', 'trust', 'about', 'services', 'gallery',
      'cta', 'seo', 'faq', 'testimonials', 'policies', 'navigation', 'footer',
      'legal', 'sale_display', 'inventory_display'
    ],
    pages: ['home', 'sales', 'sale_detail', 'service_detail', 'about', 'services', 'contact', 'faq', 'gallery', 'legal']
  }
};

export function getTemplate(templateId) {
  if (!templateId) templateId = DEFAULT_TEMPLATE_ID;
  return TEMPLATES[templateId] || null;
}