import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, DollarSign, CheckCircle, Clock, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

const fmtCents = (cents) => cents ? `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function PortalAgreementsTab({ user }) {
  const [agreements, setAgreements] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [masterAgreements, setMasterAgreements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const myId = user?.id || user?.email;
        const [a, c, ma] = await Promise.all([
          base44.entities.ReferralDealAgreement.list(),
          base44.entities.ReferralCommission.list(),
          base44.entities.MasterReferralAgreement.list(),
        ]);
        setAgreements(myId ? a.filter(x => x.agent_id === myId) : a);
        setCommissions(myId ? c.filter(x => x.agent_id === myId) : c);
        setMasterAgreements(myId ? ma.filter(x => x.user_id === myId) : ma);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  );

  const totalEarned = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.actual_referral_fee || 0), 0);
  const totalPending = commissions.filter(c => c.status !== 'paid').reduce((s, c) => s + (c.expected_referral_fee || 0), 0);
  const masterActive = masterAgreements.find(m => m.status === 'active' && m.user_type === 'agent');

  return (
    <div className="space-y-6">

      {/* Master Agreement status banner */}
      <Card className={masterActive ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}>
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {masterActive
              ? <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              : <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            }
            <div>
              <p className={`font-bold text-sm ${masterActive ? 'text-emerald-800' : 'text-amber-800'}`}>
                {masterActive ? 'Master Referral Agreement — Active' : 'No Master Agreement Signed'}
              </p>
              <p className={`text-xs mt-0.5 ${masterActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                {masterActive
                  ? `Signed ${fmtDate(masterActive.signed_timestamp)} as ${masterActive.signed_name}`
                  : 'A master agreement is required before referral commissions can be processed.'
                }
              </p>
            </div>
          </div>
          {!masterActive && (
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
              Sign Agreement
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reward summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-800">{fmtCents(totalEarned)}</p>
              <p className="text-xs text-emerald-700">Total Referral Rewards Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-800">{fmtCents(totalPending)}</p>
              <p className="text-xs text-amber-700">Pending / Estimated Rewards</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Agreements */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" /> Referral Deal Agreements ({agreements.length})
          </h4>
          {agreements.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No deal agreements yet. When referral deals are accepted and documented, they'll appear here.</p>
          ) : (
            <div className="space-y-3">
              {agreements.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{a.property_address}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Referral agent: {a.referral_agent_name} · {a.referral_agent_brokerage}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Accepted: {fmtDate(a.acceptance_timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${a.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'disputed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {a.status}
                    </Badge>
                    {a.contract_url && (
                      <Button size="sm" variant="outline" asChild className="text-xs">
                        <a href={a.contract_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Doc
                        </a>
                      </Button>
                    )}
                    {!a.contract_url && a.contract_generated && (
                      <Badge className="text-xs bg-slate-100 text-slate-600">Doc Pending</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commissions detail */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-500" /> Referral Commission Detail ({commissions.length})
          </h4>
          {commissions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No commission records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left pb-3 font-semibold">Property</th>
                    <th className="text-right pb-3 font-semibold">Est. Referral Fee</th>
                    <th className="text-right pb-3 font-semibold">Actual Fee</th>
                    <th className="text-left pb-3 font-semibold">Closing Date</th>
                    <th className="text-left pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {commissions.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-900 truncate max-w-[180px]">{c.property_address}</td>
                      <td className="py-3 text-right text-slate-600">{fmtCents(c.expected_referral_fee)}</td>
                      <td className="py-3 text-right font-semibold text-slate-900">{fmtCents(c.actual_referral_fee)}</td>
                      <td className="py-3 text-slate-500">{fmtDate(c.closing_date)}</td>
                      <td className="py-3">
                        <Badge className={`text-xs ${c.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : c.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}