import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const OPPORTUNITIES = [
  {
    task: 'Manual Agent Outreach',
    occurrences: 214,
    hours: 18.6,
    savings: 17.2,
    priority: 'High',
    agent: 'Listing Agent Outreach SuperAgent',
    impact: '+346 additional outreach opportunities from uncontacted PropStream listings',
  },
  {
    task: 'Manual Lead-to-Estate Sale Company Owner Assignment',
    occurrences: 89,
    hours: 7.4,
    savings: 6.8,
    priority: 'High',
    agent: 'Estate Sale Company Owner Matching SuperAgent',
    impact: '23 agent-submitted opportunities currently unrouted',
  },
  {
    task: 'Manual Content Generation',
    occurrences: 64,
    hours: 12.8,
    savings: 11.5,
    priority: 'High',
    agent: 'SEO Content Agent',
    impact: 'Estimated 48 county pages awaiting content',
  },
  {
    task: 'Manual Follow-Up Emails',
    occurrences: 143,
    hours: 9.5,
    savings: 8.7,
    priority: 'Medium',
    agent: 'Email Follow-Up SuperAgent',
    impact: 'Recover 18–30% of cold leads with automated sequences',
  },
  {
    task: 'Manual Reseller Lead Matching',
    occurrences: 31,
    hours: 2.6,
    savings: 2.4,
    priority: 'Medium',
    agent: 'Reseller Recruitment Agent',
    impact: 'Route 31 unmatched reseller leads automatically',
  },
  {
    task: 'Manual Social Post Creation',
    occurrences: 52,
    hours: 6.2,
    savings: 5.4,
    priority: 'Medium',
    agent: 'Social Media Agent',
    impact: 'Publish territory-specific content 5x per week automatically',
  },
  {
    task: 'Manual Cleanout Vendor Matching',
    occurrences: 12,
    hours: 1.0,
    savings: 0.9,
    priority: 'Low',
    agent: 'Cleanout Routing Agent',
    impact: 'Auto-route 12 unassigned cleanout leads',
  },
];

const PRIORITY_STYLES = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function AutomationOpportunities() {
  const totalHours = OPPORTUNITIES.reduce((a, o) => a + o.savings, 0).toFixed(1);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Automation Opportunity Audit</h3>
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
          <Clock className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-orange-700">{totalHours} hrs/mo recoverable</span>
        </div>
      </div>
      <div className="space-y-3">
        {OPPORTUNITIES.map(o => (
          <div key={o.task} className={`rounded-xl border p-5 ${o.priority === 'High' ? 'border-red-200 bg-red-50/40' : o.priority === 'Medium' ? 'border-yellow-200 bg-yellow-50/30' : 'border-slate-200 bg-white'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${o.priority === 'High' ? 'text-red-500' : o.priority === 'Medium' ? 'text-yellow-500' : 'text-blue-400'}`} />
                <span className="font-bold text-slate-800">{o.task}</span>
                <Badge className={`text-xs border ${PRIORITY_STYLES[o.priority]}`}>{o.priority} Priority</Badge>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold text-slate-800">{o.occurrences}</p>
                  <p className="text-xs text-slate-400">occurrences/mo</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800">{o.hours}h</p>
                  <p className="text-xs text-slate-400">time consumed</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-green-600">{o.savings}h</p>
                  <p className="text-xs text-slate-400">potential savings</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="font-semibold text-slate-700">Activate: {o.agent}</span>
              </div>
              <span className="text-xs text-slate-500 italic">{o.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}