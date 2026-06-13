import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertTriangle, X, Building2, MapPin, ArrowRight } from 'lucide-react';
import AppSidebar, { ALL_NAV_ITEMS } from '@/components/layout/AppSidebar';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import MessagesDropdown from '@/components/messaging/MessagesDropdown';
import UniversalHeader from '@/components/layout/UniversalHeader';
import AICoachButton from '@/components/coach/AICoachButton';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useOperatorOnboarding } from '@/hooks/useOperatorOnboarding';
import { isProfileComplete, getMissingFields } from '@/components/profile/ProfileCompletionGate';

const ALL_PAGE_NAMES = ALL_NAV_ITEMS.map(i => i.page); // includes FutOperLeads
const ADMIN_ROLES = ['super_admin', 'platform_ops', 'admin', 'support_agent', 'marketing_ops', 'data_analyst'];

// Pages that render without any chrome (public-facing)
const PUBLIC_PAGES = ['EstateSaleFinder', 'Home', 'ReferralLanding', 'SaleLanding', 'ItemDetail', 'StateCities', 'SearchByState', 'BrowseOperators', 'OperatorPackages', 'BrowseItems', 'HowToUse', 'OnboardingChat', 'BusinessProfile'];

// Pages that render with UniversalHeader only (no sidebar) for ALL roles
// These are utility/consumer-style pages linked from the UniversalHeader dropdown
const NO_SIDEBAR_PAGES = [
  'MyProfile', 'Favorites', 'RoutePlanner', 'MyEarlySignIns', 'RewardsCheckins',
  'RecordPurchase', 'MyRewards', 'FavoriteCompanies', 'NotificationSettings',
  'MyPurchases', 'MyTickets', 'MyReferrals', 'Notifications', 'Messages',
  // Agent tools
  'AgentOperatorPortal', 'AgentPartnerships', 'ReferralDealPipeline',
  'ReferralDashboard', 'JoinReferralExchange',
  // Public pages that need UniversalHeader
  'EstateSaleDetail',
  'CompareEstateSales',
];

// Consumer-type roles that get the consumer header instead of the sidebar
const CONSUMER_ROLES = ['consumer', 'executor', 'home_seller', 'buyer', 'downsizer', 'diy_seller', 'consignor', 'coach', 'reseller', 'real_estate_agent'];

// Friendly display names for browser tab titles
const PAGE_TITLES = {
  Dashboard: 'Dashboard',
  Favorites: 'Favorites',
  MyProfile: 'My Profile',
  Notifications: 'Notifications',
  MyTickets: 'My Tickets',
  BrowseItems: 'Browse Marketplace',
  RewardsCheckins: 'Rewards & Check-ins',
  MyRewards: 'My Rewards',
  MyReferrals: 'My Referrals',
  Messages: 'Messages',
  Inventory: 'Inventory',
  MySales: 'My Sales',
  SaleEditor: 'Sale Editor',
  SaleInventory: 'Sale Inventory',
  SaleTasks: 'Sale Tasks',
  Attendance: 'Attendance',
  Settings: 'Settings',
  NotificationSettings: 'Notification Settings',
  FavoriteCompanies: 'Favorite Companies',
  MyEarlySignIns: 'My Early Sign-Ins',
  RecordPurchase: 'Record Purchase',
  RoutePlanner: 'Route Planner',
  MarketingTasks: 'Marketing',
  OperatorDashboard: 'Estate Sale Company Owner Dashboard',
  OperatorProfile: 'Estate Sale Company Owner Profile',
  AdminUsers: 'Admin — Users',
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [allowedPages, setAllowedPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(() => {
    try { return !!localStorage.getItem('profileBannerDismissed'); } catch { return false; }
  });
  // Set browser tab title immediately (synchronously) on every render when page changes
  const friendly = PAGE_TITLES[currentPageName] || currentPageName?.replace(/([A-Z])/g, ' $1').trim();
  if (friendly && !PUBLIC_PAGES.includes(currentPageName)) {
    document.title = `${friendly} | EstateSalen.com`;
  }
  const { showOnboarding, handleClose, handleDismissPermanently } = useOperatorOnboarding(user);

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

      // Redirect new users without completed onboarding to the onboarding flow
      if (!userData.onboarding_completed && currentPageName !== 'OnboardingChat') {
        window.location.href = createPageUrl('OnboardingChat');
        return;
      }

      const role = userData.primary_account_type;

      // Admins always get all pages — no DB lookup needed
      if (ADMIN_ROLES.includes(role) || userData.role === 'admin') {
        setAllowedPages(ALL_PAGE_NAMES);
        return;
      }

      // Fetch the PageAccess config for this role
      const configs = await base44.entities.PageAccess.filter({ account_type: role, is_active: true });
      if (configs.length > 0) {
        setAllowedPages(configs[0].allowed_pages || []);
      } else {
        // Fallback minimal set
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
  const hideSidebar = isConsumer || NO_SIDEBAR_PAGES.includes(currentPageName);

  // Consumer layout / sidebar-free pages — top header only, no sidebar
  if (hideSidebar) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50">
        <UniversalHeader user={user} isAuthenticated={!!user} />
        {/* Profile incomplete banner for business roles on sidebar-free pages */}
        {user && !isConsumer && !ADMIN_ROLES.includes(role) && !isProfileComplete(user) && !profileBannerDismissed && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-amber-800 font-medium">Complete your profile to unlock all features</span>
              <span className="text-amber-700 flex flex-wrap gap-x-3 gap-y-0.5">
                {getMissingFields(user).map(f => (
                  <span key={f} className="inline-flex items-center gap-1">
                    {f === 'company name' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {f}
                  </span>
                ))}
              </span>
              <Link to="/MyProfile" className="inline-flex items-center gap-1 text-amber-700 font-semibold hover:text-amber-900 underline whitespace-nowrap">
                Go to Profile <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <button
              onClick={() => { localStorage.setItem('profileBannerDismissed', '1'); setProfileBannerDismissed(true); }}
              className="text-amber-500 hover:text-amber-700 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    );
  }

  // All other roles — unified sidebar layout
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50">
      {showOnboarding && (
        <OnboardingModal
          user={user}
          onClose={handleClose}
          onDismissPermanently={handleDismissPermanently}
        />
      )}
      <AppSidebar user={user} currentPageName={currentPageName} allowedPages={allowedPages} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with notifications */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200 px-4 h-12 flex items-center justify-end gap-3">
          <MessagesDropdown />
          <NotificationsDropdown />
        </div>

        {/* Profile incomplete banner — non-consumer users only */}
        {user && !CONSUMER_ROLES.includes(role) && !ADMIN_ROLES.includes(role) && !isProfileComplete(user) && !profileBannerDismissed && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-amber-800 font-medium">Complete your profile to unlock all features</span>
              <span className="text-amber-700 flex flex-wrap gap-x-3 gap-y-0.5">
                {getMissingFields(user).map(f => (
                  <span key={f} className="inline-flex items-center gap-1">
                    {f === 'company name' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {f}
                  </span>
                ))}
              </span>
              <Link to="/MyProfile" className="inline-flex items-center gap-1 text-amber-700 font-semibold hover:text-amber-900 underline whitespace-nowrap">
                Go to Profile <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <button
              onClick={() => { localStorage.setItem('profileBannerDismissed', '1'); setProfileBannerDismissed(true); }}
              className="text-amber-500 hover:text-amber-700 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Platform-wide AI Coach floating button */}
      <AICoachButton />
    </div>
  );
}