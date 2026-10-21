import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Handshake, MapPin, Info, ChevronRight, Trophy } from 'lucide-react';

// Chapter 10 P1 — the SMALLEST useful source-to-revenue + conversion-funnel
// view for one operator, computed from CANONICAL records only:
// SaleConversionPipeline (source, stage, actual_revenue), SaleProposal /
// SaleAgreement (Chapter 9 progression), Contact (referrer names).
// Referral source is SELF-REPORTED (Chapter 2) — it is NOT click attribution.
// UNKNOWN SOURCE is always a visible, distinct category.

const SOURCE_LABELS = {
  real_estate_agent: 'Real Estate Agent',
  attorney: 'Attorney',
  senior_move_manager: 'Senior Move Manager',
  professional_organizer: 'Professional Organizer',
  estate_sale_company: 'Estate Sale Company',
  past_client: 'Past Client',
  buyer_customer: 'Buyer / Customer',
  friend_family: 'Friend / Family',
  online_search: 'Online Search',
  social_media: 'Social Media',
  website: 'Website',
  other: 'Other',
};

const INQUIRY_SOURCE_LABELS = {
  operator_website: 'Operator Website',
  estatesalen_public: 'EstateSalen Public Page',
  estate_transition: 'Estate-Transition Page (SEO)',
  seo: 'SEO',
  manual: 'Manual Entry',
  professional_referral: 'Professional Referral',
  houszu: 'Houszu',
};

const REACHED_CONSULTATION = ['contract_signed', 'setup_in_progress', 'sale_live', 'completed'];

function reachedConsultation(d) {
  return !!d.consultation_date || REACHED_CONSULTATION.includes(d.stage);
}

const money = v => (v == null ? null : '$' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 }));

