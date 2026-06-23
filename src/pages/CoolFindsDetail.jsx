import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Sparkles, Eye, Calendar, Building2, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import CoolFindsComments from '@/components/coolfinds/CoolFindsComments';
import { getCategoryColor, getCategoryLabel } from '@/components/coolfinds/categories';
import { useSEO } from '@/hooks/useSEO';

export default function CoolFindsDetail() {
  const { slug } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [user, setUser] = useState(null);
  const [companySlug, setCompanySlug] = useState(null);
  const [relatedStories, setRelatedStories] = useState([]);

  useEffect(() => {
    loadStory();
    base44.auth.me().then(setUser).catch(() => {});
  }, [slug]);

  const loadStory = async () => {
    try {
      let data;
      if (slug && slug.length > 20) {
        // Looks like an ID
        data = await base44.entities.CoolFindStory.get(slug);
      } else {
        const results = await base44.entities.CoolFindStory.filter({ slug, status: 'published' });
        data = results?.[0];
      }

      if (!data || data.status !== 'published') {
        setNotFound(true);
        return;
      }
      setStory(data);

      // If an operator submitted, fetch their company SEO page slug for a profile link
      if (data.operator_id) {
        try {
          const pages = await base44.entities.SEOPage.filter({ entity_id: data.operator_id, page_type: 'company' });
          if (pages.length > 0 && pages[0].slug) {
            setCompanySlug(pages[0].slug);
          }
        } catch (_) {}
      }

      // Increment views
      try {
        await base44.entities.CoolFindStory.update(data.id, { views: (data.views || 0) + 1 });
      } catch (_) {}

      // Load related stories for "You May Also Like"
      if (data.related_story_ids && data.related_story_ids.length > 0) {
        try {
          const related = [];
          for (const rid of data.related_story_ids.slice(0, 3)) {
            try {
              const r = await base44.entities.CoolFindStory.get(rid);
              if (r && r.status === 'published') related.push(r);
            } catch (_) {}
          }
          setRelatedStories(related);
        } catch (_) {}
      }
    } catch (e) {
      console.error('Error loading story:', e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useSEO({
    title: story?.seo_title || story?.title || 'Cool Finds Story',
    description: story?.seo_description || story?.excerpt || '',
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white max-w-3xl mx-auto px-4 py-10">
        <Skeleton className="h-6 w-24 mb-4" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <Sparkles className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-serif font-bold text-slate-700 mb-2">Story Not Found</h2>
          <p className="text-slate-500 mb-6">This story may have been removed or is not yet published.</p>
          <Link to="/CoolFindsBlog">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const youtubeEmbed = getYouTubeEmbedUrl(story.youtube_url);

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader user={user} isAuthenticated={!!user} />

      <article className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/CoolFindsBlog" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-purple-600 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        <Badge className={`mb-4 ${getCategoryColor(story.category)}`}>
          {getCategoryLabel(story.category)}
        </Badge>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-4">{story.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-8 pb-8 border-b border-slate-200">
          {story.author_company_name && (
            companySlug ? (
              <Link to={`/companies?slug=${companySlug}`} className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 hover:underline font-medium">
                <Building2 className="w-4 h-4" /> {story.author_company_name}
              </Link>
            ) : (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> {story.author_company_name}
              </span>
            )
          )}
          {story.published_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> {formatDate(story.published_at)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> {(story.views || 0) + 1} views
          </span>
        </div>

        {story.excerpt && (
          <p className="text-lg text-slate-600 font-medium mb-6 leading-relaxed">{story.excerpt}</p>
        )}

        {/* Featured image or YouTube video */}
        {youtubeEmbed ? (
          <div className="aspect-video rounded-xl overflow-hidden mb-8 bg-black">
            <iframe
              src={youtubeEmbed}
              title={story.title}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : story.video_url ? (
          <div className="mb-8">
            <video src={story.video_url} controls className="w-full rounded-xl" />
          </div>
        ) : (story.featured_image_url || story.photos?.[0]) ? (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img src={story.featured_image_url || story.photos[0]} alt={story.title} className="w-full max-h-[500px] object-cover" />
          </div>
        ) : null}

        {/* Story content — prefer AI-enhanced version if available */}
        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-lg">
          {story.ai_enhanced_content ? (
            <ReactMarkdown>{story.ai_enhanced_content}</ReactMarkdown>
          ) : (
            <div className="whitespace-pre-wrap">{story.story_content}</div>
          )}
        </div>

        {/* AI-generated metadata: era, object type, tags */}
        {(story.era || story.object_type || (story.tags && story.tags.length > 0)) && (
          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {story.era && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-slate-700">Era:</span>
                <Badge className="bg-indigo-100 text-indigo-700">{story.era}</Badge>
              </div>
            )}
            {story.object_type && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-slate-700">Object Type:</span>
                <Badge className="bg-teal-100 text-teal-700">{story.object_type}</Badge>
              </div>
            )}
            {story.tags && story.tags.length > 0 && (
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm font-semibold text-slate-700">Tags:</span>
                {story.tags.map((tag, i) => (
                  <Badge key={i} className="bg-purple-100 text-purple-700">#{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Where found */}
        {story.where_found && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="w-4 h-4" /> Found: {story.where_found}
          </div>
        )}

        {/* Photo gallery */}
        {story.photos?.length > 1 && (
          <div className="mt-10">
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-4">Photo Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {story.photos.map((url, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden">
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-48 object-cover hover:scale-105 transition-transform cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Company promotion — shown when an operator submitted */}
        {companySlug && (
          <div className="mt-10 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Building2 className="w-10 h-10 text-orange-600 flex-shrink-0" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-serif font-bold text-slate-900">{story.author_company_name}</h3>
                <p className="text-sm text-slate-600">This story was shared by {story.author_company_name}. Visit their company profile to see upcoming sales and more.</p>
              </div>
              <Link to={`/companies?slug=${companySlug}`}>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap">
                  <Building2 className="w-4 h-4 mr-2" /> View Company Profile
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* You May Also Like — AI-recommended related stories */}
        {relatedStories.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-4">You May Also Like</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedStories.map(rel => (
                <Link key={rel.id} to={`/cool-finds/${rel.slug || rel.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer h-full flex flex-col">
                    {rel.featured_image_url || rel.photos?.[0] ? (
                      <div className="h-32 overflow-hidden bg-slate-100">
                        <img src={rel.featured_image_url || rel.photos[0]} alt={rel.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-32 bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-purple-300" />
                      </div>
                    )}
                    <CardContent className="p-3 flex-1 flex flex-col">
                      <Badge className={`w-fit mb-1.5 text-[10px] ${getCategoryColor(rel.category)}`}>
                        {getCategoryLabel(rel.category)}
                      </Badge>
                      <h4 className="font-serif font-bold text-sm text-slate-900 line-clamp-2">{rel.title}</h4>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 p-6 bg-gradient-to-br from-purple-50 to-orange-50 rounded-xl text-center">
          <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">Have a Story to Share?</h3>
          <p className="text-slate-600 mb-4">Submit your own cool finds, crazy stories, or hidden treasures!</p>
          <Link to="/CoolFindsSubmit">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Sparkles className="w-4 h-4 mr-2" /> Submit Your Story
            </Button>
          </Link>
        </div>

        {/* Comments section — registered users only */}
        <CoolFindsComments storyId={story.id} user={user} />
      </article>

      <SharedFooter />
    </div>
  );
}