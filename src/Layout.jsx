import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AppSidebar from '@/components/layout/AppSidebar';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import MessagesDropdown from '@/components/messaging/MessagesDropdown';
import ConsumerHeader from '@/components/layout/ConsumerHeader';

// Pages that render without any chrome (public-facing)
const PUBLIC_PAGES = ['EstateSaleDetail', 'EstateSaleFinder', 'Home', 'ReferralLanding', 'SaleLanding', 'ItemDetail'];

// Consumer-type roles that get the consumer header instead of the sidebar
const CONSUMER_ROLES = ['consumer', 'executor', 'home_seller', 'buyer', 'downsizer', 'diy_seller', 'consignor', 'coach'];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [allowedPages, setAllowedPages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndAccess();
  }, []);

  const loadUserAndAccess = async () => {
    try {
      const userData = await base44.auth.me();
      if (!userData) { setLoading(false); return; }

      // Default primary_account_type
      if (!userData.primary_account_type) userData.primary_account_type = 'consumer';
      setUser(userData);

      const role = userData.primary_account_type;

      // Fetch the PageAccess config for this role
      const configs = await base44.entities.PageAccess.filter({ account_type: role, is_active: true });
      if (configs.length > 0) {
        setAllowedPages(configs[0].allowed_pages || []);
      } else {
        // Fallback: consumers get a minimal set, everyone else gets a basic set
        setAllowedPages(['Dashboard', 'MyProfile', 'Notifications', 'MyTickets', 'BrowseItems', 'EstateSaleFinder', 'RewardsCheckins', 'Favorites', 'MyRewards', 'MyReferrals']);
      }
    } catch (error) {
      console.error('Error loading user/access:', error);
    } finally {
      setLoading(false);
    }
  };

  // Public pages — no layout at all
  if (PUBLIC_PAGES.includes(currentPageName)) return children;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-slate-600 text-lg font-serif">Loading...</div>
      </div>
    );
  }

  const role = user?.primary_account_type || 'consumer';
  const isConsumer = CONSUMER_ROLES.includes(role);

  // Consumer layout — top header only, no sidebar
  if (isConsumer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50">
        <ConsumerHeader user={user} />
        {children}
      </div>
    );
  }

  // All other roles — unified sidebar layout
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50">
      <AppSidebar user={user} currentPageName={currentPageName} allowedPages={allowedPages} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with notifications */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 px-4 h-12 flex items-center justify-end gap-3">
          <MessagesDropdown />
          <NotificationsDropdown />
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}