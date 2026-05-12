import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, CheckCircle, Clock, XCircle, Users, Loader2, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  accepted: { label: 'Active', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, iconColor: 'text-emerald-500' },
  pending:  { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock, iconColor: 'text-amber-500' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: XCircle, iconColor: 'text-red-400' },
};

export default function PortalPartnershipsTab({ user }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.OperatorAgentMatch.list();
      // Filter to matches where the current user is the agent (by email or id)
      const mine = user
        ? all.filter(m => m.agent_id === user.id || m.agent_id === user.email || m.MasterAgentID === user.id)
        : all;
      setMatches(mine);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const active = matches.filter(m => m.status === 'accepted');
  const pending = matches.filter(m => m.status === 'pending');
  const declined = matches.filter(m => m.status === 'declined');

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Partners', count: active.length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Pending Invites', count: pending.length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Declined', count: declined.length, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
        ].map(s => (
          <Card key={s.label} className={`border ${s.bg}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm">All Partnerships ({matches.length})</h3>
        <Button variant="outline" size="sm" onClick={load} className="flex items-center gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {matches.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-500 mb-1">No Partnerships Yet</p>
            <p className="text-sm text-slate-400">Use the Invite Operators tab to start building your network.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((m, i) => {
            const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <Card key={i} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Operator ID: {m.operator_id}</p>
                      {m.brokerage_name && <p className="text-xs text-slate-500">{m.brokerage_name}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${cfg.color}`}>
                          <Icon className={`w-3 h-3 mr-1 inline ${cfg.iconColor}`} />{cfg.label}
                        </Badge>
                        {m.match_score && (
                          <span className="text-xs text-slate-400">Match score: {m.match_score}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.status === 'accepted' && (
                      <Button size="sm" variant="outline" className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50">
                        View Details
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}