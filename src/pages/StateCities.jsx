import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STATE_REGIONS } from '@/components/data/StateRegions';
import { ArrowLeft, MapPin, Building2 } from 'lucide-react';

export default function StateCities() {
  const urlParams = new URLSearchParams(window.location.search);
  const stateCode = urlParams.get('state');
  
  const stateData = STATE_REGIONS[stateCode];

  if (!stateData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">State not found</h1>
          <Link to={createPageUrl('SearchByState')}>
            <Button>Back to States</Button>
          </Link>
        </div>
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
                <p className="text-xs text-orange-600">Estate Sale Finder</p>
              </div>
            </Link>

            <Link to={createPageUrl('SearchByState')}>
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to States
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MapPin className="w-12 h-12 text-cyan-600" />
            <h1 className="text-5xl font-serif font-bold text-slate-900">
              {stateData.name}
            </h1>
          </div>
          <p className="text-xl text-slate-600">
            Find estate sales in cities across {stateData.name}
          </p>
        </div>

        {/* Larger Cities */}
        {stateData.largerCities && stateData.largerCities.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-6 h-6 text-cyan-600" />
              <h2 className="text-3xl font-serif font-bold text-slate-900">
                Larger Cities
              </h2>
              <Badge variant="secondary" className="text-lg py-1 px-3">
                {stateData.largerCities.length}
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stateData.largerCities.map((city, idx) => (
                <Link
                  key={idx}
                  to={createPageUrl('EstateSaleFinder') + `?state=${stateCode}&city=${encodeURIComponent(city)}`}
                >
                  <Card className="hover:shadow-lg transition-all hover:border-cyan-600 cursor-pointer group">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <MapPin className="w-5 h-5 text-cyan-700" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors">
                            {city}
                          </h3>
                        </div>
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Smaller Cities */}
        {stateData.smallerCities && stateData.smallerCities.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-6 h-6 text-orange-600" />
              <h2 className="text-3xl font-serif font-bold text-slate-900">
                Smaller Cities
              </h2>
              <Badge variant="secondary" className="text-lg py-1 px-3">
                {stateData.smallerCities.length}
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stateData.smallerCities.map((city, idx) => (
                <Link
                  key={idx}
                  to={createPageUrl('EstateSaleFinder') + `?state=${stateCode}&city=${encodeURIComponent(city)}`}
                >
                  <Card className="hover:shadow-lg transition-all hover:border-orange-600 cursor-pointer group">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <MapPin className="w-5 h-5 text-orange-700" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {city}
                          </h3>
                        </div>
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No cities message */}
        {(!stateData.largerCities || stateData.largerCities.length === 0) && 
         (!stateData.smallerCities || stateData.smallerCities.length === 0) && (
          <Card className="p-12 text-center">
            <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No cities available for this state yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}