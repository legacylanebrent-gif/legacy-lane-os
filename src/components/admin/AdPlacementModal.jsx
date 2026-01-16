import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdPlacementModal({ isOpen, onClose, onSave, placement = null }) {
  const [formData, setFormData] = useState({
    company_id: '',
    company_name: '',
    placement_type: 'national',
    zip_code: '',
    radius_miles: 25,
    location_coordinates: { lat: null, lng: null },
    is_active: true,
    start_date: '',
    end_date: '',
    logo_url: '',
    company_url: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadVendors();
      if (placement) {
        setFormData(placement);
      }
    }
  }, [isOpen, placement]);

  const loadVendors = async () => {
    try {
      const vendorList = await base44.entities.Vendor.list();
      setVendors(vendorList || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const handleGeocodeZip = async () => {
    if (!formData.zip_code) {
      alert('Please enter a zip code');
      return;
    }

    try {
      const apiKey = await base44.functions.invoke('getConfig', { key: 'GOOGLE_MAPS_API_KEY' });
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${formData.zip_code}&key=${apiKey.data}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        setFormData(prev => ({
          ...prev,
          location_coordinates: { lat, lng }
        }));
      } else {
        alert('Zip code not found');
      }
    } catch (error) {
      console.error('Error geocoding zip:', error);
      alert('Failed to geocode zip code');
    }
  };

  const handleVendorSelect = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        company_id: vendor.id,
        company_name: vendor.company_name
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.company_id || !formData.placement_type) {
      alert('Please fill in required fields');
      return;
    }

    if (formData.placement_type === 'local' && !formData.zip_code) {
      alert('Please enter a zip code for local placement');
      return;
    }

    setLoading(true);
    try {
      if (placement?.id) {
        await base44.entities.AdPlacement.update(placement.id, formData);
      } else {
        await base44.entities.AdPlacement.create(formData);
      }
      onSave();
      setFormData({
        company_id: '',
        company_name: '',
        placement_type: 'national',
        zip_code: '',
        radius_miles: 25,
        location_coordinates: { lat: null, lng: null },
        is_active: true,
        start_date: '',
        end_date: '',
        logo_url: '',
        company_url: '',
        description: ''
      });
      onClose();
    } catch (error) {
      console.error('Error saving placement:', error);
      alert('Failed to save placement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{placement ? 'Edit Ad Placement' : 'Add Ad Placement'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Company *</Label>
            <Select value={formData.company_id} onValueChange={handleVendorSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Placement Type *</Label>
            <Select value={formData.placement_type} onValueChange={(value) => setFormData(prev => ({ ...prev, placement_type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national">National</SelectItem>
                <SelectItem value="local">Local</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.placement_type === 'local' && (
            <>
              <div className="space-y-2">
                <Label>Zip Code *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter zip code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                  />
                  <Button onClick={handleGeocodeZip} variant="outline">
                    Geocode
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Radius (miles)</Label>
                <Input
                  type="number"
                  value={formData.radius_miles}
                  onChange={(e) => setFormData(prev => ({ ...prev, radius_miles: parseFloat(e.target.value) }))}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input
              placeholder="https://..."
              value={formData.logo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Company Website</Label>
            <Input
              placeholder="https://..."
              value={formData.company_url}
              onChange={(e) => setFormData(prev => ({ ...prev, company_url: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Brief description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4"
            />
            <Label className="mb-0">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            {loading ? 'Saving...' : 'Save Placement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}