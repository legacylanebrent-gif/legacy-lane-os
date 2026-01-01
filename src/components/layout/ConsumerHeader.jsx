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
  ShoppingBag, Heart, LayoutDashboard, ChevronDown, Bell, LogOut, Home, QrCode, Receipt
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
          <Link to={createPageUrl('ConsumerHome')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">LL</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-serif font-bold text-white">Legacy Lane</h1>
              <p className="text-xs text-orange-400">Operating System</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link to={createPageUrl('Home')}>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-orange-400 hover:bg-orange-500/20"
                title="Home"
              >
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <Link to={createPageUrl('BrowseItems')}>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-orange-400 hover:bg-orange-500/20"
                title="Browse Items"
              >
                <ShoppingBag className="h-5 w-5" />
              </Button>
            </Link>
            <Link to={createPageUrl('Favorites')}>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-orange-400 hover:bg-orange-500/20"
                title="Favorites"
              >
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            <MessagesDropdown />
            <NotificationsDropdown user={user} />
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-orange-400 hover:bg-orange-500/20"
              title="Record Purchase"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openPurchaseModal'));
              }}
            >
              <Receipt className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-orange-400 hover:bg-orange-500/20"
              title="QR Check-in"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openQRScanner'));
              }}
            >
              <QrCode className="h-5 w-5" />
            </Button>
            <Link to={createPageUrl('Dashboard')}>
              <Button
                variant="ghost"
                className="text-white hover:text-orange-400 hover:bg-orange-500/20"
              >
                Dashboard
              </Button>
            </Link>
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