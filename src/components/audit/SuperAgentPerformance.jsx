import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const AGENTS = [
  { name: 'PropStream Outreach Agent', leads: 387, tasks: 41, emails: 41, responses: 7, conversion: 17, hoursSaved: 14.2, status: 'Needs Improvement' },
  { name: 'Agent Referral Agent', leads: 23, tasks: 23, emails: 23, responses: 5, conversion: 22, hoursSaved: 3.8, status: 'Healthy' },
  { name: 'Estate Sale Company Owner Recruitment Agent', leads: 68, tasks: 12, emails: 12, responses: 4, conversion: 33, hoursSaved: 2.1, status: 'Needs Improvement' },
  { name: 'Reseller Recruitment Agent', leads: 31, tasks: 28, emails: 28, responses: 9, conversion: 32, hoursSaved: 4.7, status: 'Healthy' },
  { name: 'Cleanout Recruitment Agent', leads: 12, tasks: 12, emails: 12, responses: 3, conversion: 25, hoursSaved: 2.0, status: 'Healthy' },
  { name: 'Marketing Agent', leads: 0, tasks: 24, emails: 0, responses: 0, conversion: 0, hoursSaved: 6.0, status: 'Healthy' },
  { name: 'Social Media Agent', leads: 0, tasks: 52, emails: 0, responses: 0, conversion: 0, hoursSaved: 5.4, status: 'Healthy' },
  { name: 'Email Follow-Up Agent', leads: 143, tasks: 0, emails: 0, responses: 0, conversion: 0, hoursSaved: 0, status: 'Inactive' },
  { name: 'Content Agent', leads: 64, tasks: 22, emails: 0, responses: 0, conversion: 0, hoursSaved: 11.5, status: 'Healthy' },
  { name: 'Lead Routing Agent', leads: 89, tasks: 66, emails: 0, responses: 0, conversion: 74, hoursSaved: 6.8, status: 'Healthy' },
];

const STATUS_CONFIG = {
  Healthy: { icon: CheckCircle, cls: 'text-green-500', badge: 'bg-green-100 text-green-700' },
  'Needs Improvement': { icon: AlertCircle, cls: 'text-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  Inactive: { icon: XCircle, cls: 'text-red-400', badge: 'bg-red-100 text-red-700' },
};

export default function SuperAgentPerformance() {
  const totalSaved = AGENTS.reduce((a, ag) => a + ag.hoursSaved, 0).toFixed(1);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">SuperAgent Performance Dashboard</h3>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm font-bold text-green-700">
          {totalSaved} hrs/mo saved total
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Agent', 'Leads', 'Tasks', 'Emails', 'Responses', 'Conv. %', 'Hrs Saved', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {AGENTS.map(ag => {
              const { icon: Icon, cls, badge } = STATUS_CONFIG[ag.status];
              return (
                <tr key={ag.name} className={`${ag.status === 'Inactive' ? 'bg-red-50/30' : 'hover:bg-slate-50'} transition-colors`}>
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{ag.name}</td>
                  <td className="px-4 py-3 text-slate-600">{ag.leads}</td>
                  <td className="px-4 py-3 text-slate-600">{ag.tasks}</td>
                  <td className="px-4 py-3 text-slate-600">{ag.emails}</td>
                  <td className="px-4 py-3 text-slate-600">{ag.responses}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${ag.conversion >= 25 ? 'text-green-600' : ag.conversion > 0 ? 'text-yellow-600' : 'text-slate-400'}`}>
                      {ag.conversion > 0 ? `${ag.conversion}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">{ag.hoursSaved > 0 ? `${ag.hoursSaved}h` : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs flex items-center gap-1 w-fit ${badge}`}>
                      <Icon className={`w-3 h-3 ${cls}`} />{ag.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}