import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

export default function BidRequestModal({ vendor, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    service_type: '',
    property_address: '',
    timeline: 'flexible',
    budget_range: '',
    description: '',
    contact_phone: '',
    preferred_contact: 'email'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me();

      // Create bid request (would be a new BidRequest entity in production)
      await base44.entities.Activity.create({
        contact_id: user.id,
        user_id: user.id,
        activity_type: 'note',
        subject: `Bid Request for ${vendor.company_name}`,
        description: `Service: ${formData.service_type}\nAddress: ${formData.property_address}\nTimeline: ${formData.timeline}\nBudget: ${formData.budget_range}\n\nDetails: ${formData.description}`,
        status: 'planned'
      });

      setStep(2);
    } catch (error) {
      console.error('Error creating bid request:', error);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-2xl font-serif font-bold text-navy-900 mb-2">
              Request Sent!
            </h3>
            <p className="text-slate-600 mb-6">
              {vendor.company_name} will respond within {vendor.response_time_hours || 24} hours
            </p>
            <Button onClick={onSuccess} className="bg-gold-600 hover:bg-gold-700">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-navy-900">
            Request Bid from {vendor.company_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div>
            <Label htmlFor="service_type">Service Needed *</Label>
            <Select 
              value={formData.service_type} 
              onValueChange={(val) => setFormData({...formData, service_type: val})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {vendor.services_offered?.map(service => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="address">Property Address *</Label>
            <Input
              id="address"
              value={formData.property_address}
              onChange={(e) => setFormData({...formData, property_address: e.target.value})}
              placeholder="123 Main St, City, State"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeline">Timeline</Label>
              <Select 
                value={formData.timeline} 
                onValueChange={(val) => setFormData({...formData, timeline: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent (1-3 days)</SelectItem>
                  <SelectItem value="soon">Soon (1-2 weeks)</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="budget">Budget Range</Label>
              <Input
                id="budget"
                value={formData.budget_range}
                onChange={(e) => setFormData({...formData, budget_range: e.target.value})}
                placeholder="e.g., $500-1000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Project Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your project in detail..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                placeholder="(555) 555-5555"
              />
            </div>

            <div>
              <Label htmlFor="contact">Preferred Contact</Label>
              <Select 
                value={formData.preferred_contact} 
                onValueChange={(val) => setFormData({...formData, preferred_contact: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="either">Either</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading}
              className="bg-gold-600 hover:bg-gold-700"
            >
              {loading ? 'Sending...' : 'Send Bid Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}