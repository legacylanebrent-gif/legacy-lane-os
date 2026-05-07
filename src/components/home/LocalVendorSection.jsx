import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, Scale, PiggyBank, Trash2, Sparkles, Truck, Camera, Wrench, 
  Trees, Gavel, Home, User, Shield, Heart, Car, Package, Key, Phone,
  Scissors, Bed, Smile, Utensils, Dribbble, ShoppingBag, Clock, Calendar
} from 'lucide-react';

export default function LocalVendorSection({ userLocation }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNearbyVendors();
  }, []);

  const loadNearbyVendors = async () => {
    try {
      setLoading(true);
      // Fetch all vendors
      const allVendors = await base44.entities.Vendor.list();
      
      if (!allVendors || allVendors.length === 0) {
        setVendors([]);
        setLoading(false);
        return;
      }
      
      // Filter vendors that have service areas and sort by rating
      const activeVendors = allVendors.filter(vendor => {
        const vendorData = vendor.data || vendor;
        const serviceAreas = vendorData.service_areas || [];
        return serviceAreas.length > 0;
      });

      // Sort by rating (highest first) and take top 10
      activeVendors.sort((a, b) => {
        const dataA = a.data || a;
        const dataB = b.data || b;
        const ratingA = (dataA.rating || 0);
        const ratingB = (dataB.rating || 0);
        return ratingB - ratingA;
      });
      
      setVendors(activeVendors.slice(0, 10));
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
    return type ? type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Service Provider';
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
    const IconComponent = iconMap[vendorType] || Building2;
    return IconComponent;
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
            const companyName = vendorData.company_name || 'Unknown Vendor';
            const vendorType = vendorData.vendor_type || 'other';
            const vendorId = vendorData.user_id || vendor.id;
            const IconComponent = getVendorIcon(vendorType);
            
            return (
              <div
                key={vendor.id}
                onClick={() => window.location.href = createPageUrl('BusinessProfile') + '?id=' + vendorId}
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
                    <div className="flex justify-center">
                      <Badge className={`${getCategoryBadgeColor(vendorType)} text-xs`}>
                        {formatVendorType(vendorType)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}