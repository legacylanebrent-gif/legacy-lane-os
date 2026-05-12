import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, XCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
};

const interestLabels = {
  preferred: 'Preferred Agent (Monthly Fee)',
  exclusive: 'Exclusive Territory Owner (Buy-In)',
  unsure: 'Not Sure — Learn More',
};

const relationshipLabels = {
  yes_active: 'Yes — Active relationships',
  yes_some: 'Yes — A few informal connections',
  no_open: 'No — But open to building them',
  no: 'No',
};

export default function AdminAgentApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.AgentTerritoryApplication.list('-created_date', 200);
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.AgentTerritoryApplication.update(id, { status });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const pending = apps.filter(a => a.status === 'pending');
  const reviewed = apps.filter(a => a.status !== 'pending');

  const AppCard = ({ app }) => (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
        onClick={() => toggle(app.id)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
            {app.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{app.name}</p>
            <p className="text-xs text-slate-500">{app.email} · {app.brokerage} · {app.license_state}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusColors[app.status]}>{app.status}</Badge>
          <Badge variant="outline" className="text-xs">{interestLabels[app.interested_in] || app.interested_in}</Badge>
          {expanded[app.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded[app.id] && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3">
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Phone</p>
              <p className="text-slate-800">{app.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Cities Requested</p>
              <p className="text-slate-800">{app.cities_requested || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">County Requested</p>
              <p className="text-slate-800">{app.county_requested || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Avg Sale Price</p>
              <p className="text-slate-800">{app.avg_sale_price ? `$${Number(app.avg_sale_price).toLocaleString()}` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Estate Sale Relationships</p>
              <p className="text-slate-800">{relationshipLabels[app.has_estate_sale_relationships] || app.has_estate_sale_relationships || '—'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Why Should Be Considered</p>
            <p className="text-slate-700 text-sm bg-slate-50 rounded p-3 whitespace-pre-wrap">{app.why_should_be_considered || '—'}</p>
          </div>
          {app.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => updateStatus(app.id, 'approved')}>
                <Check className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1" onClick={() => updateStatus(app.id, 'denied')}>
                <XCircle className="w-3.5 h-3.5" /> Deny
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-1">Agent Territory Applications</h1>
          <p className="text-slate-500">{pending.length} pending · {reviewed.length} reviewed</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-amber-800 text-base">
                  Pending Review
                  <Badge className="bg-amber-500 text-white ml-2">{pending.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pending.map(app => <AppCard key={app.id} app={app} />)}
              </CardContent>
            </Card>
          )}

          {pending.length === 0 && reviewed.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-slate-500">No applications submitted yet.</CardContent>
            </Card>
          )}

          {reviewed.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-700 text-base">Previously Reviewed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {reviewed.map(app => <AppCard key={app.id} app={app} />)}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}