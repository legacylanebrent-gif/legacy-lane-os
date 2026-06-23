import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Search, ArrowRight, PenSquare, Eye } from 'lucide-react';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import { useSEO } from '@/hooks/useSEO';

const CATEGORIES = [
  { key: 'all', label: 'All Stories', color: 'bg-slate-100 text-slate-700' },
  { key: 'cool_finds', label: 'Cool Finds', color: 'bg-orange-100 text-orange-700' },
  { key: 'crazy_stories', label: 'Crazy Stories', color: 'bg-purple-100 text-purple-700' },
  { key: 'hidden_treasures', label: 'Hidden Treasures', color: 'bg-cyan-100 text-cyan-700' },
];

export default function CoolFindsBlog() {
  useSEO({
    title: 'Cool Finds, Crazy Stories & Hidden Treasures | EstateSalen Blog',
    description: 'Discover amazing cool finds, crazy estate sale stories, and hidden treasures uncovered by estate sale companies across the country.',
  });

  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadStories();
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const loadStories = async () => {
    try {
      const data = await base44.entities.CoolFindStory.filter({ status: 'published' }, '-published_at', 60);
      setStories(data || []);
    } catch (e) {
      console.error('Error loading stories:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = stories.filter(s => {
    if (activeCategory !== 'all' && s.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.title?.toLowerCase().includes(q) || s.excerpt?.toLowerCase().includes(q) || s.author_company_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-purple-50">
      <UniversalHeader user={user} isAuthenticated={!!user} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 text-purple-200 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Sparkles className="w-4 h-4" /> EstateSalen Community Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            Cool Finds, Crazy Stories & Hidden Treasures
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto mb-8">
            Real discoveries from estate sale companies across the country — from rare antiques to unbelievable stories behind the items.
          </p>
          <Link to="/CoolFindsSubmit">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              <PenSquare className="w-4 h-4 mr-2" /> Submit Your Story
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Search + Category filters */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.key
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No stories yet in this category</h3>
            <p className="text-slate-500 mb-6">Be the first to share a cool find or crazy story!</p>
            <Link to="/CoolFindsSubmit">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <PenSquare className="w-4 h-4 mr-2" /> Submit Your Story
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(story => (
              <Link key={story.id} to={`/cool-finds/${story.slug || story.id}`}>
                <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full flex flex-col">
                  {story.featured_image_url || story.photos?.[0] ? (
                    <div className="h-48 overflow-hidden bg-slate-100">
                      <img
                        src={story.featured_image_url || story.photos[0]}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-purple-300" />
                    </div>
                  )}
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <Badge className={`w-fit mb-2 ${CATEGORIES.find(c => c.key === story.category)?.color || 'bg-slate-100'}`}>
                      {CATEGORIES.find(c => c.key === story.category)?.label || story.category}
                    </Badge>
                    <h3 className="font-serif font-bold text-lg text-slate-900 mb-2 line-clamp-2">{story.title}</h3>
                    {story.excerpt && (
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3 flex-1">{story.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-auto">
                      <span className="font-medium text-slate-600">{story.author_company_name || 'Anonymous'}</span>
                      <span>{formatDate(story.published_at)}</span>
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