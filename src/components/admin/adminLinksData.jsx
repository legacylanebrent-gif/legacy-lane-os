import {
  BarChart2, Rocket, Target, FileText, Settings, Globe, Users, Building2,
  ListChecks,
  Merge, Database, Award, Shield, Briefcase, Search, Upload, Mail,
  MapPin, Network, TrendingUp, Scale, Film, Bot, Zap, Brain, BarChart3,
  DollarSign, Banknote, Megaphone, Package, Share2, Gift, GraduationCap,
  MessageSquare, ShoppingBag
} from 'lucide-react';

// Single source of truth for every admin page link, organized by section.
// Consumed by src/pages/AdminLinks.jsx — the sidebar shows only one
// "Admin Links" entry pointing at that hub page.
export const ADMIN_LINK_SECTIONS = [
  {
    title: '🖥 Command Center',
    links: [
      { page: 'PunchList', label: 'Punch List', icon: ListChecks },
      { page: 'AdminDashboard', label: 'Admin Dashboard', icon: BarChart2 },
      { page: 'LaunchCommandCenter', label: 'Launch Command Center', icon: Rocket },
      { page: 'LaunchAuditCenter', label: 'Launch Audit Center', icon: Target },
      { page: 'AdminBuildReport', label: 'Build Report', icon: FileText },
      { page: 'Settings', label: 'Settings', icon: Settings },
      { page: 'ApiKeyManager', label: 'Website API Keys', icon: Globe },
    ],
  },
  {
    title: '👥 Users & Operators',
    links: [
      { page: 'AdminUsers', label: 'All Users', icon: Users },
      { page: 'AdminFutureOperators', label: 'EstateSales.net Ops', icon: Building2 },
      { page: 'AdminEstatesalesOrg', label: 'EstateSales.org Ops', icon: Building2 },
      { page: 'FutOperLeads', label: 'Future Operator Leads', icon: Merge },
      { page: 'AdminMasterOperatorDirectory', label: 'Master Operator Directory', icon: Database },
      { page: 'AdminRealEstateAgentDirectory', label: 'Real Estate Agent Directory', icon: Database },
      { page: 'AdminAgentApplications', label: 'Agent Applications', icon: Award },
      { page: 'AdminPageAccess', label: 'Page Permissions', icon: Shield },
      { page: 'BizInABox', label: 'Biz in a Box', icon: Briefcase },
    ],
  },
  {
    title: '📋 Leads & CRM',
    links: [
      { page: 'AdminLeads', label: 'All Leads', icon: Award },
      { page: 'AdminLeadsWebsite', label: 'Website Leads', icon: Globe },
      { page: 'AdminLeadsSocialAds', label: 'Social Ads Leads', icon: Share2 },
      { page: 'AdminLeadsPropstream', label: 'Propstream Probate', icon: Search },
      { page: 'PropstreamREListings', label: 'PropStream RE Listings', icon: Building2 },
      { page: 'PropstreamAgentLeads', label: 'Agent Leads', icon: Users },
      { page: 'AdminPropstreamAgentEmailDrafts', label: 'Agent Email Drafts', icon: Mail },
      { page: 'AdminLeadImporter', label: 'Lead Importer', icon: Upload },
      { page: 'AdminCleanoutLeads', label: 'Cleanout Leads', icon: Briefcase },
    ],
  },
  {
    title: '🏠 Sales & Territory',
    links: [
      { page: 'AdminEstateSales', label: 'All Estate Sales', icon: Building2 },
      { page: 'AdminTerritoryDashboard', label: 'Territory Dashboard', icon: MapPin },
      { page: 'NationalCoverageGrid', label: 'National Coverage', icon: Globe },
      { page: 'ImportedSalesDashboard', label: 'EstateSales.net Scraper', icon: Upload },
      { page: 'AdminHousioSync', label: 'Housio Territory Sync', icon: Network },
      { page: 'TerritoryMigrationAudit', label: 'Territory Migration Audit', icon: Database },
    ],
  },
  {
    title: '🔍 SEO & Content',
    links: [
      { page: 'PlatformSEODashboard', label: 'SEO Dashboard (GSC)', icon: TrendingUp },
      { page: 'AdminLifeTransitionEngine', label: 'Life Transition Engine', icon: Globe },
      { page: 'AdminProbateEngine', label: 'Probate SEO Engine', icon: Scale },
      { page: 'AdminContentEngine', label: 'Content Engine', icon: FileText },
      { page: 'AdminPhase12Deploy', label: 'Phase 12 Deploy (NJ)', icon: Rocket },
      { page: 'AdminBlogSelector', label: 'Blog Topic Approval', icon: FileText },
      { page: 'WeeklyVideoIntelligence', label: 'Weekly Video Intel', icon: Film },
    ],
  },
  {
    title: '🤖 Repository & AI',
    links: [
      { page: 'AdminCentralRepository', label: 'Central Repository', icon: Database },
      { page: 'AdminAIOperator', label: 'Admin AI Operator', icon: Bot },
      { page: 'AdminAICredits', label: 'AI Credit Management', icon: Zap },
      { page: 'AutonomousRunsDashboard', label: 'Autonomous Runs', icon: Brain },
      { page: 'PricingImport', label: 'Pricing Import', icon: BarChart3 },
    ],
  },
  {
    title: '🧠 SuperAgents',
    links: [
      { page: 'SuperAgentCommandCenter', label: 'SuperAgent Command Center', icon: Brain },
    ],
  },
  {
    title: '💰 Finance & Revenue',
    links: [
      { page: 'AdminTransactions', label: 'All Transactions', icon: DollarSign },
      { page: 'ActualRevenue', label: 'Actual Revenue', icon: DollarSign },
      { page: 'Revenue', label: 'Revenue Projections', icon: TrendingUp },
      { page: 'ComprehensiveRevenue', label: 'Comprehensive Rev.', icon: BarChart3 },
      { page: 'EstimatedPNL', label: 'Estimated P&L', icon: TrendingUp },
      { page: 'ScalabilityManager', label: 'Scalability Manager', icon: Shield },
      { page: 'FutureOperatorsAnalytics', label: 'Future Ops Revenue', icon: DollarSign },
      { page: 'PlatformExpenses', label: 'Platform Expenses', icon: Banknote },
      { page: 'OperatorPayoutWallet', label: 'Operator Payout Wallet', icon: DollarSign },
    ],
  },
  {
    title: '📣 Marketing & Ads',
    links: [
      { page: 'AdminCampaigns', label: 'Campaigns', icon: Zap },
      { page: 'PlatformAds', label: 'Platform Ads', icon: Megaphone },
      { page: 'AdminAdPlacements', label: 'Ad Placements', icon: Megaphone },
      { page: 'AdminAdvertisingPackages', label: 'Ad Packages', icon: Package },
      { page: 'PlatformAnalytics', label: 'Platform Analytics', icon: BarChart3 },
      { page: 'CustomerIODashboard', label: 'Customer.io Dashboard', icon: Mail },
      { page: 'CustomerIOReportingCenter', label: 'Email Reporting', icon: Mail },
      { page: 'TerritoryFBManager', label: 'Territory FB Manager', icon: Share2 },
    ],
  },
  {
    title: '🚀 Landing Pages',
    links: [
      { page: 'LandingPageSaleLeak', label: 'LP: Sale Leak Quiz', icon: Rocket },
      { page: 'LandingPageProfitLevers', label: 'LP: 5 Profit Levers', icon: Rocket },
      { page: 'LandingPageScaleReady', label: 'LP: Scale Readiness', icon: Rocket },
      { page: 'LandingPageCalculator', label: 'LP: Time & Profit Calc', icon: Rocket },
      { page: 'LandingPageChaosToControl', label: 'LP: Chaos to Control', icon: Rocket },
      { page: 'LandingPageOfferClose', label: 'LP: Offer & Close', icon: Rocket },
      { page: 'LandingPageFitFinder', label: 'LP: Fit Finder Quiz', icon: Rocket },
      { page: 'LandingPageReferralEngine', label: 'LP: Referral Engine', icon: Rocket },
      { page: 'LandingPageAIPlan', label: 'LP: AI Custom Plan', icon: Rocket },
      { page: 'LandingPageRetarget', label: 'LP: Retargeting Page', icon: Rocket },
      { page: 'LandingPageBizInABox', label: 'LP: Own A Division', icon: Rocket },
      { page: 'LandingPageOneDay', label: 'LP: One Day', icon: Rocket },
    ],
  },
  {
    title: '⚙️ Platform Config',
    links: [
      { page: 'AdminPackages', label: 'Subscription Packages', icon: Package },
      { page: 'AdminRewards', label: 'Rewards & Draws', icon: Gift },
      { page: 'AdminCourses', label: 'Courses', icon: GraduationCap },
      { page: 'AdminTemplates', label: 'Templates', icon: FileText },
      { page: 'AdminAutomations', label: 'Automations', icon: Zap },
      { page: 'AdminMarketplace', label: 'Marketplace Items', icon: ShoppingBag },
      { page: 'AdminVendors', label: 'Vendor Ads', icon: Briefcase },
      { page: 'AdminAmazonProducts', label: 'Amazon Products', icon: Package },
      { page: 'AdminTickets', label: 'Support Tickets', icon: MessageSquare },
    ],
  },
];