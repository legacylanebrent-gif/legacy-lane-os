import React from 'react';
import AppSidebar, { ALL_NAV_ITEMS } from '@/components/layout/AppSidebar';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import MessagesDropdown from '@/components/messaging/MessagesDropdown';

// Admins see all pages
const ALL_PAGE_NAMES = ALL_NAV_ITEMS.map(i => i.page);

export default function AdminLayout({ children, currentPage, user }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar user={user} currentPageName={currentPage} allowedPages={ALL_PAGE_NAMES} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
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