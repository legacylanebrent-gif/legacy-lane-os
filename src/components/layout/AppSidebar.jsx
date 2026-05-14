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
  ChevronDown, LogOut, HandCoins, Zap, Briefcase, Award, Gift, Globe,
  UserPlus, Sparkles, Upload, Warehouse, QrCode, Rocket, Brain
} from 'lucide-react';

// Master list of ALL nav items with the page name as the key
export const ALL_NAV_ITEMS = [
  { page: 'Dashboard',              label: 'Dashboard',           icon: LayoutDashboard, group: 'Main' },
  { page: 'ConsumerHome',           label: 'Consumer Profile',    icon: Home,            group: 'Main' },
  { page: 'MyProfile',              label: 'Business Profile',    icon: User,            group: 'Main' },
  { page: 'Notifications',          label: 'Notifications',       icon: Bell,            group: 'Main' },
  { page: 'Messages',               label: 'Messages',            icon: MessageSquare,   group: 'Main' },
  { page: 'BrowseItems',            label: 'Marketplace',         icon: ShoppingBag,     group: 'Main' },
  { page: 'Settings',               label: 'Settings',            icon: Settings,        group: 'Admin' },

  { page: 'MySales',                label: 'My Sales',            icon: Building2,       group: 'Estate Sales' },
  { page: 'ManageTeam',             label: 'Manage Team',         icon: UserPlus,        group: 'Estate Sales' },
  { page: 'Inventory',              label: 'Inventory',           icon: Package,         group: 'Estate Sales' },
  { page: 'StorageManagement',      label: 'Storage Management',  icon: Warehouse,       group: 'Estate Sales' },
  { page: 'Buyouts',                label: 'Buyouts',             icon: HandCoins,       group: 'Estate Sales' },
  { page: 'ApiKeyManager',          label: 'Website API',         icon: Globe,           group: 'Admin' },

  { page: 'MyListings',             label: 'Marketplace Listings', icon: ShoppingBag,     group: 'Estate Sales' },

  { page: 'CRM',                    label: 'CRM',                 icon: Users,           group: 'CRM & Leads' },
  { page: 'Leads',                  label: 'Lead Center',         icon: Award,           group: 'CRM & Leads' },
  { page: 'SaleConversionPipeline', label: 'Sale Pipeline',       icon: TrendingUp,      group: 'CRM & Leads' },
  { page: 'AgentOperatorPortal',   label: 'Operator Partnerships', icon: Briefcase,       group: 'CRM & Leads' },

  { page: 'Campaigns',              label: 'Campaigns',           icon: Megaphone,       group: 'Marketing' },
  { page: 'MarketingTasks',         label: 'Marketing Tasks',     icon: Megaphone,       group: 'Marketing' },
  { page: 'CampaignBuilder',        label: 'Campaign Builder',    icon: Zap,             group: 'Marketing' },
  { page: 'Analytics',              label: 'Analytics',           icon: BarChart3,       group: 'Marketing' },

  { page: 'Courses',                label: 'Browse Courses',      icon: GraduationCap,   group: 'Education' },
  { page: 'MyCourses',              label: 'My Courses',          icon: GraduationCap,   group: 'Education' },

  { page: 'IncomeTracker',          label: 'Income Tracker',      icon: TrendingUp,      group: 'Finance' },
  { page: 'MyBusinessExpenses',     label: 'Business Expenses',   icon: FileText,        group: 'Finance' },
  { page: 'AIAssistant',            label: 'AI Assistant',         icon: Sparkles,        group: 'Finance' },
  { page: 'SocialAdsHub',           label: 'Social Ads Hub',       icon: Megaphone,       group: 'Marketing' },

  { page: 'RewardsCheckins',        label: 'Check-ins',           icon: MapPin,          group: 'Consumer' },
  { page: 'Favorites',              label: 'Favorites',           icon: Heart,           group: 'Consumer' },
  { page: 'MyRewards',              label: 'My Rewards',          icon: Star,            group: 'Consumer' },
  { page: 'MyReferrals',            label: 'My Referrals',        icon: Users,           group: 'Consumer' },
  { page: 'MyTickets',              label: 'Support',             icon: MessageSquare,   group: 'Consumer' },

  { page: 'Vendors',                label: 'Vendors',             icon: Briefcase,       group: 'Directory' },
  { page: 'EstateSaleFinder',       label: 'Find Estate Sales',   icon: MapPin,          group: 'Directory' },

  // Admin pages
  { page: 'AdminUsers',             label: 'Users',               icon: Users,           group: 'Admin' },
  { page: 'AdminEstateSales',       label: 'Estate Sales',        icon: Building2,       group: 'Admin' },
  { page: 'AdminVendors',           label: 'Vendor Ads',          icon: Briefcase,       group: 'Admin' },
  { page: 'AdminLeads',             label: 'All Leads',           icon: Award,           group: 'Admin' },
  { page: 'AdminLeadsSocialAds',   label: 'Social Ads Leads',    icon: Award,           group: 'Admin' },
  { page: 'AdminLeadsPropstream',  label: 'Propstream Leads',    icon: Award,           group: 'Admin' },
  { page: 'AdminLeadsWebsite',     label: 'Website Leads',       icon: Award,           group: 'Admin' },
  { page: 'AdminLeadImporter',     label: 'Lead Importer',       icon: Upload,          group: 'Admin' },
  { page: 'AdminMarketplace',       label: 'Marketplace',         icon: ShoppingBag,     group: 'Admin' },
  { page: 'AdminCourses',           label: 'Courses',             icon: GraduationCap,   group: 'Admin' },
  { page: 'AdminTickets',           label: 'Support Tickets',     icon: MessageSquare,   group: 'Admin' },
  { page: 'AdminTemplates',         label: 'Templates',           icon: FileText,        group: 'Admin' },
  { page: 'AdminAutomations',       label: 'Automations',         icon: Zap,             group: 'Admin' },
  { page: 'AdminPackages',          label: 'Subscription Pkgs',   icon: Package,         group: 'Admin' },
  { page: 'AdminAdvertisingPackages', label: 'Ad Packages',       icon: Package,         group: 'Admin' },
  { page: 'AdminAdPlacements',      label: 'Ad Placements',       icon: Megaphone,       group: 'Admin' },
  { page: 'AdminRewards',           label: 'Rewards & Draws',     icon: Gift,            group: 'Admin' },
  { page: 'AdminCampaigns',         label: 'Campaigns',           icon: Zap,             group: 'Admin' },
  { page: 'AdminAmazonProducts',    label: 'Amazon Products',     icon: Package,         group: 'Admin' },
  { page: 'AdminTransactions',      label: 'Transactions',        icon: DollarSign,      group: 'Admin' },
  { page: 'AdminFutureOperators',   label: 'Future Operators',    icon: Briefcase,       group: 'Admin' },
  { page: 'AdminEstatesalesOrg',    label: 'EstateSales.org Ops', icon: Building2,       group: 'Admin' },
  { page: 'PlatformAnalytics',      label: 'Platform Analytics',  icon: BarChart3,       group: 'Admin' },
  { page: 'Revenue',                label: 'Revenue Projections', icon: DollarSign,      group: 'Admin' },
  { page: 'ComprehensiveRevenue',   label: 'Comprehensive Rev.',  icon: DollarSign,      group: 'Admin' },
  { page: 'FutureOperatorsAnalytics', label: 'Future Ops Rev.',   icon: DollarSign,      group: 'Admin' },
  { page: 'PricingImport',          label: 'Pricing Import',      icon: BarChart3,       group: 'Admin' },
  { page: 'AdminAICredits',         label: 'AI Credit Mgmt',      icon: Zap,             group: 'Admin' },
  { page: 'BizInABox',              label: 'Biz in a Box',        icon: Briefcase,       group: 'Admin' },
  { page: 'AdminPageAccess',        label: 'Page Permissions',    icon: Shield,          group: 'Admin' },
  { page: 'AdminAIOperator',        label: 'Admin AI Operator',   icon: Brain,           group: 'Admin' },

  // Landing Pages (admin only)
  { page: 'LandingPageSaleLeak',    label: 'LP: Sale Leak Quiz',  icon: Rocket,          group: 'Landing Pages' },
  { page: 'LandingPageProfitLevers', label: 'LP: 5 Profit Levers', icon: Rocket,          group: 'Landing Pages' },
  { page: 'LandingPageScaleReady',   label: 'LP: Scale Readiness', icon: Rocket,          group: 'Landing Pages' },
  { page: 'LandingPageCalculator',      label: 'LP: Time & Profit Calc',   icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageChaosToControl', label: 'LP: Chaos to Control',     icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageOfferClose',     label: 'LP: Offer & Close',         icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageFitFinder',      label: 'LP: Fit Finder Quiz',        icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageReferralEngine', label: 'LP: Referral Engine',         icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageAIPlan',         label: 'LP: AI Custom Plan',          icon: Rocket, group: 'Landing Pages' },
  { page: 'LandingPageRetarget',       label: 'LP: Retargeting Page',        icon: Rocket, group: 'Landing Pages' },
];

export default function AppSidebar({ user, currentPageName, allowedPages }) {
  const [open, setOpen] = useState(true);

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

  // Filter nav items to only those allowed for this user
  const visibleItems = ALL_NAV_ITEMS.filter(item => allowedPages.includes(item.page));

  // Group them
  const grouped = visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const groupOrder = ['Main', 'Estate Sales', 'Marketplace', 'CRM & Leads', 'Marketing', 'Education', 'Finance', 'Consumer', 'Directory', 'Admin', 'Landing Pages'];

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <>
      {/* Toggle button when closed */}
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
          {groupOrder.map(group => {
            const items = grouped[group];
            if (!items || items.length === 0) return null;
            return (
              <div key={group}>
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{group}</p>
                {items.map(item => {
                  const Icon = item.icon;
                  const active = currentPageName === item.page;
                  return (
                    <Link key={item.page} to={createPageUrl(item.page)}>
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
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer — user info + logout */}
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