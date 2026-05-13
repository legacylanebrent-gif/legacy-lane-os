import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MessagesDropdown from '@/components/messaging/MessagesDropdown';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { 
  LogIn, LogOut, LayoutDashboard, Bell, ChevronDown,
  Heart, ShoppingBag, Star, QrCode, Receipt, ClipboardList, Navigation, Building2, Settings, HelpCircle,
  Users, FileText, BarChart2, Send
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function UniversalHeader({ user, isAuthenticated }) {
  const userInitials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl('Home'));
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
           <Link to="/" className="flex items-center gap-3 cursor-pointer pointer-events-auto touch-manipulation relative z-50">
             <img src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png" alt="logo" className="h-9 w-9 object-contain" />
             <h1 className="text-lg font-serif font-bold text-white leading-tight hidden sm:block">EstateSalen.com</h1>
           </Link>

          {/* Right Side - User Options */}
          <div className="flex items-center gap-1">
            {isAuthenticated && user ? (
              <>
                <MessagesDropdown />
                <NotificationsDropdown user={user} />
                <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-orange-500/20 hover:text-orange-300 pointer-events-auto touch-manipulation">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.profile_image_url} />
                        <AvatarFallback className="bg-orange-600 text-white">{userInitials}</AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">{user?.full_name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 max-h-[80vh] overflow-y-auto">
                    <DropdownMenuLabel>
                      <div>
                        <p className="font-semibold">{user?.full_name}</p>
                        <p className="text-xs text-slate-500">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Dashboard')} className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Favorites')} className="cursor-pointer">
                        <Heart className="w-4 h-4 mr-2" /> Favorite Sales
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('RoutePlanner')} className="cursor-pointer">
                        <Navigation className="w-4 h-4 mr-2" /> Route Planner
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('MyEarlySignIns')} className="cursor-pointer">
                        <ClipboardList className="w-4 h-4 mr-2" /> My Early Sign-Ins
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('RewardsCheckins')} className="cursor-pointer">
                        <QrCode className="w-4 h-4 mr-2" /> Sale Checkin
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('RecordPurchase')} className="cursor-pointer">
                        <Receipt className="w-4 h-4 mr-2" /> Record Purchase
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('MyRewards')} className="cursor-pointer">
                        <Star className="w-4 h-4 mr-2" /> My Rewards
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('BrowseItems')} className="cursor-pointer">
                        <ShoppingBag className="w-4 h-4 mr-2" /> Browse Marketplace
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('FavoriteCompanies')} className="cursor-pointer">
                        <Building2 className="w-4 h-4 mr-2" /> Favorite Companies
                      </Link>
                    </DropdownMenuItem>
                    {user?.primary_account_type === 'real_estate_agent' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-orange-600 font-bold uppercase tracking-wide">Agent Tools</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('AgentOperatorPortal')} className="cursor-pointer">
                            <Users className="w-4 h-4 mr-2" /> Operator Partnerships
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('AgentPartnerships')} className="cursor-pointer">
                            <Send className="w-4 h-4 mr-2" /> Agent Partnerships
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('ReferralDealPipeline')} className="cursor-pointer">
                            <BarChart2 className="w-4 h-4 mr-2" /> Referral Deal Pipeline
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('ReferralDashboard')} className="cursor-pointer">
                            <FileText className="w-4 h-4 mr-2" /> Referral Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('JoinReferralExchange')} className="cursor-pointer">
                            <Users className="w-4 h-4 mr-2" /> Join Referral Exchange
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('HowToUse')} className="cursor-pointer">
                        <HelpCircle className="w-4 h-4 mr-2" /> How to Use
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('NotificationSettings')} className="cursor-pointer">
                        <Bell className="w-4 h-4 mr-2" /> Notification Settings
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl('AdminUsers')} className="cursor-pointer font-medium text-orange-600">
                            <Settings className="w-4 h-4 mr-2" /> Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer hover:bg-red-50 hover:text-red-700">
                      <LogOut className="w-4 h-4 mr-2" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => base44.auth.redirectToLogin(window.location.href)}
                  className="text-white hover:text-orange-400 hover:bg-orange-500/20 text-sm"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => base44.auth.redirectToLogin(window.location.href)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}