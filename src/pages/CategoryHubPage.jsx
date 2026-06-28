import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Tag, BookOpen, ShoppingBag, TrendingUp, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import SEOHead from '@/components/seo/SEOHead';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import ReactMarkdown from 'react-markdown';

export default function CategoryHubPage() {
  const [hub, setHub] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || window.location.pathname;
    try {
      const hubs = await base44.entities.SEOCategoryHub.filter({ slug });
      const h = hubs[0];
      setHub(h);
      if (h) {
        const profiles = await base44.entities.SEOItemProfile.filter({ category_name: h.category_name }, '-created_date', 12);
        setItems(profiles);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (!hub) return <div className="min-h-screen flex items-center justify-center text-slate-500">Category not found.</div>;

  const canonical = `https://estatesalen.com${hub.slug}`;
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Categories', href: '/BrowseItems' },
    { label: hub.category_name },
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: hub.seo_title || `${hub.category_name} at Estate Sales`, description: hub.meta_description || '', url: canonical },
      { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, ...(c.href ? { item: `https://estatesalen.com${c.href}` } : {}) })) },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <SEOHead title={hub.seo_title || `${hub.category_name} Estate Sale Items | EstateSalen`} description={hub.meta_description} canonical={canonical} jsonLd={jsonLd} />
      <UniversalHeader user={null} isAuthenticated={false} />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <SEOBreadcrumb crumbs={crumbs} />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center"><Tag className="w-6 h-6 text-cyan-600" /></div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">{hub.category_name}</h1>
            <p className="text-slate-500">{hub.total_items_found || 0} items found · {hub.total_items_sold || 0} sold</p>
          </div>
        </div>

        {hub.average_sold_price && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700">${hub.average_sold_price?.toFixed(0)}</div>
              <div className="text-sm text-green-600">Avg Sold Price</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{hub.total_items_found || 0}</div>
              <div className="text-sm text-blue-600">Items Found</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-700">{hub.total_items_sold || 0}</div>
              <div className="text-sm text-orange-600">Items Sold</div>
            </div>
          </div>
        )}

        {hub.category_intro && (
          <div className="bg-white border rounded-2xl p-6 mb-8 prose prose-slate max-w-none">
            <ReactMarkdown>{hub.category_intro}</ReactMarkdown>
          </div>
        )}

        {hub.related_brands?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><Award className="w-5 h-5 text-orange-500" /> Top Brands</h2>
            <div className="flex flex-wrap gap-2">
              {hub.related_brands.map(b => (
                <Link key={b} to={`/brands?slug=/brands/${b.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Badge variant="outline" className="hover:border-orange-400 cursor-pointer">{b}</Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-cyan-500" /> Recent Items</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.filter(i => i.image_url).map(item => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-3">
                    <img src={item.image_url} alt={item.item_name} className="w-full h-36 object-cover rounded-lg mb-2" loading="lazy" />
                    <p className="font-medium text-sm text-slate-800 line-clamp-2">{item.item_name}</p>
                    {item.value_low && <p className="text-xs text-green-600 mt-1">Est. ${item.value_low}–${item.value_high}</p>}
                    {item.brand_name && <p className="text-xs text-slate-500">{item.brand_name}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {hub.buying_guide && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><BookOpen className="w-5 h-5 text-violet-500" /> Buying Guide</h2>
            <div className="bg-white border rounded-2xl p-6 prose prose-slate max-w-none"><ReactMarkdown>{hub.buying_guide}</ReactMarkdown></div>
          </section>
        )}
        {hub.selling_guide && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> Selling Guide</h2>
            <div className="bg-white border rounded-2xl p-6 prose prose-slate max-w-none"><ReactMarkdown>{hub.selling_guide}</ReactMarkdown></div>
          </section>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}