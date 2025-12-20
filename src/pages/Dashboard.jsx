import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
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

  // Route to appropriate dashboard based on primary role
  const renderDashboard = () => {
    switch (user.primary_role) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      {renderDashboard()}
    </div>
  );
}