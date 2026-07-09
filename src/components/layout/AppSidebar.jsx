import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard, Home, User, Users, Building2, ShoppingBag, Package,
  TrendingUp, DollarSign, Megaphone, GraduationCap, BarChart3, MapPin,
  Star, Heart, MessageSquare, FileText, Bell, Shield, Settings, Menu, X,
  ChevronDown, ChevronRight, LogOut, HandCoins, Zap, Briefcase, Award, Gift, Globe,
  UserPlus, Sparkles, Upload, Warehouse, QrCode, Rocket, Brain, Merge, BarChart2, Film,
  Scale, Database, AlertTriangle, Target, Search, GitBranch, Mail, Share2,
  Wrench, Eye, Building, Network, Banknote, Bot, Image, Calendar, Trash2
} from 'lucide-react';

// ─── Master Nav Item List ─────────────────────────────────────────────────────
// group = top-level section label shown in sidebar
// subgroup = collapsible sub-section within an admin group (optional)
export const ALL_NAV_ITEMS = [

  // ── MAIN ────────────────────────────────────────────────────────────────────
  { page: 'Dashboard',              label: 'Dashboard',              icon: LayoutDashboard, group: 'Main' },
  { page: 'MyProfile',              label: 'My Profile',             icon: User,            group: 'Main' },

  // ── AGENT + OWNER (combined role) ────────────────────────────────────────────
  { page: 'OperatorDashboard',      label: 'Owner Dashboard',        icon: BarChart2,       group: 'Agent + Owner' },
  { page: 'AgentDashboard',         label: 'Agent Dashboard',        icon: Award,           group: 'Agent + Owner' },
  { page: 'ReferralDealPipeline',   label: 'Referral Pipeline',      icon: GitBranch,       group: 'Agent + Owner' },
  { page: 'OperatorCommissions',    label: 'Commissions',            icon: DollarSign,      group: 'Agent + Owner' },
  { page: 'AgentOperatorPortal',    label: 'Owner Partnerships',     icon: Briefcase,       group: 'Agent + Owner' },
  { page: 'AgentPartnerships',      label: 'Agent Partnerships',     icon: Users,           group: 'Agent + Owner' },

  // ── ESTATE SALES (operator-facing) ──────────────────────────────────────────
  { page: 'MySales',                label: 'My Sales',               icon: Building2,       group: 'Estate Sales' },
  { page: 'CleanoutEditor',         label: 'My Cleanouts',           icon: Trash2,          group: 'Estate Sales' },
  { page: 'DonationEditor',         label: 'My Donations',           icon: Heart,           group: 'Estate Sales' },
  { page: 'ManageTeam',             label: 'Manage Team',            icon: UserPlus,        group: 'Estate Sales' },
  { page: 'Inventory',              label: 'My Inventory',            icon: Package,         group: 'Estate Sales' },
  { page: 'StorageManagement',      label: 'Storage Management',     icon: Warehouse,       group: 'Estate Sales' },
  { page: 'MyListings',             label: 'Marketplace Listings',   icon: ShoppingBag,     group: 'Estate Sales' },
  { page: 'Buyouts',                label: 'Buyouts',                icon: HandCoins,       group: 'Estate Sales' },

  // ── CRM & LEADS ─────────────────────────────────────────────────────────────
  { page: 'CRM',                    label: 'CRM',                    icon: Users,           group: 'CRM & Leads' },
  { page: 'Leads',                  label: 'Lead Center',            icon: Award,           group: 'CRM & Leads' },
  { page: 'SaleConversionPipeline', label: 'Sale Pipeline',          icon: TrendingUp,      group: 'CRM & Leads' },

  // ── MARKETING ───────────────────────────────────────────────────────────────
  { page: 'MarketingTasks',         label: 'Marketing Tasks',        icon: Megaphone,       group: 'Marketing' },
  { page: 'CampaignBuilder',        label: 'Campaign Builder',       icon: Zap,             group: 'Marketing' },
  { page: 'Campaigns',              label: 'Campaigns',              icon: Megaphone,       group: 'Marketing' },
  { page: 'Analytics',              label: 'Analytics',              icon: BarChart3,       group: 'Marketing' },
  { page: 'SocialAdsHub',           label: 'Social Ads Hub',         icon: Megaphone,       group: 'Marketing' },

  // ── EDUCATION ───────────────────────────────────────────────────────────────
  { page: 'Courses',                label: 'Browse Courses',         icon: GraduationCap,   group: 'Education' },
  { page: 'MyCourses',              label: 'My Courses',             icon: GraduationCap,   group: 'Education' },
  { page: 'TrainingBlog',           label: 'Training Blog',           icon: FileText,        group: 'Education' },

  // ── FINANCE ─────────────────────────────────────────────────────────────────
  { page: 'IncomeTracker',          label: 'Income Tracker',         icon: TrendingUp,      group: 'Finance' },
  { page: 'MyBusinessExpenses',     label: 'Business Expenses',      icon: FileText,        group: 'Finance' },
  { page: 'AIAssistant',            label: 'AI Assistant',           icon: Sparkles,        group: 'Finance' },

  // ── RESELLER ──────────────────────────────────────────────────────────────────
  { page: 'ResellerDashboard',      label: 'My Dashboard',           icon: LayoutDashboard, group: 'Reseller' },
  { page: 'MyResellerLeads',        label: 'My Leads',               icon: Award,           group: 'Reseller' },
  { page: 'Inventory',              label: 'My Inventory',           icon: Package,         group: 'Reseller' },
  { page: 'ResellerPackupEvents',   label: 'Packup Events',          icon: Calendar,        group: 'Reseller' },

  // ── DIRECTORY ───────────────────────────────────────────────────────────────
  { page: 'Vendors',                label: 'Vendors',                icon: Briefcase,       group: 'Directory' },
  { page: 'EstateSaleFinder',       label: 'Find Estate Sales',      icon: MapPin,          group: 'Directory' },

  // ══════════════════════════════════════════════════════════════════════
  // ADMIN — broken into subgroups for easy navigation
  // ══════════════════════════════════════════════════════════════════════

  // Admin › Command Center
  { page: 'AdminDashboard',         label: 'Admin Dashboard',        icon: BarChart2,       group: 'Admin', subgroup: '🖥 Command Center' },
  { page: 'LaunchCommandCenter',    label: '🚨 Launch Command Center', icon: Rocket,         group: 'Admin', subgroup: '🖥 Command Center' },
  { page: 'LaunchAuditCenter',      label: '🎯 Launch Audit Center',  icon: Target,          group: 'Admin', subgroup: '🖥 Command Center' },
  { page: 'AdminBuildReport',       label: 'Build Report',           icon: FileText,        group: 'Admin', subgroup: '🖥 Command Center' },
  { page: 'Settings',               label: 'Settings',               icon: Settings,        group: 'Admin', subgroup: '🖥 Command Center' },
  { page: 'ApiKeyManager',          label: 'Website API Keys',       icon: Globe,           group: 'Admin', subgroup: '🖥 Command Center' },

  // Admin › Users & Operators
  { page: 'AdminUsers',             label: 'All Users',              icon: Users,           group: 'Admin', subgroup: '👥 Users & Operators' },
  { page: 'AdminFutureOperators',   label: 'EstateSales.net Ops',    icon: Building2,       group: 'Admin', subgroup: '👥 Users & Operators' },
  { page: 'AdminEstatesalesOrg',    label: 'EstateSales.org Ops',    icon: Building2,       group: 'Admin', subgroup: '👥 Users & Operators' },
  { page: 'FutOperLeads',           label: 'Future Operator Leads',  icon: Merge,           group: 'Admin', subgroup: '👥 Users & Operators' },
  { page: 'AdminMasterOperatorDirectory', label: 'Master Operator Directory', icon: Database,  group: 'Admin', subgroup: '👥 Users & Operators' },
  { page: 'AdminRealEstateAgentDirectory', label: 'Real Estate Agent Directory', icon: Database,  group: 'Admin', subgroup: '👥 Users & Operators' },
  { page: 'AdminAgentApplications', label: 'Agent Applications',     icon: Award,           group: 'Admin', subgroup: '👥 Users & Operators' },
  { page: 'AdminPageAccess',        label: 'Page Permissions',       icon: Shield,          group: 'Admin', subgroup: '👥 Users & Operators' },
  { page: 'BizInABox',              label: 'Biz in a Box',           icon: Briefcase,       group: 'Admin', subgroup: '👥 Users & Operators' },

  // Admin › Leads & CRM
  { page: 'AdminLeads',             label: 'All Leads',              icon: Award,           group: 'Admin', subgroup: '📋 Leads & CRM' },
  { page: 'AdminLeadsWebsite',      label: 'Website Leads',          icon: Globe,           group: 'Admin', subgroup: '📋 Leads & CRM' },
  { page: 'AdminLeadsSocialAds',    label: 'Social Ads Leads',       icon: Share2,          group: 'Admin', subgroup: '📋 Leads & CRM' },
  { page: 'AdminLeadsPropstream',   label: 'Propstream Probate',     icon: Search,          group: 'Admin', subgroup: '📋 Leads & CRM' },
  { page: 'PropstreamREListings',   label: 'PropStream RE Listings', icon: Building2,       group: 'Admin', subgroup: '📋 Leads & CRM' },
  { page: 'PropstreamAgentLeads',   label: 'Agent Leads',            icon: Users,           group: 'Admin', subgroup: '📋 Leads & CRM' },
  { page: 'AdminPropstreamAgentEmailDrafts', label: 'Agent Email Drafts', icon: Mail,            group: 'Admin', subgroup: '📋 Leads & CRM' },
  { page: 'AdminLeadImporter',      label: 'Lead Importer',          icon: Upload,          group: 'Admin', subgroup: '📋 Leads & CRM' },
  { page: 'AdminCleanoutLeads',     label: 'Cleanout Leads',         icon: Briefcase,       group: 'Admin', subgroup: '📋 Leads & CRM' },

  // Admin › Estate Sales & Territory
  { page: 'AdminEstateSales',       label: 'All Estate Sales',       icon: Building2,       group: 'Admin', subgroup: '🏠 Sales & Territory' },
  { page: 'AdminTerritoryDashboard', label: 'Territory Dashboard',   icon: MapPin,          group: 'Admin', subgroup: '🏠 Sales & Territory' },
  { page: 'NationalCoverageGrid',   label: 'National Coverage',      icon: Globe,           group: 'Admin', subgroup: '🏠 Sales & Territory' },
  { page: 'ImportedSalesDashboard', label: 'EstateSales.net Scraper', icon: Upload,         group: 'Admin', subgroup: '🏠 Sales & Territory' },
  { page: 'AdminHousioSync',        label: 'Housio Territory Sync',  icon: Network,         group: 'Admin', subgroup: '🏠 Sales & Territory' },
  { page: 'TerritoryMigrationAudit', label: 'Territory Migration Audit', icon: Database,      group: 'Admin', subgroup: '🏠 Sales & Territory' },

  // Admin › SEO & Content
  { page: 'PlatformSEODashboard',   label: 'SEO Dashboard (GSC)',    icon: TrendingUp,      group: 'Admin', subgroup: '🔍 SEO & Content' },
  { page: 'AdminLifeTransitionEngine', label: 'Life Transition Engine', icon: Globe,        group: 'Admin', subgroup: '🔍 SEO & Content' },
  { page: 'AdminProbateEngine',     label: 'Probate SEO Engine',     icon: Scale,           group: 'Admin', subgroup: '🔍 SEO & Content' },
  { page: 'AdminContentEngine',     label: 'Content Engine',         icon: FileText,        group: 'Admin', subgroup: '🔍 SEO & Content' },
  { page: 'AdminPhase12Deploy',     label: 'Phase 12 Deploy (NJ)',   icon: Rocket,          group: 'Admin', subgroup: '🔍 SEO & Content' },
  { page: 'AdminBlogSelector',       label: 'Blog Topic Approval',    icon: FileText,        group: 'Admin', subgroup: '🔍 SEO & Content' },
  { page: 'WeeklyVideoIntelligence', label: 'Weekly Video Intel',    icon: Film,            group: 'Admin', subgroup: '🔍 SEO & Content' },

  // Admin › Repository & AI
  { page: 'AdminCentralRepository', label: 'Central Repository',    icon: Database,        group: 'Admin', subgroup: '🤖 Repository & AI' },
  { page: 'AdminAIOperator',        label: 'Admin AI Operator',      icon: Bot,             group: 'Admin', subgroup: '🤖 Repository & AI' },
  { page: 'AdminAICredits',         label: 'AI Credit Management',   icon: Zap,             group: 'Admin', subgroup: '🤖 Repository & AI' },
  { page: 'AutonomousRunsDashboard', label: 'Autonomous Runs',       icon: Brain,           group: 'Admin', subgroup: '🤖 Repository & AI' },
  { page: 'PricingImport',          label: 'Pricing Import',         icon: BarChart3,       group: 'Admin', subgroup: '🤖 Repository & AI' },

  // Admin › SuperAgents
  { page: 'SuperAgentCommandCenter', label: 'SuperAgent Command Center', icon: Brain,       group: 'Admin', subgroup: '🧠 SuperAgents' },

  // Admin › Finance & Revenue
  { page: 'AdminTransactions',      label: 'All Transactions',       icon: DollarSign,      group: 'Admin', subgroup: '💰 Finance & Revenue' },
  { page: 'ActualRevenue',          label: 'Actual Revenue',         icon: DollarSign,      group: 'Admin', subgroup: '💰 Finance & Revenue' },
  { page: 'Revenue',                label: 'Revenue Projections',    icon: TrendingUp,      group: 'Admin', subgroup: '💰 Finance & Revenue' },
  { page: 'ComprehensiveRevenue',   label: 'Comprehensive Rev.',     icon: BarChart3,       group: 'Admin', subgroup: '💰 Finance & Revenue' },
  { page: 'EstimatedPNL',          label: 'Estimated P&L',          icon: TrendingUp,      group: 'Admin', subgroup: '💰 Finance & Revenue' },
  { page: 'ScalabilityManager',   label: 'Scalability Manager',    icon: Shield,          group: 'Admin', subgroup: '💰 Finance & Revenue' },
  { page: 'FutureOperatorsAnalytics', label: 'Future Ops Revenue',   icon: DollarSign,      group: 'Admin', subgroup: '💰 Finance & Revenue' },
  { page: 'PlatformExpenses',       label: 'Platform Expenses',      icon: Banknote,        group: 'Admin', subgroup: '💰 Finance & Revenue' },
  { page: 'OperatorPayoutWallet', label: 'Operator Payout Wallet',  icon: DollarSign,      group: 'Admin', subgroup: '💰 Finance & Revenue' },

  // Admin › Marketing & Ads
  { page: 'AdminCampaigns',         label: 'Campaigns',              icon: Zap,             group: 'Admin', subgroup: '📣 Marketing & Ads' },
  { page: 'PlatformAds',            label: 'Platform Ads',           icon: Megaphone,       group: 'Admin', subgroup: '📣 Marketing & Ads' },
  { page: 'AdminAdPlacements',      label: 'Ad Placements',          icon: Megaphone,       group: 'Admin', subgroup: '📣 Marketing & Ads' },
  { page: 'AdminAdvertisingPackages', label: 'Ad Packages',          icon: Package,         group: 'Admin', subgroup: '📣 Marketing & Ads' },
  { page: 'PlatformAnalytics',      label: 'Platform Analytics',     icon: BarChart3,       group: 'Admin', subgroup: '📣 Marketing & Ads' },
  { page: 'CustomerIODashboard',    label: 'Customer.io Dashboard',  icon: Mail,            group: 'Admin', subgroup: '📣 Marketing & Ads' },
  { page: 'CustomerIOReportingCenter', label: 'Email Reporting',     icon: Mail,            group: 'Admin', subgroup: '📣 Marketing & Ads' },
  { page: 'TerritoryFBManager',     label: 'Territory FB Manager',   icon: Share2,          group: 'Admin', subgroup: '📣 Marketing & Ads' },

  // Admin › Platform Config
  { page: 'AdminPackages',          label: 'Subscription Packages',  icon: Package,         group: 'Admin', subgroup: '⚙️ Platform Config' },
  { page: 'AdminRewards',           label: 'Rewards & Draws',        icon: Gift,            group: 'Admin', subgroup: '⚙️ Platform Config' },
  { page: 'AdminCourses',           label: 'Courses',                icon: GraduationCap,   group: 'Admin', subgroup: '⚙️ Platform Config' },
  { page: 'AdminTemplates',         label: 'Templates',              icon: FileText,        group: 'Admin', subgroup: '⚙️ Platform Config' },
  { page: 'AdminAutomations',       label: 'Automations',            icon: Zap,             group: 'Admin', subgroup: '⚙️ Platform Config' },
  { page: 'AdminMarketplace',       label: 'Marketplace Items',      icon: ShoppingBag,     group: 'Admin', subgroup: '⚙️ Platform Config' },
  { page: 'AdminVendors',           label: 'Vendor Ads',             icon: Briefcase,       group: 'Admin', subgroup: '⚙️ Platform Config' },
  { page: 'AdminAmazonProducts',    label: 'Amazon Products',        icon: Package,         group: 'Admin', subgroup: '⚙️ Platform Config' },
  { page: 'AdminTickets',           label: 'Support Tickets',        icon: MessageSquare,   group: 'Admin', subgroup: '⚙️ Platform Config' },

  // ── LANDING PAGES ────────────────────────────────────────────────────────────
  { page: 'LandingPageSaleLeak',       label: 'LP: Sale Leak Quiz',     icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageProfitLevers',   label: 'LP: 5 Profit Levers',    icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageScaleReady',     label: 'LP: Scale Readiness',    icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageCalculator',     label: 'LP: Time & Profit Calc', icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageChaosToControl', label: 'LP: Chaos to Control',   icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageOfferClose',     label: 'LP: Offer & Close',      icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageFitFinder',      label: 'LP: Fit Finder Quiz',    icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageReferralEngine', label: 'LP: Referral Engine',    icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageAIPlan',         label: 'LP: AI Custom Plan',     icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageRetarget',       label: 'LP: Retargeting Page',   icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageBizInABox',      label: 'LP: Own A Division',     icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageOneDay',         label: 'LP: One Day',            icon: Rocket, group: 'Landing Pages' },
];

// Subgroup ordering within Admin
const ADMIN_SUBGROUP_ORDER = [
  '🖥 Command Center',
  '👥 Users & Operators',
  '📋 Leads & CRM',
  '🏠 Sales & Territory',
  '🔍 SEO & Content',
  '🤖 Repository & AI',
  '🧠 SuperAgents',
  '💰 Finance & Revenue',
  '📣 Marketing & Ads',
  '⚙️ Platform Config',
];

const TOP_GROUP_ORDER = ['Main', 'Estate Sales', 'CRM & Leads', 'Marketing', 'Finance', 'Education', 'Reseller', 'Agent + Owner', 'Directory', 'Admin', 'Landing Pages'];

// ─── Collapsible subgroup component ──────────────────────────────────────────
function SubGroup({ label, items, currentPageName, defaultOpen }) {
  const hasActive = items.some(i => i.page === currentPageName);
  const [open, setOpen] = useState(defaultOpen || hasActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-slate-700/50 transition-colors group"
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-300">{label}</span>
        {open
          ? <ChevronDown className="w-3 h-3 text-slate-500" />
          : <ChevronRight className="w-3 h-3 text-slate-500" />
        }
      </button>
      {open && items.map(item => <NavItem key={item.page} item={item} currentPageName={currentPageName} />)}
    </div>
  );
}

function NavItem({ item, currentPageName }) {
  const Icon = item.icon;
  const active = currentPageName === item.page;
  return (
    <Link to={createPageUrl(item.page)}>
      <Button
        variant="ghost"
        className={`w-full justify-start rounded-none px-4 h-9 text-sm ${
          active
            ? 'bg-orange-600 text-white hover:bg-orange-700'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
      >
        <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
      </Button>
    </Link>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
// Marketing pages that require Elite tier (Professional only sees Marketing Tasks)
const ELITE_ONLY_MARKETING_PAGES = new Set(['CampaignBuilder', 'Campaigns', 'Analytics', 'SocialAdsHub']);
const ADMIN_ROLES_SIDEBAR = ['super_admin', 'platform_ops', 'admin', 'support_agent', 'marketing_ops', 'data_analyst'];

export default function AppSidebar({ user, currentPageName, allowedPages }) {
  const [open, setOpen] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState(null);

  useEffect(() => {
    const fetchTier = async () => {
      if (!user) return;
      if (ADMIN_ROLES_SIDEBAR.includes(user.primary_account_type) || user.role === 'admin') {
        setSubscriptionTier('admin');
        return;
      }
      try {
        const subs = await base44.entities.Subscription.filter({ user_id: user.id, status: 'active' });
        setSubscriptionTier(subs.length > 0 ? subs[0].tier : null);
      } catch {
        setSubscriptionTier(null);
      }
    };
    fetchTier();
  }, [user]);

  const handleLogout = () => base44.auth.logout(createPageUrl('Home'));

  const visibleItems = ALL_NAV_ITEMS.filter(item => {
    if (!allowedPages.includes(item.page)) return false;
    // Gate Elite-only marketing pages for Professional tier
    if (ELITE_ONLY_MARKETING_PAGES.has(item.page)) {
      if (subscriptionTier !== 'admin' && subscriptionTier !== 'elite') return false;
    }
    return true;
  });

  // Group all items by top-level group
  const grouped = visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <>
      {!open && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-2 z-50 bg-slate-800 text-orange-400 hover:text-orange-300 hover:bg-slate-700 shadow-lg"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <aside className={`bg-slate-800 text-white flex flex-col transition-all duration-300 overflow-hidden flex-shrink-0 h-screen sticky top-0 ${open ? 'w-64' : 'w-0'}`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img
              src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png"
              alt="logo"
              className="h-8 w-8 object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-serif font-bold text-white leading-tight truncate">EstateSalen.com</p>
              <p className="text-xs text-orange-400 leading-tight truncate">
                {user?.primary_account_type?.replace(/_/g, ' ') || 'User'}
              </p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white h-8 w-8 flex-shrink-0" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          {TOP_GROUP_ORDER.map(group => {
            const items = grouped[group];
            if (!items || items.length === 0) return null;

            // Admin group: render collapsible subgroups
            if (group === 'Admin') {
              // gather subgroup → items
              const subgrouped = {};
              const noSubgroup = [];
              items.forEach(item => {
                if (item.subgroup) {
                  if (!subgrouped[item.subgroup]) subgrouped[item.subgroup] = [];
                  subgrouped[item.subgroup].push(item);
                } else {
                  noSubgroup.push(item);
                }
              });

              return (
                <div key={group}>
                  <p className="px-4 text-xs font-bold text-orange-400 uppercase tracking-widest mb-1 mt-1">Admin</p>
                  {ADMIN_SUBGROUP_ORDER.map(sg => {
                    const sgItems = subgrouped[sg];
                    if (!sgItems || sgItems.length === 0) return null;
                    const isCommandCenter = sg === '🖥 Command Center';
                    return (
                      <SubGroup
                        key={sg}
                        label={sg}
                        items={sgItems}
                        currentPageName={currentPageName}
                        defaultOpen={isCommandCenter}
                      />
                    );
                  })}
                  {noSubgroup.map(item => <NavItem key={item.page} item={item} currentPageName={currentPageName} />)}
                </div>
              );
            }

            // All other groups: flat list
            return (
              <div key={group}>
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{group}</p>
                {items.map(item => <NavItem key={item.page} item={item} currentPageName={currentPageName} />)}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700 p-3 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white px-2 h-auto py-2">
                <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                  <AvatarImage src={user?.profile_image_url} />
                  <AvatarFallback className="bg-orange-600 text-white text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left flex-1">
                  <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 flex-shrink-0 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={createPageUrl('MyProfile')}>
                  <User className="w-4 h-4 mr-2" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}