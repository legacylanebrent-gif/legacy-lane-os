import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, MapPin, Building2, ArrowRight } from 'lucide-react';

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
  if (!(user.location?.lat && user.location?.lng)) missing.push('location coordinates');
  return missing;
}

export default function ProfileCompletionGate({ user, actionLabel = 'create a sale' }) {
  if (isProfileComplete(user)) return null;

  const missing = getMissingFields(user);

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
          {missing.includes('company name') && (
            <li className="flex items-center gap-2 text-sm text-amber-800">
              <Building2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
              Set your <strong className="mx-0.5">Company Name</strong> on the Business tab
            </li>
          )}
          {missing.includes('location coordinates') && (
            <li className="flex items-center gap-2 text-sm text-amber-800">
              <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0" />
              Set your <strong className="mx-0.5">Location</strong> on the Account tab
            </li>
          )}
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