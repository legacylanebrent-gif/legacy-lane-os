import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, BarChart3, Tag, Award, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import SEOHead from '@/components/seo/SEOHead';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import { format } from 'date-fns';

export default function PriceGuidePage() {
  const [knowledge, setKnowledge] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug) { setLoading(false); return; }
    try {
      const [knowledgeRecords] = await Promise.all([
        base44.entities.ItemKnowledge.filter({ slug, status: 'published' }),
      ]);
      const k = knowledgeRecords[0];
      setKnowledge(k);
      if (k) {
        const [history, demandRecords] = await Promise.all([
          base44.entities.ItemPriceHistory.filter({ item_knowledge_id: k.id }, '-lookup_date', 50),
          base44.entities.DemandMetrics.filter({ item_knowledge_id: k.id }),
        ]);
        setPriceHistory(history);
        setDemand(demandRecords[0] || null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (!knowledge) return <div className="min-h-screen flex items-center justify-center text-slate-500">Price guide not found.</div>;

  const canonical = `https://estatesalen.com/price-guide?slug=${encodeURIComponent(knowledge.slug)}`;
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Price Guide', href: '/price-guide' },
    { label: knowledge.entity_name },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${knowledge.entity_name} — Price Guide & Value History`,
    description: knowledge.meta_description || `Find out how much ${knowledge.entity_name} is worth at estate sales. View price history, demand data, and collector information.`,
    url: canonical,
    publisher: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
    ...(knowledge.brand ? { about: { '@type': 'Brand', name: knowledge.brand } } : {}),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <SEOHead
        title={knowledge.seo_title || `${knowledge.entity_name} Price Guide — How Much Is It Worth? | EstateSalen`}
        description={knowledge.meta_description || `Find out how much ${knowledge.entity_name} is worth. View price history, demand data, and collector insights.`}
        image={knowledge.primary_image_url}
        canonical={canonical}
        jsonLd={jsonLd}
      />
      <UniversalHeader user={null} isAuthenticated={false} />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <SEOBreadcrumb crumbs={crumbs} />

        <div className="flex items-start gap-4 mb-6">
          {knowledge.primary_image_url && (
            <img src={knowledge.primary_image_url} alt={knowledge.entity_name} className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
          )}
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">{knowledge.entity_name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {knowledge.brand && <Badge variant="outline">{knowledge.brand}</Badge>}
              {knowledge.category && <Badge variant="secondary">{knowledge.category}</Badge>}
              {knowledge.era && <Badge className="bg-amber-100 text-amber-800">{knowledge.era}</Badge>}
              {knowledge.style && <Badge className="bg-violet-100 text-violet-800">{knowledge.style}</Badge>}
            </div>
          </div>
        </div>

        {/* Price Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-700">
              {knowledge.average_value ? `$${knowledge.average_value?.toFixed(0)}` : 'N/A'}
            </div>
            <div className="text-xs text-green-600">Average Value</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-700">
              {knowledge.highest_value ? `$${knowledge.highest_value?.toFixed(0)}` : 'N/A'}
            </div>
            <div className="text-xs text-blue-600">Highest Sale</div>
          </div>
          <div className="bg-slate-50 border rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-700">
              {knowledge.lowest_value ? `$${knowledge.lowest_value?.toFixed(0)}` : 'N/A'}
            </div>
            <div className="text-xs text-slate-500">Lowest Sale</div>
          </div>
        </div>

        {/* Demand */}
        {demand && (
          <div className="bg-white border rounded-2xl p-5 mb-8">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-orange-500" /> Buyer Demand</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
              <div><div className="text-xl font-bold text-slate-800">{demand.watch_count}</div><div className="text-slate-500">Watching</div></div>
              <div><div className="text-xl font-bold text-slate-800">{demand.wanted_count}</div><div className="text-slate-500">Wanted</div></div>
              <div><div className="text-xl font-bold text-slate-800">{demand.active_inventory_count}</div><div className="text-slate-500">Available</div></div>
              <div><div className="text-xl font-bold text-slate-800">{demand.sold_inventory_count}</div><div className="text-slate-500">Sold</div></div>
            </div>
            {demand.demand_trend && (
              <div className="mt-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-slate-600">Demand trend: <strong className="capitalize">{demand.demand_trend}</strong></span>
              </div>
            )}
          </div>
        )}

        {knowledge.ai_description && (
          <div className="bg-white border rounded-2xl p-6 mb-8">
            <h2 className="font-bold text-slate-900 mb-3">About {knowledge.entity_name}</h2>
            <p className="text-slate-700 leading-relaxed">{knowledge.ai_description}</p>
          </div>
        )}

        {knowledge.historical_context && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-600" /> Historical Context</h2>
            <p className="text-slate-700 leading-relaxed">{knowledge.historical_context}</p>
          </div>
        )}

        {/* Price History */}
        {priceHistory.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-500" /> Price History ({priceHistory.length} data points)</h2>
            <div className="bg-white border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold text-slate-700">Price</th>
                    <th className="py-3 px-4 text-left font-semibold text-slate-700">Source</th>
                    <th className="py-3 px-4 text-left font-semibold text-slate-700">Condition</th>
                    <th className="py-3 px-4 text-left font-semibold text-slate-700">Location</th>
                    <th className="py-3 px-4 text-left font-semibold text-slate-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((h, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-semibold text-green-700">${h.price?.toFixed(0)}</td>
                      <td className="py-2.5 px-4 text-slate-600 capitalize">{h.source?.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 px-4 text-slate-500 capitalize">{h.condition || '—'}</td>
                      <td className="py-2.5 px-4 text-slate-500">{h.city && h.state ? `${h.city}, ${h.state}` : '—'}</td>
                      <td className="py-2.5 px-4 text-slate-400 text-xs">{h.lookup_date ? format(new Date(h.lookup_date), 'MMM d, yyyy') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="mt-6 p-5 bg-orange-50 border border-orange-200 rounded-2xl">
          <p className="text-sm text-slate-700 mb-2">Looking for {knowledge.entity_name}?</p>
          <Link to="/EstateSaleFinder" className="text-orange-600 font-semibold text-sm hover:underline">Browse upcoming estate sales →</Link>
        </div>
      </div>

      <SharedFooter />
    </div>
  );
}