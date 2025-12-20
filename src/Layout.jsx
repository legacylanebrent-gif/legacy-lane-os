import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  Home, Building2, TrendingUp, ShoppingBag, Megaphone, GraduationCap,
  Users, Settings, LogOut, Menu, X, ChevronDown, BarChart3, MapPin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const DIVISION_CONFIG = {
  estate_services: {
    label: 'Estate Services',
    icon: Home,
    pages: [
      { name: 'EstateSaleFinder', label: 'Find Estate Sales', icon: MapPin },
      { name: 'MyEstateSales', label: 'My Estate Sales', icon: Building2 },
      { name: 'Inventory', label: 'Inventory', icon: ShoppingBag }
    ]
  },
  real_estate: {
    label: 'Real Estate',
    icon: Building2,
    pages: [
      { name: 'CRM', label: 'CRM', icon: Users },
      { name: 'Properties', label: 'Properties', icon: Building2 },
      { name: 'Leads', label: 'Leads', icon: TrendingUp }
    ]
  },
  investment: {
    label: 'Investment & Flips',
    icon: TrendingUp,
    pages: [
      { name: 'Deals', label: 'Deals', icon: TrendingUp },
      { name: 'Projects', label: 'Projects', icon: Building2 }
    ]
  },
  marketplace: {
    label: 'Marketplace',
    icon: ShoppingBag,
    pages: [
      { name: 'BrowseItems', label: 'Browse', icon: ShoppingBag },
      { name: 'MyListings', label: 'My Listings', icon: BarChart3 }
    ]
  },
  marketing: {
    label: 'Marketing Hub',
    icon: Megaphone,
    pages: [
      { name: 'Campaigns', label: 'Campaigns', icon: Megaphone },
      { name: 'Analytics', label: 'Analytics', icon: BarChart3 }
    ]
  },
  education: {
    label: 'Education',
    icon: GraduationCap,
    pages: [
      { name: 'Courses', label: 'All Courses', icon: GraduationCap },
      { name: 'MyCourses', label: 'My Courses', icon: Users }
    ]
  }
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-navy-900 text-xl font-serif">Loading...</div>
      </div>
    );
  }

  // Pages that don't need layout
  if (['Onboarding'].includes(currentPageName)) {
    return children;
  }

  // Admin users use AdminLayout
  const accountType = user?.primary_account_type || user?.primary_role;
  if (accountType === 'super_admin' || 
      accountType === 'platform_ops' || 
      accountType === 'growth_team' ||
      accountType === 'partnerships' ||
      accountType === 'education_admin' ||
      accountType === 'finance_admin') {
    return (
      <AdminLayout currentPage={currentPageName} user={user}>
        {children}
      </AdminLayout>
    );
  }

  const userInitials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50">
      {/* Top Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-orange-400 hover:text-orange-300 hover:bg-slate-700"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              
              <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">LL</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-serif font-bold text-white">Legacy Lane</h1>
                  <p className="text-xs text-orange-400">Operating System</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-slate-700">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profile_image_url} />
                      <AvatarFallback className="bg-orange-600 text-white">{userInitials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">{user?.full_name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-semibold">{user?.full_name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Settings')} className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] 
          bg-white border-r border-slate-200 z-40
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-64
        `}>
          <div className="p-6 overflow-y-auto h-full">
            <div className="space-y-6">
              <div>
                <Link to={createPageUrl('Dashboard')}>
                  <Button 
                    variant={currentPageName === 'Dashboard' ? 'default' : 'ghost'}
                    className={`w-full justify-start ${
                      currentPageName === 'Dashboard' 
                        ? 'bg-slate-800 text-white hover:bg-slate-700' 
                        : 'hover:bg-cyan-50'
                    }`}
                  >
                    <Home className="w-5 h-5 mr-3" />
                    Dashboard
                  </Button>
                </Link>
              </div>

              {user?.divisions_access?.map(divisionKey => {
                const division = DIVISION_CONFIG[divisionKey];
                if (!division) return null;
                
                return (
                  <div key={divisionKey}>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      {division.label}
                    </h3>
                    <div className="space-y-1">
                      {division.pages.map(page => (
                        <Link key={page.name} to={createPageUrl(page.name)}>
                          <Button
                            variant="ghost"
                            className={`w-full justify-start ${
                              currentPageName === page.name
                                ? 'bg-cyan-100 text-cyan-700'
                                : 'hover:bg-cyan-50'
                            }`}
                          >
                            <page.icon className="w-4 h-4 mr-3" />
                            {page.label}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}