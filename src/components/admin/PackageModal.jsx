import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Square, ChevronDown, ChevronRight, Globe, Cpu } from 'lucide-react';
import { FEATURE_CATALOGUE, FEATURE_CATEGORIES, STARTER_DEFAULT_FEATURES } from '@/lib/featureCatalogue';

const TIER_PRESETS = {
  starter: STARTER_DEFAULT_FEATURES,
  growth: [
    ...STARTER_DEFAULT_FEATURES,
    'vip_events', 'social_media_posts', 'email_campaigns', 'ai_coach',
    'ai_pricing', 'operator_dashboard', 'worksheet', 'buyout',
    'ai_onboarding', 'seo_boost', 'referrals', 'marketing_dashboard',
  ],
  professional: [
    ...STARTER_DEFAULT_FEATURES,
    'vip_events', 'social_media_posts', 'social_push', 'email_campaigns',
    'sms_campaigns', 'ai_coach', 'ai_assistant', 'ai_pricing', 'ai_seo',
    'ai_social_images', 'operator_dashboard', 'worksheet', 'buyout',
    'expenses_mileage', 'settlement_statement', 'income_tracker',
    'business_expenses', 'operator_wallet', 'pos', 'checkout_station',
    'sold_inventory', 'storage_management', 'sale_pricing_tool',
    'seo_boost', 'referrals', 'marketing_dashboard', 'content_calendar',
    'ai_onboarding', 'marketplace_listings',
  ],
  elite: FEATURE_CATALOGUE.map(f => f.key), // all features
};