export default function LeadSourcePerformance() {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const user = await base44.auth.me();
        const [dealRes, propRes, agrRes, contactRes] = await Promise.all([
          base44.entities.SaleConversionPipeline.filter({ operator_id: user.id }, '-created_date'),
          base44.entities.SaleProposal.filter({ operator_id: user.id }, '-created_date'),
          base44.entities.SaleAgreement.filter({ operator_id: user.id }, '-created_date'),
          base44.entities.Contact.filter({}, '-created_date', 200),
        ]);
        setDeals(dealRes || []);
        setProposals(propRes || []);
        setAgreements(agrRes || []);
        setContacts(contactRes || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-slate-200 rounded w-1/3 mb-4" /><div className="h-64 bg-slate-200 rounded" /></div>;
  }

  const proposalDealIds = new Set(proposals.map(p => p.deal_id).filter(Boolean));
  const agreementDealIds = new Set(agreements.map(a => a.deal_id).filter(Boolean));
  const completed = deals.filter(d => d.stage === 'completed');

  const funnel = [
    { label: 'Opportunities (inquiries)', value: deals.length },
    { label: 'Consultations', value: deals.filter(reachedConsultation).length },
    { label: 'Proposals', value: deals.filter(d => proposalDealIds.has(d.id)).length },
    { label: 'Agreements', value: deals.filter(d => agreementDealIds.has(d.id)).length },
    { label: 'Completed Sales', value: completed.length },
  ];
  const totalRevenue = completed.reduce((s, d) => s + (d.actual_revenue || 0), 0);

  const groupBy = (keyFn) => {
    const groups = {};
    deals.forEach(d => {
      const key = keyFn(d) || '__unknown__';
      if (!groups[key]) groups[key] = { key, count: 0, won: 0, revenue: 0 };
      groups[key].count += 1;
      if (d.stage === 'completed') {
        groups[key].won += 1;
        groups[key].revenue += d.actual_revenue || 0;
      }
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  };

  const bySource = groupBy(d => d.referral_source_type);
  const byCity = groupBy(d => d.property_city);

  const contactName = id => {
    const c = contacts.find(c => c.id === id);
    return c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Contact' : 'Linked contact';
  };
  const byReferrer = groupBy(d => d.referral_source_contact_id || d.referral_source_name || null);

  const byInquirySource = groupBy(d => d.inquiry_source_type);

  const sourceLabel = k => k === '__unknown__' ? 'Unknown' : (SOURCE_LABELS[k] || k);
  const inquiryLabel = k => k === '__unknown__' ? 'Unknown' : (INQUIRY_SOURCE_LABELS[k] || k);

  const Th = ({ children }) => <th className="px-3 py-2 text-left font-semibold text-slate-600">{children}</th>;
  const Td = ({ children, className }) => <td className={`px-3 py-2 ${className || ''}`}>{children}</td>;

  const sourceTable = (rows, labelFn, firstColTitle) => (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm bg-white">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide">
          <tr><Th>{firstColTitle}</Th><Th>Opportunities</Th><Th>Won</Th><Th>Company Revenue</Th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className={`border-b border-slate-100 last:border-0 ${r.key === '__unknown__' ? 'bg-amber-50/40' : ''}`}>
              <Td className="font-medium text-slate-800">{labelFn(r.key)}</Td>
              <Td>{r.count}</Td>
              <Td className="text-green-700">{r.won}</Td>
              <Td className="text-green-700 font-semibold">{r.revenue > 0 ? money(r.revenue) : '—'}</Td>
            </tr>
          ))}
          {rows.length === 0 && <tr><Td className="text-slate-400 text-center py-4">No data yet</Td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Where Did My Business Come From?</h1>
          <p className="text-slate-500 text-sm mt-0.5">Source → revenue truth, computed from your canonical records only.</p>
        </div>
        <Button asChild variant="outline" className="gap-2 self-start sm:self-auto">
          <Link to="/SaleConversionPipeline"><ArrowLeft className="w-4 h-4" /> Back to Pipeline</Link>
        </Button>
      </div>

      {/* Honesty banners */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs gap-1.5 py-1.5">
          <Info className="w-3.5 h-3.5" /> Referral source is SELF-REPORTED — it is not click attribution.
        </Badge>
        <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 text-xs gap-1.5 py-1.5">
          <Info className="w-3.5 h-3.5" /> UNKNOWN SOURCE stays its own category — unknown is not "direct".
        </Badge>
      </div>

      {/* Conversion funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-orange-500" /> Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {funnel.map((f, i) => (
              <div key={f.label} className="flex items-center gap-1.5">
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  {f.label} <span className="ml-1 text-orange-600 font-bold">{f.value}</span>
                </div>
                {i < funnel.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-green-600" />
            Company revenue from completed sales: <span className="font-bold text-green-700">{money(totalRevenue)}</span>
            <span className="text-xs text-slate-400">(canonical settlement figure per deal)</span>
          </p>
          <p className="text-xs text-slate-400">Counts derive from real records — proposals/agreements are recognized from their canonical Chapter 9 states, not duplicated manual stages.</p>
        </CardContent>
      </Card>

      {/* By referral source */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Handshake className="w-4 h-4 text-orange-500" /> By Referral Source (self-reported)</CardTitle>
        </CardHeader>
        <CardContent>{sourceTable(bySource, sourceLabel, 'Source')}</CardContent>
      </Card>

      {/* By referrer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Handshake className="w-4 h-4 text-orange-500" /> Referral Partner Outcomes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sourceTable(byReferrer.filter(r => r.key !== '__unknown__'), k => contactName(k) || k, 'Professional / Source')}
          <p className="text-xs text-slate-400">Facts only — no partner scoring. Opportunities without a recorded referrer are not shown here.</p>
        </CardContent>
      </Card>

      {/* By geography */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><MapPin className="w-4 h-4 text-orange-500" /> By City</CardTitle>
        </CardHeader>
        <CardContent>{sourceTable(byCity, k => k === '__unknown__' ? 'Unknown' : k, 'City')}</CardContent>
      </Card>

      {/* By captured inquiry provenance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Info className="w-4 h-4 text-orange-500" /> By Captured Inquiry Source (provenance)</CardTitle>
        </CardHeader>
        <CardContent>
          {sourceTable(byInquirySource, inquiryLabel, 'Inquiry captured via')}
          <p className="text-xs text-slate-400 mt-2">This is WHERE the inquiry was captured (website, estate-transition page, manual…) — technical provenance, distinct from the self-reported referral source above.</p>
        </CardContent>
      </Card>

      {deals.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          No opportunities yet — this report fills in as your pipeline does.
        </div>
      )}
    </div>
  );
}