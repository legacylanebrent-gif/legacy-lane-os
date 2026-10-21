// Chapter 7 P2 — MY BUYERS (operator audience view).
// A VIEW over the buyer data that already exists — no new buyer database, no
// CRM. The audience is bounded to buyers with a relationship to THIS operator
// (their sales, offers, check-ins, purchases, VIP events, follows), and the
// consent/interest flags come from the buyerAudience safe projection.
// EXPLICIT interests and OBSERVED behavior stay visibly distinct, and
// attendance/purchase/offer/sign-in never create consent.
import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BuyerDetailDrawer from '@/components/buyers/BuyerDetailDrawer';
import BuyerMatchPanel from '@/components/buyers/BuyerMatchPanel';
import { Loader2, Mail, MessageSquare, Ban, Crown, Users, Star } from 'lucide-react';

const FILTERS = [
  { key: 'all', label: 'Everyone' },
  { key: 'vip', label: 'VIP' },
  { key: 'email', label: 'Email eligible' },
  { key: 'sms', label: 'SMS eligible' },
  { key: 'follower', label: 'Followers' },
  { key: 'interest', label: 'Declared an interest' },
  { key: 'attendee', label: 'Recent attendees' },
  { key: 'purchaser', label: 'Purchasers' },
  { key: 'no_consent', label: 'No marketing consent' },
];

const RECENT_DAYS = 90;

export default function BuyerAudience() {
  const [loading, setLoading] = useState(true);
  const [buyers, setBuyers] = useState([]);
  const [totals, setTotals] = useState(null);
  const [filter, setFilter] = useState('all');
  const [interest, setInterest] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.functions.invoke('buyerAudience', { action: 'list' })
      .then((res) => { setBuyers(res.data.buyers || []); setTotals(res.data.totals || null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const interestOptions = useMemo(() => {
    const s = new Set();
    buyers.forEach(b => (b.explicit_interests || []).forEach(i => s.add(i.toLowerCase())));
    return [...s].sort();
  }, [buyers]);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - RECENT_DAYS * 24 * 3600 * 1000;
    return buyers.filter(b => {
      const o = b.observed || {};
      switch (filter) {
        case 'vip': return b.vip;
        case 'email': return b.email_ok;
        case 'sms': return b.sms_ok;
        case 'follower': return b.follower;
        case 'interest': return (b.explicit_interests || []).length > 0;
        case 'attendee': return (o.check_ins || 0) + (o.sign_ins || 0) > 0 && (!b.last_activity || new Date(b.last_activity).getTime() >= cutoff);
        case 'purchaser': return (o.purchases || 0) > 0;
        case 'no_consent': return !b.email_ok && !b.sms_ok;
        default: return true;
      }
    }).filter(b => !interest || (b.explicit_interests || []).some(i => i.toLowerCase().includes(interest)));
  }, [buyers, filter, interest]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Users className="w-6 h-6 text-cyan-700" />
        <h1 className="text-2xl font-heading font-bold text-slate-900">My Buyers</h1>
      </div>
      <p className="text-slate-600 mb-5">
        Everyone who has connected with your sales and events — sign-ins, check-ins, offers, purchases, VIP events
        and follows. Eligibility shows only what each buyer opted into; activity never counts as consent.
      </p>

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
          <SummaryCard label="Audience" value={totals.audience} />
          <SummaryCard label="Email eligible" value={totals.email_eligible} />
          <SummaryCard label="SMS eligible" value={totals.sms_eligible} />
          <SummaryCard label="Known interests" value={totals.interests_known} />
          <SummaryCard label="Repeat attendees" value={totals.repeat_attendees} />
          <SummaryCard label="Purchasers" value={totals.purchasers} />
          <SummaryCard label="VIP guests" value={totals.vip} />
          <SummaryCard label="Followers" value={totals.followers} />
        </div>
      )}

      <BuyerMatchPanel />

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${filter === f.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
            {f.label}
          </button>
        ))}
        {interestOptions.length > 0 && (
          <select value={interest} onChange={(e) => setInterest(e.target.value)}
            className="px-3 py-1.5 rounded-full text-sm border border-slate-200 bg-white text-slate-600">
            <option value="">Any interest</option>
            {interestOptions.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        )}
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>
        : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
            No buyers match this view yet. Your audience grows as buyers sign in, check in, offer and purchase at your sales.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 font-semibold">Buyer</th>
                  <th className="px-3 py-2.5 font-semibold">Eligibility</th>
                  <th className="px-3 py-2.5 font-semibold">Interests</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Attended</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Offers</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Purchases</th>
                  <th className="px-3 py-2.5 font-semibold">Last activity</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.key} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{b.display_name || 'Buyer'}</div>
                      <div className="text-xs text-slate-500">{b.email || ''}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {b.email_ok
                          ? <Badge className="bg-green-100 text-green-800 border-green-200 text-[11px]"><Mail className="w-3 h-3 mr-0.5" />Email OK</Badge>
                          : null}
                        {b.sms_ok
                          ? <Badge className="bg-green-100 text-green-800 border-green-200 text-[11px]"><MessageSquare className="w-3 h-3 mr-0.5" />SMS OK</Badge>
                          : null}
                        {!b.email_ok && !b.sms_ok && <Badge variant="outline" className="text-slate-400 text-[11px]"><Ban className="w-3 h-3 mr-0.5" />No marketing consent</Badge>}
                        {b.vip && <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[11px]">VIP</Badge>}
                        {b.email_ok && b.consent && b.consent.email && b.consent.email.source && (
                          <span className="text-[10px] text-slate-400">opt-in: {b.consent.email.source}{b.identity_note ? ' · ' + b.identity_note : ''}</span>
                        )}
                        {!b.email_ok && b.identity_note && <span className="text-[10px] text-slate-400">{b.identity_note}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      {(b.explicit_interests || []).length
                        ? <div className="flex flex-wrap gap-1">{b.explicit_interests.slice(0, 3).map((i, k) => <Badge key={k} variant="secondary" className="text-[11px]"><Star className="w-3 h-3 mr-0.5" />{i}</Badge>)}</div>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-700">{(b.observed || {}).sales_attended}</td>
                    <td className="px-3 py-2.5 text-center text-slate-700">{(b.observed || {}).offers}</td>
                    <td className="px-3 py-2.5 text-center text-slate-700">{(b.observed || {}).purchases}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{b.last_activity ? new Date(b.last_activity).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2.5">
                      <Button variant="outline" size="sm" onClick={() => setSelected(b)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <BuyerDetailDrawer buyer={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-900">{value ?? 0}</div>
    </div>
  );
}