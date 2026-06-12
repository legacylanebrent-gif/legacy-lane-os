import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader, RefreshCw, AlertTriangle, TrendingUp, Zap, Target } from 'lucide-react';

const STATIC_ITEMS = [
  { type: 'warning', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', text: 'You have 17 unassigned estate sale opportunities.', action: 'Route them now →' },
  { type: 'warning', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', text: 'You have 9 unclaimed Estate Sale Company Owner listings in active territories.', action: 'View listings →' },
  { type: 'opportunity', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', text: 'You have 46 Estate Sale Company Owners receiving leads but not on a free trial.', action: 'Send trial offer →' },
  { type: 'opportunity', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', text: 'You have 8 territories with no reseller coverage.', action: 'View territories →' },
  { type: 'warning', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200', text: 'You have 12 cleanout leads without vendor assignment.', action: 'Assign vendors →' },
  { type: 'high_value', icon: Target, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200', text: 'You have 31 PropStream listings with scores above 75 and no outreach activity.', action: 'Generate emails →' },
];

const AGENT_SUGGESTIONS = [
  { name: 'Estate Sale Company Owner Win-Back Agent', reason: '68 Estate Sale Company Owners have not logged in for 30+ days.', impact: 'Recover 12–18 Estate Sale Company Owners.', potential_mrr: '$2,400' },
  { name: 'Referral Closing Agent', reason: '21 referrals are awaiting closing updates.', impact: 'Increase referral collection rate.', potential_mrr: '$840' },
  { name: 'Agent Territory Recruiter', reason: '11 territories have no preferred agent.', impact: 'Increase lead conversion coverage.', potential_mrr: '$1,650' },
  { name: 'Free Trial Activation Agent', reason: '46 Estate Sale Company Owners have never started a trial despite receiving leads.', impact: 'Convert 20–30% to paid plans.', potential_mrr: '$3,220' },
];

const ACTION_PLANS = {
  '7': `**7-Day Action Plan — Highest ROI Actions**

Day 1–2: Agent Outreach Blitz
• Activate automatic email generation for all PropStream listings with Estate Sale Score ≥ 60
• Target: 346 additional outreach opportunities
• Estimated additional responses: 42–60

Day 3–4: Estate Sale Company Owner Activation
• Send win-back sequence to 68 inactive operators
• Offer 14-day extended trial to 46 operators receiving leads
• Target: 12–18 Estate Sale Company Owner recoveries, 8–12 trial activations

Day 5–6: Territory Coverage
• Identify 8 uncovered reseller territories
• Send reseller recruitment outreach to matching profiles
• Assign cleanout vendors to 12 unrouted leads

Day 7: Audit & Adjustment
• Review agent email response rates
• Re-score low-performing PropStream listings
• Update territory coverage map

**Expected 7-Day Impact:**
+$2,400–$4,200 new MRR potential
+62 outreach conversations opened
12+ operators reactivated`,

  '30': `**30-Day Action Plan — Systematic Growth**

Week 1: Outreach Automation
• Fully automate PropStream agent email pipeline
• Activate operator win-back sequences
• Deploy reseller territory recruitment

Week 2: Lead Funnel Optimization
• Add retargeting pixels to all 4 landing pages
• Build thank-you page sequences for Estate Sale Company Owner claim + reseller
• Activate email follow-up agent for cold leads (7-day + 14-day cadence)

Week 3: Territory Coverage
• Target all 8 uncovered reseller territories
• Recruit cleanout vendors in 5 priority counties
• Activate agent territory recruiter for 11 uncovered areas

Week 4: Conversion Optimization
• A/B test Estate Sale Company Owner trial messaging
• Optimize agent estate sale request form
• Build non-converting lead re-engagement sequence

**Expected 30-Day Impact:**
+$6,000–$12,000 new MRR potential
+180 active outreach conversations
85%+ automation coverage`,

  '90': `**90-Day Growth Plan — Platform Scale**

Month 1: Foundation
• 100% outreach automation on all lead sources
• Full territory coverage in NJ, PA, NY, FL, TX
• Reseller and cleanout networks fully staffed in top 20 markets

Month 2: Conversion Engine
• Multi-touch follow-up sequences for all lead types
• Estate Sale Company Owner onboarding automation (Day 1, 3, 7, 14, 30)
• Agent partnership recruitment in 25 priority territories

Month 3: Revenue Optimization
• Referral commission tracking automation
• Upsell sequences for free/trial operators
• National territory expansion beyond NJ pilot

**Q4 Vision:**
SuperAgents handle 85%+ of repetitive operational work.
You review recommendations and close partnerships.
Platform reaches $25,000+ MRR on automation momentum.`,
};

export default function AICOOReport() {
  const [plan, setPlan] = useState(null);
  const [planKey, setPlanKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [founderStats] = useState({
    hoursSaved: 52.4,
    potentialRevMissed: 8940,
    uncontacted: 58,
    inactiveOperators: 68,
    inactiveAgents: 11,
    untappedTerritories: 8,
    nextAction: 'Contact the 12 Estate Sale Company Owners who claimed listings but never started a trial.',
    nextActionRevImpact: '$1,782 MRR',
    nextActionTime: '43 minutes',
  });

  const generatePlan = async (period) => {
    setLoading(true); setPlanKey(period);
    await new Promise(r => setTimeout(r, 1200));
    setPlan(ACTION_PLANS[period]);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Daily COO Report */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">AI COO Daily Report</h3>
            <p className="text-xs text-slate-400">Today's Optimization Opportunities — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        <div className="space-y-2">
          {STATIC_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${item.bg}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${item.color}`} />
                  <span className="text-slate-800 text-sm">{item.text}</span>
                </div>
                <span className="text-xs font-semibold text-blue-600 whitespace-nowrap cursor-pointer hover:underline">{item.action}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Automations */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="font-bold text-slate-800">Recommended Automations</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { priority: 'High', title: '387 PropStream listings imported this week', detail: 'Only 41 agent emails were generated.', rec: 'Activate automatic draft generation for listings with Estate Sale Score ≥ 60.', impact: '+346 additional outreach opportunities' },
            { priority: 'High', title: '23 agent-submitted opportunities unrouted', detail: 'No Estate Sale Company Owner assignment has been made.', rec: 'Activate automatic Estate Sale Company Owner matching.', impact: '23 additional lead deliveries' },
            { priority: 'Medium', title: 'Email follow-up agent is inactive', detail: '143 leads received no follow-up this month.', rec: 'Activate 7-day and 14-day email sequences.', impact: 'Recover 18–30% of cold leads' },
            { priority: 'Medium', title: '8 territories have no reseller coverage', detail: 'Reseller leads in these territories cannot be matched.', rec: 'Launch reseller recruitment campaign.', impact: 'Coverage for 8 new markets' },
          ].map((r, i) => (
            <div key={i} className={`rounded-xl border p-5 ${r.priority === 'High' ? 'border-red-200 bg-red-50/30' : 'border-yellow-200 bg-yellow-50/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`text-xs ${r.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.priority} Priority</Badge>
              </div>
              <p className="font-bold text-slate-800 text-sm mb-1">{r.title}</p>
              <p className="text-slate-500 text-xs mb-2">{r.detail}</p>
              <p className="text-slate-700 text-xs font-medium mb-2">{r.rec}</p>
              <p className="text-green-700 text-xs font-bold">Expected impact: {r.impact}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SuperAgent Marketplace */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-slate-800">SuperAgent Marketplace — Build Next</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {AGENT_SUGGESTIONS.map(s => (
            <div key={s.name} className="bg-white rounded-xl border border-purple-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-bold text-slate-800">{s.name}</p>
                <Badge className="bg-purple-100 text-purple-700 text-xs whitespace-nowrap">Suggested</Badge>
              </div>
              <p className="text-slate-500 text-xs mb-1"><span className="font-semibold text-slate-600">Reason:</span> {s.reason}</p>
              <p className="text-slate-500 text-xs mb-2"><span className="font-semibold text-slate-600">Impact:</span> {s.impact}</p>
              <p className="text-green-700 text-xs font-bold">Potential MRR: {s.potential_mrr}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Founder Mode */}
      <div className="bg-slate-900 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold">Founder Mode</h3>
            <p className="text-slate-400 text-xs">Your personal ROI dashboard</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Hours Saved This Month', value: `${founderStats.hoursSaved}h`, color: 'text-green-400' },
            { label: 'Potential Revenue Missed', value: `$${founderStats.potentialRevMissed.toLocaleString()}`, color: 'text-red-400' },
            { label: 'Uncontacted Leads', value: founderStats.uncontacted, color: 'text-orange-400' },
            { label: 'Inactive Operators', value: founderStats.inactiveOperators, color: 'text-yellow-400' },
            { label: 'Inactive Agents', value: founderStats.inactiveAgents, color: 'text-yellow-400' },
            { label: 'Untapped Territories', value: founderStats.untappedTerritories, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl p-5">
          <p className="text-orange-300 text-xs font-semibold uppercase tracking-wide mb-2">Most Valuable Next Action</p>
          <p className="text-white font-bold text-base mb-3">{founderStats.nextAction}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Estimated Revenue Impact</p>
              <p className="text-green-400 font-bold">{founderStats.nextActionRevImpact}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Estimated Time</p>
              <p className="text-white font-bold">{founderStats.nextActionTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Action Plan Generator */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-800">AI Generated Action Plan</h3>
        </div>
        <div className="flex flex-wrap gap-3 mb-4">
          {[['7', '7-Day Action Plan'], ['30', '30-Day Action Plan'], ['90', '90-Day Growth Plan']].map(([key, label]) => (
            <Button key={key} onClick={() => generatePlan(key)} disabled={loading && planKey === key}
              className={`${planKey === key && plan ? 'bg-slate-900 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'} border`}
              variant="outline">
              {loading && planKey === key ? <><Loader className="w-4 h-4 animate-spin mr-2" />Generating…</> : label}
            </Button>
          ))}
        </div>
        {plan && (
          <div className="bg-slate-900 rounded-2xl p-6">
            <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">{plan}</pre>
          </div>
        )}
      </div>
    </div>
  );
}