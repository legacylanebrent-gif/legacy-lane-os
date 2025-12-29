import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin, Save } from 'lucide-react';

export default function ConsumerHome() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setFormData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        street: userData.address?.street || '',
        city: userData.address?.city || '',
        state: userData.address?.state || '',
        zip: userData.address?.zip || ''
      });
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        full_name: formData.full_name,
        phone: formData.phone,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip
        }
      };
      
      await base44.auth.updateMe(updateData);
      alert('Profile updated successfully!');
      loadUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">
          Welcome, {user?.full_name || 'User'}
        </h1>
        <p className="text-slate-600">Manage your profile information</p>
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <p className="text-sm font-mono">
            DEBUG: primary_account_type = "{user?.primary_account_type}"
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Profile Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your full name"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={formData.email}
                  disabled
                  className="pl-10 bg-slate-50"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 555-5555"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Address</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Street Address</Label>
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div>
                  <Label>ZIP Code</Label>
                  <Input
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    placeholder="12345"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}