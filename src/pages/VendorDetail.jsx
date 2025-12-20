import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Star, MapPin, Award, CheckCircle, Clock, DollarSign, ChevronLeft, FileText } from 'lucide-react';
import BidRequestModal from '@/components/vendors/BidRequestModal';

export default function VendorDetail() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBidModal, setShowBidModal] = useState(false);

  useEffect(() => {
    loadVendor();
  }, []);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const vendorId = params.get('id');

      const allVendors = await base44.entities.Vendor.list();
      const vendorData = allVendors.find(v => v.id === vendorId);
      setVendor(vendorData);

      // Mock reviews - would filter by vendor_id in real system
      const reviewData = await base44.entities.Review.list();
      setReviews(reviewData.slice(0, 5));
    } catch (error) {
      console.error('Error loading vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !vendor) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(createPageUrl('Vendors'))}
          className="mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Vendors
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-serif font-bold text-navy-900 mb-2">
                      {vendor.company_name}
                    </h1>
                    <Badge variant="outline" className="text-sm capitalize">
                      {vendor.vendor_type?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <Badge className={`${getTierBadge(vendor.tier)} text-lg px-4 py-2`}>
                    {vendor.tier}
                  </Badge>
                </div>

                {vendor.rating && (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                      <span className="text-2xl font-bold text-navy-900">
                        {vendor.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-slate-600">
                      {vendor.total_reviews} reviews
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-slate-600">Jobs Completed</p>
                      <p className="text-xl font-bold text-navy-900">{vendor.jobs_completed}</p>
                    </div>
                  </div>

                  {vendor.response_time_hours && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-slate-600">Response Time</p>
                        <p className="text-xl font-bold text-navy-900">{vendor.response_time_hours}h</p>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => setShowBidModal(true)}
                  className="w-full bg-gold-600 hover:bg-gold-700 h-12"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Request Bid
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Services Offered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {vendor.services_offered?.map((service, index) => (
                    <Badge key={index} variant="outline">
                      {service}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="reviews">
              <TabsList>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    {reviews.length === 0 ? (
                      <p className="text-center text-slate-500">No reviews yet</p>
                    ) : (
                      <div className="space-y-6">
                        {reviews.map(review => (
                          <div key={review.id} className="border-b pb-6 last:border-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? 'text-amber-500 fill-amber-500'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-semibold text-navy-900">
                                {review.reviewer_name}
                              </span>
                            </div>
                            {review.title && (
                              <h4 className="font-semibold text-navy-900 mb-1">
                                {review.title}
                              </h4>
                            )}
                            <p className="text-slate-600">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {vendor.license_number && (
                        <div>
                          <p className="text-sm text-slate-600 mb-1">License Number</p>
                          <p className="font-semibold text-navy-900">{vendor.license_number}</p>
                        </div>
                      )}
                      {vendor.website && (
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Website</p>
                          <a 
                            href={vendor.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gold-600 hover:underline"
                          >
                            {vendor.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Areas</CardTitle>
              </CardHeader>
              <CardContent>
                {vendor.service_areas?.length > 0 ? (
                  <div className="space-y-2">
                    {vendor.service_areas.map((area, index) => (
                      <div key={index} className="flex items-center gap-2 text-slate-700">
                        <MapPin className="w-4 h-4 text-gold-600" />
                        <span>{area}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No service areas listed</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Partnership Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendor.insurance_verified && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>Insurance Verified</span>
                  </div>
                )}
                {vendor.revenue_share_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Revenue Share</span>
                    <span className="font-bold text-navy-900">{vendor.revenue_share_rate}%</span>
                  </div>
                )}
                {vendor.average_bid && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Avg Bid</span>
                    <span className="font-bold text-navy-900">${vendor.average_bid}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showBidModal && (
        <BidRequestModal
          vendor={vendor}
          onClose={() => setShowBidModal(false)}
          onSuccess={() => {
            setShowBidModal(false);
          }}
        />
      )}
    </div>
  );
}