import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Loader2, Link2, ShieldCheck } from 'lucide-react';
import { ALL_NAV_ITEMS } from '@/components/layout/AppSidebar';
import { ADMIN_LINK_SECTIONS } from '@/components/admin/adminLinksData';
import { OPERATOR_LINK_SECTIONS } from '@/components/operators/operatorLinksData';

// Roles that see everything without a PageAccess config
const ADMIN_ROLES = ['super_admin', 'platform_ops', 'admin', 'support_agent', 'marketing_ops', 'data_analyst'];

// All account types PageAccess can be configured for (mirrors the entity enum)
const ACCOUNT_TYPES = [
  'super_admin', 'platform_ops', 'growth_team', 'partnerships', 'education_admin', 'finance_admin',
  'estate_sale_operator', 'real_estate_agent', 'investor', 'vendor', 'consignor', 'consumer', 'collector_dealer',
];

// Page name → { label, icon, group } lookup assembled from every link catalog
const PAGE_META = (() => {
  const map = {};
  const add = (item, group) => {
    if (item?.page && !map[item.page]) map[item.page] = { label: item.label, icon: item.icon, group };
  };
  ALL_NAV_ITEMS.forEach(i => add(i, i.group));
  ADMIN_LINK_SECTIONS.forEach(s => s.links.forEach(l => add(l, s.title)));
  OPERATOR_LINK_SECTIONS.forEach(s => s.links.forEach(l => add(l, s.title)));
  return map;
})();

const prettify = (page) => page.replace(/([A-Z])/g, ' $1').trim();

const ADMIN_SECTION_ORDER = ADMIN_LINK_SECTIONS.map(s => s.title);

// Sort groups: Main first, then catalog sections, then everything else, Other last
const groupRank = (group) => {
  if (group === 'Main') return 0;
  const i = ADMIN_SECTION_ORDER.indexOf(group);
  if (i >= 0) return 100 + i;
  if (group === 'Other') return 999;
  return 200;
};

export default function MyLinks() {
  const [me, setMe] = useState(null);
  const [viewRole, setViewRole] = useState(null); // role being viewed (admins can switch)
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setMe(user);
        const role = user?.primary_account_type || 'consumer';
        setViewRole(role);
        setLinks(await loadRoleLinks(user, role));
      } catch (e) {
        setError(e?.message || 'Failed to load your links');
      }
    })();
  }, []);

  const loadRoleLinks = async (user, role) => {
    const isAdmin = ADMIN_ROLES.includes(role);
    if (isAdmin) {
      // Admins see everything — union of the sidebar nav and the admin/operator catalogs
      const all = [...ALL_NAV_ITEMS, ...ADMIN_LINK_SECTIONS.flatMap(s => s.links), ...OPERATOR_LINK_SECTIONS.flatMap(s => s.links)];
      const seen = new Set();
      return all.filter(i => (seen.has(i.page) ? false : seen.add(i.page)));
    }
    const configs = await base44.entities.PageAccess.filter({ account_type: role, is_active: true });
    const pages = configs.length > 0 ? (configs[0].allowed_pages || []) : ['Dashboard', 'MyProfile', 'Notifications', 'MyTickets', 'BrowseItems', 'EstateSaleFinder', 'RewardsCheckins', 'Favorites', 'MyRewards', 'MyReferrals', 'MyLinks'];
    return pages.map(p => PAGE_META[p] ? { page: p, ...PAGE_META[p] } : { page: p, label: prettify(p), icon: Link2, group: 'Other' });
  };

  const handleViewRole = async (role) => {
    setViewRole(role);
    setSwitching(true);
    try {
      setLinks(await loadRoleLinks(me, role));
    } catch (e) {
      setError(e?.message || 'Failed to load links for this role');
    } finally {
      setSwitching(false);
    }
  };

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }
  if (!links) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading your links...
      </div>
    );
  }

  // Group and order sections
  const groups = {};
  links.forEach(l => {
    const g = l.group || 'Other';
    (groups[g] = groups[g] || []).push(l);
  });
  const orderedGroups = Object.keys(groups).sort((a, b) => groupRank(a) - groupRank(b) || a.localeCompare(b));
  const isAdmin = ADMIN_ROLES.includes(viewRole) || me?.role === 'admin';

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-800">My Links</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">
          {isAdmin
            ? <>Showing the full link set for <span className="font-semibold text-slate-700">{viewRole}</span> — {links.length} pages.</>
            : <>Every page assigned to your account — {links.length} pages.</>}
        </p>
      </div>

      {isAdmin && (
        <div className="mb-6 flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-lg p-4">
          <ShieldCheck className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <label className="text-sm text-slate-600 font-medium flex-shrink-0">Check a role:</label>
          <select
            value={viewRole}
            onChange={e => handleViewRole(e.target.value)}
            disabled={switching}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{prettify(t)}</option>)}
          </select>
          {switching && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
      )}

      <div className="space-y-6">
        {orderedGroups.map(group => (
          <div key={group} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">{group}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {groups[group].map(link => {
                const Icon = link.icon || Link2;
                return (
                  <Link
                    key={link.page}
                    to={createPageUrl(link.page)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-orange-50 hover:border-orange-300 transition-colors text-sm text-slate-700 hover:text-slate-900"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0 text-orange-600" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}