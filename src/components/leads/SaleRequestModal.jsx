import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

export default function SaleRequestModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    property_address: '',
    source: 'website',
    situation: 'rather_not_say',
    home_size: '',
    gated_community: false,
    sales_allowed: '',
    amount_to_sell: '',
    interested_in_full_service: '',
    items_to_sell: [],
    timeline: '',
    notes: '',
    score: 75
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.Lead.create({
        source: formData.source,
        source_details: 'Estate sale request via website',
        intent: 'estate_sale',
        situation: formData.situation || 'standard',
        property_address: formData.property_address,
        home_size: formData.home_size,
        gated_community: formData.gated_community,
        sales_allowed: formData.sales_allowed,
        amount_to_sell: formData.amount_to_sell,
        interested_in_full_service: formData.interested_in_full_service,
        items_to_sell: formData.items_to_sell,
        timeline: formData.timeline,
        score: parseInt(formData.score),
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        notes: formData.notes
      });

      const names = formData.contact_name.split(' ');
      await base44.entities.Contact.create({
        first_name: names[0],
        last_name: names.slice(1).join(' ') || names[0],
        email: formData.contact_email,
        phone: formData.contact_phone,
        lead_source: 'website',
        situation: formData.situation || 'standard',
        notes: formData.notes
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setFormData({
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      property_address: '',
      source: 'website',
      situation: 'rather_not_say',
      home_size: '',
      gated_community: false,
      sales_allowed: '',
      amount_to_sell: '',
      interested_in_full_service: '',
      items_to_sell: [],
      timeline: '',
      notes: '',
      score: 75
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <div className="max-h-[calc(90vh-4rem)] overflow-y-auto pr-2">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Submit Estate Sale Request</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">
              Request Received!
            </h3>
            <p className="text-slate-600 mb-6">
              We'll contact local estate sale companies on your behalf and they will reach out to you within 24-48 hours.
            </p>
            <Button onClick={handleClose} className="bg-cyan-600 hover:bg-cyan-700">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="address">Property Address *</Label>
              <Input
                id="address"
                value={formData.property_address}
                onChange={(e) => setFormData({...formData, property_address: e.target.value})}
                placeholder="123 Main St, City, State ZIP"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Situation</Label>
                <Select value={formData.situation} onValueChange={(value) => setFormData({...formData, situation: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="rather_not_say">I'd Rather Not Say</SelectItem>
                    <SelectItem value="probate">Probate</SelectItem>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="downsizing">Downsizing</SelectItem>
                    <SelectItem value="relocation">Relocation</SelectItem>
                    <SelectItem value="foreclosure">Foreclosure</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="estate">Estate</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Timeline</Label>
                <Select value={formData.timeline} onValueChange={(value) => setFormData({...formData, timeline: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
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
            </div>

            <div>
              <Label>Size of Home</Label>
              <Select value={formData.home_size} onValueChange={(value) => setFormData({...formData, home_size: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="1-2_bedroom">1-2 Bedroom House</SelectItem>
                  <SelectItem value="3-4_bedroom">3-4 Bedroom House</SelectItem>
                  <SelectItem value="5+_bedroom">5+ Bedroom House</SelectItem>
                  <SelectItem value="apartment_condo">Apartment or Condo</SelectItem>
                  <SelectItem value="storefront_business">Storefront or Business</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="gated_community"
                  checked={formData.gated_community}
                  onChange={(e) => setFormData({...formData, gated_community: e.target.checked, sales_allowed: ''})}
                  className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                />
                <Label htmlFor="gated_community" className="cursor-pointer">Gated Community?</Label>
              </div>

              {formData.gated_community && (
                <div>
                  <Label>Are in-person sales allowed?</Label>
                  <Select value={formData.sales_allowed} onValueChange={(value) => setFormData({...formData, sales_allowed: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="unsure">Unsure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>How much is to be sold?</Label>
                <Select value={formData.amount_to_sell} onValueChange={(value) => setFormData({...formData, amount_to_sell: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (90-100%)</SelectItem>
                    <SelectItem value="most">Most (50-90%)</SelectItem>
                    <SelectItem value="some">Some (&lt;50%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Interested in full service? (sale, cleanout, home sale)</Label>
                <Select value={formData.interested_in_full_service} onValueChange={(value) => setFormData({...formData, interested_in_full_service: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="unsure">Maybe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>What will you be selling?</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 p-4 border rounded-lg bg-slate-50 max-h-[400px] overflow-y-auto">
                {['Furniture', 'Antiques', 'Collectibles', 'Jewelry', 'Art & Paintings', 'China & Glassware', 'Crystal', 'Silver & Silverware', 'Books', 'Vintage Clothing', 'Tools', 'Garden & Outdoor', 'Kitchen & Dining', 'Appliances', 'Electronics', 'Linens & Bedding', 'Decorative Items', 'Rugs & Carpets', 'Lamps & Lighting', 'Musical Instruments', 'Sports Equipment', 'Toys & Games', 'Holiday Decorations', 'Records & Vinyl', 'Coins & Stamps', 'Watches & Clocks', 'Pottery & Ceramics', 'Vintage Electronics', 'Luggage & Trunks', 'Sewing & Crafts'].map(item => (
                  <div key={item} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`item_${item}`}
                      checked={formData.items_to_sell.includes(item)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, items_to_sell: [...formData.items_to_sell, item]});
                        } else {
                          setFormData({...formData, items_to_sell: formData.items_to_sell.filter(i => i !== item)});
                        }
                      }}
                      className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                    />
                    <Label htmlFor={`item_${item}`} className="cursor-pointer text-sm">{item}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Tell us about your estate sale needs..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button 
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={loading}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}