import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, Building2, Mail, Phone, Globe, MapPin, Loader2 } from 'lucide-react';

export default function VendorClaim() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    company_description: '',
    service_areas: '',
    website: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadVendor();
  }, []);

  const loadVendor = async () => {
    try {
      const code = searchParams.get('code');
      if (!code) {
        setError('Invalid or missing invite code');
        setLoading(false);
        return;
      }

      const vendors = await base44.entities.Vendor.filter({ invite_code: code });
      if (vendors.length === 0) {
        setError('This invite link is invalid or has expired');
        setLoading(false);
        return;
      }

      const vendorData = vendors[0];
      
      if (vendorData.claim_status === 'verified' || vendorData.user_id) {
        setError('This listing has already been claimed. Please login.');
        setLoading(false);
        return;
      }

      if (vendorData.trial_end_date && new Date(vendorData.trial_end_date) < new Date()) {
        setError('This invite has expired.');
        setLoading(false);
        return;
      }

      setVendor(vendorData);
      setFormData(prev => ({
        ...prev,
        website: vendorData.website || '',
        service_areas: (vendorData.service_areas || []).join(', ')
      }));
    } catch (error) {
      console.error('Error loading vendor:', error);
      setError('Failed to load vendor information');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!vendor) return;

    if (!formData.full_name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const result = await base44.functions.invoke('createVendorWithInvite', {
        vendor_id: vendor.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        company_description: formData.company_description,
        service_areas: formData.service_areas.split(',').map(s => s.trim()).filter(Boolean),
        website: formData.website
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/VendorDashboard');
        }, 2000);
      } else {
        setError(result.error || 'Failed to claim listing');
      }
    } catch (error) {
      console.error('Error claiming vendor:', error);
      setError(error.message || 'Failed to claim listing');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-emerald-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-cyan-600" />
            <p className="text-slate-600">Loading your invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !vendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Invitation Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              Listing Claimed!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Welcome to EstateSalen! Your 14-day free trial is now active.
            </p>
            <p className="text-sm text-slate-500">Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = vendor.trial_end_date 
    ? Math.max(0, Math.ceil((new Date(vendor.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24)))
    : 14;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-emerald-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-600" />
                  Claim Your Vendor Listing
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Invited by {vendor.invited_by_name || 'EstateSalen Team'}
                </p>
              </div>
              <Badge className="bg-green-600">
                {daysRemaining} Days Free Trial
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <h3 className="font-semibold text-cyan-900 mb-2">Company Information</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-600" />
                  <span className="text-cyan-700">{vendor.company_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-600" />
                  <span className="text-cyan-700">{vendor.invite_email}</span>
                </div>
                {vendor.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-600" />
                    <span className="text-cyan-700">{vendor.website}</span>
                  </div>
                )}
                {vendor.service_areas?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-600" />
                    <span className="text-cyan-700">{vendor.service_areas.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <p className="text-sm text-slate-500">
              Complete the form to claim your listing and activate free trial
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://company.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="company_description">Company Description</Label>
              <Textarea
                id="company_description"
                value={formData.company_description}
                onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
                placeholder="Tell us about your services..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="service_areas">Service Areas</Label>
              <Input
                id="service_areas"
                value={formData.service_areas}
                onChange={(e) => setFormData({ ...formData, service_areas: e.target.value })}
                placeholder="City1, City2, City3"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button 
              onClick={handleClaim} 
              disabled={claiming}
              className="w-full mt-6 bg-cyan-600 hover:bg-cyan-700"
              size="lg"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Claim Listing & Start Free Trial
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center mt-4">
              By claiming, you agree to Terms of Service. 14-day free trial starts immediately.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}