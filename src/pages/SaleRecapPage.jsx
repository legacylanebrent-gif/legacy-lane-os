import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Trophy, Tag, Eye, TrendingUp, Award, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import SEOHead from '@/components/seo/SEOHead';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import { format } from 'date-fns';

export default function SaleRecapPage() {
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug) { setLoading(false); return; }
    try {
      const recaps = await base44.entities.SaleRecap.filter({ slug, status: 'published' });
      setRecap(recaps[0] || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (!recap) return <div className="min-h-screen flex items-center justify-center text-slate-500">Sale recap not found.</div>;

  const canonical = `https://estatesalen.com/sale-recap?slug=${encodeURIComponent(recap.slug)}`;
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Estate Sales', href: '/EstateSaleFinder' },
    { label: `${recap.title} — Recap` },
  ];

  const jsonLd = recap.schema_json || {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: recap.seo_title || `${recap.title} — Sale Recap`,
    description: recap.meta_description || '',
    url: canonical,
    publisher: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
  };

  const sellThroughRate = recap.total_items ? Math.round((recap.total_sold / recap.total_items) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <SEOHead title={recap.seo_title || `${recap.title} — Sale Recap`} description={recap.meta_description} canonical={canonical} jsonLd={jsonLd} />
      <UniversalHeader user={null} isAuthenticated={false} />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <SEOBreadcrumb crumbs={crumbs} />

        {recap.primary_image_url && (
          <img src={recap.primary_image_url} alt={recap.title} className="w-full h-56 object-cover rounded-2xl mb-6" />
        )}

        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trophy className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">{recap.title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1 flex-wrap">
              {recap.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{recap.city}, {recap.state}</span>}
              {recap.operator_name && <span className="flex items-center gap-1"><Award className="w-3 h-3" />{recap.operator_name}</span>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{recap.total_items || 0}</div>
            <div className="text-xs text-slate-500">Total Items</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-700">{recap.total_sold || 0}</div>
            <div className="text-xs text-green-600">Items Sold</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-700">{recap.total_views || 0}</div>
            <div className="text-xs text-blue-600">Total Views</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-700">{sellThroughRate}%</div>
            <div className="text-xs text-orange-600">Sell-Through</div>
          </div>
        </div>

        {recap.actual_revenue > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 text-center">
            <div className="text-3xl font-bold text-green-700">${recap.actual_revenue?.toLocaleString()}</div>
            <div className="text-sm text-green-600">Total Sale Revenue</div>
          </div>
        )}

        {recap.ai_summary && (
          <div className="bg-white border rounded-2xl p-6 mb-8">
            <h2 className="font-bold text-slate-900 mb-2">Sale Summary</h2>
            <p className="text-slate-700 leading-relaxed">{recap.ai_summary}</p>
          </div>
        )}

        {recap.most_valuable_items?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Most Valuable Items
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recap.most_valuable_items.map((item, i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-36 object-cover rounded-lg mb-3" loading="lazy" />}
                    <p className="font-semibold text-slate-800 line-clamp-2">{item.name}</p>
                    {item.sold_price && <p className="text-green-600 font-bold mt-1">${item.sold_price?.toLocaleString()}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {recap.top_categories?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2"><Tag className="w-5 h-5 text-cyan-500" /> Top Categories</h2>
            <div className="flex flex-wrap gap-2">
              {recap.top_categories.map(c => (
                <Link key={c} to={`/categories?slug=/categories/${c.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Badge variant="outline" className="hover:border-orange-400">{c}</Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {recap.notable_brands?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2"><Award className="w-5 h-5 text-blue-500" /> Notable Brands</h2>
            <div className="flex flex-wrap gap-2">
              {recap.notable_brands.map(b => (
                <Link key={b} to={`/brands?slug=/brands/${b.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{b}</Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {recap.historical_notes && (
          <div className="bg-slate-50 border rounded-2xl p-6">
            <h2 className="font-bold text-slate-900 mb-2">Historical Notes</h2>
            <p className="text-slate-700">{recap.historical_notes}</p>
          </div>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}