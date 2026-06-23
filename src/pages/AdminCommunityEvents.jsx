import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle, XCircle, MapPin, Loader2, Clock, Calendar, Mail, Phone } from 'lucide-react';
import UniversalHeader from '@/components/layout/UniversalHeader';

const EVENT_TYPE_LABELS = {
  flea_market: 'Flea Market',
  antique_show: 'Antique Show',
  craft_show: 'Craft Show',
  collectibles_show: 'Collectibles Show',
  other: 'Community Event',
};

export default function AdminCommunityEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('draft');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) loadEvents();
    }).catch(() => {});
  }, [activeTab]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CommunityEvent.filter({ status: activeTab }, '-submitted_at', 100);
      setEvents(data || []);
    } catch (e) {
      console.error('Error loading events:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (evt) => {
    try {
      await base44.entities.CommunityEvent.update(evt.id, {
        status: 'published',
        published_at: new Date().toISOString(),
      });
      setEvents(prev => prev.filter(e => e.id !== evt.id));
    } catch (e) {
      alert('Error publishing event: ' + e.message);
    }
  };

  const handleReject = async (evt) => {
    try {
      await base44.entities.CommunityEvent.update(evt.id, { status: 'rejected' });
      setEvents(prev => prev.filter(e => e.id !== evt.id));
    } catch (e) {
      alert('Error rejecting event: ' + e.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatEventDate = (e) => {
    if (e.start_date === e.end_date || !e.end_date) return formatDate(e.start_date);
    return `${formatDate(e.start_date)} – ${formatDate(e.end_date)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UniversalHeader user={user} isAuthenticated={!!user} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-teal-600" /> Community Events — Admin
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review and publish submitted flea markets, antique shows, and community events.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="draft">
              <Clock className="w-4 h-4 mr-1" /> Pending ({events.length})
            </TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
              </div>
            ) : events.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-slate-400">
                No {activeTab} events.
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {events.map(evt => (
                  <Card key={evt.id} className="overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {evt.photos?.[0] ? (
                            <img src={evt.photos[0]} alt={evt.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <Badge className="bg-teal-100 text-teal-700 mb-1">
                                {EVENT_TYPE_LABELS[evt.event_type] || 'Event'}
                              </Badge>
                              {evt.geocode_status === 'geocoded' && (
                                <Badge className="bg-green-100 text-green-700 ml-1">Geocoded</Badge>
                              )}
                              {evt.geocode_status === 'failed' && (
                                <Badge className="bg-red-100 text-red-700 ml-1">Geocode Failed</Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(evt.submitted_at)}</span>
                          </div>

                          <h3 className="font-serif font-bold text-lg text-slate-900 mb-1">{evt.title}</h3>
                          {evt.description && <p className="text-sm text-slate-600 line-clamp-2 mb-2">{evt.description}</p>}

                          <div className="space-y-1 text-sm text-slate-500 mb-3">
                            <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatEventDate(evt)}{evt.start_time ? ` • ${evt.start_time}${evt.end_time ? `–${evt.end_time}` : ''}` : ''}</p>
                            <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {evt.property_address?.street}, {evt.property_address?.city}, {evt.property_address?.state} {evt.property_address?.zip}</p>
                            {evt.admission_fee && <p className="flex items-center gap-1.5">Admission: {evt.admission_fee}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                              <span>Organizer: {evt.organizer_name}</span>
                              {evt.organizer_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {evt.organizer_email}</span>}
                              {evt.organizer_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {evt.organizer_phone}</span>}
                            </div>
                          </div>

                          {activeTab === 'draft' && (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(evt)}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Publish
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(evt)}>
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
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