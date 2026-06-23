import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Upload, X, Youtube, Loader2, CheckCircle, ArrowLeft, MapPin, Wand2 } from 'lucide-react';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import { useSEO } from '@/hooks/useSEO';

export default function CoolFindsSubmit() {
  useSEO({
    title: 'Submit Cool Find | Cool Finds Blog',
    description: 'Share your cool finds, crazy stories, or hidden treasures with the EstateSalen community.',
  });

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Simplified form — users only submit: Title, Basic Story, Photos, Where Found
  // AI auto-generates: Category, Tags, Era, Object Type, SEO, Related Stories, Enhanced Content
  const [form, setForm] = useState({
    title: '',
    story_content: '',
    where_found: '',
    author_company_name: '',
    author_email: '',
    author_phone: '',
    author_id: '',
    operator_id: null,
    youtube_url: '',
  });
  const [photos, setPhotos] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setUser(u);
      const isOperator = u.primary_account_type === 'estate_sale_operator';
      setForm(f => ({
        ...f,
        author_email: u.email || '',
        author_company_name: u.company_name || u.full_name || '',
        author_phone: u.phone || '',
        author_id: u.id || '',
        operator_id: isOperator ? u.id : null,
      }));
      setLoading(false);
    }).catch(() => {
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const isAdmin = user?.role === 'admin' || ['super_admin', 'platform_ops', 'admin'].includes(user?.primary_account_type);

  const handlePhotoUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push(file_url);
      }
      setPhotos(prev => [...prev, ...uploaded]);
    } catch (e) {
      console.error('Photo upload error:', e);
      alert('Error uploading photos. Please try again.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleVideoUpload = async (file) => {
    if (!file) return;
    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVideoUrl(file_url);
    } catch (e) {
      console.error('Video upload error:', e);
      alert('Error uploading video. Please try again.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.story_content) {
      alert('Please fill in the title and your story.');
      return;
    }
    setSubmitting(true);
    try {
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

      await base44.entities.CoolFindStory.create({
        ...form,
        slug,
        photos,
        video_url: videoUrl || null,
        featured_image_url: photos[0] || null,
        is_admin_post: isAdmin,
        status: 'draft',
        ai_metadata_status: 'pending',
        submitted_at: new Date().toISOString(),
      });

      // If an operator submitted, ensure they have a company SEO page for cross-linking
      if (form.operator_id) {
        try {
          const existing = await base44.entities.SEOPage.filter({ entity_id: form.operator_id, page_type: 'company' });
          if (existing.length === 0) {
            await base44.functions.invoke('generateOperatorSEOProfile', { operator_id: form.operator_id });
          }
        } catch (_) {}
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
      alert('Error submitting story. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-orange-50 flex items-center justify-center px-4">
        <Card className="max-w-lg w-full text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">Story Submitted!</h2>
          <p className="text-slate-600 mb-4">
            Your story has been submitted. Our AI is automatically generating the category, tags, era, object type, SEO keywords, and related story recommendations.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Once AI enrichment is complete, our team will review and publish it to the Cool Finds blog.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/CoolFindsBlog')} className="bg-purple-600 hover:bg-purple-700 text-white">
              View Blog
            </Button>
            <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ title: '', story_content: '', where_found: '', author_company_name: user.company_name || user.full_name || '', author_email: user.email || '', author_phone: user.phone || '', youtube_url: '' }); setPhotos([]); setVideoUrl(''); }}>
              Submit Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-orange-50">
      <UniversalHeader user={user} isAuthenticated={!!user} />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/CoolFindsBlog" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-purple-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-semibold px-3 py-1 rounded-full mb-3">
            <Sparkles className="w-4 h-4" /> Share Your Discovery
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Submit Your Story</h1>
          <p className="text-slate-600">
            Just tell us what you found and where — our AI will handle the rest, automatically generating the category, tags, era, object type, SEO keywords, and related story recommendations.
          </p>
        </div>

        {/* AI Info Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Wand2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              <p className="font-semibold text-purple-800 mb-1">AI-Powered Story Enrichment</p>
              <p>You only need to provide the basics. After you submit, our AI will automatically:</p>
              <ul className="mt-1.5 space-y-0.5 text-slate-600">
                <li>• Assign the best category and tags</li>
                <li>• Identify the era and object type</li>
                <li>• Generate SEO title, description, and keywords</li>
                <li>• Enhance your story with polished writing</li>
                <li>• Recommend related stories for "You May Also Like"</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Story Title *</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="The Amazing Discovery at the Johnson Estate Sale"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Your Story *</Label>
                <Textarea
                  required
                  value={form.story_content}
                  onChange={(e) => setForm({ ...form, story_content: e.target.value })}
                  placeholder="Tell us what you found... What is it? What happened? What made it special? Don't worry about making it perfect — our AI will polish it for you."
                  className="mt-1 min-h-[200px]"
                />
                <p className="text-xs text-slate-400 mt-1">Just write naturally — AI will enhance the structure and flow.</p>
              </div>

              <div>
                <Label>Where Found</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={form.where_found}
                    onChange={(e) => setForm({ ...form, where_found: e.target.value })}
                    placeholder="e.g. Attic of a 1920s home in Portland, OR"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">City, state, or general location description.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">Photos</h3>
              <p className="text-sm text-slate-500">Upload photos of your find (optional but recommended — AI uses them for context).</p>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(Array.from(e.target.files))}
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700">
                    {uploadingPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingPhotos ? 'Uploading...' : 'Upload Photos'}
                  </span>
                </label>
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {idx === 0 && (
                        <Badge className="absolute bottom-1 left-1 text-[10px] bg-purple-600 text-white">Featured</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video — admin only can add YouTube; all users can upload video */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">Video (Optional)</h3>

              <div>
                <Label className="text-sm text-slate-600">Upload a Video File</Label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleVideoUpload(e.target.files[0])}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700">
                      {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingVideo ? 'Uploading...' : 'Upload Video'}
                    </span>
                  </label>
                  {videoUrl && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" /> Video uploaded
                    </Badge>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div>
                  <Label className="text-sm text-slate-600 flex items-center gap-1">
                    <Youtube className="w-4 h-4 text-red-500" /> YouTube Video URL (Admin)
                  </Label>
                  <Input
                    type="url"
                    value={form.youtube_url}
                    onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
              size="lg"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
            <Link to="/CoolFindsBlog">
              <Button type="button" variant="outline" size="lg">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>

      <SharedFooter />
    </div>
  );
}