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
  ShoppingBag, Heart, LayoutDashboard, ChevronDown, Bell, LogOut, Home, QrCode, Receipt, MessageSquare, Star, ClipboardList, Navigation
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ConsumerHeader({ user }) {
  const userInitials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl('Home'));
  };

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3">
            <img src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png" alt="logo" className="h-12 w-12 object-contain" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-serif font-bold text-white">EstateSalen.com</h1>
              <p className="text-xs text-orange-400">Discover Sales Near You!</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-orange-400 hover:text-orange-300 hover:bg-slate-700">
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            <MessagesDropdown />
            <NotificationsDropdown user={user} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-orange-500/20 hover:text-orange-300">
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
                  <Link to={createPageUrl('Home')} className="cursor-pointer">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Dashboard')} className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Favorites')} className="cursor-pointer">
                    <Heart className="w-4 h-4 mr-2" />
                    Favorites
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('MyEarlySignIns')} className="cursor-pointer">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    My Early Sign-Ins
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('RewardsCheckins')} className="cursor-pointer">
                    <QrCode className="w-4 h-4 mr-2" />
                    Sale Checkin
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('RecordPurchase')} className="cursor-pointer">
                    <Receipt className="w-4 h-4 mr-2" />
                    Record Purchase
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('MyRewards')} className="cursor-pointer">
                    <Star className="w-4 h-4 mr-2" />
                    My Rewards
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('BrowseItems')} className="cursor-pointer">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Browse Marketplace
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('RoutePlanner')} className="cursor-pointer">
                    <Navigation className="w-4 h-4 mr-2" />
                    Route Planner
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('NotificationSettings')} className="cursor-pointer">
                    <Bell className="w-4 h-4 mr-2" />
                    Notification Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer hover:bg-red-50 hover:text-red-700">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}