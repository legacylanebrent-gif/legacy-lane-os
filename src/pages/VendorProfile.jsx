import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, Phone, Mail, Globe, Star, Calendar, Building2, 
  ArrowLeft, CheckCircle, TrendingUp, Home as HomeIcon, MessageSquare,
  Shield, Wrench, Truck, Sparkles, Home, Scale, PiggyBank, Heart, Trees, Camera, ShoppingBag, Gavel, Package, Trash2
} from 'lucide-react';
import MessageModal from '@/components/messaging/MessageModal';
import UniversalHeader from '@/components/layout/UniversalHeader';

export default function VendorProfile() {
  const [vendor, setVendor] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  useEffect(() => {
    loadVendorData();
  }, []);

  const loadVendorData = async () => {
    try {
      // Check if user is logged in
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        // User not logged in
      }

      const urlParams = new URLSearchParams(window.location.search);
      const vendorId = urlParams.get('id');

      if (!vendorId) {
        window.location.href = createPageUrl('Home');
        return;
      }

      // Load vendor data
      const vendors = await base44.entities.Vendor.filter({ id: vendorId });
      
      if (!vendors || vendors.length === 0) {
        window.location.href = createPageUrl('Home');
        return;
      }

      setVendor(vendors[0]);
    } catch (error) {
      console.error('Error loading vendor:', error);
    } finally {
      setLoading(false);
    }
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

  const formatVendorType = (type) => {
    return type ? type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Service Provider';
  };

  const getTierBadgeColor = (tier) => {
    const colors = {
      standard: 'bg-slate-600',
      preferred: 'bg-blue-600',
      premier: 'bg-orange-600'
    };
    return colors[tier] || 'bg-slate-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-slate-600 text-xl">Vendor not found</div>
      </div>
    );
  }

  const vendorData = vendor.data || vendor;
  const IconComponent = getVendorIcon(vendorData.vendor_type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={!!currentUser} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link to={createPageUrl('Home')} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>

        {/* Hero Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Icon/Logo */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-xl">
                  <IconComponent className="w-16 h-16 text-white" />
                </div>
              </div>

              {/* Business Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2">
                      {vendorData.company_name || 'Vendor'}
                    </h2>
                    <div className="flex gap-2">
                      <Badge className={`${getTierBadgeColor(vendorData.tier)} text-white`}>
                        {vendorData.tier ? vendorData.tier.toUpperCase() : 'STANDARD'}
                      </Badge>
                      <Badge className="bg-slate-600 text-white">
                        {formatVendorType(vendorData.vendor_type)}
                      </Badge>
                    </div>
                  </div>
                  {vendorData.insurance_verified && (
                    <Badge className="bg-green-600 text-white gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Insured
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{vendorData.rating || 'N/A'}</div>
                    <div className="text-sm text-slate-600 flex items-center justify-center gap-1">
                      Rating <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{vendorData.total_reviews || 0}</div>
                    <div className="text-sm text-slate-600">Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{vendorData.jobs_completed || 0}</div>
                    <div className="text-sm text-slate-600">Jobs Done</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="services" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="areas">Service Areas</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Services Offered</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {vendorData.services_offered?.map((service, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900">{service}</div>
                      </div>
                    </div>
                  )) || (
                    <p className="text-slate-500 col-span-2">No services listed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Areas Tab */}
          <TabsContent value="areas">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Service Areas</h3>
                {vendorData.service_areas && vendorData.service_areas.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {vendorData.service_areas.map((area, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm">
                          {area}
                        </Badge>
                      ))}
                    </div>
                    {vendorData.service_territory_miles && (
                      <p className="text-slate-600">
                        Service radius: <strong>{vendorData.service_territory_miles} miles</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">No service areas listed</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardContent className="p-6 space-y-4">
                {vendorData.license_number && (
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-cyan-600" />
                    <div>
                      <div className="text-sm text-slate-500">License Number</div>
                      <div className="font-semibold text-slate-900">{vendorData.license_number}</div>
                    </div>
                  </div>
                )}
                
                {vendorData.response_time_hours && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <div>
                      <div className="text-sm text-slate-500">Typical Response Time</div>
                      <div className="font-semibold text-slate-900">
                        {vendorData.response_time_hours < 24 
                          ? `${vendorData.response_time_hours} hours` 
                          : `${vendorData.response_time_hours / 24} days`}
                      </div>
                    </div>
                  </div>
                )}

                {vendorData.average_bid && (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-sm text-slate-500">Average Bid</div>
                      <div className="font-semibold text-slate-900">
                        ${vendorData.average_bid.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {vendorData.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <a 
                      href={vendorData.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:underline"
                    >
                      {vendorData.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Contact CTA */}
        <Card className="mt-8 bg-gradient-to-r from-orange-50 to-cyan-50">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-serif font-bold text-slate-900 mb-4">
              Need This Service?
            </h3>
            <p className="text-slate-600 mb-6">
              Contact {vendorData.company_name} to discuss your needs
            </p>
            {currentUser ? (
              <Button 
                onClick={() => setMessageModalOpen(true)}
                className="bg-cyan-600 hover:bg-cyan-700 gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Message Vendor
              </Button>
            ) : (
              <Button 
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Sign In to Contact
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Modal */}
      {currentUser && (
        <MessageModal
          open={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          recipient={{ id: vendorData.user_id, full_name: vendorData.company_name }}
        />
      )}
    </div>
  );
}