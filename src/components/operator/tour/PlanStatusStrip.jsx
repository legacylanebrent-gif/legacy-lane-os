import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ArrowUpRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIER_LABELS = {
  starter: 'Starter',
  growth: 'Growth',
  professional: 'Professional',
  elite: 'Elite',
  basic: 'Basic',
  pro: 'Pro',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

const cap = (value) => String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);

export function planLabel(user) {
  const tier = user?.subscription_tier;
  if (!tier) return null;
  return TIER_LABELS[tier] || cap(tier);
}

/**
 * Current subscription package with a link to review or upgrade the plan.
 * tone="dark" for the operator hero, tone="light" elsewhere.
 */
export default function PlanStatusStrip({ user, tone = 'light', className }) {
  const label = planLabel(user);
  const status = user?.subscription_status;
  const isTrial = status === 'trial';
  const isActive = status === 'active';
  const dark = tone === 'dark';

  const statusText = isTrial ? 'Trial' : isActive ? 'Active' : label ? cap(status || 'inactive') : 'No plan';

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm',
        dark ? 'border border-white/15 bg-white/5 text-slate-200' : 'border border-slate-200 bg-white text-slate-700',
        className
      )}
    >
      <span className={cn('inline-flex items-center gap-1.5 font-semibold', dark ? 'text-white' : 'text-slate-900')}>
        {isActive ? (
          <BadgeCheck className="w-4 h-4 text-emerald-500" />
        ) : (
          <Sparkles className={cn('w-4 h-4', dark ? 'text-cyan-300' : 'text-cyan-600')} />
        )}
        {label ? `${label} plan` : 'No active plan'}
      </span>

      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          isTrial
            ? 'bg-amber-100 text-amber-800'
            : isActive
              ? 'bg-emerald-100 text-emerald-800'
              : dark
                ? 'bg-white/10 text-slate-300'
                : 'bg-slate-100 text-slate-600'
        )}
      >
        {statusText}
      </span>

      <Link
        to="/OperatorPackages"
        className={cn(
          'ml-auto inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline',
          dark ? 'text-cyan-300 hover:text-cyan-200' : 'text-cyan-700 hover:text-cyan-900'
        )}
      >
        {label ? 'View / upgrade' : 'Choose a plan'}
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}