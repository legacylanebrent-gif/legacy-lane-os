import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { US_STATES } from '@/components/data/USStates';
import UniversalHeader from '@/components/layout/UniversalHeader';
import { base44 } from '@/api/base44Client';
import { MapPin, Home as HomeIcon } from 'lucide-react';

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

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20 px-4 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png" alt="logo" className="h-14 w-14 object-contain" />
                <div>
                  <h3 className="text-2xl font-serif font-bold">EstateSalen.com</h3>
                  <p className="text-sm text-orange-400">Estate Sale Finder</p>
                </div>
              </div>
              <p className="text-slate-400 text-lg mb-6">
                Discover amazing estate sales and find treasures near you. Connect with trusted estate sale companies nationwide.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('SearchByState')} className="text-white hover:text-orange-400 transition-colors">Browse by State</Link></li>
                <li><Link to={createPageUrl('BrowseOperators')} className="text-white hover:text-orange-400 transition-colors">Browse Companies</Link></li>
                <li><Link to={createPageUrl('Home')} className="text-white hover:text-orange-400 transition-colors">Find Sales</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">For Businesses</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('OperatorPackages')} className="text-white hover:text-orange-400 transition-colors">List Your Company</Link></li>
                <li><Link to={createPageUrl('AgentSignup')} className="text-white hover:text-orange-400 transition-colors">Real Estate Agents</Link></li>
                <li><Link to={createPageUrl('VendorSignup')} className="text-white hover:text-orange-400 transition-colors">Vendors</Link></li>
                <li><Link to={createPageUrl('StartYourCompany')} className="text-white hover:text-orange-400 transition-colors font-semibold">Start Your Own Estate Sale Company</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-500">© {new Date().getFullYear()} EstateSalen.com. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}