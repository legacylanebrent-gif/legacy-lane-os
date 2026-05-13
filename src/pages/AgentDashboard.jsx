import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AgentTerritorySection from '@/components/agentdashboard/AgentTerritorySection';
import AgentCommissionProgress from '@/components/agentdashboard/AgentCommissionProgress';
import AgentLeadsList from '@/components/agentdashboard/AgentLeadsList';
import AgentOperatorOutreach from '@/components/agentdashboard/AgentOperatorOutreach';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldOff, Clock } from 'lucide-react';

export default function AgentDashboard() {
  const [user, setUser] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      if (u) {
        const apps = await base44.entities.AgentTerritoryApplication.filter({ email: u.email });
        // Sort by newest
        apps.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setApplication(apps[0] || null);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  // No application submitted
  if (!application) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-14 space-y-4">
            <ShieldOff className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">No Application Found</h2>
            <p className="text-slate-500 text-sm">You haven't submitted a territory application yet. Apply through the Agent Partnerships page to get started.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Application exists but not yet approved
  if (application.status !== 'approved') {
    const statusMessages = {
      pending: { icon: Clock, title: 'Application Under Review', msg: 'Your territory application has been received and is awaiting review. You\'ll be notified once it\'s approved.' },
      reviewing: { icon: Clock, title: 'Application Being Reviewed', msg: 'Our team is currently reviewing your application. This typically takes 1–3 business days.' },
      denied: { icon: ShieldOff, title: 'Application Not Approved', msg: 'Unfortunately your territory application was not approved at this time. Please contact support for more information.' },
    };
    const info = statusMessages[application.status] || statusMessages.pending;
    const Icon = info.icon;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-14 space-y-4">
            <Icon className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">{info.title}</h2>
            <p className="text-slate-500 text-sm">{info.msg}</p>
            <div className="bg-slate-50 rounded-lg p-3 text-left text-sm mt-4 space-y-1">
              <p className="text-slate-600"><span className="font-medium">Territory:</span> {application.cities_requested || application.county_requested || '—'}</p>
              <p className="text-slate-600"><span className="font-medium">State:</span> {application.license_state || '—'}</p>
              <p className="text-slate-600"><span className="font-medium">Interest:</span> {application.interested_in || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved — show full dashboard
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Agent Dashboard</h1>
            <p className="text-slate-500 mt-1">
              Welcome back, <span className="font-medium text-slate-700">{user?.full_name || application.name}</span> · Territory:{' '}
              <span className="text-orange-600 font-medium">{application.cities_requested || application.county_requested}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Territory Approved
          </div>
        </div>

        {/* Territory Map + Commission side by side on desktop */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AgentTerritorySection application={application} />
          </div>
          <div>
            <AgentCommissionProgress application={application} userId={user?.id} />
          </div>
        </div>

        {/* Leads + Operator Outreach */}
        <div className="grid lg:grid-cols-2 gap-6">
          <AgentLeadsList application={application} userId={user?.id} userEmail={user?.email} />
          <AgentOperatorOutreach application={application} />
        </div>
      </div>
    </div>
  );
}