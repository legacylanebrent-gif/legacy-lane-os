import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import EstateSaleOperatorDashboard from '@/components/dashboards/EstateSaleOperatorDashboard';
import RealEstateAgentDashboard from '@/components/dashboards/RealEstateAgentDashboard';
import InvestorDashboard from '@/components/dashboards/InvestorDashboard';
import ConsumerDashboard from '@/components/dashboards/ConsumerDashboard';
import CoachDashboard from '@/components/dashboards/CoachDashboard';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';

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
      // Ensure primary_account_type defaults to 'consumer' if not set
      if (userData && (!userData.primary_account_type || userData.primary_account_type === '')) {
        userData.primary_account_type = 'consumer';
      }
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

  if (!user) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-red-600 font-bold text-xl mb-2">Error: No User Data</h2>
            <p className="text-red-700">User could not be loaded. Please try logging out and back in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Route to appropriate dashboard based on primary account type
  const renderDashboard = () => {
    const accountType = user.primary_account_type || user.primary_role;
    
    try {
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
    } catch (error) {
      return (
        <div className="p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <h2 className="text-red-600 font-bold text-xl mb-2">Dashboard Error</h2>
              <p className="text-red-700 mb-2">Failed to load dashboard for account type: {accountType}</p>
              <p className="text-sm text-red-600">Error: {error.message}</p>
              <pre className="mt-4 p-4 bg-white rounded text-xs overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      );
    }
  };

  return (
    <>
      <UniversalHeader user={user} isAuthenticated={!!user} />
      {renderDashboard()}
      <SharedFooter />
    </>
  );
}