import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isAdminUser } from '@/lib/isAdminUser';
import {
  TrendingUp, Search, MousePointerClick, Eye, Target, AlertTriangle,
  RefreshCw, Globe, BarChart3, ArrowUpRight, Zap, ChevronDown, ChevronUp,
  FileText, CheckCircle, Clock, XCircle, Tag, MapPin, Building2,
  ShoppingBag, BookOpen, Newspaper, Layers, PenLine, ListChecks
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (n) => (n ?? 0).toLocaleString();
const pct = (n) => `${(n ?? 0).toFixed(1)}%`;

function StatCard({ label, value, sub, icon, color }) {
  const Icon = icon;
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function SectionHeader({ icon, title, badge }) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-slate-500" />
        <h2 className="font-bold text-slate-800 text-base">{title}</h2>
      </div>
      {badge && <Badge className="bg-slate-100 text-slate-600 text-xs">{badge}</Badge>}
    </div>
  );
}

function MiniStat({ label, value, color = 'text-slate-900' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`font-bold text-sm ${color}`}>{fmt(value)}</span>
    </div>
  );
}

function QueryRow({ query, clicks, impressions, ctr, position }) {
  const ctrColor = ctr >= 5 ? 'text-green-600' : ctr >= 2 ? 'text-amber-600' : 'text-red-500';
  const posColor = position <= 10 ? 'text-green-600' : position <= 20 ? 'text-amber-600' : 'text-slate-500';
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-2.5 px-4 text-sm text-slate-800 font-medium">{query}</td>
      <td className="py-2.5 px-4 text-sm text-slate-700 text-center">{fmt(impressions)}</td>
      <td className="py-2.5 px-4 text-sm text-slate-700 text-center">{fmt(clicks)}</td>
      <td className={`py-2.5 px-4 text-sm font-semibold text-center ${ctrColor}`}>{pct(ctr)}</td>
      <td className={`py-2.5 px-4 text-sm font-semibold text-center ${posColor}`}>#{position}</td>
    </tr>
  );
}

