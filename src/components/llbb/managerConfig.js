// LLBB Website Manager configuration — navigation, panel registry, editor
// field definitions (Phase 4A). Subsequent phases plug in here.
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
  { key: 'seo', label: 'SEO' },
  { key: 'policies', label: 'Policies' },
  { key: 'domain', label: 'Domain' },
  { key: 'preview', label: 'Preview' }
];

// Generic settings editor registry — one reusable editor powers every
// settings-backed panel. sections=null fields sit at the settings root.
export const EDITOR_PANELS = {
  business: {
    title: 'Business Identity',
    description: 'Shown across the website title bar, header and footer. Canonical Company data is seeded automatically; edits here are website presentation only.',
    groups: [
      { section: null, fields: [
        { key: 'site_title', label: 'Site Title', type: 'text' },
        { key: 'display_business_name', label: 'Business Name on Website', type: 'text', required: true },
        { key: 'tagline', label: 'Tagline', type: 'text' }
      ] }
    ]
  },
  branding: {
    title: 'Branding',
    description: 'Logo, colors and fonts used by the website template.',
    groups: [
      { section: 'branding', fields: [
        { key: 'logo_url', label: 'Logo URL', type: 'text', placeholder: 'https://…' },
        { key: 'primary_color', label: 'Primary Color', type: 'color' },
        { key: 'secondary_color', label: 'Secondary Color', type: 'color' },
        { key: 'accent_color', label: 'Accent Color', type: 'color' },
        { key: 'background_color', label: 'Background Color', type: 'color' },
        { key: 'text_color', label: 'Text Color', type: 'color' },
        { key: 'heading_font_family', label: 'Heading Font', type: 'text' },
        { key: 'body_font_family', label: 'Body Font', type: 'text' }
      ] }
    ]
  },
  homepage: {
    title: 'Homepage',
    description: 'Hero and introduction shown on the website home page.',
    groups: [
      { section: 'homepage', fields: [
        { key: 'hero_headline', label: 'Hero Headline', type: 'text', required: true },
        { key: 'hero_subheadline', label: 'Hero Subheadline', type: 'textarea', required: true },
        { key: 'hero_image_url', label: 'Hero Image URL', type: 'text', placeholder: 'https://…' },
        { key: 'intro_copy', label: 'Intro Copy', type: 'textarea' },
        { key: 'cta_label', label: 'CTA Label', type: 'text' },
        { key: 'cta_link', label: 'CTA Link', type: 'text', placeholder: '/site/sales or https://…' }
      ] }
    ]
  },
  about: {
    title: 'About',
    description: 'About page headline and copy (blank-line separated paragraphs).',
    groups: [
      { section: 'about', fields: [
        { key: 'headline', label: 'Headline', type: 'text' },
        { key: 'body', label: 'Body', type: 'textarea', rows: 8 }
      ] }
    ]
  },
  services: {
    title: 'Services',
    description: 'Services shown on the website services page.',
    groups: [
      { section: 'services', fields: [
        { key: 'headline', label: 'Headline', type: 'text' },
        { key: 'intro', label: 'Intro', type: 'textarea' }
      ], itemFields: [
        { key: 'title', label: 'Service Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' }
      ] }
    ]
  },
  testimonials: {
    title: 'Testimonials',
    description: 'Client testimonials shown on the website.',
    groups: [
      { section: 'testimonials', fields: [
        { key: 'headline', label: 'Headline', type: 'text' }
      ], itemFields: [
        { key: 'quote', label: 'Quote', type: 'textarea' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'context', label: 'Context', type: 'text' }
      ] }
    ]
  },
  contact_social: {
    title: 'Contact & Social',
    description: 'Contact presentation and social profile links.',
    groups: [
      { section: 'contact', fields: [
        { key: 'use_company_phone', label: 'Use Company Phone', type: 'bool' },
        { key: 'phone_display', label: 'Phone Override (when not using company phone)', type: 'text' },
        { key: 'use_company_email', label: 'Use Company Email', type: 'bool' },
        { key: 'email_display', label: 'Email Override (when not using company email)', type: 'text' },
        { key: 'address_display', label: 'Address Display', type: 'text', placeholder: 'City, State' },
        { key: 'contact_cta_label', label: 'Contact CTA Label', type: 'text' }
      ] },
      { section: 'social', fields: [
        { key: 'facebook', label: 'Facebook URL', type: 'text' },
        { key: 'instagram', label: 'Instagram URL', type: 'text' },
        { key: 'twitter', label: 'X / Twitter URL', type: 'text' },
        { key: 'youtube', label: 'YouTube URL', type: 'text' },
        { key: 'pinterest', label: 'Pinterest URL', type: 'text' }
      ] }
    ]
  },
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
  },
  policies: {
    title: 'Policies',
    description: 'Privacy policy and terms copy shown on the website legal page.',
    groups: [
      { section: 'legal', fields: [
        { key: 'privacy_policy_text', label: 'Privacy Policy', type: 'textarea', rows: 8 },
        { key: 'terms_text', label: 'Terms of Service', type: 'textarea', rows: 8 }
      ] }
    ]
  }
};