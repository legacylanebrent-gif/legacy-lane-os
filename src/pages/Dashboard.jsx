import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import EstateSaleOperatorDashboard from '@/components/dashboards/EstateSaleOperatorDashboard';
import RealEstateAgentDashboard from '@/components/dashboards/RealEstateAgentDashboard';
import InvestorDashboard from '@/components/dashboards/InvestorDashboard';
import ConsumerDashboard from '@/components/dashboards/ConsumerDashboard';
import CoachDashboard from '@/components/dashboards/CoachDashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) return null;

  // Route to appropriate dashboard based on primary account type
  const renderDashboard = () => {
    const accountType = user.primary_account_type || user.primary_role;
    switch (accountType) {
      case 'super_admin':
      case 'platform_ops':
      case 'growth_team':
      case 'partnerships':
      case 'education_admin':
      case 'finance_admin':
        return <SuperAdminDashboard user={user} />;

      case 'estate_sale_operator':
        return <EstateSaleOperatorDashboard user={user} />;

      case 'real_estate_agent':
        return <RealEstateAgentDashboard user={user} />;

      case 'investor':
        return <InvestorDashboard user={user} />;

      case 'coach':
        return <CoachDashboard user={user} />;

      case 'consumer':
      case 'executor':
      case 'home_seller':
      case 'buyer':
      case 'downsizer':
      case 'diy_seller':
      case 'consignor':
      default:
        return <ConsumerDashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50">
      {renderDashboard()}
      
      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">LL</span>
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold">Legacy Lane</h3>
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
                <li><Link to={createPageUrl('SearchByState')} className="text-slate-400 hover:text-white transition-colors">Browse by State</Link></li>
                <li><Link to={createPageUrl('Home')} className="text-slate-400 hover:text-white transition-colors">Find Sales</Link></li>
                <li><Link to={createPageUrl('MyTickets')} className="text-slate-400 hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">For Businesses</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('OperatorPackages')} className="text-slate-400 hover:text-white transition-colors">List Your Company</Link></li>
                <li><Link to={createPageUrl('AgentSignup')} className="text-slate-400 hover:text-white transition-colors">Real Estate Agents</Link></li>
                <li><Link to={createPageUrl('VendorSignup')} className="text-slate-400 hover:text-white transition-colors">Vendors</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-500">
              © 2024 Legacy Lane. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}