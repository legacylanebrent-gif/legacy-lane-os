import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import SEOHead from '@/components/seo/SEOHead';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';
import { format } from 'date-fns';

export default function BlogIndex() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SEOPage.filter({ page_type: 'blog', status: 'published' }, '-published_at', 100)
      .then(setPosts).finally(() => setLoading(false));
  }, []);

  const canonical = 'https://estatesalen.com/blog';
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog' }];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'EstateSalen Blog — Estate Sale & Collectibles Guides',
    url: canonical,
    publisher: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <SEOHead
        title="Estate Sale & Collectibles Blog | EstateSalen.com"
        description="Buying guides, value guides, identification tips, and collector resources for estate sale shoppers and Estate Sale Company Owners."
        canonical={canonical}
        jsonLd={jsonLd}
      />
      <UniversalHeader user={null} isAuthenticated={false} />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <SEOBreadcrumb crumbs={crumbs} />
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center"><BookOpen className="w-6 h-6 text-pink-600" /></div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Estate Sale & Collectibles Blog</h1>
            <p className="text-slate-500">Buying guides, value guides, and collector resources</p>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No articles published yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <Link key={post.id} to={`/blog-post?slug=${encodeURIComponent(post.slug)}`}>
                <Card className="h-full hover:shadow-xl transition-shadow group">
                  <CardContent className="p-5 flex flex-col h-full">
                    <h2 className="font-serif font-bold text-slate-900 text-lg mb-2 line-clamp-3 group-hover:text-orange-600 transition-colors">
                      {post.h1 || post.title}
                    </h2>
                    {post.meta_description && (
                      <p className="text-sm text-slate-600 line-clamp-3 flex-1 mb-3">{post.meta_description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-auto">
                      {post.published_at && (
                        <><Calendar className="w-3 h-3" /><span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span></>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-orange-600 font-semibold">
                        Read <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}