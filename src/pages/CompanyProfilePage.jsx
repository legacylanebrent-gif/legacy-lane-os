import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Phone, Globe, ShoppingBag, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import SEOHead from '@/components/seo/SEOHead';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

export default function CompanyProfilePage() {
  const [page, setPage] = useState(null);
  const [activeSales, setActiveSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug) { setLoading(false); return; }
    try {
      const pages = await base44.entities.SEOPage.filter({ slug, page_type: 'company' });
      const p = pages[0];
      setPage(p);
      if (p?.entity_id) {
        const sales = await base44.entities.EstateSale.filter(
          { operator_id: p.entity_id, status: { $in: ['upcoming', 'active'] } }, '-created_date', 6
        );
        setActiveSales(sales);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (!page) return <div className="min-h-screen flex items-center justify-center text-slate-500">Company not found.</div>;

  const canonical = page.canonical_url || `https://estatesalen.com/companies?slug=${encodeURIComponent(page.slug)}`;
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Estate Sale Companies', href: '/BrowseOperators' },
    { label: page.h1 || page.title },
  ];

  const jsonLd = page.schema_json || {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: page.h1 || page.title,
    description: page.meta_description,
    url: canonical,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <SEOHead title={page.title} description={page.meta_description} canonical={canonical} jsonLd={jsonLd} />
      <UniversalHeader user={null} isAuthenticated={false} />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <SEOBreadcrumb crumbs={crumbs} />
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">{page.h1 || page.title}</h1>
            {page.meta_description && <p className="text-slate-500 text-sm mt-1">{page.meta_description}</p>}
          </div>
        </div>

        {page.intro_content && (
          <div className="bg-white border rounded-2xl p-6 mb-8 prose prose-slate max-w-none">
            <ReactMarkdown>{page.intro_content}</ReactMarkdown>
          </div>
        )}

        {activeSales.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" /> Upcoming Sales
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {activeSales.map(sale => (
                <Link key={sale.id} to={`/EstateSaleDetail?id=${sale.id}`}>
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{sale.title}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{sale.property_address?.city}, {sale.property_address?.state}</span>
                      </div>
                      {sale.sale_dates?.[0] && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(sale.sale_dates[0].date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {page.main_content && (
          <div className="bg-white border rounded-2xl p-6 prose prose-slate max-w-none">
            <ReactMarkdown>{page.main_content}</ReactMarkdown>
          </div>
        )}

        {page.faq_json?.length > 0 && (
          <section className="mt-8 bg-slate-50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {page.faq_json.map((faq, i) => (
                <div key={i} className="border-b border-slate-200 pb-4 last:border-0">
                  <h3 className="font-semibold text-slate-800 mb-1">{faq.question}</h3>
                  <p className="text-slate-600 text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}