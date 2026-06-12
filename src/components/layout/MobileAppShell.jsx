import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import MobileTabBar from '@/components/layout/MobileTabBar';
import { Bell, MessageSquare } from 'lucide-react';

export default function MobileAppShell({ children, title, showHeader = true }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 pb-20">
      {/* Minimal top header */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 h-12 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png"
              alt="EstateSalen"
              className="h-7 w-7 object-contain"
            />
            <span className="text-sm font-serif font-bold text-slate-800">EstateSalen</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link to={createPageUrl('Messages')} className="p-1.5 text-slate-400 hover:text-slate-600">
              <MessageSquare className="w-4 h-4" />
            </Link>
            <Link to={createPageUrl('Notifications')} className="p-1.5 text-slate-400 hover:text-slate-600">
              <Bell className="w-4 h-4" />
            </Link>
          </div>
        </header>
      )}

      {/* Page content */}
      <main className="max-w-lg mx-auto">
        {children}
      </main>

      {/* Bottom tab bar */}
      <MobileTabBar />
    </div>
  );
}