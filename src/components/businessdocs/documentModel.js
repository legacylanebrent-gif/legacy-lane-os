import { base44 } from '@/api/base44Client';

// Chapter 6 P1 — shared vocabulary and helpers for the Business Document Vault.

export const DOC_CATEGORIES = [
  { key: 'FORMATION', label: 'Formation' },
  { key: 'INSURANCE', label: 'Insurance' },
  { key: 'AGREEMENT', label: 'Agreement' },
  { key: 'POLICY', label: 'Policy' },
  { key: 'REGISTRATION', label: 'Registration' },
  { key: 'PERMIT', label: 'Permit' },
  { key: 'CERTIFICATION', label: 'Certification' },
  { key: 'PROFESSIONAL', label: 'Professional' },
  { key: 'OTHER', label: 'Other' },
];

export const DOC_STATUSES = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'REVIEW', label: 'Review' },
  { key: 'ARCHIVED', label: 'Archived' },
];

export const DOC_SCOPES = [
  { key: 'business', label: 'Business' },
  { key: 'sale', label: 'Sale' },
  { key: 'contact', label: 'Contact / Client' },
  { key: 'team_member', label: 'Team Member' },
];

export const categoryLabel = (key) => (DOC_CATEGORIES.find(c => c.key === key) || {}).label || key;
export const statusLabel = (key) => (DOC_STATUSES.find(s => s.key === key) || {}).label || key;
export const scopeLabel = (key) => (DOC_SCOPES.find(s => s.key === key) || {}).label || key;

// Factual expiration math — no legal conclusions, no "never expires".
export const daysUntil = (dateStr) => {
  if (!dateStr) return null; // NO EXPIRATION KNOWN
  const diff = new Date(dateStr + 'T00:00:00Z') - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.round(diff / 86400000);
};

// Tightest current warning window for an ACTIVE document, or null.
export const expiringState = (doc) => {
  if (doc.status !== 'ACTIVE' || !doc.expiration_date) return null;
  const d = daysUntil(doc.expiration_date);
  if (d < 0) return { key: 'expired', label: 'Expired', tone: 'red', days: d };
  if (d <= 7) return { key: '7', label: `Expires in ${d} day${d === 1 ? '' : 's'}`, tone: 'red', days: d };
  if (d <= 30) return { key: '30', label: `Expires in ${d} days`, tone: 'amber', days: d };
  if (d <= 60) return { key: '60', label: `Expires in ${d} days`, tone: 'slate', days: d };
  return null;
};

// Short-lived authorized view of a privately stored file.
export const getSignedUrl = async (fileUri, expiresIn = 300) => {
  const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: expiresIn });
  return res.signed_url;
};

export const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '');