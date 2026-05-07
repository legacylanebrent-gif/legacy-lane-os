import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { 
  User, Building2, Mail, Phone, MapPin, Bell, CreditCard, 
  Save, Upload, Check, ArrowUpCircle, ArrowDownCircle, Home, Eye, Calendar, FileText, ArrowRight, ShoppingBag, DollarSign, Share2
} from 'lucide-react';
import SocialMediaTab from '@/components/profile/SocialMediaTab';
import MarketplaceCredentialsTab from '@/components/profile/MarketplaceCredentialsTab';

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [packages, setPackages] = useState([]);
  const [estateSales, setEstateSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [uploadingVenmo, setUploadingVenmo] = useState(false);
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    company_description: '',
    business_address: '',
    website_url: '',
    profile_image_url: '',
    early_sign_in_default: true
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_new_leads: true,
    email_new_messages: true,
    email_sale_reminders: true,
    email_marketing_updates: false,
    sms_new_leads: false,
    sms_new_messages: true,
    sms_sale_reminders: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      setProfileData({
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        company_name: userData.company_name || '',
        company_description: userData.company_description || '',
        business_address: userData.business_address || '',
        website_url: userData.website_url || '',
        profile_image_url: userData.profile_image_url || '',
        early_sign_in_default: userData.early_sign_in_default !== false
      });

      if (userData.notification_settings) {
        setNotificationSettings({ ...notificationSettings, ...userData.notification_settings });
      }

      // Load subscription
      const subscriptions = await base44.entities.Subscription.filter({ user_id: userData.id });
      if (subscriptions.length > 0) {
        setSubscription(subscriptions[0]);
      }

      // Load available packages
      const accountType = userData.primary_account_type;
      if (accountType) {
        const packagesData = await base44.entities.SubscriptionPackage.filter({ 
          account_type: accountType,
          is_active: true 
        });
        setPackages(packagesData.sort((a, b) => {
          const order = { basic: 1, pro: 2, premium: 3 };
          return order[a.tier_level] - order[b.tier_level];
        }));
      }

      // Load estate sales only for operator-type users (consumers never own sales)
      const userAccountType = userData.primary_account_type || 'consumer';
      const isConsumer = !userAccountType || userAccountType === 'consumer' || userAccountType === 'executor' || userAccountType === 'home_seller' || userAccountType === 'buyer' || userAccountType === 'downsizer' || userAccountType === 'diy_seller' || userAccountType === 'consignor';
      const isTeamRole = ['team_admin', 'team_member', 'team_marketer'].includes(userAccountType);
      if (!isConsumer) {
        const operatorId = isTeamRole ? userData.operator_id : userData.id;
        if (operatorId) {
          const sales = await base44.entities.EstateSale.filter({ operator_id: operatorId });
          setEstateSales(sales);
        }
      }

      // Load user purchases
      const userPurchases = await base44.entities.Transaction.filter({ created_by: userData.email });
      setPurchases(userPurchases);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(profileData);
      alert('Profile updated successfully!');
      await loadData();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ notification_settings: notificationSettings });
      alert('Notification settings updated!');
    } catch (error) {
      console.error('Error saving notifications:', error);
      alert('Failed to update notifications');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSaving(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileData({ ...profileData, profile_image_url: file_url });
      await base44.auth.updateMe({ profile_image_url: file_url });
      alert('Profile image updated!');
      await loadData();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setSaving(false);
    }
  };

  const handleVenmoQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingVenmo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ venmo_qr_code: file_url });
      setUser({...user, venmo_qr_code: file_url});
      alert('Venmo QR code updated!');
    } catch (error) {
      console.error('Error uploading Venmo QR code:', error);
      alert('Failed to upload Venmo QR code');
    } finally {
      setUploadingVenmo(false);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      basic: 'bg-slate-100 text-slate-700 border-slate-300',
      pro: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      premium: 'bg-orange-100 text-orange-700 border-orange-300'
    };
    return colors[tier] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const accountType = user?.primary_account_type || user?.primary_role || 'consumer';
  const isConsumerType = !accountType || accountType === 'consumer' || accountType === 'executor' || accountType === 'home_seller' || accountType === 'buyer' || accountType === 'downsizer' || accountType === 'diy_seller' || accountType === 'consignor';

  return (
    <div className="p-6 lg:p-8 pb-32 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">My Profile</h1>
        <p className="text-slate-600">Manage your account settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isConsumerType ? 'grid-cols-2' : 'grid-cols-7'} max-w-4xl`}>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {!isConsumerType && <TabsTrigger value="sales">My Sales</TabsTrigger>}
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {!isConsumerType && <TabsTrigger value="subscription">Subscription</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="social" className="flex items-center gap-1"><Share2 className="w-3 h-3" />Social Media</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="etsy" className="flex items-center gap-1">🧶 Etsy</TabsTrigger>}
          {!isConsumerType && <TabsTrigger value="ebay" className="flex items-center gap-1">🛍️ eBay</TabsTrigger>}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData.profile_image_url} />
                  <AvatarFallback className="bg-orange-600 text-white text-3xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500 mt-2">JPG, PNG or GIF. Max 5MB</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={profileData.email}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                {!isConsumerType && (
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={profileData.website_url}
                      onChange={(e) => setProfileData({ ...profileData, website_url: e.target.value })}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                )}
              </div>

              {!isConsumerType && (
                <>
                  <div>
                    <Label>Company/Business Name</Label>
                    <Input
                      value={profileData.company_name}
                      onChange={(e) => setProfileData({ ...profileData, company_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Business Description</Label>
                    <Textarea
                      value={profileData.company_description}
                      onChange={(e) => setProfileData({ ...profileData, company_description: e.target.value })}
                      rows={4}
                      placeholder="Tell customers about your business..."
                    />
                  </div>

                  <div>
                    <Label>Business Address</Label>
                    <Input
                      value={profileData.business_address}
                      onChange={(e) => setProfileData({ ...profileData, business_address: e.target.value })}
                      placeholder="123 Main St, City, State ZIP"
                    />
                  </div>

                  <div className="flex items-center justify-between border rounded-lg p-4 bg-slate-50">
                    <div>
                      <Label className="text-base font-medium">Early Sign-In Default</Label>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Default setting for early sign-in on all new sales you create. You can override per sale.
                      </p>
                    </div>
                    <Switch
                      checked={profileData.early_sign_in_default !== false}
                      onCheckedChange={(checked) => setProfileData({ ...profileData, early_sign_in_default: checked })}
                    />
                  </div>
                </>
              )}

              <Button 
                onClick={handleSaveProfile} 
                disabled={saving}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* Venmo QR Code Section - business users only */}
          {!isConsumerType && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Venmo QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Upload your Venmo QR code to make it easy for customers to pay you
              </p>
              
              {user?.venmo_qr_code && (
                <div className="flex justify-center">
                  <img 
                    src={user.venmo_qr_code} 
                    alt="Venmo QR Code" 
                    className="w-64 h-64 object-contain border-2 border-slate-200 rounded-lg p-4 bg-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleVenmoQRUpload}
                  className="hidden"
                  id="venmo-qr-upload"
                  disabled={uploadingVenmo}
                />
                <Button 
                  variant="outline"
                  disabled={uploadingVenmo}
                  onClick={() => document.getElementById('venmo-qr-upload').click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingVenmo ? 'Uploading...' : user?.venmo_qr_code ? 'Change QR Code' : 'Upload QR Code'}
                </Button>
                {user?.venmo_qr_code && (
                  <Button 
                    variant="ghost"
                    onClick={async () => {
                      if (confirm('Remove Venmo QR code?')) {
                        await base44.auth.updateMe({ venmo_qr_code: null });
                        setUser({...user, venmo_qr_code: null});
                      }
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>}

          {/* My Purchases Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  My Purchases
                </div>
                <Link to={createPageUrl('MyPurchases')}>
                  <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                    View All
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-700">
                        {purchases.length}
                      </div>
                      <div className="text-sm text-slate-600">Total Purchases</div>
                    </div>
                    <div className="text-center p-4 bg-cyan-50 rounded-lg">
                      <div className="text-2xl font-bold text-cyan-700">
                        ${purchases.reduce((sum, p) => sum + (p.price * p.quantity || 0), 0).toFixed(0)}
                      </div>
                      <div className="text-sm text-slate-600">Total Spent</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-700">
                        {purchases.reduce((sum, p) => sum + (p.quantity || 0), 0)}
                      </div>
                      <div className="text-sm text-slate-600">Items Bought</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {purchases.slice(0, 3).map(purchase => (
                      <div key={purchase.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{purchase.item_name}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(purchase.created_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            ${(purchase.price * purchase.quantity).toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {purchase.quantity}x @ ${purchase.price}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to={createPageUrl('MyPurchases')}>
                    <Button variant="outline" className="w-full">
                      View All Purchases
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No purchases recorded yet</p>
                  <Link to={createPageUrl('RecordPurchase')}>
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Record Your First Purchase
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Email Notifications</h3>
                <div className="space-y-4">
                  {!isConsumerType && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">New Leads</Label>
                        <p className="text-sm text-slate-500">Get notified when new leads come in</p>
                      </div>
                      <Switch
                        checked={notificationSettings.email_new_leads}
                        onCheckedChange={(checked) => 
                          setNotificationSettings({ ...notificationSettings, email_new_leads: checked })
                        }
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">New Messages</Label>
                      <p className="text-sm text-slate-500">Get notified about new messages</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_new_messages}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, email_new_messages: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Sale Reminders</Label>
                      <p className="text-sm text-slate-500">Reminders about upcoming sales</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_sale_reminders}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, email_sale_reminders: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Marketing Updates</Label>
                      <p className="text-sm text-slate-500">News, tips, and special offers</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_marketing_updates}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, email_marketing_updates: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">SMS Notifications</h3>
                <div className="space-y-4">
                  {!isConsumerType && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">New Leads</Label>
                        <p className="text-sm text-slate-500">Text alerts for new leads</p>
                      </div>
                      <Switch
                        checked={notificationSettings.sms_new_leads}
                        onCheckedChange={(checked) => 
                          setNotificationSettings({ ...notificationSettings, sms_new_leads: checked })
                        }
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">New Messages</Label>
                      <p className="text-sm text-slate-500">Text alerts for messages</p>
                    </div>
                    <Switch
                      checked={notificationSettings.sms_new_messages}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, sms_new_messages: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Sale Reminders</Label>
                      <p className="text-sm text-slate-500">SMS reminders about sales</p>
                    </div>
                    <Switch
                      checked={notificationSettings.sms_sale_reminders}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, sms_sale_reminders: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSaveNotifications} 
                disabled={saving}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Sales Tab */}
        <TabsContent value="sales" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                My Estate Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {estateSales.length > 0 ? (
                <div className="space-y-4">
                  {estateSales.map(sale => (
                    <Link 
                      key={sale.id} 
                      to={createPageUrl('MySales')}
                      className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-2">{sale.title}</h3>
                          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                            {sale.property_address?.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {sale.property_address.city}, {sale.property_address.state}
                              </div>
                            )}
                            {sale.sale_dates?.[0]?.date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(sale.sale_dates[0].date).toLocaleDateString()}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {sale.views || 0} views
                            </div>
                          </div>
                        </div>
                        <Badge className={
                          sale.status === 'active' ? 'bg-green-100 text-green-700' :
                          sale.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                          sale.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {sale.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">You haven't created any estate sales yet</p>
                  <Button asChild className="bg-orange-600 hover:bg-orange-700">
                    <Link to={createPageUrl('MySales')}>
                      Create Your First Sale
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {estateSales.length > 0 && subscription && (
            <Card className="bg-gradient-to-br from-orange-50 to-cyan-50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Sale Performance Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <div className="text-2xl font-bold text-slate-900">
                          {estateSales.length}
                        </div>
                        <div className="text-sm text-slate-600">Total Sales</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-cyan-700">
                          {estateSales.reduce((sum, s) => sum + (s.views || 0), 0)}
                        </div>
                        <div className="text-sm text-slate-600">Total Views</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-700">
                          ${estateSales.reduce((sum, s) => sum + (s.actual_revenue || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-600">Total Revenue</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Social Media Tab */}
        {!isConsumerType && (
          <TabsContent value="social" className="mt-6">
            <SocialMediaTab user={user} />
          </TabsContent>
        )}

        {/* Etsy Tab */}
        {!isConsumerType && (
          <TabsContent value="etsy" className="mt-6">
            <MarketplaceCredentialsTab platform="etsy" />
          </TabsContent>
        )}

        {/* eBay Tab */}
        {!isConsumerType && (
          <TabsContent value="ebay" className="mt-6">
            <MarketplaceCredentialsTab platform="ebay" />
          </TabsContent>
        )}

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6 mt-6">
          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">
                      {subscription.plan_type.replace(/_/g, ' ').replace(/\boperator\b/gi, '').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())}
                    </h3>
                    <Badge className={getTierColor(subscription.tier)}>
                      {subscription.tier.replace(/\b\w/g, c => c.toUpperCase())} Tier
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-slate-900">${subscription.price}</div>
                    <div className="text-sm text-slate-600">per {subscription.billing_period === 'monthly' ? 'month' : subscription.billing_period === 'annually' ? 'year' : subscription.billing_period}</div>
                  </div>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Check className="w-4 h-4 text-green-600" />
                    Status: <Badge variant="outline" className="text-green-600">{subscription.status}</Badge>
                  </div>
                  {subscription.renewal_date && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Check className="w-4 h-4 text-green-600" />
                      Renews on {new Date(subscription.renewal_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Available Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {packages.map(pkg => {
                  const isCurrentPlan = subscription?.tier === pkg.tier_level;
                  
                  return (
                    <Card 
                      key={pkg.id} 
                      className={`relative ${isCurrentPlan ? 'border-2 border-orange-500' : ''}`}
                    >
                      {isCurrentPlan && (
                        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-600">
                          Current Plan
                        </Badge>
                      )}
                      <CardContent className="p-6">
                        <div className="text-center mb-4">
                          <Badge className={getTierColor(pkg.tier_level)}>
                            {pkg.tier_level}
                          </Badge>
                          <h3 className="text-xl font-bold text-slate-900 mt-2 mb-1">
                            {pkg.package_name}
                          </h3>
                          <p className="text-sm text-slate-600 mb-4">{pkg.description}</p>
                          <div className="text-3xl font-bold text-slate-900 mb-1">
                            ${pkg.monthly_price}
                          </div>
                          <div className="text-sm text-slate-600">per month</div>
                          {pkg.annual_price && (
                            <div className="text-xs text-cyan-600 mt-1">
                              ${pkg.annual_price}/year (save ${(pkg.monthly_price * 12 - pkg.annual_price).toFixed(0)})
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2 mb-6">
                          {pkg.features?.slice(0, 5).map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-600">{feature}</span>
                            </div>
                          ))}
                          {pkg.features?.length > 5 && (
                            <p className="text-xs text-slate-500">
                              +{pkg.features.length - 5} more features
                            </p>
                          )}
                        </div>

                        {!isCurrentPlan && (
                          <Button 
                            className="w-full"
                            variant={pkg.tier_level === 'premium' ? 'default' : 'outline'}
                          >
                            {subscription && pkg.tier_level === 'premium' ? (
                              <>
                                <ArrowUpCircle className="w-4 h-4 mr-2" />
                                Upgrade
                              </>
                            ) : subscription && pkg.tier_level === 'basic' ? (
                              <>
                                <ArrowDownCircle className="w-4 h-4 mr-2" />
                                Downgrade
                              </>
                            ) : (
                              'Select Plan'
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {packages.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  No subscription packages available at this time.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}