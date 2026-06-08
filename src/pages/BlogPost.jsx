import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import SEOHead from '@/components/seo/SEOHead';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

export default function BlogPost() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug) { setLoading(false); return; }
    try {
      const pages = await base44.entities.SEOPage.filter({ slug, page_type: 'blog', status: 'published' });
      setPage(pages[0] || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (!page) return <div className="min-h-screen flex items-center justify-center text-slate-500">Article not found.</div>;

  const canonical = page.canonical_url || `https://estatesalen.com/blog?slug=${encodeURIComponent(page.slug)}`;
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: page.h1 || page.title },
  ];

  const jsonLd = page.schema_json || {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: page.h1 || page.title,
    description: page.meta_description || '',
    url: canonical,
    datePublished: page.published_at,
    author: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
    publisher: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead title={page.title} description={page.meta_description} canonical={canonical} jsonLd={jsonLd} />
      <UniversalHeader user={null} isAuthenticated={false} />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <SEOBreadcrumb crumbs={crumbs} />

        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <BookOpen className="w-4 h-4" />
          <span>EstateSalen.com</span>
          {page.published_at && (
            <>
              <span>·</span>
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(page.published_at), 'MMM d, yyyy')}</span>
            </>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-6 leading-tight">
          {page.h1 || page.title}
        </h1>

        {page.intro_content && (
          <p className="text-xl text-slate-600 leading-relaxed mb-8 border-l-4 border-orange-400 pl-4">
            {page.intro_content}
          </p>
        )}

        <article className="prose prose-slate prose-lg max-w-none">
          <ReactMarkdown
            components={{
              a: ({ href, children }) => <Link to={href?.startsWith('http') ? href : href} className="text-orange-600 hover:text-orange-700 underline">{children}</Link>,
              h2: ({ children }) => <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">{children}</h3>,
            }}
          >
            {page.main_content}
          </ReactMarkdown>
        </article>

        {page.faq_json?.length > 0 && (
          <section className="mt-12 bg-slate-50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {page.faq_json.map((faq, i) => (
                <div key={i} className="border-b border-slate-200 pb-4 last:border-0 last:pb-0">
                  <h3 className="font-semibold text-slate-800 mb-1">{faq.question}</h3>
                  <p className="text-slate-600 text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 p-6 bg-orange-50 border border-orange-200 rounded-2xl">
          <h3 className="font-bold text-slate-900 mb-2">Find Estate Sales Near You</h3>
          <p className="text-slate-600 text-sm mb-3">Discover upcoming estate sales with unique finds in your area.</p>
          <Link to="/EstateSaleFinder" className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-semibold text-sm">
            Browse Estate Sales <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <SharedFooter />
    </div>
  );
}