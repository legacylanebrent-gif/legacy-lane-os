/**
 * Master Feature Catalogue
 * Each feature has:
 *   key       – unique identifier stored in SubscriptionPackage.allowed_features
 *   label     – human-readable name
 *   description – short explanation
 *   page      – (optional) route name in App.jsx if this also unlocks a page
 *   category  – grouping for display
 */

export const FEATURE_CATALOGUE = [
  // ─── Core Sale Management ──────────────────────────────────────────
  {
    key: 'sale_create',
    label: 'Create & Publish Sales',
    description: 'Create draft sales and publish them publicly on the platform.',
    page: 'MySales',
    category: 'Core Sale Management',
  },
  {
    key: 'sale_edit',
    label: 'Edit Sale Details',
    description: 'Edit address, dates, photos, description, and sale type at any time.',
    page: 'SaleEditor',
    category: 'Core Sale Management',
  },
  {
    key: 'sale_contracts',
    label: 'Client Contracts',
    description: 'Generate, send, and store the client estate sale agreement digitally.',
    page: 'SaleContracts',
    category: 'Core Sale Management',
  },
  {
    key: 'sale_tasks',
    label: 'Sale Tasks & Checklists',
    description: 'Create and assign pre-sale and day-of checklists.',
    page: 'SaleTasks',
    category: 'Core Sale Management',
  },
  {
    key: 'sale_statistics',
    label: 'Sale Statistics',
    description: 'View live and post-sale metrics: views, saves, revenue, attendance.',
    page: 'SaleStatistics',
    category: 'Core Sale Management',
  },
  {
    key: 'sale_export',
    label: 'Export Sale Data',
    description: 'Download inventory, revenue, attendance, and contacts as CSV/PDF.',
    page: 'SaleExport',
    category: 'Core Sale Management',
  },
  {
    key: 'sale_signs',
    label: 'Print Directional Signs',
    description: 'Generate print-ready directional signs and stake cards.',
    page: 'PrintSigns',
    category: 'Core Sale Management',
  },
  {
    key: 'early_sign_in',
    label: 'Early Sign-In List',
    description: 'Manage the public early-arrival line list for shoppers.',
    page: 'EarlySignIn',
    category: 'Core Sale Management',
  },
  {
    key: 'sale_attendance',
    label: 'Attendance Tracking',
    description: 'Log attendance by day and time slot.',
    page: 'Attendance',
    category: 'Core Sale Management',
  },

  // ─── Inventory & POS ──────────────────────────────────────────────
  {
    key: 'inventory',
    label: 'Item Inventory',
    description: 'Catalog items with photos, descriptions, and prices.',
    page: 'SaleInventory',
    category: 'Inventory & POS',
  },
  {
    key: 'pos',
    label: 'Point of Sale (POS)',
    description: 'Full POS system — scan items, build carts, accept payments.',
    page: 'ScanAndCart',
    category: 'Inventory & POS',
  },
  {
    key: 'checkout_station',
    label: 'Checkout Station',
    description: 'Dedicated checkout station view for staff.',
    page: 'CheckoutStation',
    category: 'Inventory & POS',
  },
  {
    key: 'ai_pricing',
    label: 'AI Item Pricing (Google Lens)',
    description: 'AI-powered price suggestions based on item photos using Google Lens.',
    category: 'Inventory & POS',
  },
  {
    key: 'sold_inventory',
    label: 'Sold Inventory Tracker',
    description: 'Track and manage items that have sold across all sales.',
    page: 'SoldInventory',
    category: 'Inventory & POS',
  },
  {
    key: 'storage_management',
    label: 'Storage Management',
    description: 'Manage off-site storage locations and contents.',
    page: 'StorageManagement',
    category: 'Inventory & POS',
  },
  {
    key: 'worksheet',
    label: 'Worksheet',
    description: 'Sale-day transaction worksheet for manual recording.',
    page: 'Worksheet',
    category: 'Inventory & POS',
  },

  // ─── Financial & Reporting ─────────────────────────────────────────
  {
    key: 'expenses_mileage',
    label: 'Expenses & Mileage',
    description: 'Log sale-related costs and mileage. Auto-generates P&L summary.',
    category: 'Financial & Reporting',
  },
  {
    key: 'settlement_statement',
    label: 'Settlement Statement',
    description: 'Auto-generate the net payout settlement statement for the estate client.',
    page: 'SettlementStatement',
    category: 'Financial & Reporting',
  },
  {
    key: 'income_tracker',
    label: 'Income Tracker',
    description: 'Track all income streams across sales.',
    page: 'IncomeTracker',
    category: 'Financial & Reporting',
  },
  {
    key: 'business_expenses',
    label: 'Business Expenses',
    description: 'Track overall business expenses separate from individual sales.',
    page: 'MyBusinessExpenses',
    category: 'Financial & Reporting',
  },
  {
    key: 'operator_wallet',
    label: 'Operator Wallet',
    description: 'View and manage your platform wallet, commissions, and payouts.',
    page: 'OperatorWalletDashboard',
    category: 'Financial & Reporting',
  },

  // ─── Marketing & Social ────────────────────────────────────────────
  {
    key: 'social_media_posts',
    label: 'Social Media Campaign Generator',
    description: 'AI-generate tease, reveal, day-of, and results posts for Facebook & Instagram.',
    page: 'SaleMarketingCampaigns',
    category: 'Marketing & Social',
  },
  {
    key: 'social_push',
    label: 'Push Posts to Social Media',
    description: 'Actually publish generated posts to connected Facebook & Instagram accounts.',
    category: 'Marketing & Social',
  },
  {
    key: 'email_campaigns',
    label: 'Email Campaigns',
    description: 'Send email blasts to regional followers and subscribers.',
    category: 'Marketing & Social',
  },
  {
    key: 'sms_campaigns',
    label: 'SMS Campaigns',
    description: 'Send SMS campaigns to opted-in subscribers.',
    category: 'Marketing & Social',
  },
  {
    key: 'facebook_ads',
    label: 'Facebook & Instagram Paid Ads',
    description: 'Launch paid Meta ad campaigns directly from the platform.',
    category: 'Marketing & Social',
  },
  {
    key: 'marketing_dashboard',
    label: 'Marketing Dashboard',
    description: 'View campaign performance, opens, clicks, and ad spend in one place.',
    page: 'OperatorMarketingDashboard',
    category: 'Marketing & Social',
  },
  {
    key: 'content_calendar',
    label: 'Social Content Calendar',
    description: 'Plan and schedule social posts across multiple sales.',
    page: 'ContentCalendar',
    category: 'Marketing & Social',
  },

  // ─── AI & Automation ──────────────────────────────────────────────
  {
    key: 'ai_coach',
    label: 'AI Business Coach',
    description: 'Access the floating AI Coach for real-time business advice and content generation.',
    category: 'AI & Automation',
  },
  {
    key: 'ai_assistant',
    label: 'AI Assistant Chat',
    description: 'Full AI assistant chat interface for extended conversations.',
    page: 'AIAssistant',
    category: 'AI & Automation',
  },
  {
    key: 'ai_seo',
    label: 'AI SEO Content Generation',
    description: 'Auto-generate SEO-optimized descriptions, titles, and structured data for sales.',
    category: 'AI & Automation',
  },
  {
    key: 'ai_social_images',
    label: 'AI-Generated Social Images',
    description: 'Generate custom social media images using AI for each post.',
    category: 'AI & Automation',
  },
  {
    key: 'ai_onboarding',
    label: 'AI Onboarding Recommendations',
    description: 'AI-powered personalized setup recommendations for new operators.',
    category: 'AI & Automation',
  },

  // ─── VIP & Premium Events ──────────────────────────────────────────
  {
    key: 'vip_events',
    label: 'VIP Pre-Sale Events',
    description: 'Host paid or invite-only VIP preview nights with ticketing and RSVPs.',
    page: 'VIPEvent',
    category: 'VIP & Premium Events',
  },
  {
    key: 'buyout',
    label: 'Buyout / Dealer Offers',
    description: 'Record bulk buyout offers from dealers or liquidators.',
    category: 'VIP & Premium Events',
  },

  // ─── SEO & Online Presence ─────────────────────────────────────────
  {
    key: 'seo_boost',
    label: 'SEO Boost',
    description: 'Submit sales to Google indexing and boost search visibility.',
    page: 'SEOBoostDashboard',
    category: 'SEO & Online Presence',
  },
  {
    key: 'operator_profile',
    label: 'Public Company Profile',
    description: 'Publish a public company profile page on EstateSalen.com.',
    page: 'OperatorProfile',
    category: 'SEO & Online Presence',
  },
  {
    key: 'operator_dashboard',
    label: 'Operator Analytics Dashboard',
    description: 'View comprehensive business metrics and performance dashboard.',
    page: 'OperatorDashboard',
    category: 'SEO & Online Presence',
  },

  // ─── Referrals & Partnerships ──────────────────────────────────────
  {
    key: 'referrals',
    label: 'Referral Program',
    description: 'Generate referral links, track referred users, and earn commissions.',
    page: 'ReferralDashboard',
    category: 'Referrals & Partnerships',
  },
  {
    key: 'agent_partnerships',
    label: 'Real Estate Agent Partnerships',
    description: 'Connect with real estate agents for seller referrals.',
    page: 'AgentPartnerships',
    category: 'Referrals & Partnerships',
  },
  {
    key: 'referral_deal_pipeline',
    label: 'Referral Deal Pipeline',
    description: 'Manage and track active referral deals with agents.',
    page: 'ReferralDealPipeline',
    category: 'Referrals & Partnerships',
  },
  {
    key: 'operator_commissions',
    label: 'Commission Tracking',
    description: 'Track and manage earned commissions.',
    page: 'OperatorCommissions',
    category: 'Referrals & Partnerships',
  },

  // ─── Team & Multi-User ─────────────────────────────────────────────
  {
    key: 'team_management',
    label: 'Team Member Management',
    description: 'Invite team members and assign role-based permissions.',
    page: 'ManageTeam',
    category: 'Team & Multi-User',
  },
  {
    key: 'team_task_assignment',
    label: 'Team Task Assignment',
    description: 'Assign sale tasks directly to specific team members.',
    category: 'Team & Multi-User',
  },
  {
    key: 'sale_client_permissions',
    label: 'Client Portal Access',
    description: 'Give estate clients limited access to view their sale data.',
    category: 'Team & Multi-User',
  },

  // ─── Marketplace ──────────────────────────────────────────────────
  {
    key: 'marketplace_listings',
    label: 'Marketplace Listings',
    description: 'List individual items for sale in the public marketplace.',
    page: 'MyListings',
    category: 'Marketplace',
  },
  {
    key: 'marketplace_auctions',
    label: 'Online Auctions',
    description: 'Run timed online auctions for individual items.',
    category: 'Marketplace',
  },
  {
    key: 'ebay_etsy_sync',
    label: 'eBay / Etsy Sync',
    description: 'Cross-post items to eBay and Etsy automatically.',
    category: 'Marketplace',
  },
  {
    key: 'sale_pricing_tool',
    label: 'Sale Pricing Tool',
    description: 'Bulk pricing research tool for pre-sale valuation.',
    page: 'SalePricingTool',
    category: 'Marketplace',
  },
];

// ── All categories in display order ───────────────────────────────────
export const FEATURE_CATEGORIES = [
  'Core Sale Management',
  'Inventory & POS',
  'Financial & Reporting',
  'Marketing & Social',
  'AI & Automation',
  'VIP & Premium Events',
  'SEO & Online Presence',
  'Referrals & Partnerships',
  'Team & Multi-User',
  'Marketplace',
];

// ── Helper: get feature by key ────────────────────────────────────────
export const getFeatureByKey = (key) => FEATURE_CATALOGUE.find(f => f.key === key);

// ── Helper: get all page routes unlocked by a feature list ────────────
export const getPagesForFeatures = (featureKeys) => {
  return FEATURE_CATALOGUE
    .filter(f => featureKeys.includes(f.key) && f.page)
    .map(f => f.page);
};

// ── Starter defaults: core features every operator gets ───────────────
export const STARTER_DEFAULT_FEATURES = [
  'sale_create', 'sale_edit', 'sale_contracts', 'sale_tasks',
  'sale_statistics', 'sale_export', 'sale_signs', 'early_sign_in',
  'sale_attendance', 'inventory', 'operator_profile',
];