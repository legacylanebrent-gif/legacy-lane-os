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
  BookOpen, ChevronRight, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import MessageModal from '@/components/messaging/MessageModal';
import ContactFormModal from '@/components/company/ContactFormModal';
import UniversalHeader from '@/components/layout/UniversalHeader';
import { getImageSrc } from '@/utils/imageOptimizer';
import { formatPhone } from '@/utils/formatPhone';
import ProfileSaleCard from '@/components/company/ProfileSaleCard';
import FollowCompanyButton from '@/components/company/FollowCompanyButton';

export default function BusinessProfile() {
  const [business, setBusiness] = useState(null);
  const [currentSales, setCurrentSales] = useState([]);
  const [pastSales, setPastSales] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [blogPosts, setBlogPosts] = useState([]);

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

      // Sales that actually happened in the last 30 days, newest first.
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const saleTime = (s) => Math.max(0, ...(s.sale_dates || []).map(d => {
        const t = d?.date ? new Date(d.date).getTime() : NaN;
        return isNaN(t) ? 0 : t;
      }));
      const recent = operatorSales
        .filter(s => (s.sale_dates || []).some(d => {
          const t = d?.date ? new Date(d.date).getTime() : NaN;
          return !isNaN(t) && t <= now && t >= thirtyDaysAgo;
        }))
        .sort((a, b) => saleTime(b) - saleTime(a));
      setRecentSales(recent);

      // Load blog posts linked to this operator's sales
      const saleIds = operatorSales.map(s => s.id);
      if (saleIds.length > 0) {
        try {
          // Fetch all published blogs and filter by operator's sales
          const allBlogs = await base44.entities.SEOPage.filter(
            { page_type: 'blog', status: 'published' },
            '-published_at',
            200
          );
          const operatorBlogs = allBlogs.filter(b => saleIds.includes(b.entity_id));
          setBlogPosts(operatorBlogs);
        } catch (e) {
          setBlogPosts([]);
        }
      }
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
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
                {(business.company_logo_url || business.company_logo || business.logo_dark || business.logo_light) ? (
                  <img
                    src={business.company_logo_url || business.company_logo || business.logo_dark || business.logo_light}
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2">
                      {business.company_name || business.full_name}
                    </h2>
                    <Badge className="bg-orange-600 text-white">
                      {getAccountTypeLabel(business.primary_account_type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {business.verified && (
                      <Badge className="bg-green-600 text-white gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </Badge>
                    )}
                    <FollowCompanyButton
                      operatorId={business.id}
                      operatorName={business.company_name || business.full_name}
                      operatorCity={business.city || business.address_city || ''}
                      operatorState={business.state || business.address_state || ''}
                      currentUser={currentUser}
                    />
                  </div>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
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

        {/* Recent Sales — last 30 days */}
        {recentSales.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-orange-600" />
              <h3 className="text-xl font-serif font-bold text-slate-900">Recent Sales (Last 30 Days)</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">What this company has been selling lately.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentSales.map(sale => (
                <ProfileSaleCard
                  key={sale.id}
                  sale={sale}
                  badgeLabel={sale.status === 'active' ? 'Active Now' : sale.status === 'completed' ? 'Completed' : 'Upcoming'}
                  badgeClassName={sale.status === 'completed' ? 'bg-cyan-600 text-white' : 'bg-green-600 text-white'}
                  muted
                />
              ))}
            </div>
          </div>
        )}

        {/* Tabs Section */}
        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="current">Current Sales</TabsTrigger>
            <TabsTrigger value="past">Past Sales</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
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
                  <ProfileSaleCard
                    key={sale.id}
                    sale={sale}
                    badgeLabel={sale.status === 'active' ? 'Active Now' : 'Upcoming'}
                    badgeClassName={sale.status === 'active' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}
                  />
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
                  <ProfileSaleCard
                    key={sale.id}
                    sale={sale}
                    badgeLabel={sale.status === 'completed' ? 'Completed' : 'Cancelled'}
                    badgeClassName="bg-slate-600 text-white"
                    muted
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Blog Tab */}
          <TabsContent value="blog" className="space-y-4">
            {blogPosts.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No blog posts yet</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogPosts.map(post => (
                  <Link
                    key={post.id}
                    to={`/blog-post?slug=${encodeURIComponent(post.slug)}`}
                    className="block group"
                  >
                    <Card className="h-full hover:shadow-xl transition-shadow overflow-hidden">
                      {post.image_url && (
                        <div className="h-40 overflow-hidden">
                          <img
                            src={post.image_url}
                            alt={post.h1 || post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <CardContent className="p-5 flex flex-col h-full">
                        <h4 className="font-serif font-bold text-slate-900 text-base mb-2 line-clamp-3 group-hover:text-orange-600 transition-colors">
                          {post.h1 || post.title}
                        </h4>
                        {post.meta_description && (
                          <p className="text-sm text-slate-600 line-clamp-2 flex-1 mb-3">{post.meta_description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-auto">
                          {post.published_at && (
                            <><Calendar className="w-3 h-3" /><span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span></>
                          )}
                          <span className="ml-auto flex items-center gap-1 text-orange-600 font-semibold">
                            Read <ChevronRight className="w-3 h-3" />
                          </span>
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