// LLBB Website Manager configuration (Phase 4B). Section editors are
// dedicated components; only the SEO panel remains on the generic editor.
export const WORKFLOW_LABELS = {
  draft: 'Draft',
  setup_in_progress: 'Setup In Progress',
  ready_for_review: 'Ready for Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  live: 'Live',
  suspended: 'Suspended',
  archived: 'Archived'
};

export const WORKFLOW_BADGE = {
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  setup_in_progress: 'bg-amber-100 text-amber-800 border border-amber-200',
  ready_for_review: 'bg-blue-100 text-blue-800 border border-blue-200',
  changes_requested: 'bg-orange-100 text-orange-800 border border-orange-200',
  approved: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  live: 'bg-green-100 text-green-800 border border-green-200',
  suspended: 'bg-red-100 text-red-700 border border-red-200',
  archived: 'bg-slate-200 text-slate-600 border border-slate-300'
};

export const ALERT_LABELS = {
  waiting_for_client: 'Waiting for Client',
  waiting_for_review: 'Waiting for Review',
  domain_action_required: 'Domain Action Required',
  setup_incomplete: 'Setup Incomplete',
  publication_problem: 'Publication Problem',
  site_suspended: 'Site Suspended'
};

export const TRANSITION_LABELS = {
  setup_in_progress: 'Start Setup',
  ready_for_review: 'Submit for Review',
  approved: 'Approve',
  live: 'Go Live',
  changes_requested: 'Request Changes',
  suspended: 'Suspend',
  archived: 'Archive'
};

export const MANAGEMENT_MODE_LABELS = {
  admin_managed: 'Admin Managed',
  client_managed: 'Client Managed',
  collaborative: 'Collaborative'
};

export const MANAGER_NAV = [
  { key: 'overview', label: 'Overview' },
  { key: 'business', label: 'Business' },
  { key: 'branding', label: 'Branding' },
  { key: 'homepage', label: 'Homepage' },
  { key: 'about', label: 'About' },
  { key: 'services', label: 'Services' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'contact_social', label: 'Contact & Social' },
  { key: 'estate_sales', label: 'Estate Sales' },
  { key: 'faq', label: 'FAQ' },
  { key: 'policies', label: 'Policies' },
  { key: 'seo', label: 'SEO' },
  { key: 'navigation', label: 'Navigation & Footer' },
  { key: 'domain', label: 'Domain' },
  { key: 'preview', label: 'Preview' }
];

// Readiness section key → studio nav tab (Overview deep links, Part 2).
export const READINESS_SECTION_TABS = {
  business: 'business', homepage: 'homepage', contact: 'contact_social',
  runtime: 'domain', services: 'services', seo: 'seo', branding: 'branding',
  about: 'about', testimonials: 'testimonials', gallery: 'gallery',
  social: 'contact_social', faq: 'faq', legal: 'policies', domain: 'domain',
  sales_integration: 'estate_sales', content_quality: 'homepage'
};

// Generic settings editor registry — SEO only in Phase 4B; every other panel
// has a dedicated structured editor.
export const EDITOR_PANELS = {
  seo: {
    title: 'SEO',
    description: 'Default SEO title, description and social image.',
    groups: [
      { section: 'seo', fields: [
        { key: 'default_title', label: 'Default Title', type: 'text' },
        { key: 'default_description', label: 'Default Description', type: 'textarea' },
        { key: 'social_image_url', label: 'Social Image URL', type: 'text' }
      ] }
    ]
  }
};