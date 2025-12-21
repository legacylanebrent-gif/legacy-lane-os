import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const VENDOR_TYPES = [
  { value: 'mover', label: 'Mover' },
  { value: 'cleanout', label: 'Cleanout' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'cpa', label: 'CPA' },
  { value: 'stager', label: 'Stager' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'appraiser', label: 'Appraiser' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'other', label: 'Other' }
];

const TIER_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'preferred', label: 'Preferred' },
  { value: 'premier', label: 'Premier' }
];

export default function VendorModal({ open, onClose, vendor, onSuccess }) {
  const [formData, setFormData] = useState({
    company_name: '',
    vendor_type: 'mover',
    services_offered: [],
    service_areas: [],
    tier: 'standard',
    rating: 0,
    total_reviews: 0,
    jobs_completed: 0,
    response_time_hours: 0,
    average_bid: 0,
    insurance_verified: false,
    license_number: '',
    website: '',
    revenue_share_rate: 0
  });
  const [newService, setNewService] = useState('');
  const [newArea, setNewArea] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vendor) {
      setFormData({
        company_name: vendor.company_name || '',
        vendor_type: vendor.vendor_type || 'mover',
        services_offered: vendor.services_offered || [],
        service_areas: vendor.service_areas || [],
        tier: vendor.tier || 'standard',
        rating: vendor.rating || 0,
        total_reviews: vendor.total_reviews || 0,
        jobs_completed: vendor.jobs_completed || 0,
        response_time_hours: vendor.response_time_hours || 0,
        average_bid: vendor.average_bid || 0,
        insurance_verified: vendor.insurance_verified || false,
        license_number: vendor.license_number || '',
        website: vendor.website || '',
        revenue_share_rate: vendor.revenue_share_rate || 0
      });
    } else {
      setFormData({
        company_name: '',
        vendor_type: 'mover',
        services_offered: [],
        service_areas: [],
        tier: 'standard',
        rating: 0,
        total_reviews: 0,
        jobs_completed: 0,
        response_time_hours: 0,
        average_bid: 0,
        insurance_verified: false,
        license_number: '',
        website: '',
        revenue_share_rate: 0
      });
    }
  }, [vendor, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (vendor) {
        await base44.entities.Vendor.update(vendor.id, formData);
      } else {
        await base44.entities.Vendor.create(formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    if (newService.trim() && !formData.services_offered.includes(newService.trim())) {
      setFormData({
        ...formData,
        services_offered: [...formData.services_offered, newService.trim()]
      });
      setNewService('');
    }
  };

  const removeService = (service) => {
    setFormData({
      ...formData,
      services_offered: formData.services_offered.filter(s => s !== service)
    });
  };

  const addArea = () => {
    if (newArea.trim() && !formData.service_areas.includes(newArea.trim())) {
      setFormData({
        ...formData,
        service_areas: [...formData.service_areas, newArea.trim()]
      });
      setNewArea('');
    }
  };

  const removeArea = (area) => {
    setFormData({
      ...formData,
      service_areas: formData.service_areas.filter(a => a !== area)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {vendor ? 'Edit Vendor' : 'Add New Vendor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendor Type *</Label>
                <select
                  value={formData.vendor_type}
                  onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                >
                  {VENDOR_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Tier</Label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {TIER_OPTIONS.map(tier => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Services Offered */}
          <div>
            <Label>Services Offered</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Add a service..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
              />
              <Button type="button" onClick={addService} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.services_offered.map((service, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {service}
                  <button
                    type="button"
                    onClick={() => removeService(service)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Service Areas */}
          <div>
            <Label>Service Areas</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Add a city/region..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArea())}
              />
              <Button type="button" onClick={addArea} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.service_areas.map((area, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {area}
                  <button
                    type="button"
                    onClick={() => removeArea(area)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rating (1-5)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Total Reviews</Label>
              <Input
                type="number"
                value={formData.total_reviews}
                onChange={(e) => setFormData({ ...formData, total_reviews: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Jobs Completed</Label>
              <Input
                type="number"
                value={formData.jobs_completed}
                onChange={(e) => setFormData({ ...formData, jobs_completed: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Response Time (hours)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.response_time_hours}
                onChange={(e) => setFormData({ ...formData, response_time_hours: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Average Bid ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.average_bid}
                onChange={(e) => setFormData({ ...formData, average_bid: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Revenue Share Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.revenue_share_rate}
                onChange={(e) => setFormData({ ...formData, revenue_share_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* License & Verification */}
          <div className="space-y-4">
            <div>
              <Label>License Number</Label>
              <Input
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              />
            </div>

            <div>
              <Label>Website</Label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.insurance_verified}
                onCheckedChange={(checked) => setFormData({ ...formData, insurance_verified: checked })}
              />
              <Label>Insurance Verified</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              {loading ? 'Saving...' : vendor ? 'Update Vendor' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}