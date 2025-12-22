import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Users, DollarSign, Package, Home, GraduationCap,
  Settings, BarChart3, ShoppingBag, Briefcase, Award, FileText, Zap, Building2, User, Gift, Menu, X
} from 'lucide-react';

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', path: 'Dashboard', icon: LayoutDashboard },
  { label: 'My Profile', path: 'MyProfile', icon: User },
  { label: 'My Sales', path: 'MySales', icon: Building2 },
  { label: 'Marketplace', path: 'AdminMarketplace', icon: ShoppingBag },
  { label: 'Courses', path: 'AdminCourses', icon: GraduationCap },
  { label: 'Campaigns', path: 'AdminCampaigns', icon: Zap },
  { label: 'Leads', path: 'AdminLeads', icon: Award },
  { label: 'Users', path: 'AdminUsers', icon: Users },
  { label: 'Estate Sales', path: 'AdminEstateSales', icon: Home },
  { label: 'Vendor Ads', path: 'AdminVendors', icon: Briefcase },
  { label: 'Analytics', path: 'PlatformAnalytics', icon: BarChart3 },
  { label: 'Revenue Projections', path: 'Revenue', icon: DollarSign },
  { label: 'Future Operators', path: 'AdminFutureOperators', icon: Briefcase },
  { label: 'Future Operators Rev', path: 'FutureOperatorsAnalytics', icon: DollarSign },
  { label: 'Comprehensive Revenue', path: 'ComprehensiveRevenue', icon: DollarSign },
  { label: 'Monthly Packages', path: 'AdminPackages', icon: Package },
  { label: 'Advertising Packages', path: 'AdminAdvertisingPackages', icon: Package },
  { label: 'Rewards & Draws', path: 'AdminRewards', icon: Gift },
  { label: 'Transactions', path: 'AdminTransactions', icon: FileText },
  { label: 'Settings', path: 'Settings', icon: Settings }
];

export default function AdminLayout({ children, currentPage }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const isActive = (path) => {
    return currentPage === path;
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Hamburger Button */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="bg-slate-800 text-orange-400 hover:text-orange-300 hover:bg-slate-700"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Left Navigation */}
      <aside className={`bg-slate-800 text-white flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      }`}>
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-serif font-bold text-orange-400">Admin Console</h2>
          <p className="text-xs text-slate-400 mt-1">Legacy Lane OS</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {ADMIN_NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link key={item.path} to={createPageUrl(item.path)}>
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
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}