export default function PackageModal({ open, onClose, package: pkg, onSuccess }) {
  const [formData, setFormData] = useState({
    account_type: 'estate_sale_operator',
    package_name: '',
    tier_level: 'starter',
    pricing_model: 'subscription',
    monthly_price: '',
    annual_price: '',
    per_item_price: '',
    platform_fee_percentage: '',
    biz_in_a_box_setup_fee: '',
    biz_in_a_box_monthly_year1: '',
    biz_in_a_box_revenue_share: '',
    description: '',
    allowed_features: [],
    allowed_pages: [],
    limits: { listings: '', photos: '', leads: '', campaigns: '', storage: '' },
    is_active: true,
    featured: false,
  });
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeTab, setActiveTab] = useState('pricing');

  useEffect(() => {
    if (pkg) {
      setFormData({
        account_type: pkg.account_type || 'estate_sale_operator',
        package_name: pkg.package_name || '',
        tier_level: pkg.tier_level || 'starter',
        pricing_model: pkg.pricing_model || 'subscription',
        monthly_price: pkg.monthly_price || '',
        annual_price: pkg.annual_price || '',
        per_item_price: pkg.per_item_price || '',
        platform_fee_percentage: pkg.platform_fee_percentage || '',
        biz_in_a_box_setup_fee: pkg.biz_in_a_box_setup_fee || '',
        biz_in_a_box_monthly_year1: pkg.biz_in_a_box_monthly_year1 || '',
        biz_in_a_box_revenue_share: pkg.biz_in_a_box_revenue_share || '',
        description: pkg.description || '',
        allowed_features: pkg.allowed_features || [],
        allowed_pages: pkg.allowed_pages || [],
        limits: pkg.limits || { listings: '', photos: '', leads: '', campaigns: '', storage: '' },
        is_active: pkg.is_active !== false,
        featured: pkg.featured || false,
      });
    } else {
      setFormData(prev => ({ ...prev, allowed_features: [...STARTER_DEFAULT_FEATURES] }));
    }
    // Expand all categories by default
    const expanded = {};
    FEATURE_CATEGORIES.forEach(c => { expanded[c] = true; });
    setExpandedCategories(expanded);
  }, [pkg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        monthly_price: formData.monthly_price ? parseFloat(formData.monthly_price) : null,
        annual_price: formData.annual_price ? parseFloat(formData.annual_price) : null,
        per_item_price: formData.per_item_price ? parseFloat(formData.per_item_price) : null,
        platform_fee_percentage: formData.platform_fee_percentage ? parseFloat(formData.platform_fee_percentage) : null,
        biz_in_a_box_setup_fee: formData.biz_in_a_box_setup_fee ? parseFloat(formData.biz_in_a_box_setup_fee) : null,
        biz_in_a_box_monthly_year1: formData.biz_in_a_box_monthly_year1 ? parseFloat(formData.biz_in_a_box_monthly_year1) : null,
        biz_in_a_box_revenue_share: formData.biz_in_a_box_revenue_share ? parseFloat(formData.biz_in_a_box_revenue_share) : null,
      };
      if (pkg?.id) {
        await base44.entities.SubscriptionPackage.update(pkg.id, data);
      } else {
        await base44.entities.SubscriptionPackage.create(data);
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to save package: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (key) => {
    setFormData(prev => ({
      ...prev,
      allowed_features: prev.allowed_features.includes(key)
        ? prev.allowed_features.filter(k => k !== key)
        : [...prev.allowed_features, key],
    }));
  };

  const applyPreset = (tier) => {
    setFormData(prev => ({ ...prev, allowed_features: [...(TIER_PRESETS[tier] || [])] }));
  };

  const selectAllInCategory = (category) => {
    const keys = FEATURE_CATALOGUE.filter(f => f.category === category).map(f => f.key);
    setFormData(prev => ({
      ...prev,
      allowed_features: [...new Set([...prev.allowed_features, ...keys])],
    }));
  };

  const clearAllInCategory = (category) => {
    const keys = FEATURE_CATALOGUE.filter(f => f.category === category).map(f => f.key);
    setFormData(prev => ({
      ...prev,
      allowed_features: prev.allowed_features.filter(k => !keys.includes(k)),
    }));
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categoryCheckedCount = (cat) => {
    const keys = FEATURE_CATALOGUE.filter(f => f.category === cat).map(f => f.key);
    return keys.filter(k => formData.allowed_features.includes(k)).length;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">{pkg?.id ? 'Edit Package' : 'Create New Package'}</DialogTitle>
        </DialogHeader>

        {/* Tab nav */}
        <div className="flex gap-1 border-b flex-shrink-0 -mx-6 px-6">
          {['pricing', 'features'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'features'
                ? `Features & Pages (${formData.allowed_features.length})`
                : 'Pricing & Settings'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {/* ── PRICING TAB ── */}
          {activeTab === 'pricing' && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Package Name *</Label>
                  <Input
                    value={formData.package_name}
                    onChange={e => setFormData({ ...formData, package_name: e.target.value })}
                    placeholder="Starter, Growth, Professional, Elite"
                    required
                  />
                </div>
                <div>
                  <Label>Tier Level *</Label>
                  <Select value={formData.tier_level} onValueChange={v => setFormData({ ...formData, tier_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Account Type *</Label>
                <Select value={formData.account_type} onValueChange={v => setFormData({ ...formData, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estate_sale_operator">Estate Sale Operator</SelectItem>
                    <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="consignor">Consignor</SelectItem>
                    <SelectItem value="biz_in_a_box">Biz in a Box</SelectItem>
                    <SelectItem value="reseller">Reseller</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Perfect for getting started..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Pricing Model *</Label>
                <Select value={formData.pricing_model} onValueChange={v => setFormData({ ...formData, pricing_model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription (Monthly/Annual)</SelectItem>
                    <SelectItem value="per_item">Per Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.pricing_model === 'subscription' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monthly Price ($)</Label>
                    <Input
                      type="number" step="0.01"
                      value={formData.monthly_price}
                      onChange={e => {
                        const mp = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, monthly_price: e.target.value, annual_price: mp > 0 ? Math.round(mp * 12 * 0.9) : '' });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Annual Price ($) <span className="text-xs text-slate-400">10% off auto-calc</span></Label>
                    <Input
                      type="number" step="0.01"
                      value={formData.annual_price}
                      onChange={e => setFormData({ ...formData, annual_price: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price Per Item ($)</Label>
                    <Input type="number" step="0.01" value={formData.per_item_price} onChange={e => setFormData({ ...formData, per_item_price: e.target.value })} />
                  </div>
                  <div>
                    <Label>Platform Fee (%)</Label>
                    <Input type="number" step="0.1" value={formData.platform_fee_percentage} onChange={e => setFormData({ ...formData, platform_fee_percentage: e.target.value })} />
                  </div>
                </div>
              )}

              {formData.account_type === 'biz_in_a_box' && (
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-base font-semibold">Biz in a Box Pricing</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>One-Time Investment ($)</Label>
                      <Input type="number" step="0.01" value={formData.biz_in_a_box_setup_fee} onChange={e => setFormData({ ...formData, biz_in_a_box_setup_fee: e.target.value })} placeholder="2997" />
                    </div>
                    <div>
                      <Label>Royalty Fee (%)</Label>
                      <Input type="number" step="0.1" value={formData.biz_in_a_box_revenue_share} onChange={e => setFormData({ ...formData, biz_in_a_box_revenue_share: e.target.value })} placeholder="3" />
                    </div>
                    <div>
                      <Label>Monthly Fee — Year 1 ($)</Label>
                      <Input type="number" step="0.01" value={formData.biz_in_a_box_monthly_year1} onChange={e => setFormData({ ...formData, biz_in_a_box_monthly_year1: e.target.value })} placeholder="149" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">Package Limits</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['listings', 'photos', 'leads', 'campaigns', 'storage'].map(lim => (
                    <Input
                      key={lim}
                      placeholder={`${lim.charAt(0).toUpperCase() + lim.slice(1)} limit (e.g., Unlimited)`}
                      value={formData.limits[lim]}
                      onChange={e => setFormData({ ...formData, limits: { ...formData.limits, [lim]: e.target.value } })}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-6 border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formData.is_active} onCheckedChange={c => setFormData({ ...formData, is_active: c })} />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formData.featured} onCheckedChange={c => setFormData({ ...formData, featured: c })} />
                  <span className="text-sm">Featured / Recommended</span>
                </label>
              </div>
            </div>
          )}

          {/* ── FEATURES TAB ── */}
          {activeTab === 'features' && (
            <div className="py-4 space-y-4">
              {/* Quick preset buttons */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Presets</p>
                <div className="flex flex-wrap gap-2">
                  {['starter', 'growth', 'professional', 'elite'].map(t => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset(t)}
                      className="capitalize text-xs"
                    >
                      Load {t} defaults
                    </Button>
                  ))}
                  <Button type="button" size="sm" variant="outline" className="text-xs text-red-600 border-red-200"
                    onClick={() => setFormData(prev => ({ ...prev, allowed_features: [] }))}>
                    Clear All
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="text-xs text-green-600 border-green-200"
                    onClick={() => setFormData(prev => ({ ...prev, allowed_features: FEATURE_CATALOGUE.map(f => f.key) }))}>
                    Select All
                  </Button>
                </div>
              </div>

              {/* Category sections */}
              {FEATURE_CATEGORIES.map(category => {
                const features = FEATURE_CATALOGUE.filter(f => f.category === category);
                const checked = categoryCheckedCount(category);
                const total = features.length;
                const allChecked = checked === total;
                const someChecked = checked > 0 && !allChecked;
                const isExpanded = expandedCategories[category];

                return (
                  <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Category header */}
                    <div
                      className="flex items-center gap-3 p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                      <span className="font-semibold text-slate-800 flex-1 text-sm">{category}</span>
                      <Badge variant="secondary" className={`text-xs ${allChecked ? 'bg-green-100 text-green-700' : someChecked ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                        {checked}/{total}
                      </Badge>
                      <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => selectAllInCategory(category)}
                          className="text-xs text-green-600 hover:underline px-1">All</button>
                        <span className="text-slate-300">|</span>
                        <button type="button" onClick={() => clearAllInCategory(category)}
                          className="text-xs text-red-500 hover:underline px-1">None</button>
                      </div>
                    </div>

                    {/* Feature rows */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100">
                        {features.map(feature => {
                          const isChecked = formData.allowed_features.includes(feature.key);
                          return (
                            <label
                              key={feature.key}
                              className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors ${isChecked ? 'bg-green-50/40' : ''}`}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleFeature(feature.key)}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-medium ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                                    {feature.label}
                                  </span>
                                  {feature.page && (
                                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5">
                                      <Globe className="w-3 h-3" />
                                      Page: {feature.page}
                                    </span>
                                  )}
                                  {!feature.page && (
                                    <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 border border-purple-200 rounded px-1.5 py-0.5">
                                      <Cpu className="w-3 h-3" />
                                      Feature only
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{feature.description}</p>
                              </div>
                              {isChecked && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
          <div className="text-xs text-slate-400">
            {formData.allowed_features.length} features selected
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Saving...' : pkg?.id ? 'Update Package' : 'Create Package'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}