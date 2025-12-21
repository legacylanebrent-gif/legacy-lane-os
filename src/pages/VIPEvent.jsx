import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import VIPEventManager from '@/components/vip/VIPEventManager';

export default function VIPEvent() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  useEffect(() => {
    if (!eventId) {
      navigate(-1);
      return;
    }
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const events = await base44.entities.VIPEvent.filter({ id: eventId });
      if (events.length === 0) {
        alert('Event not found');
        navigate(-1);
        return;
      }
      setEvent(events[0]);
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Sale
        </Button>
      </div>

      <VIPEventManager event={event} />
    </div>
  );
}