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
  ArrowLeft, CheckCircle, TrendingUp, Home as HomeIcon
} from 'lucide-react';
import { format } from 'date-fns';

export default function BusinessProfile() {
  const [business, setBusiness] = useState(null);
  const [estateSales, setEstateSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const businessId = urlParams.get('id');

      if (!businessId) {
        window.location.href = createPageUrl('Home');
        return;
      }

      // Load business user data
      const users = await base44.entities.User.list();
      const businessUser = users.find(u => u.id === businessId);

      if (!businessUser) {
        window.location.href = createPageUrl('Home');
        return;
      }

      setBusiness(businessUser);

      // Load related estate sales if estate sale operator
      if (businessUser.primary_account_type === 'estate_sale_operator') {
        const allSales = await base44.entities.EstateSale.list('-created_date', 50);
        const operatorSales = allSales.filter(s => s.operator_id === businessId);
        setEstateSales(operatorSales);
      }
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeLabel = (type) => {
    const labels = {
      estate_sale_operator: 'Estate Sale Operator',
      real_estate_agent: 'Real Estate Agent',
      investor: 'Investor',
      vendor: 'Vendor',
      coach: 'Coach'
    };
    return labels[type] || type;
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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">LL</span>
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-slate-900">Legacy Lane</h1>
                <p className="text-xs text-orange-600">Business Directory</p>
              </div>
            </Link>

            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Sales
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Logo/Image */}
              <div className="flex-shrink-0">
                {business.company_logo ? (
                  <img
                    src={business.company_logo}
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
                      <a href={`mailto:${business.email}`} className="hover:text-orange-600">
                        {business.email}
                      </a>
                    </div>
                  )}
                  {business.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-cyan-600" />
                      <a href={`tel:${business.phone}`} className="hover:text-cyan-600">
                        {business.phone}
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
                    <div className="text-2xl font-bold text-slate-900">{estateSales.length}</div>
                    <div className="text-sm text-slate-600">Estate Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {business.years_in_business || 0}+
                    </div>
                    <div className="text-sm text-slate-600">Years Experience</div>
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
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="sales">Estate Sales</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          {/* Estate Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            {estateSales.length === 0 ? (
              <Card className="p-12 text-center">
                <HomeIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No estate sales yet</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {estateSales.map(sale => (
                  <Link
                    key={sale.id}
                    to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                    className="block group"
                  >
                    <Card className="overflow-hidden hover:shadow-xl transition-shadow">
                      {sale.images && sale.images.length > 0 && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={sale.images[0]}
                            alt={sale.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {sale.status === 'active' && (
                            <Badge className="absolute top-3 right-3 bg-green-600 text-white">
                              Active Now
                            </Badge>
                          )}
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
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-4 h-4 text-orange-600" />
                              <span>{format(new Date(sale.sale_dates[0].date), 'MMM d, yyyy')}</span>
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
              {business.phone && (
                <Button 
                  onClick={() => window.location.href = `tel:${business.phone}`}
                  className="bg-cyan-600 hover:bg-cyan-700 gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </Button>
              )}
              {business.email && (
                <Button 
                  onClick={() => window.location.href = `mailto:${business.email}`}
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
    </div>
  );
}