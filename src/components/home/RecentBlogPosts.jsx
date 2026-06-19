import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function RecentBlogPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await base44.entities.SEOPage.filter(
        { page_type: 'blog', status: 'published' },
        '-published_at',
        6
      );
      setPosts(data || []);
    } catch (err) {
      console.log('Could not load blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold text-slate-900">Latest from Our Blog</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <div className="h-40 bg-slate-200 rounded-t-xl" />
                <CardContent className="p-5">
                  <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-full mb-1" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  return (
    <section className="py-12 px-4 bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif font-bold text-slate-900">Latest from Our Blog</h2>
            <p className="text-slate-600 mt-1">Expert guides, collector tips, and estate sale insights</p>
          </div>
          <Link to="/blog">
            <Button variant="outline" className="gap-2">
              View All Posts <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link
              key={post.id}
              to={`/blog-post?slug=${encodeURIComponent(post.slug)}`}
              className="block group"
            >
              <Card className="h-full overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 border border-slate-200">
                {post.image_url ? (
                  <div className="h-40 overflow-hidden">
                    <img src={post.image_url} alt={post.h1 || post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-orange-100 via-cyan-100 to-slate-100 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-slate-300" />
                  </div>
                )}
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">
                    {post.h1 || post.title}
                  </h3>
                  {post.meta_description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                      {post.meta_description}
                    </p>
                  )}
                  {post.published_at && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(post.published_at), 'MMM d, yyyy')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}