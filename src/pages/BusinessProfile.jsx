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
  ArrowLeft, CheckCircle, TrendingUp, Home as HomeIcon, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import MessageModal from '@/components/messaging/MessageModal';
import ContactFormModal from '@/components/company/ContactFormModal';
import UniversalHeader from '@/components/layout/UniversalHeader';
import { getImageSrc } from '@/utils/imageOptimizer';
import { formatPhone } from '@/utils/formatPhone';

export default function BusinessProfile() {
  const [business, setBusiness] = useState(null);
  const [currentSales, setCurrentSales] = useState([]);
  const [pastSales, setPastSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      // Check if user is logged in
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        // User not logged in — guest visitor
      }

      const urlParams = new URLSearchParams(window.location.search);
      const businessId = urlParams.get('id');

      if (!businessId) {
        window.location.href = createPageUrl('Home');
        return;
      }

      // Load business user data — fall back to getOperatorsWithLocation if User.list() fails (guest)
      let businessUser = null;
      try {
        const users = await base44.entities.User.list();
        businessUser = users.find(u => u.id === businessId);
      } catch (e) {
        // RLS blocks User.list() for guests — use backend function instead
        const res = await base44.functions.invoke('getOperatorById', { operatorId: businessId });
        businessUser = res.data?.operator || null;
      }

      if (!businessUser) {
        setLoading(false);
        return;
      }

      setBusiness(businessUser);

      // Load related estate sales
      let allSales = [];
      try {
        allSales = await base44.entities.EstateSale.list('-created_date', 100);
      } catch (e) {
        allSales = [];
      }
      const operatorSales = allSales.filter(s => s.operator_id === businessId);
      
      const current = operatorSales.filter(s => 
        s.status === 'upcoming' || s.status === 'active' || s.status === 'draft'
      );
      const past = operatorSales.filter(s => 
        s.status === 'completed' || s.status === 'cancelled'
      );
      
      setCurrentSales(current);
      setPastSales(past);
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return null;
    // If already in 12-hour format like "9:00 AM", return as-is
    if (/am|pm/i.test(timeStr)) return timeStr;
    // Convert 24-hour "HH:MM" or "HH:MM:SS" to 12-hour
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const getAccountTypeLabel = (type) => {
    const labels = {
      estate_sale_operator: 'Estate Sale Company',
      estate_sale_company_owner: 'Estate Sale Company',
      real_estate_agent: 'Real Estate Agent',
      investor: 'Investor',
      vendor: 'Vendor',
      coach: 'Coach',
      consignor: 'Consignor',
      reseller: 'Reseller',
      collector_dealer: 'Antique & Collector Dealer',
      consumer: 'Shopper',
    };
    return labels[type] || type?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-slate-600 text-xl">Business not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={!!currentUser} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Logo/Image */}
              <div className="flex-shrink-0">
                {(business.company_logo_url || business.company_logo) ? (
                  <img
                    src={business.company_logo_url || business.company_logo}
                    alt={business.company_name || business.full_name}
                    className="w-32 h-32 rounded-lg object-cover border-2 border-slate-200"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>

              {/* Business Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2">
                      {business.company_name || business.full_name}
                    </h2>
                    <Badge className="bg-orange-600 text-white">
                      {getAccountTypeLabel(business.primary_account_type)}
                    </Badge>
                  </div>
                  {business.verified && (
                    <Badge className="bg-green-600 text-white gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                {business.company_description && (
                  <p className="text-slate-700 mb-6 leading-relaxed">
                    {business.company_description}
                  </p>
                )}

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {business.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-orange-600" />
                      <button
                        onClick={() => setContactFormOpen(true)}
                        className="hover:text-orange-600 cursor-pointer text-left"
                      >
                        <span className="underline underline-offset-2">Send Message</span>
                        <span className="text-xs text-slate-400 ml-1">(via contact form)</span>
                      </button>
                    </div>
                  )}
                  {(business.business_phone || business.phone) && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-cyan-600" />
                      <a href={`tel:${business.business_phone || business.phone}`} className="hover:text-cyan-600">
                        {formatPhone(business.business_phone || business.phone)}
                      </a>
                    </div>
                  )}
                  {business.service_area && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span>{business.service_area}</span>
                    </div>
                  )}
                  {business.company_website && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <a 
                        href={business.company_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-600"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{currentSales.length + pastSales.length}</div>
                    <div className="text-sm text-slate-600">Total Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {business.primary_account_type === 'reseller' && business.reseller_founded_year
                        ? <>Since {business.reseller_founded_year}</>
                        : (business.founded_year
                          ? <>{new Date().getFullYear() - parseInt(business.founded_year)}+</>
                          : <>—</>
                        )
                      }
                    </div>
                    <div className="text-sm text-slate-600">
                      {business.primary_account_type === 'reseller' ? 'Year Started' : 'Years Experience'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-1">
                      {business.rating || 5.0}
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="text-sm text-slate-600">Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="current">Current Sales</TabsTrigger>
            <TabsTrigger value="past">Past Sales</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          {/* Current Sales Tab */}
          <TabsContent value="current" className="space-y-4">
            {currentSales.length === 0 ? (
              <Card className="p-12 text-center">
                <HomeIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No current estate sales</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentSales.map(sale => (
                  <Link
                    key={sale.id}
                    to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                    className="block group"
                  >
                    <Card className="overflow-hidden hover:shadow-xl transition-shadow">
                       {sale.images && sale.images.length > 0 && (
                         <div className="relative h-48 overflow-hidden">
                           <img
                             src={getImageSrc(sale.images[0], 400)}
                             alt={sale.title}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                             loading="lazy"
                             decoding="async"
                           />
                          <Badge className={`absolute top-3 right-3 ${sale.status === 'active' ? 'bg-green-600' : 'bg-blue-600'} text-white`}>
                            {sale.status === 'active' ? 'Active Now' : 'Upcoming'}
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-5">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">
                          {sale.title}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-cyan-600" />
                            <span>{sale.property_address?.city}, {sale.property_address?.state}</span>
                          </div>
                          {sale.sale_dates && sale.sale_dates.length > 0 && (
                            <div className="flex items-start gap-2 text-slate-600">
                              <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                              <div>
                                {sale.sale_dates.map((sd, i) => (
                                  <span key={i} className="block">
                                    {format(new Date(sd.date), 'MMM d, yyyy')}
                                    {sd.start_time && formatTimeDisplay(sd.start_time) && (
                                      <> — {formatTimeDisplay(sd.start_time)}{sd.end_time && formatTimeDisplay(sd.end_time) ? ` - ${formatTimeDisplay(sd.end_time)}` : ''}</>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Past Sales Tab */}
          <TabsContent value="past" className="space-y-4">
            {pastSales.length === 0 ? (
              <Card className="p-12 text-center">
                <HomeIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No past estate sales</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastSales.map(sale => (
                  <Link
                    key={sale.id}
                    to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                    className="block group"
                  >
                    <Card className="overflow-hidden hover:shadow-xl transition-shadow opacity-90">
                       {sale.images && sale.images.length > 0 && (
                         <div className="relative h-48 overflow-hidden">
                           <img
                             src={typeof sale.images[0] === 'string' ? sale.images[0] : sale.images[0]?.url}
                             alt={sale.title}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 grayscale-[30%]"
                           />
                          <Badge className="absolute top-3 right-3 bg-slate-600 text-white">
                            {sale.status === 'completed' ? 'Completed' : 'Cancelled'}
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-5">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">
                          {sale.title}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-cyan-600" />
                            <span>{sale.property_address?.city}, {sale.property_address?.state}</span>
                          </div>
                          {sale.sale_dates && sale.sale_dates.length > 0 && (
                            <div className="flex items-start gap-2 text-slate-600">
                              <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                              <div>
                                {sale.sale_dates.map((sd, i) => (
                                  <span key={i} className="block">
                                    {format(new Date(sd.date), 'MMM d, yyyy')}
                                    {sd.start_time && formatTimeDisplay(sd.start_time) && (
                                      <> — {formatTimeDisplay(sd.start_time)}{sd.end_time && formatTimeDisplay(sd.end_time) ? ` - ${formatTimeDisplay(sd.end_time)}` : ''}</>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">About Us</h3>
                  <p className="text-slate-700 leading-relaxed">
                    {business.company_description || 'No description available.'}
                  </p>
                </div>

                {business.specialties && business.specialties.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {business.specialties.map((specialty, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {business.certifications && business.certifications.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">Certifications</h3>
                    <div className="space-y-2">
                      {business.certifications.map((cert, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-700">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          {cert}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Services Offered</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {business.services_offered?.map((service, idx) => (
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
        </Tabs>

        {/* Contact CTA */}
        <Card className="mt-8 bg-gradient-to-r from-orange-50 to-cyan-50">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-serif font-bold text-slate-900 mb-4">
              Ready to Work Together?
            </h3>
            <p className="text-slate-600 mb-6">
              Contact {business.company_name || business.full_name} to learn more about their services
            </p>
            <div className="flex gap-4 justify-center">
              {currentUser && (
                <Button 
                  onClick={() => setMessageModalOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-700 gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message Company
                </Button>
              )}
              {(business.business_phone || business.phone) && (
                <Button 
                  onClick={() => window.location.href = `tel:${business.business_phone || business.phone}`}
                  className="bg-orange-600 hover:bg-orange-700 gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </Button>
              )}
              {business.email && (
                <Button 
                  onClick={() => setContactFormOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Modal — for authenticated users */}
      {currentUser && business && (
        <MessageModal
          open={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          recipient={business}
        />
      )}

      {/* Contact Form Modal — for guest visitors */}
      {business && (
        <ContactFormModal
          open={contactFormOpen}
          onClose={() => setContactFormOpen(false)}
          business={business}
        />
      )}
    </div>
  );
}