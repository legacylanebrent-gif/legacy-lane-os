import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, Eye, ArrowRight, ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { rows } from './saleDayMetrics';

const STATUS_STYLES = {
  published: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function CoolFindsCard({ user }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    base44.entities.CoolFindStory.filter(
      { author_id: user.id },
      { sort: '-created_date', limit: 4 }
    )
      .then((res) => !cancelled && setStories(rows(res)))
      .catch((e) => console.error('Cool finds:', e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-4 sm:p-5">
      <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-amber-300/30 blur-2xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-amber-700">
            <Sparkles className="w-3 h-3" />
            Cool Finds
          </div>
          <h2 className="mt-1 font-serif text-lg sm:text-xl font-bold text-slate-900">
            Share your best find
          </h2>
          <p className="text-xs text-slate-600 max-w-md">
            Operators and admins publish the stories that make this business fun — the surprise, the
            mystery piece, the attic discovery.
          </p>
        </div>
        <Button className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-sm" asChild>
          <Link to="/CoolFindsSubmit" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Cool Find
          </Link>
        </Button>
      </div>

      <div className="relative mt-3">
        {loading ? (
          <div className="h-16 rounded-xl bg-white/70 animate-pulse" />
        ) : stories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-white/70 p-3 text-center">
            <ImageIcon className="w-6 h-6 mx-auto text-amber-400 mb-1" />
            <p className="text-sm text-slate-700">You haven&apos;t shared a find yet.</p>
            <p className="text-[11px] text-slate-500">
              Your first story is reviewed by an admin, then published on the Cool Finds blog.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {stories.map((story) => {
                const href = story.status === 'published' && story.slug
                  ? `/cool-finds/${story.slug}`
                  : '/CoolFindsSubmit';
                return (
                  <Link
                    key={story.id}
                    to={href}
                    className="flex items-center gap-2.5 rounded-xl border border-amber-200/70 bg-white/80 p-2.5 transition-colors hover:bg-white"
                  >
                    <div className="h-9 w-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      {story.featured_image_url || story.photos?.[0] ? (
                        <img
                          src={story.featured_image_url || story.photos[0]}
                          alt={story.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{story.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {story.where_found || 'No location noted'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${
                        STATUS_STYLES[story.status] || STATUS_STYLES.draft
                      }`}
                    >
                      {story.status || 'draft'}
                    </span>
                    {story.status === 'published' && (
                      <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 flex-shrink-0">
                        <Eye className="w-3 h-3" />
                        {story.views || 0}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
            <Link
              to="/CoolFindsBlog"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
            >
              Browse the Cool Finds blog
              <ArrowRight className="w-3 h-3" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}