import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, User, MapPin, AlertCircle } from 'lucide-react';

const statusConfig = {
  new: { label: 'New', cls: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Accepted', cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', cls: 'bg-purple-100 text-purple-700' },
  closed: { label: 'Closed', cls: 'bg-green-100 text-green-700' },
};

export default function AgentLeadsList({ application, userId }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!userId) { setLoading(false); return; }
      const data = await base44.entities.ReferralLead.filter({ assigned_agent_id: userId });
      data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setLeads(data || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const active = leads.filter(l => l.status !== 'closed');
  const closed = leads.filter(l => l.status === 'closed');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <ClipboardList className="w-5 h-5 text-purple-500" />
          Leads & Follow-ups
          {active.length > 0 && (
            <Badge className="bg-purple-100 text-purple-700 ml-1">{active.length} active</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-slate-400 text-sm">No leads assigned yet.</p>
            <p className="text-slate-400 text-xs">Leads will appear here once operators or the platform routes them to you.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {active.map(lead => {
              const cfg = statusConfig[lead.status] || statusConfig.new;
              return (
                <div key={lead.id} className="flex items-start justify-between gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200 hover:border-orange-200 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <p className="font-medium text-slate-800 text-sm truncate">{lead.client_name}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <p className="text-xs text-slate-500 truncate">{lead.property_address}</p>
                    </div>
                  </div>
                  <Badge className={`${cfg.cls} text-xs flex-shrink-0`}>{cfg.label}</Badge>
                </div>
              );
            })}
            {closed.length > 0 && (
              <p className="text-center text-xs text-slate-400 pt-2">{closed.length} closed deal{closed.length > 1 ? 's' : ''} not shown</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}