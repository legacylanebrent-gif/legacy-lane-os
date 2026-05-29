import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  Facebook, MapPin, Plus, RefreshCw, Send, CheckCircle, XCircle,
  Clock, Eye, Trash2, Globe, Image, FileText, Zap
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-800',
  posted: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-700'
};

export default function TerritoryFBManager() {
  const [pages, setPages] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPageForm, setShowPageForm] = useState(false);
  const [filterTerritory, setFilterTerritory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newPage, setNewPage] = useState({
    territory_name: '', county: '', state: '', fb_page_name: '',
    fb_page_id: '', fb_page_url: '', fb_page_access_token: '',
    zip_codes_covered: '', cities_covered: '', post_time: '09:00',
    days_before_sale: 2, is_active: true
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [pgs, pts] = await Promise.all([
      base44.entities.TerritoryFBPage.list('-created_date', 100),
      base44.entities.TerritoryFBPost.list('-created_date', 200)
    ]);
    setPages(pgs || []);
    setPosts(pts || []);
    setLoading(false);
  };

  const handleGenerate = async (territoryId) => {
    setGenerating(true);
    try {
      const payload = territoryId ? { territory_id: territoryId } : {};
      const res = await base44.functions.invoke('generateTerritoryFBPosts', payload);
      alert(`Generation complete! Check the Posts tab to review.`);
      await loadAll();
    } catch (err) {
      alert('Error generating posts: ' + err.message);
    }
    setGenerating(false);
  };

  const handleApprove = async (postId) => {
    await base44.entities.TerritoryFBPost.update(postId, { approval_status: 'approved', publish_status: 'scheduled' });
    await loadAll();
  };

  const handleReject = async (postId) => {
    await base44.entities.TerritoryFBPost.update(postId, { approval_status: 'rejected' });
    await loadAll();
  };

  const handlePublish = async (postId) => {
    setPublishing(postId);
    try {
      await base44.functions.invoke('publishTerritoryFBPost', { post_id: postId });
      alert('Published to Facebook!');
      await loadAll();
    } catch (err) {
      alert('Publish failed: ' + err.message);
    }
    setPublishing(null);
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    await base44.entities.TerritoryFBPost.delete(postId);
    setPosts(p => p.filter(x => x.id !== postId));
  };

  const handleSavePage = async () => {
    const data = {
      ...newPage,
      zip_codes_covered: newPage.zip_codes_covered.split(',').map(z => z.trim()).filter(Boolean),
      cities_covered: newPage.cities_covered.split(',').map(c => c.trim()).filter(Boolean),
      days_before_sale: parseInt(newPage.days_before_sale) || 2
    };
    await base44.entities.TerritoryFBPage.create(data);
    setShowPageForm(false);
    setNewPage({ territory_name: '', county: '', state: '', fb_page_name: '', fb_page_id: '', fb_page_url: '', fb_page_access_token: '', zip_codes_covered: '', cities_covered: '', post_time: '09:00', days_before_sale: 2, is_active: true });
    await loadAll();
  };

  const filteredPosts = posts.filter(p => {
    const tMatch = filterTerritory === 'all' || p.territory_fb_page_id === filterTerritory;
    const sMatch = filterStatus === 'all' || p.approval_status === filterStatus || p.publish_status === filterStatus;
    return tMatch && sMatch;
  });

  const pendingCount = posts.filter(p => p.approval_status === 'pending_review').length;
  const postedCount = posts.filter(p => p.publish_status === 'posted').length;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-slate-500 text-lg">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Facebook className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Territory FB Pages</h1>
              <p className="text-sm text-slate-500">Manage organic Facebook posts per territory — 2 days before each sale</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleGenerate(null)} disabled={generating} className="bg-blue-600 hover:bg-blue-700">
              <Zap className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Run Generator (All)'}
            </Button>
            <Button onClick={() => setShowPageForm(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add Territory Page
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Territory Pages', value: pages.length, icon: MapPin, color: 'text-blue-600' },
            { label: 'Total Posts', value: posts.length, icon: FileText, color: 'text-slate-600' },
            { label: 'Pending Review', value: pendingCount, icon: Clock, color: 'text-yellow-600' },
            { label: 'Posted to FB', value: postedCount, icon: CheckCircle, color: 'text-emerald-600' },
          ].map((s, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="posts">
          <TabsList className="mb-6">
            <TabsTrigger value="posts">Posts Queue {pendingCount > 0 && <Badge className="ml-2 bg-yellow-500 text-white text-xs">{pendingCount}</Badge>}</TabsTrigger>
            <TabsTrigger value="pages">Territory Pages</TabsTrigger>
          </TabsList>

          {/* POSTS TAB */}
          <TabsContent value="posts">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={filterTerritory}
                onChange={e => setFilterTerritory(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Territories</option>
                {pages.map(p => <option key={p.id} value={p.id}>{p.territory_name}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="scheduled">Scheduled</option>
                <option value="posted">Posted</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
              </select>
              <Button variant="outline" size="sm" onClick={loadAll}>
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh
              </Button>
            </div>

            {filteredPosts.length === 0 ? (
              <Card className="p-12 text-center bg-white">
                <Facebook className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 text-lg mb-2">No posts yet</p>
                <p className="text-slate-400 text-sm mb-6">Run the generator to create AI posts for upcoming sales in your territories.</p>
                <Button onClick={() => handleGenerate(null)} disabled={generating} className="bg-blue-600 hover:bg-blue-700">
                  <Zap className="w-4 h-4 mr-2" /> Generate Posts Now
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map(post => (
                  <Card key={post.id} className="bg-white shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className={post.post_type === 'combined_digest' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                              {post.post_type === 'combined_digest' ? '📋 Combined Digest' : '📌 Individual Sale'}
                            </Badge>
                            <Badge className={STATUS_COLORS[post.approval_status] || 'bg-slate-100 text-slate-700'}>
                              {post.approval_status?.replace('_', ' ')}
                            </Badge>
                            <Badge className={STATUS_COLORS[post.publish_status] || 'bg-slate-100 text-slate-700'}>
                              {post.publish_status}
                            </Badge>
                          </div>
                          <p className="font-semibold text-slate-900 text-sm mb-1">
                            {post.territory_name} · {post.post_type === 'combined_digest'
                              ? `${post.sales_included?.length || 0} sales`
                              : post.estate_sale_title}
                          </p>
                          <p className="text-xs text-slate-400 mb-3">
                            Sale date: {post.sale_start_date} · Scheduled: {post.scheduled_for ? format(new Date(post.scheduled_for), 'MMM d, h:mm a') : 'Not set'}
                          </p>
                          {/* Caption preview */}
                          <p className="text-sm text-slate-600 line-clamp-3 bg-slate-50 rounded-lg p-3 border">
                            {post.ai_caption || 'No caption generated'}
                          </p>
                        </div>
                        {post.ai_image_url && (
                          <img
                            src={post.ai_image_url}
                            alt="post visual"
                            className="w-24 h-24 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                        <Button size="sm" variant="outline" onClick={() => setSelectedPost(post)}>
                          <Eye className="w-3 h-3 mr-1" /> Preview
                        </Button>
                        {post.approval_status === 'pending_review' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(post.id)}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(post.id)}>
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {post.approval_status === 'approved' && post.publish_status !== 'posted' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handlePublish(post.id)} disabled={publishing === post.id}>
                            <Send className="w-3 h-3 mr-1" /> {publishing === post.id ? 'Publishing...' : 'Post to Facebook'}
                          </Button>
                        )}
                        {post.publish_status === 'posted' && post.fb_post_id && (
                          <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Posted
                          </Badge>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 ml-auto" onClick={() => handleDeletePost(post.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      {post.error_message && (
                        <p className="text-xs text-red-500 mt-2 bg-red-50 rounded p-2">Error: {post.error_message}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PAGES TAB */}
          <TabsContent value="pages">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pages.map(page => (
                <Card key={page.id} className="bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Facebook className="w-5 h-5 text-blue-600" />
                      </div>
                      <Badge className={page.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                        {page.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{page.territory_name}</h3>
                    <p className="text-sm text-slate-500 mb-2">{page.county}, {page.state}</p>
                    {page.fb_page_url && (
                      <a href={page.fb_page_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mb-3">
                        <Globe className="w-3 h-3" /> View FB Page
                      </a>
                    )}
                    <div className="text-xs text-slate-400 space-y-1 mb-4">
                      <p>Posts {page.days_before_sale ?? 2} days before sale · {page.post_time || '09:00'}</p>
                      <p>{(page.cities_covered || []).length} cities · {(page.zip_codes_covered || []).length} ZIPs</p>
                      <p>{page.total_posts_sent || 0} posts sent total</p>
                      {page.last_post_sent_at && <p>Last post: {format(new Date(page.last_post_sent_at), 'MMM d')}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleGenerate(page.id)} disabled={generating}>
                        <Zap className="w-3 h-3 mr-1" /> Generate
                      </Button>
                      {!page.fb_page_id && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs self-center">No FB credentials</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add new card */}
              <button
                onClick={() => setShowPageForm(true)}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                <Plus className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Add Territory Page</span>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Post Preview Modal */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post Preview — {selectedPost.territory_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge className={selectedPost.post_type === 'combined_digest' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                  {selectedPost.post_type === 'combined_digest' ? 'Combined Digest' : 'Individual Sale'}
                </Badge>
                <Badge className={STATUS_COLORS[selectedPost.approval_status]}>
                  {selectedPost.approval_status?.replace('_', ' ')}
                </Badge>
              </div>

              {selectedPost.ai_image_url && (
                <img src={selectedPost.ai_image_url} alt="post" className="w-full rounded-xl object-cover max-h-64" />
              )}

              <div className="bg-slate-50 rounded-xl p-4 border">
                <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Caption
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{selectedPost.ai_caption}</p>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p>Sale date: {selectedPost.sale_start_date}</p>
                <p>Scheduled: {selectedPost.scheduled_for ? format(new Date(selectedPost.scheduled_for), 'MMM d, yyyy h:mm a') : 'Not set'}</p>
                {selectedPost.estate_sale_link && <p>Link: <a href={selectedPost.estate_sale_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{selectedPost.estate_sale_link}</a></p>}
              </div>

              {selectedPost.approval_status === 'pending_review' && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { handleApprove(selectedPost.id); setSelectedPost(null); }}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button variant="outline" className="flex-1 text-red-600 border-red-200" onClick={() => { handleReject(selectedPost.id); setSelectedPost(null); }}>
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
              {selectedPost.approval_status === 'approved' && selectedPost.publish_status !== 'posted' && (
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { handlePublish(selectedPost.id); setSelectedPost(null); }}>
                  <Send className="w-4 h-4 mr-2" /> Post to Facebook Now
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Territory Page Form */}
      {showPageForm && (
        <Dialog open={showPageForm} onOpenChange={setShowPageForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Territory Facebook Page</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Territory Name *</label>
                  <Input placeholder="EstateSalen Monmouth County" value={newPage.territory_name} onChange={e => setNewPage(p => ({ ...p, territory_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">County *</label>
                  <Input placeholder="Monmouth County" value={newPage.county} onChange={e => setNewPage(p => ({ ...p, county: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">State *</label>
                  <Input placeholder="NJ" value={newPage.state} onChange={e => setNewPage(p => ({ ...p, state: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Days Before Sale</label>
                  <Input type="number" min="1" max="7" value={newPage.days_before_sale} onChange={e => setNewPage(p => ({ ...p, days_before_sale: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">FB Page Name</label>
                <Input placeholder="EstateSalen Monmouth County NJ" value={newPage.fb_page_name} onChange={e => setNewPage(p => ({ ...p, fb_page_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">FB Page URL</label>
                <Input placeholder="https://facebook.com/estatesalenmonmouth" value={newPage.fb_page_url} onChange={e => setNewPage(p => ({ ...p, fb_page_url: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">FB Page ID</label>
                <Input placeholder="123456789" value={newPage.fb_page_id} onChange={e => setNewPage(p => ({ ...p, fb_page_id: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">FB Page Access Token</label>
                <Input type="password" placeholder="EAAxxxx..." value={newPage.fb_page_access_token} onChange={e => setNewPage(p => ({ ...p, fb_page_access_token: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Cities Covered (comma-separated)</label>
                <Input placeholder="Red Bank, Asbury Park, Long Branch" value={newPage.cities_covered} onChange={e => setNewPage(p => ({ ...p, cities_covered: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ZIP Codes Covered (comma-separated)</label>
                <Input placeholder="07701, 07712, 07740" value={newPage.zip_codes_covered} onChange={e => setNewPage(p => ({ ...p, zip_codes_covered: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Preferred Post Time</label>
                <Input type="time" value={newPage.post_time} onChange={e => setNewPage(p => ({ ...p, post_time: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSavePage} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  Save Territory Page
                </Button>
                <Button variant="outline" onClick={() => setShowPageForm(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}