import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import MessagesDropdown from '@/components/messaging/MessagesDropdown';
import { 
  LayoutDashboard, Users, DollarSign, Package, Home, GraduationCap,
  Settings, BarChart3, ShoppingBag, Briefcase, Award, FileText, Zap, Building2, User, Gift, Menu, ChevronDown, MessageSquare, TrendingUp, Bell, Megaphone, Heart, MapPin, Shield
} from 'lucide-react';

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', path: 'Dashboard', icon: LayoutDashboard },
  { label: 'Notifications', path: 'Notifications', icon: Bell },
  { label: 'My Profile', path: 'MyProfile', icon: User },
  { label: 'My Sales', path: 'MySales', icon: Building2 },
  { label: 'Check-ins', path: 'RewardsCheckins', icon: MapPin },
  { label: 'Favorites', path: 'Favorites', icon: Heart },
  { label: 'CRM', path: 'CRM', icon: Users },
  { label: 'Marketplace', path: 'AdminMarketplace', icon: ShoppingBag },
  { label: 'Leads', path: 'AdminLeads', icon: Award },
  { label: 'Marketing Tasks', path: 'MarketingTasks', icon: Megaphone },
  { label: 'Campaigns', path: 'AdminCampaigns', icon: Zap },
  { label: 'Income Tracker', path: 'IncomeTracker', icon: TrendingUp },
  { label: 'Business Expenses', path: 'MyBusinessExpenses', icon: FileText },
  { label: 'Courses', path: 'AdminCourses', icon: GraduationCap },
  { label: 'Users', path: 'AdminUsers', icon: Users },
  { label: 'Estate Sales', path: 'AdminEstateSales', icon: Home },
  { label: 'Vendor Ads', path: 'AdminVendors', icon: Briefcase },
  { label: 'Incoming Leads', path: 'IncomingLeads', icon: TrendingUp },
  { label: 'Analytics', path: 'PlatformAnalytics', icon: BarChart3 },
  { label: 'Rewards & Draws', path: 'AdminRewards', icon: Gift },
  { label: 'Support Tickets', path: 'AdminTickets', icon: MessageSquare },
  { label: 'Templates', path: 'AdminTemplates', icon: FileText },
  { label: 'Automations', path: 'AdminAutomations', icon: Zap },
  { label: 'Amazon Products', path: 'AdminAmazonProducts', icon: Package },
  { label: 'Subscription Packages', path: 'AdminPackages', icon: Package },
  { label: 'Advertising Packages', path: 'AdminAdvertisingPackages', icon: Package },
  { label: 'Pricing Import', path: 'PricingImport', icon: BarChart3 },
  { label: 'Transactions', path: 'AdminTransactions', icon: FileText },
  { label: 'Revenue Projections', path: 'Revenue', icon: DollarSign },
  { label: 'Future Operators', path: 'AdminFutureOperators', icon: Briefcase },
  { label: 'Future Operators Rev', path: 'FutureOperatorsAnalytics', icon: DollarSign },
  { label: 'Comprehensive Revenue', path: 'ComprehensiveRevenue', icon: DollarSign },
  { label: 'Biz in a Box', path: 'BizInABox', icon: Briefcase },
  { label: 'Page Permissions', path: 'AdminPageAccess', icon: Shield },
  { label: 'Settings', path: 'Settings', icon: Settings }
];

export default function AdminLayout({ children, currentPage, user }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const isActive = (path) => {
    return currentPage === path;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Hamburger Button - Fixed Position */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <MessagesDropdown />
        <NotificationsDropdown />
        <Button
          variant="ghost"
          size="icon"
          className="bg-slate-800 text-orange-400 hover:text-orange-300 hover:bg-slate-700"
          onClick={(e) => {
            e.stopPropagation();
            setSidebarOpen(!sidebarOpen);
          }}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Left Navigation */}
      <aside className={`bg-slate-800 text-white flex flex-col transition-all duration-300 overflow-hidden ${
        sidebarOpen ? 'w-64' : 'w-0'
      }`}>
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <div className="mb-2">
            <h2 className="text-xl font-serif font-bold text-orange-400">Admin Console</h2>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 pb-32 space-y-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-white [&::-webkit-scrollbar-thumb]:rounded-full">
          {ADMIN_NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <React.Fragment key={item.path}>
                {(item.label === 'Users' || item.label === 'Revenue Projections') && (
                  <div className="w-[80%] mx-auto my-3 border-t border-slate-600" />
                )}
                <Link to={createPageUrl(item.path)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      active
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              </React.Fragment>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-32">
        {children}
      </main>
    </div>
  );
}