import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Award, Star, MapPin, TrendingUp } from 'lucide-react';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const vendorTypes = [
    { value: 'all', label: 'All Vendors' },
    { value: 'mover', label: 'Movers' },
    { value: 'cleanout', label: 'Cleanout Services' },
    { value: 'attorney', label: 'Attorneys' },
    { value: 'cpa', label: 'CPAs' },
    { value: 'stager', label: 'Stagers' },
    { value: 'contractor', label: 'Contractors' },
    { value: 'appraiser', label: 'Appraisers' },
    { value: 'photographer', label: 'Photographers' }
  ];

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const vendorData = await base44.entities.Vendor.list();
      setVendors(vendorData);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = searchQuery.trim() === '' ||
      vendor.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.services_offered?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || vendor.vendor_type === selectedType;

    return matchesSearch && matchesType;
  });

  const getTierBadge = (tier) => {
    const colors = {
      premier: 'bg-gold-600 text-white',
      preferred: 'bg-blue-600 text-white',
      standard: 'bg-slate-600 text-white'
    };
    return colors[tier] || colors.standard;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
            Vendor Partners
          </h1>
          <p className="text-slate-600">Trusted professionals to support your business</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search vendors by name or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="mb-6 flex-wrap h-auto">
            {vendorTypes.map(type => (
              <TabsTrigger key={type.value} value={type.value}>
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedType}>
            {filteredVendors.length === 0 ? (
              <Card className="p-12 text-center">
                <Award className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  No vendors found
                </h3>
                <p className="text-slate-500">Try adjusting your search or filters</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map(vendor => (
                  <Link key={vendor.id} to={createPageUrl(`VendorDetail?id=${vendor.id}`)}>
                    <Card className="hover:shadow-lg transition-shadow h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-navy-900 text-lg">
                            {vendor.company_name}
                          </h3>
                          <Badge className={getTierBadge(vendor.tier)}>
                            {vendor.tier}
                          </Badge>
                        </div>

                        <Badge variant="outline" className="mb-3 capitalize">
                          {vendor.vendor_type?.replace(/_/g, ' ')}
                        </Badge>

                        <div className="space-y-2 mb-4">
                          {vendor.rating && (
                            <div className="flex items-center gap-2 text-sm">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <span className="font-semibold">{vendor.rating.toFixed(1)}</span>
                              <span className="text-slate-500">({vendor.total_reviews} reviews)</span>
                            </div>
                          )}

                          {vendor.jobs_completed > 0 && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <TrendingUp className="w-4 h-4" />
                              <span>{vendor.jobs_completed} jobs completed</span>
                            </div>
                          )}

                          {vendor.service_areas?.length > 0 && (
                            <div className="flex items-start gap-2 text-sm text-slate-600">
                              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {vendor.service_areas.slice(0, 3).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {vendor.insurance_verified && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            ✓ Insured
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}