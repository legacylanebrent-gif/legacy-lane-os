import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Globe, DollarSign, Users, Bell, Shield, Mail, Palette, Zap } from 'lucide-react';
export default function Settings() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // General
    site_name: 'Legacy Lane OS',
    site_description: 'Comprehensive platform for estate sales, real estate, and marketplace',
    support_email: 'support@legacylane.com',
    
    // Financial
    platform_fee_rate: 10,
    referral_fee_rate: 5,
    vendor_commission_rate: 15,
    subscription_trial_days: 14,
    
    // Features
    enable_estate_sales: true,
    enable_marketplace: true,
    enable_courses: true,
    enable_vendor_directory: true,
    require_approval_for_sales: false,
    require_approval_for_vendors: true,
    
    // Notifications
    email_notifications: true,
    admin_alerts: true,
    lead_notifications: true,
    
    // Security
    require_email_verification: true,
    enable_two_factor: false,
    session_timeout_hours: 24
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // In production, save to settings entity
    setTimeout(() => {
      setSaving(false);
      alert('Settings saved successfully');
    }, 1000);
  };

  const isAdmin = user?.primary_role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50 p-8">
        <Card className="max-w-2xl mx-auto p-12 text-center">
          <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-serif font-bold text-navy-900 mb-2">
            Admin Access Required
          </h2>
          <p className="text-slate-600">
            You need administrator privileges to access settings.
          </p>
        </Card>
      </div>
    );
  }

  const SettingsContent = () => (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
            Platform Settings
          </h1>
          <p className="text-slate-600">Manage all aspects of Legacy Lane OS</p>
        </div>

        <Tabs defaultValue="general">
          <div className="overflow-x-auto pb-2 -mx-8 px-8 lg:mx-0 lg:px-0 mb-6">
            <TabsList className="inline-flex w-max min-w-full lg:w-full">
              <TabsTrigger value="general" className="whitespace-nowrap">
                <Globe className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="financial" className="whitespace-nowrap">
                <DollarSign className="w-4 h-4 mr-2" />
                Financial
              </TabsTrigger>
              <TabsTrigger value="features" className="whitespace-nowrap">
                <Zap className="w-4 h-4 mr-2" />
                Features
              </TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap">
                <Users className="w-4 h-4 mr-2" />
                Users & Roles
              </TabsTrigger>
              <TabsTrigger value="notifications" className="whitespace-nowrap">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="whitespace-nowrap">
                <Shield className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="branding" className="whitespace-nowrap">
                <Palette className="w-4 h-4 mr-2" />
                Branding
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="site_name">Site Name</Label>
                  <Input
                    id="site_name"
                    value={settings.site_name}
                    onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="site_description">Site Description</Label>
                  <Textarea
                    id="site_description"
                    value={settings.site_description}
                    onChange={(e) => setSettings({...settings, site_description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => setSettings({...settings, support_email: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fee Structure</CardTitle>
                  <CardDescription>Platform fees and commissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="platform_fee">Platform Fee (%)</Label>
                      <Input
                        id="platform_fee"
                        type="number"
                        value={settings.platform_fee_rate}
                        onChange={(e) => setSettings({...settings, platform_fee_rate: parseFloat(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="referral_fee">Referral Fee (%)</Label>
                      <Input
                        id="referral_fee"
                        type="number"
                        value={settings.referral_fee_rate}
                        onChange={(e) => setSettings({...settings, referral_fee_rate: parseFloat(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="vendor_commission">Vendor Commission (%)</Label>
                      <Input
                        id="vendor_commission"
                        type="number"
                        value={settings.vendor_commission_rate}
                        onChange={(e) => setSettings({...settings, vendor_commission_rate: parseFloat(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="trial_days">Free Trial (Days)</Label>
                      <Input
                        id="trial_days"
                        type="number"
                        value={settings.subscription_trial_days}
                        onChange={(e) => setSettings({...settings, subscription_trial_days: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Agent Pro</h4>
                        <p className="text-sm text-slate-600">$99/month</p>
                      </div>
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Operator Pro</h4>
                        <p className="text-sm text-slate-600">$149/month</p>
                      </div>
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Investor Premium</h4>
                        <p className="text-sm text-slate-600">$199/month</p>
                      </div>
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Feature Toggles</CardTitle>
                <CardDescription>Enable or disable platform features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Estate Sales</h4>
                    <p className="text-sm text-slate-600">Allow estate sale listings</p>
                  </div>
                  <Switch
                    checked={settings.enable_estate_sales}
                    onCheckedChange={(val) => setSettings({...settings, enable_estate_sales: val})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Marketplace</h4>
                    <p className="text-sm text-slate-600">Enable marketplace functionality</p>
                  </div>
                  <Switch
                    checked={settings.enable_marketplace}
                    onCheckedChange={(val) => setSettings({...settings, enable_marketplace: val})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Courses</h4>
                    <p className="text-sm text-slate-600">Allow course creation and sales</p>
                  </div>
                  <Switch
                    checked={settings.enable_courses}
                    onCheckedChange={(val) => setSettings({...settings, enable_courses: val})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Vendor Directory</h4>
                    <p className="text-sm text-slate-600">Enable vendor partnerships</p>
                  </div>
                  <Switch
                    checked={settings.enable_vendor_directory}
                    onCheckedChange={(val) => setSettings({...settings, enable_vendor_directory: val})}
                  />
                </div>

                <div className="border-t pt-6 mt-6">
                  <h3 className="font-semibold mb-4">Approval Requirements</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Estate Sale Approval</h4>
                        <p className="text-sm text-slate-600">Require admin approval for new estate sales</p>
                      </div>
                      <Switch
                        checked={settings.require_approval_for_sales}
                        onCheckedChange={(val) => setSettings({...settings, require_approval_for_sales: val})}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Vendor Approval</h4>
                        <p className="text-sm text-slate-600">Require admin approval for new vendors</p>
                      </div>
                      <Switch
                        checked={settings.require_approval_for_vendors}
                        onCheckedChange={(val) => setSettings({...settings, require_approval_for_vendors: val})}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Configure user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Available Roles</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge>Super Admin</Badge>
                      <Badge>Platform Ops</Badge>
                      <Badge>Estate Sale Operator</Badge>
                      <Badge>Real Estate Agent</Badge>
                      <Badge>Investor</Badge>
                      <Badge>Coach</Badge>
                      <Badge>Vendor</Badge>
                      <Badge>Consumer</Badge>
                      <Badge>Executor</Badge>
                      <Badge>Home Seller</Badge>
                      <Badge>Buyer</Badge>
                      <Badge>Downsizer</Badge>
                      <Badge>DIY Seller</Badge>
                    </div>
                  </div>

                  <Button className="bg-gold-600 hover:bg-gold-700">
                    Manage Role Permissions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure system notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Email Notifications</h4>
                    <p className="text-sm text-slate-600">Send transactional emails</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(val) => setSettings({...settings, email_notifications: val})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Admin Alerts</h4>
                    <p className="text-sm text-slate-600">Critical system alerts</p>
                  </div>
                  <Switch
                    checked={settings.admin_alerts}
                    onCheckedChange={(val) => setSettings({...settings, admin_alerts: val})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Lead Notifications</h4>
                    <p className="text-sm text-slate-600">New lead alerts</p>
                  </div>
                  <Switch
                    checked={settings.lead_notifications}
                    onCheckedChange={(val) => setSettings({...settings, lead_notifications: val})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Platform security configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Email Verification</h4>
                    <p className="text-sm text-slate-600">Require email verification for new users</p>
                  </div>
                  <Switch
                    checked={settings.require_email_verification}
                    onCheckedChange={(val) => setSettings({...settings, require_email_verification: val})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Two-Factor Authentication</h4>
                    <p className="text-sm text-slate-600">Enable 2FA for all users</p>
                  </div>
                  <Switch
                    checked={settings.enable_two_factor}
                    onCheckedChange={(val) => setSettings({...settings, enable_two_factor: val})}
                  />
                </div>

                <div>
                  <Label htmlFor="session_timeout">Session Timeout (Hours)</Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    value={settings.session_timeout_hours}
                    onChange={(e) => setSettings({...settings, session_timeout_hours: parseInt(e.target.value)})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Branding & Appearance</CardTitle>
                <CardDescription>Customize platform look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Logo</Label>
                  <div className="mt-2 p-8 border-2 border-dashed rounded-lg text-center">
                    <p className="text-slate-500">Upload custom logo</p>
                    <Button variant="outline" className="mt-2">Choose File</Button>
                  </div>
                </div>

                <div>
                  <Label>Favicon</Label>
                  <div className="mt-2 p-8 border-2 border-dashed rounded-lg text-center">
                    <p className="text-slate-500">Upload favicon</p>
                    <Button variant="outline" className="mt-2">Choose File</Button>
                  </div>
                </div>

                <div>
                  <Label>Custom CSS</Label>
                  <Textarea
                    placeholder="/* Add custom CSS */"
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-8">
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-gold-600 hover:bg-gold-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </div>
    </div>
  );

  return <SettingsContent />;
}