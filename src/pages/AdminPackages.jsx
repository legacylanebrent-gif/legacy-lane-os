import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Check, DollarSign, Package, Trash2 } from 'lucide-react';
import PackageModal from '@/components/admin/PackageModal';

export default function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountType, setSelectedAccountType] = useState('estate_sale_operator');
  const [editingPackage, setEditingPackage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const accountTypes = [
    { value: 'estate_sale_operator', label: 'Estate Sale Operator' },
    { value: 'real_estate_agent', label: 'Real Estate Agent' },
    { value: 'investor', label: 'Investor' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'consignor', label: 'Consignor' },
    { value: 'buyer', label: 'Buyer' },
    { value: 'diy_seller', label: 'DIY Seller' }
  ];

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await base44.entities.SubscriptionPackage.list();
      console.log('Loaded packages:', data);
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setShowModal(true);
  };

  const handleAdd = (accountType) => {
    setEditingPackage({ account_type: accountType });
    setShowModal(true);
  };

  const handleDelete = async (pkg) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    
    try {
      await base44.entities.SubscriptionPackage.delete(pkg.id);
      await loadPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package');
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      basic: 'bg-slate-100 text-slate-700',
      pro: 'bg-blue-100 text-blue-700',
      premium: 'bg-orange-100 text-orange-700'
    };
    return colors[tier] || 'bg-slate-100 text-slate-700';
  };

  const filteredPackages = packages
    .filter(pkg => {
      const accountType = pkg.data?.account_type || pkg.account_type;
      return accountType === selectedAccountType;
    })
    .sort((a, b) => {
      const tierOrder = { basic: 1, pro: 2, premium: 3 };
      const tierA = a.data?.tier_level || a.tier_level;
      const tierB = b.data?.tier_level || b.tier_level;
      return tierOrder[tierA] - tierOrder[tierB];
    });
  
  console.log('Filtered packages:', filteredPackages.length, 'for account type:', selectedAccountType);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Subscription Packages</h1>
          <p className="text-slate-600">Manage pricing and features for all account types</p>
        </div>
      </div>

      <PackageModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPackage(null);
        }}
        package={editingPackage}
        onSuccess={loadPackages}
      />

      <Tabs value={selectedAccountType} onValueChange={setSelectedAccountType}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
          {accountTypes.map(type => (
            <TabsTrigger key={type.value} value={type.value} className="text-xs lg:text-sm">
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {accountTypes.map(type => (
          <TabsContent key={type.value} value={type.value} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">{type.label} Packages</h2>
              <Button
                onClick={() => handleAdd(type.value)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Package
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {filteredPackages.length === 0 ? (
                <div className="col-span-3 text-center py-12 border-2 border-dashed border-slate-300 rounded-lg">
                  <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 mb-4">No packages created yet</p>
                  <Button onClick={() => handleAdd(type.value)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Package
                  </Button>
                </div>
              ) : (
                filteredPackages.map(pkg => {
                  const pkgData = pkg.data || pkg;
                  return (
                  <Card key={pkg.id} className={`relative ${pkgData.featured ? 'border-2 border-orange-500' : ''}`}>
                    {pkgData.featured && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-orange-600">Recommended</Badge>
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={getTierColor(pkgData.tier_level)}>
                          {pkgData.tier_level}
                        </Badge>
                        {!pkgData.is_active && (
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl">{pkgData.package_name}</CardTitle>
                      <p className="text-sm text-slate-600 mt-2">{pkgData.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border-t pt-4">
                        <div className="flex items-baseline gap-2">
                          <DollarSign className="w-5 h-5 text-slate-500 mt-1" />
                          <div>
                            {pkgData.pricing_model === 'per_item' ? (
                              <>
                                <div className="text-3xl font-bold text-slate-900">${pkgData.per_item_price}</div>
                                <div className="text-sm text-slate-600">per item</div>
                                {pkgData.platform_fee_percentage && (
                                  <div className="text-sm text-slate-600 mt-1">
                                    + {pkgData.platform_fee_percentage}% platform fee
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="text-3xl font-bold text-slate-900">${pkgData.monthly_price}</div>
                                <div className="text-sm text-slate-600">per month</div>
                                {pkgData.annual_price && (
                                  <div className="mt-2 text-sm text-slate-600">
                                    ${pkgData.annual_price}/year (save ${(pkgData.monthly_price * 12 - pkgData.annual_price).toFixed(0)})
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {pkgData.limits && (
                        <div className="space-y-2 border-t pt-4">
                          <p className="text-sm font-semibold text-slate-700">Limits:</p>
                          {Object.entries(pkgData.limits).map(([key, value]) => (
                            value && (
                              <div key={key} className="text-sm text-slate-600 flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                {key.replace(/_/g, ' ')}: {value}
                              </div>
                            )
                          ))}
                        </div>
                      )}

                      {pkgData.features && pkgData.features.length > 0 && (
                        <div className="space-y-2 border-t pt-4">
                          <p className="text-sm font-semibold text-slate-700">Features:</p>
                          {pkgData.features.map((feature, idx) => (
                            <div key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 mt-4"
                          onClick={() => handleEdit(pkg)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Package
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 mt-4 text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handleDelete(pkg)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );})
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}