import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, MapPin, Globe, Layers, ClipboardList, Package, Building2, FileText } from 'lucide-react';

import StateContentGenerator from '@/components/content-engine/StateContentGenerator';
import CountyContentGenerator from '@/components/content-engine/CountyContentGenerator';
import LifeEventContentGenerator from '@/components/content-engine/LifeEventContentGenerator';
import ChecklistContentGenerator from '@/components/content-engine/ChecklistContentGenerator';
import ItemContentGenerator from '@/components/content-engine/ItemContentGenerator';
import ProviderPageGenerator from '@/components/content-engine/ProviderPageGenerator';
import BlogContentGenerator from '@/components/content-engine/BlogContentGenerator';

export default function AdminContentEngine() {
  const [tab, setTab] = useState('state');
  const [loading, setLoading] = useState(true);
  const [stateGuides, setStateGuides] = useState([]);
  const [countyGuides, setCountyGuides] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [items, setItems] = useState([]);
  const [blogCount, setBlogCount] = useState({ drafts: 0, published: 0 });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [sg, cg, h, i] = await Promise.all([
      base44.entities.StateGuide.list('-created_date', 300),
      base44.entities.CountyGuide.list('-created_date', 300),
      base44.entities.LifeEventHub.list('-created_date', 50),
      base44.entities.ItemKnowledgeBase.list('-created_date', 200),
    ]);
    setStateGuides(sg); setCountyGuides(cg); setHubs(h); setItems(i);
    // Load blog counts in background
    base44.entities.SEOPage.filter({ page_type: 'blog', status: 'draft' }).then(d => setBlogCount(prev => ({ ...prev, drafts: d.length })));
    base44.entities.SEOPage.filter({ page_type: 'blog', status: 'published' }).then(p => setBlogCount(prev => ({ ...prev, published: p.length })));
    setLoading(false);
  };

  const statsDraft = {
    stateGuides: stateGuides.filter(g => g.status === 'draft').length,
    stateGuidesLive: stateGuides.filter(g => g.status === 'published').length,
    countyGuides: countyGuides.filter(g => g.status === 'draft').length,
    countyGuidesLive: countyGuides.filter(g => g.status === 'published').length,
    hubs: hubs.filter(h => h.status === 'draft').length,
    hubsLive: hubs.filter(h => h.status === 'published').length,
    items: items.filter(i => i.status === 'draft').length,
    itemsLive: items.filter(i => i.status === 'published').length,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Population Engine</h1>
          <p className="text-slate-500 text-sm">AI-powered content generation for all SEO pages · Saves as draft, never auto-publishes</p>
        </div>
        <Button onClick={loadAll} variant="outline" size="sm" className="gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'State Guides', draft: statsDraft.stateGuides, live: statsDraft.stateGuidesLive, total: stateGuides.length },
          { label: 'County Guides', draft: statsDraft.countyGuides, live: statsDraft.countyGuidesLive, total: countyGuides.length },
          { label: 'Event Hubs', draft: statsDraft.hubs, live: statsDraft.hubsLive, total: hubs.length },
          { label: 'Item Guides', draft: statsDraft.items, live: statsDraft.itemsLive, total: items.length },
          { label: 'Blog Posts', draft: blogCount.drafts, live: blogCount.published, total: blogCount.drafts + blogCount.published },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-slate-900">{s.total}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs text-yellow-600">{s.draft} draft</span>
                <span className="text-xs text-green-600">{s.live} live</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-xs text-amber-700">
        <strong>AI Content Rules:</strong> All generated content is educational only. No specific legal fees, deadlines, or requirements are invented. 
        Every page includes a disclaimer and ends with estate sale, cleanout, realtor, and investor CTAs. All content saves as <strong>draft</strong> — review before publishing.
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="state" className="gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5" />State Content</TabsTrigger>
          <TabsTrigger value="county" className="gap-1.5 text-xs"><Globe className="w-3.5 h-3.5" />County Content</TabsTrigger>
          <TabsTrigger value="life-event" className="gap-1.5 text-xs"><Layers className="w-3.5 h-3.5" />Life Event Content</TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1.5 text-xs"><ClipboardList className="w-3.5 h-3.5" />Checklist Content</TabsTrigger>
          <TabsTrigger value="items" className="gap-1.5 text-xs"><Package className="w-3.5 h-3.5" />Item Content</TabsTrigger>
          <TabsTrigger value="providers" className="gap-1.5 text-xs"><Building2 className="w-3.5 h-3.5" />Provider Pages</TabsTrigger>
          <TabsTrigger value="blogs" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" />Blogs</TabsTrigger>
        </TabsList>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <TabsContent value="state">
            <StateContentGenerator stateGuides={stateGuides} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="county">
            <CountyContentGenerator countyGuides={countyGuides} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="life-event">
            <LifeEventContentGenerator hubs={hubs} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="checklist">
            <ChecklistContentGenerator onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="items">
            <ItemContentGenerator items={items} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="providers">
            <ProviderPageGenerator onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="blogs">
            <BlogContentGenerator onRefresh={loadAll} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}