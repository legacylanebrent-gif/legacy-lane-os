import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

export default function DownsizingTool() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    current_home: '',
    timeline: 'exploring',
    reason: 'retirement'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.Lead.create({
        source: 'downsizing_tool',
        intent: 'sell_home',
        situation: 'downsizing',
        property_address: formData.current_home,
        timeline: formData.timeline,
        score: 70
      });

      const names = formData.name.split(' ');
      await base44.entities.Contact.create({
        first_name: names[0],
        last_name: names.slice(1).join(' ') || names[0],
        email: formData.email,
        phone: formData.phone,
        lead_source: 'downsizing_tool',
        situation: 'downsizing'
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error creating lead:', error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
        <h3 className="text-2xl font-serif font-bold text-navy-900 mb-2">
          Let's Make Your Move Easy
        </h3>
        <p className="text-slate-600">
          Our downsizing specialists will help you every step of the way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div>
        <Label htmlFor="name">Your Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="current_home">Current Home Address</Label>
        <Input
          id="current_home"
          value={formData.current_home}
          onChange={(e) => setFormData({...formData, current_home: e.target.value})}
          placeholder="123 Main St, City, State"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="timeline">Timeline</Label>
          <Select value={formData.timeline} onValueChange={(val) => setFormData({...formData, timeline: val})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="1_3_months">1-3 Months</SelectItem>
              <SelectItem value="3_6_months">3-6 Months</SelectItem>
              <SelectItem value="6_12_months">6-12 Months</SelectItem>
              <SelectItem value="exploring">Just Exploring</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="reason">Reason for Downsizing</Label>
          <Select value={formData.reason} onValueChange={(val) => setFormData({...formData, reason: val})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="retirement">Retirement</SelectItem>
              <SelectItem value="empty_nest">Empty Nest</SelectItem>
              <SelectItem value="health">Health Reasons</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button 
        type="submit"
        disabled={loading}
        className="w-full bg-gold-600 hover:bg-gold-700 h-12 text-lg"
      >
        {loading ? 'Submitting...' : 'Get Downsizing Guide'}
      </Button>
    </form>
  );
}