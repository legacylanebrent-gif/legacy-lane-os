import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LocalVendorSection({ userLocation }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLocation) {
      loadNearbyVendors();
    }
  }, [userLocation]);

  const loadNearbyVendors = async () => {
    try {
      // Fetch all vendors
      const allVendors = await base44.entities.Vendor.list();
      
      // Filter vendors that have service areas and sort by rating
      const activeVendors = allVendors.filter(vendor => {
        const serviceAreas = vendor.data?.service_areas || vendor.service_areas || [];
        return serviceAreas.length > 0;
      });

      // Sort by rating (highest first) and take top 10
      activeVendors.sort((a, b) => {
        const ratingA = (a.data?.rating || a.rating || 0);
        const ratingB = (b.data?.rating || b.rating || 0);
        return ratingB - ratingA;
      });
      
      setVendors(activeVendors.slice(0, 10));
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadgeColor = (vendorType) => {
    const colors = {
      stager: 'bg-purple-100 text-purple-700',
      attorney: 'bg-blue-100 text-blue-700',
      cpa: 'bg-green-100 text-green-700',
      junk_removal: 'bg-orange-100 text-orange-700',
      cleaning: 'bg-cyan-100 text-cyan-700',
      moving: 'bg-indigo-100 text-indigo-700',
      photography: 'bg-pink-100 text-pink-700',
      repair: 'bg-yellow-100 text-yellow-700',
      landscaping: 'bg-emerald-100 text-emerald-700',
      auctioneer: 'bg-red-100 text-red-700',
      appraiser: 'bg-slate-100 text-slate-700',
      donation_pickup: 'bg-teal-100 text-teal-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[vendorType] || colors.other;
  };

  const formatVendorType = (type) => {
    return type ? type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Service Provider';
  };

  if (loading) {
    return (
      <section className="py-8 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-serif font-bold text-slate-900">Our Locally Featured Businesses</h3>
          </div>
          <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (vendors.length === 0) {
    return null;
  }

  return (
    <section className="py-8 px-4 bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-serif font-bold text-slate-900 mb-2">
            Our Locally Featured Businesses
          </h3>
          <p className="text-slate-600">Trusted service providers in your area</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {vendors.map(vendor => {
            const vendorData = vendor.data || vendor;
            const companyLogo = vendorData.company_logo || 'https://via.placeholder.com/150x150?text=Logo';
            const companyName = vendorData.company_name || 'Unknown Vendor';
            const vendorType = vendorData.vendor_type || 'other';
            
            return (
              <Link
                key={vendor.id}
                to={createPageUrl('BusinessProfile') + '?id=' + (vendorData.user_id || vendor.id)}
                className="block group"
              >
                <Card className="hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-slate-200 hover:border-orange-300 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                      <img
                        src={companyLogo}
                        alt={companyName}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/150x150?text=Logo';
                        }}
                      />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 text-center mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {companyName}
                    </h4>
                    <div className="flex justify-center">
                      <Badge className={`${getCategoryBadgeColor(vendorType)} text-xs`}>
                        {formatVendorType(vendorType)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}