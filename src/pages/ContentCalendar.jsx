import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ContentCalendar() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'social_media',
    publishDate: '',
    platform: 'facebook',
    status: 'draft'
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const user = await base44.auth.me();
      const contentData = await base44.entities.MarketingTask.filter({ user_id: user.id }, '-created_date');
      setContent(contentData || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContent = async () => {
    if (!formData.title || !formData.publishDate) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await base44.entities.MarketingTask.create({
        ...formData,
        publish_date: new Date(formData.publishDate).toISOString()
      });

      setFormData({ title: '', type: 'social_media', publishDate: '', platform: 'facebook', status: 'draft' });
      setShowModal(false);
      await loadContent();
    } catch (error) {
      console.error('Error adding content:', error);
      alert('Failed to add content');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading calendar...</div>;

  const contentByDate = content.reduce((acc, item) => {
    const date = item.publish_date?.split('T')[0] || new Date().toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(contentByDate).sort();
  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700'
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="w-8 h-8" />
          Content Calendar
        </h1>
        <Button 
          onClick={() => setShowModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Content
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Total Items</div>
            <div className="text-3xl font-bold">{content.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Drafts</div>
            <div className="text-3xl font-bold text-slate-600">{content.filter(c => c.status === 'draft').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Published</div>
            <div className="text-3xl font-bold text-green-600">{content.filter(c => c.status === 'published').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      {sortedDates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {sortedDates.map(date => (
                <div key={date}>
                  <h3 className="font-semibold text-lg mb-3">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
                  <div className="space-y-2 ml-4 border-l-2 border-slate-200 pl-4">
                    {contentByDate[date].map(item => (
                      <div key={item.id} className="p-3 border rounded-lg bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-xs text-slate-600 mt-1">{item.type} • {item.platform}</div>
                          </div>
                          <Badge className={statusColors[item.status] || statusColors.draft}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-slate-600">
            No content scheduled. Create your first piece to get started!
          </CardContent>
        </Card>
      )}

      {/* Add Content Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                placeholder="Content title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select 
                className="w-full border rounded-md p-2"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="social_media">Social Media</option>
                <option value="email">Email</option>
                <option value="blog">Blog Post</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Platform</label>
              <select 
                className="w-full border rounded-md p-2"
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Publish Date</label>
              <Input
                type="datetime-local"
                value={formData.publishDate}
                onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddContent} className="flex-1 bg-orange-600 hover:bg-orange-700">
                Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}