import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator } from 'lucide-react';

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// Upgrade proration ESTIMATE. Shows the unused value of the customer's current
// cycle and what they would owe to move to a different package today.
// It never charges, writes or changes a subscription — the admin applies the
// result when the plan is actually changed.
export default function ProrationCalculator({ packages = [] }) {
  const plans = useMemo(
    () => packages.filter(p => p.pricing_model !== 'per_item' && (p.monthly_price > 0 || p.annual_price > 0)),
    [packages]
  );

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [daysUsed, setDaysUsed] = useState('10');

  const from = plans.find(p => p.id === fromId);
  const to = plans.find(p => p.id === toId);

  const daysInCycle = cycle === 'monthly' ? 30 : 365;
  const priceFor = (p) => (cycle === 'monthly' ? (p?.monthly_price || 0) : (p?.annual_price || 0));
  const used = Math.min(Math.max(Number(daysUsed) || 0, 0), daysInCycle);
  const remaining = daysInCycle - used;

  const credit = priceFor(from) * (remaining / daysInCycle);
  const charge = priceFor(to);
  const dueToday = Math.max(0, charge - credit);
  const carryover = Math.max(0, credit - charge);

  const label = (p) => `${p.package_name} — ${cycle === 'monthly' ? money(p.monthly_price) + '/mo' : money(p.annual_price) + '/yr'}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-4 h-4 text-orange-500" />
          Upgrade Proration Calculator
        </CardTitle>
        <p className="text-xs text-slate-500">
          Estimate the unused value of a customer's current plan and what they would owe to switch today. Nothing is charged here.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Current plan</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Choose plan" /></SelectTrigger>
              <SelectContent>
                {plans.map(p => <SelectItem key={p.id} value={p.id}>{label(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">New plan</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue placeholder="Choose plan" /></SelectTrigger>
              <SelectContent>
                {plans.map(p => <SelectItem key={p.id} value={p.id}>{label(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Billing cycle</Label>
            <Select value={cycle} onValueChange={setCycle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                <SelectItem value="annual">Annual (365 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Days already used in cycle</Label>
            <Input
              type="number"
              min="0"
              max={daysInCycle}
              value={daysUsed}
              onChange={(e) => setDaysUsed(e.target.value)}
            />
          </div>
        </div>

        {!from || !to ? (
          <p className="text-sm text-slate-500">Choose a current plan and a new plan to see the estimate.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Unused credit ({remaining} days left)</p>
              <p className="text-lg font-bold text-slate-900">{money(credit)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">New plan charge</p>
              <p className="text-lg font-bold text-slate-900">{money(charge)}</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-xs text-orange-700">{carryover > 0 ? 'Credit carried forward' : 'Due today'}</p>
              <p className="text-lg font-bold text-orange-700">{money(carryover > 0 ? carryover : dueToday)}</p>
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          Estimate only. Proration rules, minimum fees and taxes are yours to apply — this calculator does not charge, refund or change any subscription.
        </p>
      </CardContent>
    </Card>
  );
}