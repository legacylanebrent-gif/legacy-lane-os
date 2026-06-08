import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, FileText, MapPin, Globe, Users, Building2, GitBranch, BookOpen, GraduationCap, BarChart3, TrendingUp, DollarSign } from 'lucide-react';

import SEAdminContentHubs from '@/components/seo-engine/admin/SEAdminContentHubs';
import SEAdminStateGuides from '@/components/seo-engine/admin/SEAdminStateGuides';
import SEAdminCountyGuides from '@/components/seo-engine/admin/SEAdminCountyGuides';
import SEAdminLeads from '@/components/seo-engine/admin/SEAdminLeads';
import SEAdminProviders from '@/components/seo-engine/admin/SEAdminProviders';
import SEAdminRouting from '@/components/seo-engine/admin/SEAdminRouting';
import SEAdminItemKnowledge from '@/components/seo-engine/admin/SEAdminItemKnowledge';
import SEAdminUniversity from '@/components/seo-engine/admin/SEAdminUniversity';
import SEAdminWeeklyReports from '@/components/seo-engine/admin/SEAdminWeeklyReports';
import SEAdminSEOPerformance from '@/components/seo-engine/admin/SEAdminSEOPerformance';
import SEAdminRevenue from '@/components/seo-engine/admin/SEAdminRevenue';

function StatsBar({ hubs, stateGuides, countyGuides, leads, providers, items, articles, reports }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {[
        { label: 'Hubs', value: hubs.length, pub: hubs.filter(x=>x.status==='published').length, icon: FileText, color: 'text-purple-600' },
        { label: 'State Guides', value: stateGuides.length, pub: stateGuides.filter(x=>x.status==='published').length, icon: MapPin, color: 'text-blue-600' },
        { label: 'County Guides', value: countyGuides.length, pub: countyGuides.filter(x=>x.status==='published').length, icon: Globe, color: 'text-cyan-600' },
        { label: 'Leads', value: leads.length, pub: leads.filter(x=>x.crm_status==='new').length, icon: Users, color: 'text-green-600' },
        { label: 'Providers', value: providers.length, pub: providers.filter(x=>x.status==='active').length, icon: Building2, color: 'text-amber-600' },
        { label: 'Item Guides', value: items.length, pub: items.filter(x=>x.status==='published').length, icon: BookOpen, color: 'text-orange-600' },
        { label: 'Articles', value: articles.length, pub: articles.filter(x=>x.status==='published').length, icon: GraduationCap, color: 'text-indigo-600' },
        { label: 'Reports', value: reports.length, pub: reports.filter(x=>x.status==='published').length, icon: BarChart3, color: 'text-rose-600' },
      ].map(({ label, value, pub, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="p-3 flex items-center gap-2">
            <Icon className={`w-6 h-6 shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
              <p className="text-xs text-slate-400 truncate">{label} · {pub} live</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminLifeTransitionEngine() {
  const [tab, setTab] = useState('hubs');
  const [loading, setLoading] = useState(true);

  const [hubs, setHubs] = useState([]);
  const [stateGuides, setStateGuides] = useState([]);
  const [countyGuides, setCountyGuides] = useState([]);
  const [leads, setLeads] = useState([]);
  const [providers, setProviders] = useState([]);
  const [routingRules, setRoutingRules] = useState([]);
  const [items, setItems] = useState([]);
  const [articles, setArticles] = useState([]);
  const [reports, setReports] = useState([]);
  const [seoLogs, setSeoLogs] = useState([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [h, sg, cg, l, p, rr, i, a, r, sl] = await Promise.all([
      base44.entities.LifeEventHub.list('-created_date', 100),
      base44.entities.StateGuide.list('-created_date', 200),
      base44.entities.CountyGuide.list('-created_date', 200),
      base44.entities.EstateTransitionLead.list('-created_date', 500),
      base44.entities.ProviderDirectory.list('-created_date', 100),
      base44.entities.ProviderRoutingRule.list('-created_date', 200),
      base44.entities.ItemKnowledgeBase.list('-created_date', 200),
      base44.entities.EstateSaleUniversityArticle.list('-created_date', 200),
      base44.entities.WeeklyMarketReport.list('-created_date', 50),
      base44.entities.SEOIndexLog.list('-created_date', 500),
    ]);
    setHubs(h); setStateGuides(sg); setCountyGuides(cg); setLeads(l);
    setProviders(p); setRoutingRules(rr); setItems(i); setArticles(a);
    setReports(r); setSeoLogs(sl);
    setLoading(false);
  };

  const tabs = [
    { value: 'hubs', label: 'Content Hubs', icon: FileText },
    { value: 'state-guides', label: 'State Guides', icon: MapPin },
    { value: 'county-guides', label: 'County Guides', icon: Globe },
    { value: 'leads', label: `Leads (${leads.length})`, icon: Users },
    { value: 'providers', label: 'Providers', icon: Building2 },
    { value: 'routing', label: 'Routing', icon: GitBranch },
    { value: 'items', label: 'Item Knowledge', icon: BookOpen },
    { value: 'university', label: 'University', icon: GraduationCap },
    { value: 'reports', label: 'Weekly Reports', icon: BarChart3 },
    { value: 'seo', label: 'SEO Performance', icon: TrendingUp },
    { value: 'revenue', label: 'Revenue', icon: DollarSign },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Life Transition SEO Engine</h1>
          <p className="text-slate-500 text-sm">AI content · lead capture · provider routing · SEO performance</p>
        </div>
        <Button onClick={loadAll} variant="outline" size="sm" className="gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <StatsBar hubs={hubs} stateGuides={stateGuides} countyGuides={countyGuides} leads={leads} providers={providers} items={items} articles={articles} reports={reports} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-xs">
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="hubs"><SEAdminContentHubs hubs={hubs} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="state-guides"><SEAdminStateGuides guides={stateGuides} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="county-guides"><SEAdminCountyGuides guides={countyGuides} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="leads"><SEAdminLeads leads={leads} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="providers"><SEAdminProviders providers={providers} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="routing"><SEAdminRouting rules={routingRules} providers={providers} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="items"><SEAdminItemKnowledge items={items} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="university"><SEAdminUniversity articles={articles} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="reports"><SEAdminWeeklyReports reports={reports} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="seo"><SEAdminSEOPerformance seoLogs={seoLogs} onRefresh={loadAll} /></TabsContent>
        <TabsContent value="revenue"><SEAdminRevenue leads={leads} seoLogs={seoLogs} /></TabsContent>
      </Tabs>
    </div>
  );
}