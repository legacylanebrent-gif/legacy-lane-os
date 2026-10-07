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
  Wrench, Eye, Building, Network, Banknote, Bot, Image, Calendar, Trash2, Lightbulb, LayoutGrid
} from 'lucide-react';

// ─── Master Nav Item List ─────────────────────────────────────────────────────
// group = top-level section label shown in sidebar
// subgroup = collapsible sub-section within an admin group (optional)
export const ALL_NAV_ITEMS = [

  // ── MAIN ────────────────────────────────────────────────────────────────────
  { page: 'Home',                   label: 'Main Website',           icon: Home,            group: 'Main' },
  { page: 'Dashboard',              label: 'Dashboard',              icon: LayoutDashboard, group: 'Main' },
  { page: 'MyProfile',              label: 'My Profile',             icon: User,            group: 'Main' },

  // ── ESTATE SALES (operator core) ────────────────────────────────────────────
  { page: 'MySales',                label: 'My Sales',               icon: Building2,       group: 'Estate Sales' },
  { page: 'Inventory',              label: 'My Inventory',           icon: Package,         group: 'Estate Sales' },

  // ── CRM & LEADS (operator core) ─────────────────────────────────────────────
  { page: 'CRM',                    label: 'CRM',                    icon: Users,           group: 'CRM & Leads' },
  { page: 'Leads',                  label: 'Lead Center',            icon: Award,           group: 'CRM & Leads' },

  // ── MARKETING (operator core) ───────────────────────────────────────────────
  { page: 'OperatorMarketingHub',   label: 'Marketing Hub',          icon: Lightbulb,       group: 'Marketing' },

  // ── RESELLER ──────────────────────────────────────────────────────────────────
  { page: 'ResellerDashboard',      label: 'My Dashboard',           icon: LayoutDashboard, group: 'Reseller' },
  { page: 'MyResellerLeads',        label: 'My Leads',               icon: Award,           group: 'Reseller' },
  { page: 'Inventory',              label: 'My Inventory',           icon: Package,         group: 'Reseller' },
  { page: 'ResellerPackupEvents',   label: 'Packup Events',          icon: Calendar,        group: 'Reseller' },

  // ══════════════════════════════════════════════════════════════════════
  // Operators — single hub page (all operator links consolidated on /OperatorLinks)
  // ══════════════════════════════════════════════════════════════════════
  { page: 'OperatorLinks',          label: 'Operator Links',         icon: LayoutGrid,      group: 'More' },

  // ══════════════════════════════════════════════════════════════════════
  // ADMIN — single hub page (all admin links consolidated on /AdminLinks)
  // ══════════════════════════════════════════════════════════════════════

  // Admin — single hub page (all admin links consolidated on /AdminLinks)
  { page: 'AdminLinks',             label: 'Admin Links',            icon: Shield,          group: 'Admin' },
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

const TOP_GROUP_ORDER = ['Admin', 'Main', 'Estate Sales', 'CRM & Leads', 'Marketing', 'More', 'Reseller'];

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
  // Mobile: default the sidebar collapsed so it doesn't cover the page; users open
  // it via the hamburger button. Desktop keeps it expanded by default.
  const isMobile = () => window.innerWidth < 1024;
  const [open, setOpen] = useState(() => !isMobile());
  const [subscriptionTier, setSubscriptionTier] = useState(null);

  // Collapse again after navigating on mobile so the menu doesn't cover the new page
  useEffect(() => {
    if (isMobile()) setOpen(false);
  }, [currentPageName]);

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