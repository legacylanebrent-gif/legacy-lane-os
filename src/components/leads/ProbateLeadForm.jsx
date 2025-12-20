import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

export default function ProbateLeadForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property_address: '',
    relationship: '',
    details: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.Lead.create({
        source: 'probate',
        intent: 'sell_home',
        situation: 'probate',
        property_address: formData.property_address,
        score: 85
      });

      const names = formData.name.split(' ');
      await base44.entities.Contact.create({
        first_name: names[0],
        last_name: names.slice(1).join(' ') || names[0],
        email: formData.email,
        phone: formData.phone,
        lead_source: 'probate',
        situation: 'probate',
        notes: formData.details
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
          We're Here to Help
        </h3>
        <p className="text-slate-600">
          A certified probate specialist will contact you within 24 hours.
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
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Property Address</Label>
        <Input
          id="address"
          value={formData.property_address}
          onChange={(e) => setFormData({...formData, property_address: e.target.value})}
          placeholder="123 Main St, City, State"
        />
      </div>

      <div>
        <Label htmlFor="relationship">Your Relationship to the Deceased</Label>
        <Input
          id="relationship"
          value={formData.relationship}
          onChange={(e) => setFormData({...formData, relationship: e.target.value})}
          placeholder="e.g., Executor, Family Member"
        />
      </div>

      <div>
        <Label htmlFor="details">Additional Details</Label>
        <Textarea
          id="details"
          value={formData.details}
          onChange={(e) => setFormData({...formData, details: e.target.value})}
          placeholder="Tell us about your situation..."
          rows={4}
        />
      </div>

      <Button 
        type="submit"
        disabled={loading}
        className="w-full bg-gold-600 hover:bg-gold-700 h-12 text-lg"
      >
        {loading ? 'Submitting...' : 'Request Free Consultation'}
      </Button>
    </form>
  );
}