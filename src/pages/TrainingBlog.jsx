import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

export default function TrainingBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.SEOPage.filter({ page_type: 'blog', status: 'published' }, '-published_at', 100)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Training Blog</h1>
          <p className="text-slate-500">Educational guides, tutorials, and training resources for estate sale professionals</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No training articles published yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link key={post.id} to={`/blog-post?slug=${encodeURIComponent(post.slug)}`}>
              <Card className="h-full hover:shadow-xl transition-shadow group overflow-hidden">
                {post.image_url && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={post.image_url}
                      alt={post.h1 || post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardContent className="p-5 flex flex-col h-full">
                  <h2 className="font-serif font-bold text-slate-900 text-lg mb-2 line-clamp-3 group-hover:text-blue-600 transition-colors">
                    {post.h1 || post.title}
                  </h2>
                  {post.meta_description && (
                    <p className="text-sm text-slate-600 line-clamp-3 flex-1 mb-3">{post.meta_description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-auto">
                    {post.published_at && (
                      <>
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
                      </>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-blue-600 font-semibold">
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
  );
}