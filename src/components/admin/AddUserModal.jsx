import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    company_name: ''
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
        company_name: ''
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              required
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

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
            />
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