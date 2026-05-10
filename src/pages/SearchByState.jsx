import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { US_STATES } from '@/components/data/USStates';
import UniversalHeader from '@/components/layout/UniversalHeader';
import { base44 } from '@/api/base44Client';
import { MapPin, Home as HomeIcon } from 'lucide-react';
import SharedFooter from '@/components/layout/SharedFooter';

export default function SearchByState() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      setIsAuthenticated(authed);
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MapPin className="w-10 h-10 text-orange-600" />
            <h1 className="text-5xl font-serif font-bold text-slate-900">
              Find Estate Sales in Your State
            </h1>
          </div>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Browse estate sales across all 50 states and Washington D.C. Click on your state to discover sales near you.
          </p>
        </div>

        {/* States Grid */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {US_STATES.map((state) => (
                <Link
                  key={state.code}
                  to={createPageUrl('StateCities') + `?state=${state.code}`}
                  className="group"
                >
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-all duration-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <span className="text-white font-bold text-lg">{state.code}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 text-center group-hover:text-orange-600 transition-colors">
                      {state.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-xl shadow-md p-8 text-center">
          <HomeIcon className="w-12 h-12 text-orange-600 mx-auto mb-4" />
          <h3 className="text-2xl font-serif font-bold text-slate-900 mb-3">
            Discover Amazing Estate Sales
          </h3>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Whether you're looking for antiques, furniture, collectibles, or unique treasures, 
            find estate sales happening in your area. Each state page shows active sales with 
            detailed information about dates, locations, and available items.
          </p>
        </div>
      </div>

      <SharedFooter />
    </div>
  );
}