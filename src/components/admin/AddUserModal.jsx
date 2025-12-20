import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const ACCOUNT_TYPES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'platform_ops', label: 'Platform Ops' },
  { value: 'growth_team', label: 'Growth Team' },
  { value: 'partnerships', label: 'Partnerships' },
  { value: 'education_admin', label: 'Education Admin' },
  { value: 'finance_admin', label: 'Finance Admin' },
  { value: 'estate_sale_operator', label: 'Estate Sale Operator' },
  { value: 'real_estate_agent', label: 'Real Estate Agent' },
  { value: 'investor', label: 'Investor' },
  { value: 'consignor', label: 'Consignor' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'coach', label: 'Coach' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'executor', label: 'Executor' },
  { value: 'home_seller', label: 'Home Seller' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'downsizer', label: 'Downsizer' },
  { value: 'diy_seller', label: 'DIY Seller' }
];

export default function AddUserModal({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    primary_account_type: '',
    phone: '',
    bio: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    },
    company_name: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    business_license: '',
    insurance_provider: '',
    insurance_policy_number: '',
    years_in_business: '',
    service_areas: [],
    specializations: [],
    company_address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const divisions = [];
      const accountType = formData.primary_account_type;

      if (['estate_sale_operator', 'executor', 'consignor'].includes(accountType)) {
        divisions.push('estate_services');
      }
      if (['real_estate_agent', 'home_seller', 'buyer'].includes(accountType)) {
        divisions.push('real_estate');
      }
      if (accountType === 'investor') {
        divisions.push('investment');
      }
      if (['consumer', 'buyer', 'diy_seller', 'downsizer', 'consignor'].includes(accountType)) {
        divisions.push('marketplace');
      }
      if (['estate_sale_operator', 'real_estate_agent', 'investor'].includes(accountType)) {
        divisions.push('marketing');
      }
      if (accountType === 'coach' || divisions.length > 0) {
        divisions.push('education');
      }

      await base44.asServiceRole.entities.User.create({
        ...formData,
        account_types: [formData.primary_account_type],
        divisions_access: [...new Set(divisions)],
        onboarding_completed: true
      });

      onSuccess();
      onClose();
      setFormData({
        full_name: '',
        email: '',
        primary_account_type: '',
        phone: '',
        bio: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: ''
        },
        company_name: '',
        company_phone: '',
        company_email: '',
        company_website: '',
        business_license: '',
        insurance_provider: '',
        insurance_policy_number: '',
        years_in_business: '',
        service_areas: [],
        specializations: [],
        company_address: {
          street: '',
          city: '',
          state: '',
          zip: ''
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="account_type">Account Type *</Label>
            <Select 
              value={formData.primary_account_type}
              onValueChange={(value) => setFormData({...formData, primary_account_type: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>

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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="bio">Bio / About</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Personal Address</Label>
              <Input
                placeholder="Street Address"
                value={formData.address.street}
                onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="City"
                  value={formData.address.city}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                />
                <Input
                  placeholder="State"
                  value={formData.address.state}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                />
                <Input
                  placeholder="ZIP"
                  value={formData.address.zip}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, zip: e.target.value}})}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="years_in_business">Years in Business</Label>
                <Input
                  id="years_in_business"
                  type="number"
                  value={formData.years_in_business}
                  onChange={(e) => setFormData({...formData, years_in_business: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_phone">Company Phone</Label>
                <Input
                  id="company_phone"
                  type="tel"
                  value={formData.company_phone}
                  onChange={(e) => setFormData({...formData, company_phone: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="company_email">Company Email</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={formData.company_email}
                  onChange={(e) => setFormData({...formData, company_email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="company_website">Company Website</Label>
              <Input
                id="company_website"
                type="url"
                placeholder="https://example.com"
                value={formData.company_website}
                onChange={(e) => setFormData({...formData, company_website: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <Label>Company Address</Label>
              <Input
                placeholder="Street Address"
                value={formData.company_address.street}
                onChange={(e) => setFormData({...formData, company_address: {...formData.company_address, street: e.target.value}})}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="City"
                  value={formData.company_address.city}
                  onChange={(e) => setFormData({...formData, company_address: {...formData.company_address, city: e.target.value}})}
                />
                <Input
                  placeholder="State"
                  value={formData.company_address.state}
                  onChange={(e) => setFormData({...formData, company_address: {...formData.company_address, state: e.target.value}})}
                />
                <Input
                  placeholder="ZIP"
                  value={formData.company_address.zip}
                  onChange={(e) => setFormData({...formData, company_address: {...formData.company_address, zip: e.target.value}})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_license">Business License Number</Label>
                <Input
                  id="business_license"
                  value={formData.business_license}
                  onChange={(e) => setFormData({...formData, business_license: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insurance_provider">Insurance Provider</Label>
                <Input
                  id="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="insurance_policy">Policy Number</Label>
                <Input
                  id="insurance_policy"
                  value={formData.insurance_policy_number}
                  onChange={(e) => setFormData({...formData, insurance_policy_number: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="service_areas">Service Areas (comma separated)</Label>
              <Input
                id="service_areas"
                placeholder="Los Angeles, Orange County, San Diego"
                onChange={(e) => setFormData({
                  ...formData, 
                  service_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>

            <div>
              <Label htmlFor="specializations">Specializations (comma separated)</Label>
              <Input
                id="specializations"
                placeholder="Estate Sales, Downsizing, Consignment"
                onChange={(e) => setFormData({
                  ...formData, 
                  specializations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}