import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Building2, Tag, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import SEOHead from '@/components/seo/SEOHead';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

export default function CityHubPage() {
  const [hub, setHub] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    // Support both ?slug=/estate-sales/red-bank-nj and direct path param
    const slug = params.get('slug') || window.location.pathname;

    try {
      const hubs = await base44.entities.SEOCityHub.filter({ slug });
      const cityHub = hubs[0];
      setHub(cityHub);

      if (cityHub) {
        const city = cityHub.city;
        const state = cityHub.state;
        const activeSales = await base44.entities.EstateSale.filter(
          { 'property_address.city': city, 'property_address.state': state, status: { $in: ['upcoming', 'active'] }, sale_type: { $ne: 'buyout_or_cleanout' } },
          '-created_date', 12
        );
        setSales(activeSales);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (!hub) return <div className="min-h-screen flex items-center justify-center text-slate-500">Location not found.</div>;

  const canonical = `https://estatesalen.com${hub.slug}`;
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Estate Sales', href: '/EstateSaleFinder' },
    { label: `${hub.state} Sales`, href: `/SearchByState?state=${hub.state}` },
    { label: `${hub.city}, ${hub.state}` },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: hub.seo_title || `Estate Sales in ${hub.city}, ${hub.state}`,
        description: hub.meta_description || '',
        url: canonical,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, ...(c.href ? { item: `https://estatesalen.com${c.href}` } : {}) })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <SEOHead title={hub.seo_title || `Estate Sales in ${hub.city}, ${hub.state} | EstateSalen`} description={hub.meta_description} canonical={canonical} jsonLd={jsonLd} />
      <UniversalHeader user={null} isAuthenticated={false} />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <SEOBreadcrumb crumbs={crumbs} />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <MapPin className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">
              Estate Sales in {hub.city}, {hub.state}
            </h1>
            <p className="text-slate-500">{hub.total_sales_count || 0} sales recorded</p>
          </div>
        </div>

        {hub.local_intro && (
          <div className="bg-white border rounded-2xl p-6 mb-8 prose prose-slate max-w-none">
            <ReactMarkdown>{hub.local_intro}</ReactMarkdown>
          </div>
        )}

        {/* Upcoming Sales */}
        {sales.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" /> Upcoming & Active Sales
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {sales.map(sale => (
                <Link key={sale.id} to={`/EstateSaleDetail?id=${sale.id}`}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      {sale.images?.[0] && (
                        <img src={typeof sale.images[0] === 'string' ? sale.images[0] : sale.images[0].url} alt={sale.title} className="w-full h-40 object-cover rounded-lg mb-3" loading="lazy" />
                      )}
                      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{sale.title}</h3>
                      {sale.sale_dates?.[0] && (
                        <p className="text-sm text-slate-500">{format(new Date(sale.sale_dates[0].date + 'T00:00:00'), 'MMM d, yyyy')}</p>
                      )}
                      {sale.categories?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sale.categories.slice(0, 3).map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Popular categories */}
        {hub.popular_categories_json?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-cyan-500" /> Popular Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              {hub.popular_categories_json.map(cat => (
                <Link key={cat} to={`/categories?slug=/categories/${cat.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Badge variant="outline" className="text-sm py-1 px-3 hover:border-orange-400 cursor-pointer">{cat}</Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {hub.estate_sale_guide && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" /> Estate Sale Guide for {hub.city}
            </h2>
            <div className="bg-white border rounded-2xl p-6 prose prose-slate max-w-none">
              <ReactMarkdown>{hub.estate_sale_guide}</ReactMarkdown>
            </div>
          </section>
        )}
      </div>

      <SharedFooter />
    </div>
  );
}