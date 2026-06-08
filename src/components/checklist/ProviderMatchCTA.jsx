import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Home, Trash2, DollarSign } from 'lucide-react';

const PROVIDERS = [
  { icon: Building2, label: 'Estate Sale Company', desc: 'Professional setup, pricing & sale management', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { icon: Home, label: 'Probate Realtor', desc: 'List & sell the inherited home quickly', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { icon: Trash2, label: 'Cleanout Service', desc: 'Full property cleanout after the sale', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  { icon: DollarSign, label: 'Cash Offer', desc: 'Fast all-cash offer on the property as-is', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
];

export default function ProviderMatchCTA({ headline, body, state, county }) {
  const location = county ? `${county}, ${state}` : state || 'your area';

  return (
    <Card className="border-amber-200 shadow-lg">
      <CardContent className="p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {headline || 'Need Help With Any of These Steps?'}
        </h2>
        <p className="text-slate-600 mb-6">
          {body || `We connect families with trusted local professionals in ${location} — estate sale companies, probate realtors, cleanout vendors, and cash buyers.`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {PROVIDERS.map(p => (
            <div key={p.label} className={`rounded-xl border p-4 text-center ${p.bg}`}>
              <p.icon className={`w-6 h-6 mx-auto mb-2 ${p.color}`} />
              <p className="text-xs font-semibold text-slate-800">{p.label}</p>
              <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
        <a href={`/estate-settlement-planner${state ? `?state=${encodeURIComponent(state)}` : ''}`}>
          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base py-3">
            Get Matched With Local Providers →
          </Button>
        </a>
        <p className="text-xs text-center text-slate-400 mt-2">Free matching · No obligation · Available in most states</p>
      </CardContent>
    </Card>
  );
}