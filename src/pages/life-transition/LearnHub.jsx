import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SEBreadcrumb from '@/components/seo-engine/SEBreadcrumb';
import SEDisclaimer from '@/components/seo-engine/SEDisclaimer';
import SELeadCTA from '@/components/seo-engine/SELeadCTA';
import { Search } from 'lucide-react';

const CATEGORY_LABELS = {
  probate_101: 'Probate 101', estate_sale_process: 'Estate Sale Process', pricing_and_value: 'Pricing & Value',
  cleanout_and_donations: 'Cleanout & Donations', inherited_home: 'Inherited Home', downsizing: 'Downsizing',
  legal_and_tax: 'Legal & Tax', for_operators: 'For Operators', for_buyers: 'For Buyers', general: 'General'
};

export default function LearnHub() {
  const { articleSlug } = useParams();
  const [articles, setArticles] = useState([]);
  const [article, setArticle] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (articleSlug) {
      base44.entities.EstateSaleUniversityArticle.filter({ slug: articleSlug, status: 'published' })
        .then(r => { setArticle(r[0] || null); setLoading(false); if (r[0]?.seo_title) document.title = r[0].seo_title; });
    } else {
      base44.entities.EstateSaleUniversityArticle.filter({ status: 'published' }, '-created_date', 100)
        .then(r => { setArticles(r); setLoading(false); });
    }
  }, [articleSlug]);

  // Article detail view
  if (articleSlug) {
    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-slate-500">Loading...</div></div>;
    if (!article) return <div className="min-h-screen flex items-center justify-center text-slate-500">Article not found.</div>;
    return (
      <div className="min-h-screen bg-white">
        <UniversalHeader hideAuth />
        <SEBreadcrumb crumbs={[{ label: 'Learn', href: '/learn' }, { label: article.title }]} />
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <Badge className="mb-3 bg-slate-700 text-slate-200 text-xs">{CATEGORY_LABELS[article.category] || article.category}</Badge>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">{article.title}</h1>
            <p className="text-slate-300">{article.seo_description}</p>
          </div>
        </section>
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
          <SEDisclaimer />
          <div className="prose max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: article.article_content }} />
          {article.faq_json?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {article.faq_json.map((f, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">{f.question}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{f.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <SELeadCTA lifeEventType="estate_settlement" sourceUrl={`/learn/${articleSlug}`} sourcePageType="university_article" />
        </div>
        <SharedFooter />
      </div>
    );
  }

  // Index view
  const filtered = articles.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader hideAuth />
      <SEBreadcrumb crumbs={[{ label: 'Estate Sale University' }]} />
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Estate Sale University</h1>
        <p className="text-slate-300 max-w-2xl mx-auto">Free educational articles on estate sales, probate, downsizing, inherited homes, and more.</p>
      </section>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input className="pl-9" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {filtered.map(a => (
              <Link key={a.id} to={`/learn/${a.slug}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-5">
                    <Badge className="mb-2 text-xs bg-slate-100 text-slate-600">{CATEGORY_LABELS[a.category] || a.category}</Badge>
                    <h3 className="font-semibold text-slate-900 mb-1">{a.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{a.seo_description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-semibold mb-2">Articles coming soon</p>
            <p className="text-sm">We're building our educational library. Check back soon.</p>
          </div>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}