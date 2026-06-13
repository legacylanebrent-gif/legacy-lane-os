import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Search, Building2, MapPin, User } from 'lucide-react';

const tabs = [
  { label: 'Discover', icon: Home, path: '/' },
  { label: 'Sales', icon: Search, path: '/EstateSaleFinder' },
  { label: 'Companies', icon: Building2, path: '/BrowseOperators' },
  { label: 'Route', icon: MapPin, path: '/RoutePlanner' },
  { label: 'Profile', icon: User, path: '/MyProfile' },
];

export default function MobileTabBar({ unreadTotal = 0 }) {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={createPageUrl(tab.path === '/' ? 'Home' : tab.path.replace('/', ''))}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                isActive ? 'text-orange-600' : 'text-slate-400'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? 'fill-orange-100' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.label === 'Profile' && unreadTotal > 0 && (
                <span className="absolute -top-1 right-1/4 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-orange-600 text-white text-[10px] font-bold px-1 leading-none">
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}