// Centralized TEMPLATE REGISTRY (Phase 3D.1 — Parts 5/6/7).
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
      'identity', 'branding', 'contact', 'social', 'homepage', 'about',
      'services', 'cta', 'seo', 'faq', 'legal', 'sale_display', 'inventory_display'
    ],
    pages: ['home', 'sales', 'sale_detail', 'about', 'services', 'contact', 'faq', 'legal']
  }
};

export function getTemplate(templateId) {
  if (!templateId) templateId = DEFAULT_TEMPLATE_ID;
  return TEMPLATES[templateId] || null;
}