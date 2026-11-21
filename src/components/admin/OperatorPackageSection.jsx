import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Admin plan control on the user edit form. Shows the operator's current tier
 * and status (so the form reflects what they actually have) and lets an admin
 * assign a package directly — it activates on save, bypassing checkout.
 */
export default function OperatorPackageSection({ packages = [], formData, setFormData, accountTypes = [] }) {
  const assignedPackage = packages.find(p => p.id === formData.selected_package);

  const handleAssign = (value) => {
    const pkg = packages.find(p => p.id === value);
    if (!pkg) return;
    const alignedAccountType = accountTypes.some(t => t.value === pkg.account_type)
      ? pkg.account_type
      : formData.primary_account_type;
    setFormData(prev => ({
      ...prev,
      selected_package: pkg.id,
      subscription_tier: pkg.tier_level,
      subscription_status: 'active',
      primary_account_type: alignedAccountType,
    }));
  };

  return (
    <div className="rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Plan &amp; Package</h3>
          <p className="text-xs text-slate-500">
            Assigning a package activates it for this user right away — no checkout.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Current plan</p>
          <p className="text-sm font-semibold text-slate-800 capitalize">{formData.subscription_tier || 'No plan'}</p>
          <p className="text-xs text-slate-500 capitalize">{formData.subscription_status || '—'}</p>
        </div>
      </div>

      <Select value={formData.selected_package || ''} onValueChange={handleAssign}>
        <SelectTrigger>
          <SelectValue placeholder="Assign a package" />
        </SelectTrigger>
        <SelectContent>
          {packages.map(pkg => (
            <SelectItem key={pkg.id} value={pkg.id}>
              {pkg.package_name} — {(pkg.account_type || '').replace(/_/g, ' ')} — ${pkg.monthly_price || 0}/mo
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {assignedPackage && (
        <p className="text-xs text-emerald-700">
          {assignedPackage.package_name} will be active for this user when you save.
        </p>
      )}
    </div>
  );
}