import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CalendarDays, MapPin, ArrowRight, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { getCategoryLabel } from '@/components/coolfinds/categories';

export default function CoolFindsCommunitySection() {
  const [stories, setStories] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storyData, eventData] = await Promise.all([
        base44.entities.CoolFindStory.filter({ status: 'published' }, '-published_at', 3),
        base44.entities.CommunityEvent.filter({ status: 'published' }, 'start_date', 3),
      ]);
      setStories(storyData || []);
      // Only show upcoming events (start_date >= today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setEvents((eventData || []).filter(e => new Date(e.start_date + 'T00:00:00') >= today));
    } catch (error) {
      console.error('Error loading cool finds / community events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const hasStories = stories.length > 0;
  const hasEvents = events.length > 0;

  // If neither has content, still show the section as a promotional CTA
  return (
    <section className="py-12 sm:py-16 px-4 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <Badge className="mb-3 bg-violet-600 text-white text-sm px-4 py-1">Community</Badge>
          <h3 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-2">
            Cool Finds & Local Events
          </h3>
          <p className="text-lg text-slate-600">
            Discover amazing treasures and community happenings near you
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Cool Finds Blog */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                Cool Finds & Crazy Stories
              </h4>
              <Link to="/CoolFindsBlog" className="text-sm text-violet-600 hover:underline font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {hasStories ? (
              <div className="space-y-4">
                {stories.map(story => (
                  <Link key={story.id} to={`/cool-finds/${story.slug || story.id}`} className="block group">
                    <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-0.5 border-violet-200 bg-white">
                      <div className="flex gap-4">
                        {story.featured_image_url && (
                          <div className="w-28 h-28 flex-shrink-0 overflow-hidden">
                            <img
                              src={story.featured_image_url}
                              alt={story.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <CardContent className="flex-1 p-4 flex flex-col justify-center">
                          <Badge className="self-start mb-2 bg-violet-100 text-violet-700 text-[10px] uppercase tracking-wide">
                            {getCategoryLabel(story.category)}
                          </Badge>
                          <h5 className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-2 mb-1">
                            {story.title}
                          </h5>
                          {story.excerpt && (
                            <p className="text-sm text-slate-500 line-clamp-2">{story.excerpt}</p>
                          )}
                          {story.author_company_name && (
                            <p className="text-xs text-slate-400 mt-1">by {story.author_company_name}</p>
                          )}
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-6 bg-white/60 border-violet-200">
                <p className="text-slate-500 text-sm mb-4">
                  Estate sale companies share their most amazing discoveries and wild stories. Be the first to read them!
                </p>
                <Link
                  to="/CoolFindsSubmit"
                  className="inline-flex items-center gap-1.5 text-violet-600 hover:underline text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" /> Submit your own cool find
                </Link>
              </Card>
            )}
          </div>

          {/* Community Events */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-violet-600" />
                Flea Markets & Antique Shows
              </h4>
              <Link to="/CommunityEvents" className="text-sm text-violet-600 hover:underline font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {hasEvents ? (
              <div className="space-y-4">
                {events.map(evt => (
                  <Link key={evt.id} to="/CommunityEvents" className="block group">
                    <Card className="p-4 hover:shadow-xl transition-all hover:-translate-y-0.5 border-violet-200 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 flex-shrink-0 bg-violet-100 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-violet-700 uppercase">
                            {format(new Date(evt.start_date + 'T00:00:00'), 'MMM')}
                          </span>
                          <span className="text-lg font-bold text-violet-900 leading-none">
                            {format(new Date(evt.start_date + 'T00:00:00'), 'd')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge className="mb-1 bg-violet-100 text-violet-700 text-[10px] uppercase tracking-wide">
                            {evt.event_type === 'antique_show' ? 'Antique Show' : evt.event_type === 'craft_show' ? 'Craft Show' : evt.event_type === 'collectibles_show' ? 'Collectibles' : 'Flea Market'}
                          </Badge>
                          <h5 className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-1">
                            {evt.title}
                          </h5>
                          <div className="flex items-center gap-1 text-sm text-slate-500 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{evt.property_address?.city}, {evt.property_address?.state}</span>
                          </div>
                          {evt.admission_fee && (
                            <div className="flex items-center gap-1 text-sm text-violet-600 font-medium mt-0.5">
                              <Ticket className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{evt.admission_fee}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-6 bg-white/60 border-violet-200">
                <p className="text-slate-500 text-sm mb-4">
                  Find flea markets, antique shows, and collectibles events in your area. Submit your own event to get it on the map!
                </p>
                <Link
                  to="/CommunityEventSubmit"
                  className="inline-flex items-center gap-1.5 text-violet-600 hover:underline text-sm font-medium"
                >
                  <CalendarDays className="w-4 h-4" /> Submit a community event
                </Link>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}