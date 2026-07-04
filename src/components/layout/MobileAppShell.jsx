import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import MobileTabBar from '@/components/layout/MobileTabBar';
import MobileQRCheckIn from '@/components/checkin/MobileQRCheckIn';
import { Bell, MessageSquare } from 'lucide-react';

export default function MobileAppShell({ children, title, showHeader = true }) {
  const [user, setUser] = useState(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(u => { setUser(u); loadCounts(u); }).catch(() => {});
    });
  }, []);

  // Poll unread counts every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadCounts(user), 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadCounts = async (u) => {
    try {
      const [notifs, msgs] = await Promise.all([
        base44.entities.Notification.filter({ user_id: u.id }, '-created_date', 100),
        base44.entities.Message.filter({ recipient_id: u.id }, '-created_date', 100),
      ]);
      setUnreadNotifs(notifs.filter(n => !n.read).length);
      setUnreadMessages(msgs.filter(m => !m.read).length);
    } catch (e) { /* silent */ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 pb-20">
      {/* Minimal top header */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 h-[72px] flex items-center justify-between">
          <Link to="/mobile" className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png"
              alt="EstateSalen"
              className="h-10 w-10 object-contain"
            />
            <span className="text-base font-serif font-bold text-slate-800">EstateSalen</span>
          </Link>
          <div className="flex items-center gap-1">
            <MobileQRCheckIn />
            <Link to="/mobile/messages" className="relative p-2 text-slate-400 hover:text-slate-600">
              <MessageSquare className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[15px] h-4 flex items-center justify-center rounded-full bg-orange-600 text-white text-[10px] font-bold px-1 leading-none">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>
            <Link to="/mobile/notifications" className="relative p-2 text-slate-400 hover:text-slate-600">
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[15px] h-4 flex items-center justify-center rounded-full bg-orange-600 text-white text-[10px] font-bold px-1 leading-none">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </Link>
          </div>
        </header>
      )}

      {/* Page content */}
      <main className="max-w-lg mx-auto">
        {children}
      </main>

      {/* Bottom tab bar */}
      <MobileTabBar unreadTotal={unreadNotifs + unreadMessages} />
    </div>
  );
}