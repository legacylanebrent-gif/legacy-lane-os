import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Eye, Loader2, Sparkles, Clock } from 'lucide-react';
import UniversalHeader from '@/components/layout/UniversalHeader';
import { getCategoryColor, getCategoryLabel } from '@/components/coolfinds/categories';

export default function AdminCoolFinds() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('draft');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) loadStories();
    }).catch(() => {});
  }, [activeTab]);

  const loadStories = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CoolFindStory.filter({ status: activeTab }, '-submitted_at', 100);
      setStories(data || []);
    } catch (e) {
      console.error('Error loading stories:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (story) => {
    try {
      await base44.entities.CoolFindStory.update(story.id, {
        status: 'published',
        published_at: new Date().toISOString(),
      });
      setStories(prev => prev.filter(s => s.id !== story.id));
    } catch (e) {
      alert('Error publishing story: ' + e.message);
    }
  };

  const handleReject = async (story) => {
    try {
      await base44.entities.CoolFindStory.update(story.id, { status: 'rejected' });
      setStories(prev => prev.filter(s => s.id !== story.id));
    } catch (e) {
      alert('Error rejecting story: ' + e.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UniversalHeader user={user} isAuthenticated={!!user} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" /> Cool Finds Blog — Admin
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review and publish submitted stories.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="draft">
              <Clock className="w-4 h-4 mr-1" /> Pending ({stories.length})
            </TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : stories.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-slate-400">
                No {activeTab} stories.
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {stories.map(story => (
                  <Card key={story.id} className="overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Thumbnail */}
                        <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {story.featured_image_url || story.photos?.[0] ? (
                            <img src={story.featured_image_url || story.photos[0]} alt={story.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Sparkles className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <Badge className={`mb-1 ${getCategoryColor(story.category)}`}>
                                {getCategoryLabel(story.category)}
                              </Badge>
                              {story.is_admin_post && (
                                <Badge className="bg-blue-100 text-blue-700 ml-1">Admin Post</Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(story.submitted_at)}</span>
                          </div>

                          <h3 className="font-serif font-bold text-lg text-slate-900 mb-1">{story.title}</h3>
                          {story.excerpt && <p className="text-sm text-slate-600 line-clamp-2 mb-2">{story.excerpt}</p>}

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                            <span>{story.author_company_name || 'Unknown'}</span>
                            {story.author_email && <span>• {story.author_email}</span>}
                            {story.youtube_url && <Badge className="bg-red-100 text-red-700">YouTube</Badge>}
                            {story.video_url && <Badge className="bg-green-100 text-green-700">Video</Badge>}
                            {story.photos?.length > 0 && <span>• {story.photos.length} photos</span>}
                            {story.ai_metadata_status === 'pending' && <Badge className="bg-amber-100 text-amber-700">AI: Pending</Badge>}
                            {story.ai_metadata_status === 'generated' && <Badge className="bg-blue-100 text-blue-700">AI: Enriched</Badge>}
                            {story.ai_metadata_status === 'failed' && <Badge className="bg-red-100 text-red-700">AI: Failed</Badge>}
                          </div>

                          {/* AI-generated metadata preview */}
                          {story.ai_metadata_status === 'generated' && (story.tags?.length > 0 || story.era || story.object_type) && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {story.era && <Badge className="bg-indigo-50 text-indigo-600 text-[10px]">{story.era}</Badge>}
                              {story.object_type && <Badge className="bg-teal-50 text-teal-600 text-[10px]">{story.object_type}</Badge>}
                              {story.tags?.slice(0, 4).map((tag, i) => (
                                <Badge key={i} className="bg-purple-50 text-purple-600 text-[10px]">#{tag}</Badge>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link to={`/cool-finds/${story.slug || story.id}`} target="_blank">
                              <Button variant="outline" size="sm">
                                <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                              </Button>
                            </Link>
                            {activeTab === 'draft' && (
                              <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(story)}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Publish
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(story)}>
                                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}