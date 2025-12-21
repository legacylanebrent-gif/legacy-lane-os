import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { US_STATES } from '@/components/data/USStates';
import { MapPin, Building2, BookOpen, Briefcase, MessageSquare, Quote } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah M.",
    location: "Miami, FL",
    text: "Thanks for your website and help getting someone to handle my mother's estate sale. The company I found was professional and exceeded expectations!",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop"
  },
  {
    name: "Robert T.",
    location: "Austin, TX",
    text: "I secured a great company through Legacy Lane. Thanks for all your help! You guys are fantastic and made the process so easy.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop"
  },
  {
    name: "Jennifer L.",
    location: "Chicago, IL",
    text: "Hired one of your companies! I'm very pleased with their professionalism and the results they delivered for our estate sale.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop"
  }
];

export default function Operators() {
  const [selectedState, setSelectedState] = useState('');

  const handleStateSearch = () => {
    if (selectedState) {
      window.location.href = createPageUrl('StateCities') + `?state=${selectedState}`;
    }
  };

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
                <p className="text-xs text-orange-600">Estate Sale Professionals</p>
              </div>
            </Link>

            <Link to={createPageUrl('Home')}>
              <Button variant="ghost">Back to Home</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-800 to-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <Building2 className="w-16 h-16 mx-auto mb-6 text-orange-400" />
            <h1 className="text-5xl font-serif font-bold mb-4">
              Find Estate Sale Professionals
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Connect with trusted estate sale operators and companies in your area
            </p>
            <Link to={createPageUrl('Onboarding')}>
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-lg px-8">
                <Briefcase className="w-5 h-5 mr-2" />
                List Your Company
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search by company name, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>

              {/* State Filter */}
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="h-12">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <SelectValue placeholder="Filter by State" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All States</SelectItem>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(selectedState || searchQuery) && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {filteredOperators.length} {filteredOperators.length === 1 ? 'operator' : 'operators'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedState('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Operators Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-slate-600">Loading operators...</div>
          </div>
        ) : filteredOperators.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No operators found
            </h3>
            <p className="text-slate-500 mb-6">
              {selectedState || searchQuery 
                ? 'Try adjusting your filters or search criteria'
                : 'Be the first to list your estate sale company'}
            </p>
            <Link to={createPageUrl('Onboarding')}>
              <Button className="bg-orange-600 hover:bg-orange-700">
                List Your Company
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOperators.map((operator) => (
              <Link
                key={operator.id}
                to={createPageUrl('BusinessProfile') + '?id=' + operator.id}
              >
                <Card className="hover:shadow-xl transition-all hover:border-orange-500 cursor-pointer group h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-serif font-bold text-slate-900 group-hover:text-orange-600 transition-colors mb-1">
                          {operator.company_name || operator.full_name}
                        </h3>
                        {operator.city && operator.state && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <MapPin className="w-3 h-3" />
                            {operator.city}, {operator.state}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>

                    {operator.company_description && (
                      <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                        {operator.company_description}
                      </p>
                    )}

                    {/* Service Areas */}
                    {operator.service_states && operator.service_states.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {operator.service_states.slice(0, 5).map((state, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {state}
                            </Badge>
                          ))}
                          {operator.service_states.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{operator.service_states.length - 5}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-slate-600 pt-4 border-t">
                      {operator.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                          <span className="font-medium">{operator.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {operator.total_sales && (
                        <div>
                          <span className="font-medium">{operator.total_sales}</span> sales
                        </div>
                      )}
                    </div>

                    {/* Contact Options */}
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      {operator.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="w-3 h-3" />
                          <span>Phone</span>
                        </div>
                      )}
                      {operator.company_website && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Globe className="w-3 h-3" />
                          <span>Website</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <section className="bg-white border-t py-16 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Briefcase className="w-12 h-12 text-orange-600 mx-auto mb-4" />
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">
            Are You an Estate Sale Professional?
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Join our network of trusted operators and grow your business with Legacy Lane
          </p>
          <Link to={createPageUrl('Onboarding')}>
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-lg px-8">
              List Your Company Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}