export default function PlatformSEODashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [showAllQueries, setShowAllQueries] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(true);

  // Entity counts
  const [pages, setPages] = useState([]);
  const [brands, setBrands] = useState({ total: 0, withHub: 0 });
  const [categories, setCategories] = useState({ total: 0, withHub: 0 });
  const [salesStats, setSalesStats] = useState({ total: 0, withSummary: 0 });
  const [itemStats, setItemStats] = useState({ total: 0, withDesc: 0 });
  const [companyStats, setCompanyStats] = useState({ total: 0, withProfile: 0 });
  const [blogStats, setBlogStats] = useState({ suggested: 0, drafts: 0, approved: 0, published: 0 });

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me && isAdminUser(me)) {
          await Promise.all([loadGSCData(), loadEntityStats()]);
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const loadGSCData = async () => {
    try {
      const snapshots = await base44.entities.KPISnapshot.filter(
        { source: 'search_console' }, '-created_date', 1
      );
      if (snapshots.length > 0) {
        try { setSnapshot(JSON.parse(snapshots[0].notes)); } catch (_) {}
      }
    } catch (_) {}
  };

  const loadEntityStats = async () => {
    try {
      const [
        allPages, brandHubs, catHubs,
        allSales, allItems, blogSeoPages, companyPages
      ] = await Promise.all([
        base44.entities.SEOPage.list('-created_date', 2000),
        base44.entities.SEOBrandHub.list('-created_date', 1000),
        base44.entities.SEOCategoryHub.list('-created_date', 500),
        base44.entities.EstateSale.filter({ status: { $in: ['upcoming', 'active', 'completed'] } }, '-created_date', 500),
        base44.entities.SEOItemProfile.list('-created_date', 1000),
        base44.entities.SEOPage.filter({ page_type: 'blog' }, '-created_date', 500),
        base44.entities.SEOPage.filter({ page_type: 'company', status: 'published' }, '-created_date', 500),
      ]);

      setPages(allPages);

      // Brands: count unique brand names in items vs how many have hub pages
      const uniqueBrands = new Set(allItems.map(i => i.brand_name).filter(Boolean));
      setBrands({ total: uniqueBrands.size, withHub: brandHubs.length });

      // Categories: count unique categories across sales vs hubs
      const allCats = new Set(allSales.flatMap(s => s.categories || []).filter(Boolean));
      setCategories({ total: allCats.size, withHub: catHubs.length });

      // Sales: with/without ai_summary
      setSalesStats({ total: allSales.length, withSummary: allSales.filter(s => s.ai_summary).length });

      // Items: with/without ai_description
      setItemStats({ total: allItems.length, withDesc: allItems.filter(i => i.ai_description).length });

      // Companies: scraped operators vs those with company SEO pages
      setCompanyStats({ total: 0, withProfile: companyPages.length }); // total loaded lazily

      // Blog queue breakdown
      setBlogStats({
        suggested: blogSeoPages.filter(p => p.status === 'draft' && !p.intro_content).length,
        drafts: blogSeoPages.filter(p => p.status === 'draft' && p.intro_content).length,
        approved: blogSeoPages.filter(p => p.status === 'draft' && p.main_content).length,
        published: blogSeoPages.filter(p => p.status === 'published').length,
      });

    } catch (_) {}
  };

  const runFetch = async () => {
    setRefreshing(true);
    try {
      await base44.functions.invoke('fetchSearchConsoleData', {});
      await loadGSCData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setRefreshing(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!user || !isAdminUser(user)) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
      </div>
    </div>
  );

  // ── Derived from pages ──────────────────────────────────────────────────────
  const totalPages = pages.length;
  const publishedPages = pages.filter(p => p.status === 'published').length;
  const draftPages = pages.filter(p => p.status === 'draft').length;
  const indexedPages = pages.filter(p => p.indexed_status === 'indexed').length;
  const notIndexedPages = pages.filter(p => p.indexed_status === 'not_indexed').length;

  const byType = (type) => pages.filter(p => p.page_type === type).length;

  const waitingForSitemap = pages.filter(p => p.status === 'published' && p.indexed_status === 'not_submitted').length;
  const submittedToGoogle = pages.filter(p => p.indexed_status === 'submitted').length;
  const needingReview = pages.filter(p => p.indexed_status === 'not_indexed').length;

  // GSC
  const queries = snapshot?.top_queries || [];
  const devices = snapshot?.device_breakdown || [];
  const opportunities = snapshot?.low_ctr_opportunities || [];
  const displayedQueries = showAllQueries ? queries : queries.slice(0, 10);
  const deviceData = devices.map(d => ({
    name: d.device.charAt(0).toUpperCase() + d.device.slice(1),
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-semibold uppercase tracking-widest">Platform SEO Command Center</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">SEO Dashboard</h1>
              <p className="text-slate-400 mt-1 text-sm">Content inventory, indexing queue, opportunities &amp; Google Search Console</p>
              {snapshot?.fetched_at && (
                <p className="text-slate-500 text-xs mt-2">GSC last updated: {new Date(snapshot.fetched_at).toLocaleString()} · {snapshot.period_days}-day window</p>
              )}
            </div>
            <Button onClick={runFetch} disabled={refreshing} className="bg-cyan-600 hover:bg-cyan-700 gap-2 w-full md:w-auto">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Fetching...' : 'Refresh GSC Data'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-10">

        {/* ── 1. SEO Pages Created ── */}
        <section>
          <SectionHeader icon={FileText} title="SEO Pages Created" badge={`${fmt(totalPages)} total`} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Total Pages" value={fmt(totalPages)} icon={FileText} color="bg-slate-100 text-slate-600" />
            <StatCard label="Published" value={fmt(publishedPages)} icon={CheckCircle} color="bg-green-100 text-green-600" />
            <StatCard label="Draft" value={fmt(draftPages)} icon={PenLine} color="bg-amber-100 text-amber-600" />
            <StatCard label="Indexed" value={fmt(indexedPages)} icon={Globe} color="bg-cyan-100 text-cyan-600" />
            <StatCard label="Not Indexed" value={fmt(notIndexedPages)} icon={XCircle} color="bg-red-100 text-red-500" />
          </div>
        </section>

        {/* ── 2. Pages By Type ── */}
        <section>
          <SectionHeader icon={Layers} title="Pages By Type" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Sales', type: 'sale', icon: ShoppingBag, color: 'bg-orange-100 text-orange-600' },
              { label: 'Items', type: 'item', icon: Tag, color: 'bg-violet-100 text-violet-600' },
              { label: 'Brands', type: 'brand', icon: Building2, color: 'bg-blue-100 text-blue-600' },
              { label: 'Categories', type: 'category', icon: Layers, color: 'bg-indigo-100 text-indigo-600' },
              { label: 'Companies', type: 'company', icon: Building2, color: 'bg-teal-100 text-teal-600' },
              { label: 'Cities', type: 'city', icon: MapPin, color: 'bg-emerald-100 text-emerald-600' },
              { label: 'Blogs', type: 'blog', icon: BookOpen, color: 'bg-pink-100 text-pink-600' },
              { label: 'Reports', type: 'report', icon: Newspaper, color: 'bg-yellow-100 text-yellow-700' },
            ].map(({ label, type, icon, color }) => (
              <div key={type} className="bg-white border rounded-xl p-4 shadow-sm text-center">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2 ${color}`}>
                  {React.createElement(icon, { className: 'w-4 h-4' })}
                </div>
                <div className="text-2xl font-black text-slate-900">{fmt(byType(type))}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Content Opportunities ── */}
        <section>
          <SectionHeader icon={AlertTriangle} title="Content Opportunities" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Brands / Categories */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-500" /> Hubs Missing
              </h3>
              <MiniStat
                label="Brands without hub pages"
                value={Math.max(0, brands.total - brands.withHub)}
                color="text-red-600"
              />
              <MiniStat
                label="Categories without hub pages"
                value={Math.max(0, categories.total - categories.withHub)}
                color="text-red-600"
              />
              <MiniStat label="Brand hubs created" value={brands.withHub} color="text-green-600" />
              <MiniStat label="Category hubs created" value={categories.withHub} color="text-green-600" />
            </div>

            {/* Sales / Items */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-500" /> Content Gaps
              </h3>
              <MiniStat
                label="Sales without AI summary"
                value={salesStats.total - salesStats.withSummary}
                color="text-red-600"
              />
              <MiniStat
                label="Items missing descriptions"
                value={itemStats.total - itemStats.withDesc}
                color="text-red-600"
              />
              <MiniStat label="Sales with summaries" value={salesStats.withSummary} color="text-green-600" />
              <MiniStat label="Items with descriptions" value={itemStats.withDesc} color="text-green-600" />
            </div>

            {/* Companies */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-500" /> Company Profiles
              </h3>
              <MiniStat label="Company SEO pages created" value={companyStats.withProfile} color="text-green-600" />
              <MiniStat label="Published company pages" value={pages.filter(p => p.page_type === 'company' && p.status === 'published').length} color="text-green-600" />
              <MiniStat label="Company pages (draft)" value={pages.filter(p => p.page_type === 'company' && p.status === 'draft').length} color="text-amber-600" />
            </div>
          </div>
        </section>

        {/* ── 4. Indexing Queue ── */}
        <section>
          <SectionHeader icon={ListChecks} title="Indexing Queue" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-amber-800">Waiting for Sitemap</span>
              </div>
              <div className="text-4xl font-black text-amber-700">{fmt(waitingForSitemap)}</div>
              <div className="text-xs text-amber-600 mt-1">Published pages not yet submitted</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-blue-800">Submitted to Google</span>
              </div>
              <div className="text-4xl font-black text-blue-700">{fmt(submittedToGoogle)}</div>
              <div className="text-xs text-blue-600 mt-1">Awaiting crawl confirmation</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-bold text-red-800">Needing Review</span>
              </div>
              <div className="text-4xl font-black text-red-600">{fmt(needingReview)}</div>
              <div className="text-xs text-red-600 mt-1">Marked not_indexed by Google</div>
            </div>
          </div>
        </section>

        {/* ── 5. AI Blog Queue ── */}
        <section>
          <SectionHeader icon={BookOpen} title="AI Blog Queue" badge={`${fmt(blogStats.published)} published`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Suggested Posts" value={fmt(blogStats.suggested)} sub="Ready to generate" icon={Zap} color="bg-violet-100 text-violet-600" />
            <StatCard label="Drafts" value={fmt(blogStats.drafts)} sub="In progress" icon={PenLine} color="bg-amber-100 text-amber-600" />
            <StatCard label="Approved" value={fmt(blogStats.approved)} sub="Ready to publish" icon={CheckCircle} color="bg-cyan-100 text-cyan-600" />
            <StatCard label="Published" value={fmt(blogStats.published)} sub="Live on site" icon={Globe} color="bg-green-100 text-green-600" />
          </div>
        </section>

        {/* ── 6. Performance (GSC) ── */}
        <section>
          <SectionHeader icon={TrendingUp} title="Performance — Google Search Console" />

          {!snapshot ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">No Search Console Data Yet</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                Click "Refresh GSC Data" to pull your latest Google Search Console metrics.
              </p>
              <Button onClick={runFetch} disabled={refreshing} className="bg-cyan-600 hover:bg-cyan-700 gap-2">
                <Zap className="w-4 h-4" /> Fetch Now
              </Button>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Clicks (28d)" value={fmt(snapshot.site_total_clicks)} icon={MousePointerClick} color="bg-orange-100 text-orange-600" />
                <StatCard label="Impressions" value={fmt(snapshot.site_total_impressions)} icon={Eye} color="bg-cyan-100 text-cyan-600" />
                <StatCard label="Avg CTR" value={pct(snapshot.site_avg_ctr)} sub="Click-through rate" icon={TrendingUp} color="bg-green-100 text-green-600" />
                <StatCard label="Avg Position" value={`#${snapshot.site_avg_position}`} sub="Lower = better" icon={Target} color="bg-violet-100 text-violet-600" />
              </div>

              {/* Low CTR Opportunities */}
              {opportunities.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm overflow-hidden mb-6">
                  <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setShowOpportunities(!showOpportunities)}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <div>
                        <h3 className="font-bold text-amber-900 text-sm">Low CTR Opportunities — {opportunities.length} pages</h3>
                        <p className="text-amber-700 text-xs">High impressions but low click-through — rewrite titles/descriptions for quick wins</p>
                      </div>
                    </div>
                    {showOpportunities ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
                  </button>
                  {showOpportunities && (
                    <div className="border-t border-amber-200">
                      <table className="w-full">
                        <thead className="bg-amber-100">
                          <tr>
                            <th className="py-2 px-4 text-xs text-amber-800 font-bold text-left uppercase">Page</th>
                            <th className="py-2 px-4 text-xs text-amber-800 font-bold text-center uppercase">Impressions</th>
                            <th className="py-2 px-4 text-xs text-amber-800 font-bold text-center uppercase">CTR</th>
                            <th className="py-2 px-4 text-xs text-amber-800 font-bold text-center uppercase">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opportunities.map((opp, i) => (
                            <tr key={i} className="border-t border-amber-100 hover:bg-amber-50">
                              <td className="py-2 px-4 text-xs text-slate-700 max-w-xs truncate">{opp.page}</td>
                              <td className="py-2 px-4 text-xs text-center font-semibold">{fmt(opp.impressions)}</td>
                              <td className="py-2 px-4 text-xs text-center text-red-600 font-bold">{pct(opp.ctr)}</td>
                              <td className="py-2 px-4 text-xs text-center">#{opp.position}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Search Queries */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-500" />
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Top Search Queries</h3>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600 text-xs">{queries.length} queries</Badge>
                  </div>
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-left uppercase">Query</th>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Impressions</th>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Clicks</th>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">CTR</th>
                        <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedQueries.map((q, i) => <QueryRow key={i} {...q} />)}
                    </tbody>
                  </table>
                  {queries.length > 10 && (
                    <div className="p-4 border-t border-slate-100 text-center">
                      <button onClick={() => setShowAllQueries(!showAllQueries)} className="text-sm text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-1 mx-auto">
                        {showAllQueries ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />Show all {queries.length} queries</>}
                      </button>
                    </div>
                  )}
                </div>

                {/* Device Breakdown */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Device Breakdown</h3>
                  </div>
                  {deviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={deviceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={65} />
                        <Tooltip />
                        <Bar dataKey="clicks" fill="#f97316" radius={[0, 4, 4, 0]} name="Clicks" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No device data</div>
                  )}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Sale pages ranked</span>
                      <span className="font-bold text-slate-900">{fmt(snapshot.sale_pages?.length || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total impressions</span>
                      <span className="font-bold text-slate-900">{fmt(snapshot.site_total_impressions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Pages */}
              {(snapshot.sale_pages || []).length > 0 && (
                <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-orange-500" />
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Top Pages in Google</h3>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 text-xs">{snapshot.sale_pages.length} ranked</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-left uppercase">Page URL</th>
                          <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Impressions</th>
                          <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Clicks</th>
                          <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">CTR</th>
                          <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Position</th>
                          <th className="py-2.5 px-4 text-xs text-slate-500 font-bold text-center uppercase">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshot.sale_pages.slice(0, 20).map((sp, i) => (
                          <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="py-2.5 px-4 text-xs text-slate-700 max-w-xs truncate">{sp.page_url}</td>
                            <td className="py-2.5 px-4 text-xs text-center font-semibold">{fmt(sp.impressions)}</td>
                            <td className="py-2.5 px-4 text-xs text-center">{fmt(sp.clicks)}</td>
                            <td className={`py-2.5 px-4 text-xs font-bold text-center ${sp.ctr >= 5 ? 'text-green-600' : sp.ctr >= 2 ? 'text-amber-600' : 'text-red-500'}`}>{pct(sp.ctr)}</td>
                            <td className={`py-2.5 px-4 text-xs font-semibold text-center ${sp.position <= 10 ? 'text-green-600' : sp.position <= 20 ? 'text-amber-600' : 'text-slate-500'}`}>#{sp.position}</td>
                            <td className="py-2.5 px-4 text-center">
                              <a href={sp.page_url} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-700">
                                <ArrowUpRight className="w-3.5 h-3.5 inline" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

      </div>
    </div>
  );
}