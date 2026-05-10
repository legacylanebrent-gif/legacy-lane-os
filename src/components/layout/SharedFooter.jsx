import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SharedFooter() {
  return (
    <footer className="bg-slate-900 text-white py-20 px-4">
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
              <li><Link to={createPageUrl('Home')} className="text-white hover:text-orange-400 transition-colors">Home</Link></li>
              <li><Link to={createPageUrl('SearchByState')} className="text-white hover:text-orange-400 transition-colors">Browse by State</Link></li>
              <li><Link to={createPageUrl('BrowseOperators')} className="text-white hover:text-orange-400 transition-colors">Browse Companies</Link></li>
              <li><Link to={createPageUrl('BrowseItems')} className="text-white hover:text-orange-400 transition-colors">Marketplace</Link></li>
              <li><Link to={createPageUrl('EstateSaleFinder')} className="text-white hover:text-orange-400 transition-colors">Find Sales</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">For Businesses</h4>
            <ul className="space-y-2">
              <li><Link to={createPageUrl('OperatorPackages')} className="text-white hover:text-orange-400 transition-colors">List Your Company</Link></li>
              <li><Link to={createPageUrl('AgentSignup')} className="text-white hover:text-orange-400 transition-colors">Real Estate Agents</Link></li>
              <li><Link to={createPageUrl('VendorSignup')} className="text-white hover:text-orange-400 transition-colors">Vendors</Link></li>
              <li><Link to={createPageUrl('DIYSaleSignup')} className="text-white hover:text-orange-400 transition-colors">Sell Your Items</Link></li>
              <li><Link to={createPageUrl('StartYourCompany')} className="text-white hover:text-orange-400 transition-colors font-semibold">Start Your Own Estate Sale Company</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-800 pt-8 text-center">
          <p className="text-slate-500">
            © {new Date().getFullYear()} EstateSalen.com. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}