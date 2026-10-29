import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldQuestion } from 'lucide-react';
import { MATCH_LABELS, MATCH_STYLES } from './listingApi';

const ICONS = {
  verified: CheckCircle2,
  possible: HelpCircle,
  failed: AlertTriangle,
};

export default function OwnershipBadge({ status, reviewStatus, conflict, compact = false }) {
  const Icon = ICONS[status] || ShieldQuestion;
  const label = MATCH_LABELS[status] || 'Not matched yet';
  const reviewed = reviewStatus === 'confirmed' ? ' · confirmed' : reviewStatus === 'rejected' ? ' · rejected' : '';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${MATCH_STYLES[status] || MATCH_STYLES.unmatched}`}
      title={conflict ? 'Newer reference evidence conflicts with what was verified earlier.' : undefined}
    >
      <Icon className="h-3.5 w-3.5" />
      {compact ? (MATCH_LABELS[status] || 'Not matched') : `${label}${reviewed}`}
      {conflict ? <span className="font-semibold">· conflict</span> : null}
    </span>
  );
}