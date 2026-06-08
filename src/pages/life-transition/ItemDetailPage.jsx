import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SEBreadcrumb from '@/components/seo-engine/SEBreadcrumb';
import SEDisclaimer from '@/components/seo-engine/SEDisclaimer';
import SELeadCTA from '@/components/seo-engine/SELeadCTA';

export default function ItemDetailPage() {
  const { itemSlug } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ItemKnowledgeBase.filter({ item_slug: itemSlug })
      .then(results => { setItem(results[0] || null); setLoading(false); if (results[0]?.seo_title) document.title = results[0].seo_title; });
  }, [itemSlug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-slate-500">Loading...</div></div>;
  if (!item) return <div className="min-h-screen flex items-center justify-center text-slate-500">Item guide not found.</div>;

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />
      <SEBreadcrumb crumbs={[{ label: 'Item Guides', href: '/items' }, { label: item.item_name }]} />

      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className="bg-slate-700 text-slate-200 text-xs">{item.category}</Badge>
            {item.brand && <Badge className="bg-slate-700 text-slate-200 text-xs">{item.brand}</Badge>}
            {item.era && <Badge className="bg-slate-700 text-slate-200 text-xs">{item.era}</Badge>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">{item.seo_title || item.item_name}</h1>
          <p className="text-slate-300 max-w-2xl">{item.seo_description || item.value_guide}</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <SEDisclaimer />

        {item.identification_guide && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">How to Identify {item.item_name}</h2>
            <div className="prose max-w-none text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: item.identification_guide }} />
          </div>
        )}

        {item.value_guide && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <h2 className="font-bold text-amber-900 mb-3">Value Guide — {item.item_name}</h2>
              <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.value_guide }} />
              {item.pricing_notes && <p className="text-xs text-slate-500 mt-3 italic">{item.pricing_notes}</p>}
            </CardContent>
          </Card>
        )}

        {item.sold_examples_json?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Recent Sold Examples</h2>
            <div className="space-y-2">
              {item.sold_examples_json.map((ex, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                  <span className="text-slate-700">{ex.title}</span>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-bold text-green-700">${ex.price?.toLocaleString()}</span>
                    <span>{ex.source}</span>
                    {ex.date && <span>{ex.date}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {item.faq_json?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">FAQs about {item.item_name}</h2>
            <div className="space-y-3">
              {item.faq_json.map((f, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{f.question}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <SELeadCTA
          lifeEventType="estate_settlement"
          sourceUrl={`/items/${itemSlug}`}
          sourcePageType="item_knowledge"
          ctaTitle="Looking to Sell Similar Items?"
          ctaDesc="Connect with estate sale companies in your area who can appraise and sell your items."
        />
      </div>
      <SharedFooter />
    </div>
  );
}