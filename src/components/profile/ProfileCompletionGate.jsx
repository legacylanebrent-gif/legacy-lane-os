import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, MapPin, Building2, Phone, ArrowRight } from 'lucide-react';

// Baseline profile completeness — used for the site-wide "complete your profile" banner.
export function isProfileComplete(user) {
  if (!user) return false;
  const hasCompanyName = !!(user.company_name || '').trim();
  const hasLocation = !!(user.location?.lat && user.location?.lng);
  return hasCompanyName && hasLocation;
}

export function getMissingFields(user) {
  const missing = [];
  if (!user) return ['all'];
  if (!(user.company_name || '').trim()) missing.push('company name');
  if (!(user.location?.lat && user.location?.lng)) missing.push('city + state');
  return missing;
}

// Paid business accounts must have a usable operator profile before starting a sale:
// company name, a contact phone they can be reached on, and their service area.
const BUSINESS_ACCOUNT_TYPES = [
  'estate_sale_operator', 'agent_operator', 'real_estate_agent',
  'vendor', 'reseller', 'collector_dealer', 'investor',
];

export function isBusinessAccount(user) {
  if (!user) return false;
  return BUSINESS_ACCOUNT_TYPES.includes(user.primary_account_type) || user.role === 'admin';
}

export function getSaleCreationMissing(user) {
  if (!user) return ['all'];
  const missing = getMissingFields(user);
  if (isBusinessAccount(user)) {
    if (!(user.phone || user.business_phone || '').trim()) missing.push('contact phone');
    if (!(user.zip_code || user.address_zip || '').trim()) missing.push('ZIP code');
  }
  return missing;
}

export function canCreateSale(user) {
  return getSaleCreationMissing(user).length === 0;
}

const MISSING_ITEMS = {
  'company name': { icon: Building2, label: 'Company Name', where: 'on the Business tab' },
  'contact phone': { icon: Phone, label: 'Contact Phone', where: 'on the Account tab' },
  'city + state': { icon: MapPin, label: 'Area (city + state, no street address needed)', where: 'on the Account tab' },
  'ZIP code': { icon: MapPin, label: 'ZIP Code', where: 'on the Account tab' },
};

export default function ProfileCompletionGate({ user, actionLabel = 'create a sale' }) {
  const missing = getSaleCreationMissing(user);
  if (missing.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 flex flex-col sm:flex-row items-start gap-4">
      <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-amber-900 text-sm mb-1">Complete your profile first</h3>
        <p className="text-sm text-amber-700 mb-3">
          Before you can {actionLabel}, you need to complete:
        </p>
        <ul className="space-y-1.5 mb-4">
          {missing.filter(k => MISSING_ITEMS[k]).map((key) => {
            const { icon: Icon, label, where } = MISSING_ITEMS[key];
            return (
              <li key={key} className="flex items-start gap-2 text-sm text-amber-800">
                <Icon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>Set your <strong className="mx-0.5">{label}</strong> {where}</span>
              </li>
            );
          })}
        </ul>
        <Link
          to="/MyProfile"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Go to My Profile <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}