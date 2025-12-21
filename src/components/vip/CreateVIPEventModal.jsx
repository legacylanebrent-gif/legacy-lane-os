import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Star } from 'lucide-react';

export default function CreateVIPEventModal({ open, onClose, sale, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: null,
    start_time: '9:00 AM',
    end_time: '11:00 AM',
    max_attendees: 50,
    tickets_per_invite: 1
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.event_date) {
      alert('Please enter a title and date');
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.VIPEvent.create({
        sale_id: sale.id,
        sale_title: sale.title,
        operator_id: user.id,
        title: formData.title,
        description: formData.description,
        event_date: format(formData.event_date, 'yyyy-MM-dd'),
        start_time: formData.start_time,
        end_time: formData.end_time,
        max_attendees: parseInt(formData.max_attendees),
        tickets_per_invite: parseInt(formData.tickets_per_invite),
        status: 'draft'
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating VIP event:', error);
      alert('Failed to create VIP event');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: null,
      start_time: '9:00 AM',
      end_time: '11:00 AM',
      max_attendees: 50,
      tickets_per_invite: 1
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600" />
            Create VIP Pre-Sale Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Event Title *</Label>
            <Input
              placeholder="VIP Early Access Event"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Exclusive early access for VIP members before the public sale..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Event Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.event_date ? format(formData.event_date, 'PPP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.event_date}
                    onSelect={(date) => setFormData({...formData, event_date: date})}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Start Time</Label>
              <Input
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
              />
            </div>

            <div>
              <Label>End Time</Label>
              <Input
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max Attendees</Label>
              <Input
                type="number"
                value={formData.max_attendees}
                onChange={(e) => setFormData({...formData, max_attendees: e.target.value})}
              />
            </div>
            <div>
              <Label>Tickets Per VIP</Label>
              <Input
                type="number"
                min="1"
                value={formData.tickets_per_invite}
                onChange={(e) => setFormData({...formData, tickets_per_invite: e.target.value})}
              />
              <p className="text-xs text-slate-600 mt-1">Guests per invitation</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}