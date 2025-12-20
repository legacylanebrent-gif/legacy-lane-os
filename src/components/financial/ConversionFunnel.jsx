import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Target, HandshakeIcon, CheckCircle } from 'lucide-react';

export default function ConversionFunnel({ leads, deals }) {
  const qualified = leads.filter(l => l.score >= 60).length;
  const proposals = deals.filter(d => ['proposal', 'negotiation', 'closing'].includes(d.stage)).length;
  const won = deals.filter(d => d.stage === 'won').length;

  const stages = [
    { label: 'Leads', count: leads.length, icon: Users, color: 'bg-blue-100 text-blue-700' },
    { label: 'Qualified', count: qualified, icon: Target, color: 'bg-purple-100 text-purple-700' },
    { label: 'Proposals', count: proposals, icon: HandshakeIcon, color: 'bg-amber-100 text-amber-700' },
    { label: 'Won', count: won, icon: CheckCircle, color: 'bg-green-100 text-green-700' }
  ];

  const maxCount = leads.length || 1;

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const percentage = (stage.count / maxCount) * 100;
        const Icon = stage.icon;

        return (
          <Card key={stage.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stage.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-navy-900">{stage.label}</h4>
                    <p className="text-sm text-slate-500">
                      {stage.count} ({percentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-navy-900">{stage.count}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-gold-600 h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}