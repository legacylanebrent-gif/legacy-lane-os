import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, Scale, PiggyBank, Trash2, Sparkles, Truck, Camera, Wrench, 
  Trees, Gavel, Home, Shield, Heart, Package, ShoppingBag, ArrowRight, MapPin
} from 'lucide-react';

// Haversine distance (miles)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function LocalVendorSection({ userLocation, userZipCode }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(() => parseInt(localStorage.getItem('searchRadius') || '25'));

  useEffect(() => {
    loadNearbyVendors();
  }, [userLocation, userZipCode]);

  const loadNearbyVendors = async () => {
    try {
      setLoading(true);
      const allVendors = await base44.entities.Vendor.filter({ geocode_status: 'geocoded' }, '-rating', 300);
      
      if (!allVendors || allVendors.length === 0) {
        setVendors([]);
        setLoading(false);
        return;
      }

      // Only filter by distance if user location exists
      if (userLocation && userLocation.lat && userLocation.lng) {
        const withDistance = allVendors
          .map(vendor => {
            const data = vendor;
            if (data.lat != null && data.lng != null) {
              const dist = calculateDistance(userLocation.lat, userLocation.lng, data.lat, data.lng);
              return { ...vendor, distance: dist };
            }
            return { ...vendor, distance: null };
          })
          .filter(v => v.distance !== null && v.distance <= radius)
          .sort((a, b) => a.distance - b.distance);

        setVendors(withDistance.slice(0, 10));
      } else {
        // No location — show top-rated vendors nationwide (legacy behavior)
        const activeVendors = allVendors.filter(v => {
          const data = v;
          return (data.service_areas || []).length > 0;
        });
        setVendors(activeVendors.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
      setVendors([]);
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
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Service Provider';
  };

  const getVendorIcon = (vendorType) => {
    const iconMap = {
      real_estate_agent: Home,
      probate_attorney: Scale,
      estate_planning_attorney: Scale,
      elder_law_attorney: Scale,
      title_company: Building2,
      mortgage_broker: PiggyBank,
      financial_advisor: PiggyBank,
      cpa_tax_strategist: PiggyBank,
      trust_administrator: Shield,
      insurance_agent: Shield,
      senior_move_manager: Heart,
      assisted_living_placement: Home,
      home_care_agency: Heart,
      geriatric_care_manager: Heart,
      junk_removal: Trash2,
      cleanout_crew: Sparkles,
      dumpster_rental: Truck,
      biohazard_cleanup: Shield,
      hoarding_cleanup: Sparkles,
      deep_cleaning: Sparkles,
      carpet_cleaning: Sparkles,
      odor_removal: Sparkles,
      home_stager: Home,
      handyman: Wrench,
      painter: Wrench,
      landscaper: Trees,
      flooring_installer: Wrench,
      antique_dealer: ShoppingBag,
      gold_silver_coins_buyer: ShoppingBag,
      vintage_reseller: ShoppingBag,
      consignment_shop: ShoppingBag,
      auction_house: Gavel,
      appraiser: Building2,
      moving_company: Truck,
      storage_facility: Package,
      pods_container: Package,
      shipping_service: Truck,
      photography: Camera,
      repair: Wrench,
      auctioneer: Gavel,
      stager: Home,
      attorney: Scale,
      cpa: PiggyBank,
      cleaning: Sparkles,
      other: Building2
    };
    return iconMap[vendorType] || Building2;
  };

  if (loading) {
    return (
      <section className="py-8 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-serif font-bold text-slate-900">Our Locally Featured Businesses</h3>
            {userZipCode && <p className="text-slate-600 mt-1">Loading providers near {userZipCode}...</p>}
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

  const sectionTitle = userLocation
    ? userZipCode ? `Locally Featured Businesses Near ${userZipCode}` : 'Locally Featured Businesses Near You'
    : 'Our Locally Featured Businesses';
  const sectionSubtitle = userLocation
    ? `Top-rated service providers within ${radius} miles`
    : 'Trusted service providers in your area';

  return (
    <section className="py-8 px-4 bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-serif font-bold text-slate-900 mb-2">
            {sectionTitle}
          </h3>
          <p className="text-slate-600">{sectionSubtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {vendors.map(vendor => {
            const vendorData = vendor;
            const companyName = vendorData.company_name || 'Unknown Vendor';
            const vendorType = vendorData.vendor_type || 'other';
            const IconComponent = getVendorIcon(vendorType);
            
            return (
              <div
                key={vendor.id}
                onClick={() => window.location.href = createPageUrl('VendorProfile') + '?id=' + vendor.id}
                className="block group cursor-pointer"
              >
                <Card className="hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-slate-200 hover:border-orange-300 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-orange-50 to-cyan-50 flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 text-center mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {companyName}
                    </h4>
                    <div className="flex justify-center gap-2 flex-wrap">
                      <Badge className={`${getCategoryBadgeColor(vendorType)} text-xs`}>
                        {formatVendorType(vendorType)}
                      </Badge>
                      {vendorData.distance !== null && vendorData.distance !== undefined && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                          {vendorData.distance.toFixed(1)} mi
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Show "View All" when there are more vendors beyond 10 */}
        {vendors.length >= 10 && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={() => window.location.href = createPageUrl('VendorSignup')}
              className="gap-2"
            >
              View All Vendors <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}