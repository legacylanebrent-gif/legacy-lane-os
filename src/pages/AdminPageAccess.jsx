import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, Search, Plus, Edit, Save, X, CheckCircle, Users
} from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
  { value: 'platform_ops', label: 'Platform Ops', color: 'bg-blue-100 text-blue-700' },
  { value: 'growth_team', label: 'Growth Team', color: 'bg-green-100 text-green-700' },
  { value: 'partnerships', label: 'Partnerships', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'education_admin', label: 'Education Admin', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'finance_admin', label: 'Finance Admin', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'estate_sale_operator', label: 'Estate Sale Operator', color: 'bg-orange-100 text-orange-700' },
  { value: 'real_estate_agent', label: 'Real Estate Agent', color: 'bg-red-100 text-red-700' },
  { value: 'investor', label: 'Investor', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'vendor', label: 'Vendor', color: 'bg-pink-100 text-pink-700' },
  { value: 'consignor', label: 'Consignor', color: 'bg-teal-100 text-teal-700' },
  { value: 'consumer', label: 'Consumer', color: 'bg-slate-100 text-slate-700' }
];

const ALL_PAGES = [
  'Dashboard', 'Home', 'MyProfile', 'Settings', 'Notifications', 'Messages',
  'MySales', 'SaleInventory', 'Worksheet', 'Attendance', 'SaleTasks', 
  'SaleStatistics', 'PrintSigns', 'SaleExport', 'VIPEvent', 'SaleContracts',
  'SaleMarketingCampaigns', 'Inventory', 'RewardsCheckins', 'Favorites',
  'MyRewards', 'MyReferrals', 'MyTickets', 'IncomeTracker', 'MyBusinessExpenses',
  'BrowseItems', 'MyListings', 'ItemDetail', 'EstateSaleDetail', 'SaleLanding',
  'EstateSaleFinder', 'SearchByState', 'BusinessProfile', 'ReferralLanding',
  'CRM', 'ContactDetail', 'Leads', 'Pipeline', 'IncomingLeads', 'LeadCapture',
  'MarketingTasks', 'Campaigns', 'Analytics', 'CampaignBuilder',
  'Courses', 'CourseDetail', 'MyCourses', 'CourseLearning',
  'Vendors', 'VendorDetail', 'Properties', 'Deals',
  'AdminUsers', 'AdminEstateSales', 'AdminVendors', 'AdminLeads',
  'AdminMarketplace', 'AdminCourses', 'AdminTickets', 'AdminTemplates',
  'AdminAutomations', 'AdminPackages', 'AdminAdvertisingPackages',
  'AdminRewards', 'AdminCampaigns', 'AdminAmazonProducts', 'AdminTransactions',
  'PlatformAnalytics', 'Revenue', 'ComprehensiveRevenue',
  'AdminFutureOperators', 'FutureOperatorsAnalytics',
  'OperatorPackages', 'AgentSignup', 'VendorSignup', 'DIYSaleSignup',
  'StartYourCompany'
];

export default function AdminPageAccess() {
  const [accessConfigs, setAccessConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    account_type: '',
    allowed_pages: [],
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadAccessConfigs();
  }, []);

  const loadAccessConfigs = async () => {
    try {
      const data = await base44.entities.PageAccess.list();
      setAccessConfigs(data);
    } catch (error) {
      console.error('Error loading page access configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingConfig) {
        await base44.entities.PageAccess.update(editingConfig.id, formData);
      } else {
        await base44.entities.PageAccess.create(formData);
      }
      await loadAccessConfigs();
      setModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this page access configuration?')) return;
    try {
      await base44.entities.PageAccess.delete(id);
      await loadAccessConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      account_type: '',
      allowed_pages: [],
      description: '',
      is_active: true
    });
    setEditingConfig(null);
  };

  const openEditModal = (config) => {
    setEditingConfig(config);
    setFormData(config);
    setModalOpen(true);
  };

  const togglePage = (pageName) => {
    setFormData(prev => ({
      ...prev,
      allowed_pages: prev.allowed_pages.includes(pageName)
        ? prev.allowed_pages.filter(p => p !== pageName)
        : [...prev.allowed_pages, pageName]
    }));
  };

  const selectAllPages = () => {
    setFormData(prev => ({ ...prev, allowed_pages: [...ALL_PAGES] }));
  };

  const clearAllPages = () => {
    setFormData(prev => ({ ...prev, allowed_pages: [] }));
  };

  const filteredConfigs = accessConfigs.filter(config => {
    if (!searchQuery) return true;
    const accountType = ACCOUNT_TYPES.find(t => t.value === config.account_type);
    return accountType?.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
           config.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getAccountTypeInfo = (value) => {
    return ACCOUNT_TYPES.find(t => t.value === value);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Page Access Management</h1>
          <p className="text-slate-600">Control which pages different account types can access</p>
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Configuration
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Total Configs</div>
            <div className="text-2xl font-bold text-slate-900">{accessConfigs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Active</div>
            <div className="text-2xl font-bold text-green-600">
              {accessConfigs.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Admin Types</div>
            <div className="text-2xl font-bold text-purple-600">
              {accessConfigs.filter(c => c.account_type.includes('admin') || c.account_type.includes('ops')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">User Types</div>
            <div className="text-2xl font-bold text-orange-600">
              {accessConfigs.filter(c => !c.account_type.includes('admin') && !c.account_type.includes('ops')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search account types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Access Configurations */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredConfigs.map(config => {
          const accountInfo = getAccountTypeInfo(config.account_type);
          return (
            <Card key={config.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-slate-600" />
                      <CardTitle>{accountInfo?.label || config.account_type}</CardTitle>
                      {!config.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-slate-600">{config.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-2">
                    Allowed Pages ({config.allowed_pages?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {config.allowed_pages?.slice(0, 10).map((page, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {page}
                      </Badge>
                    ))}
                    {config.allowed_pages?.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{config.allowed_pages.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(config)}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(config.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredConfigs.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg mb-4">
            {searchQuery ? 'No configurations match your search' : 'No page access configurations yet'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setModalOpen(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Create First Configuration
            </Button>
          )}
        </Card>
      )}

      {/* Edit/Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingConfig ? 'Edit Page Access' : 'Create Page Access Configuration'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account Type *</Label>
              <Select 
                value={formData.account_type} 
                onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                disabled={!!editingConfig}
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
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this account type's access level"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Allowed Pages ({formData.allowed_pages.length} selected)</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllPages}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearAllPages}>
                    <X className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
                {ALL_PAGES.map(page => (
                  <label key={page} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowed_pages.includes(page)}
                      onChange={() => togglePage(page)}
                      className="rounded"
                    />
                    <span className="text-sm flex-1">{page}</span>
                    {formData.allowed_pages.includes(page) && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Active Configuration</span>
            </label>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
                <Save className="w-4 h-4 mr-2" />
                {editingConfig ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}