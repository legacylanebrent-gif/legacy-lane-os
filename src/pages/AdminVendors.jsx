import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Briefcase, Star, CheckCircle, MapPin } from 'lucide-react';

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    filterVendors();
  }, [searchQuery, typeFilter, vendors]);

  const loadVendors = async () => {
    try {
      const data = await base44.entities.Vendor.list();
      setVendors(data);
      setFilteredVendors(data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVendors = () => {
    let filtered = vendors;

    if (searchQuery) {
      filtered = filtered.filter(vendor =>
        vendor.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.services_offered?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(vendor => vendor.vendor_type === typeFilter);
    }

    setFilteredVendors(filtered);
  };

  const getTierBadge = (tier) => {
    const configs = {
      standard: { label: 'Standard', className: 'bg-slate-100 text-slate-700' },
      preferred: { label: 'Preferred', className: 'bg-blue-100 text-blue-700' },
      premier: { label: 'Premier', className: 'bg-orange-100 text-orange-700' }
    };
    const config = configs[tier] || configs.standard;
    return <Badge className={config.className}>{config.label}</Badge>;
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
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Vendor Management</h1>
        <p className="text-slate-600">{vendors.length} total vendors</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search by company name or services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Types</option>
          <option value="mover">Mover</option>
          <option value="cleanout">Cleanout</option>
          <option value="attorney">Attorney</option>
          <option value="cpa">CPA</option>
          <option value="stager">Stager</option>
          <option value="contractor">Contractor</option>
          <option value="appraiser">Appraiser</option>
          <option value="photographer">Photographer</option>
          <option value="inspector">Inspector</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {filteredVendors.map(vendor => (
          <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{vendor.company_name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      {getTierBadge(vendor.tier)}
                      <Badge variant="outline">{vendor.vendor_type}</Badge>
                    </div>
                  </div>
                  {vendor.insurance_verified && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  {vendor.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{vendor.rating.toFixed(1)}</span>
                      <span>({vendor.total_reviews || 0} reviews)</span>
                    </div>
                  )}

                  {vendor.jobs_completed && (
                    <div>
                      <span className="font-medium">Jobs Completed:</span> {vendor.jobs_completed}
                    </div>
                  )}

                  {vendor.services_offered && vendor.services_offered.length > 0 && (
                    <div>
                      <span className="font-medium">Services:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vendor.services_offered.slice(0, 3).map((service, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                        {vendor.services_offered.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{vendor.services_offered.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {vendor.service_areas && vendor.service_areas.length > 0 && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-cyan-600" />
                      <span>{vendor.service_areas.join(', ')}</span>
                    </div>
                  )}

                  {vendor.license_number && (
                    <div className="text-xs">
                      <span className="font-medium">License:</span> {vendor.license_number}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No vendors found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}