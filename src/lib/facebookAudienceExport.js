// PropStream → Facebook / Meta Custom Audience CSV Export
// Multi-email + multi-phone columns included
// Maps Lead entity fields to Facebook's expected CSV format

function cleanEmail(value) {
  if (!value) return '';
  const email = String(value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function cleanPhone(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return '';
}

function cleanName(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase()
    .replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, '')
    .replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, '');
}

function cleanText(value) {
  if (!value) return '';
  return String(value).trim();
}

function cleanZip(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 5);
}

function parseMoney(value) {
  if (!value) return 0;
  return Number(String(value).replace(/[^0-9.-]/g, '')) || 0;
}

function getYearsOwned(lastSaleDate) {
  if (!lastSaleDate) return 0;
  const date = new Date(lastSaleDate);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return diff / (1000 * 60 * 60 * 24 * 365);
}

function calculateValue(lead) {
  let score = 10;

  const equity = lead.propstream_equity || 0;
  const propertyValue = lead.estimated_value || 0;
  const ltv = (lead.est_loan_to_value || 0) * 100;
  const yearBuilt = lead.propstream_year_built || 0;
  const situation = (lead.situation || '').toLowerCase();
  const propertyType = (lead.propstream_property_type || '').toLowerCase();
  const propertyStatus = (lead.property_status || '').toLowerCase();

  // Life events
  if (situation === 'probate') score += 30;
  if (situation === 'foreclosure') score += 25;
  if (situation === 'divorce') score += 20;

  // Equity
  if (equity >= 500000) score += 30;
  else if (equity >= 250000) score += 20;
  else if (equity >= 100000) score += 10;

  // Property value
  if (propertyValue >= 750000) score += 20;
  else if (propertyValue >= 500000) score += 15;
  else if (propertyValue >= 300000) score += 10;

  // LTV
  if (ltv > 0 && ltv <= 50) score += 15;

  // Property status
  if (propertyStatus.includes('vacant')) score += 20;

  // Years owned
  const yearsOwned = getYearsOwned(lead.propstream_last_sale_date);
  if (yearsOwned >= 25) score += 30;
  else if (yearsOwned >= 20) score += 25;
  else if (yearsOwned >= 15) score += 20;
  else if (yearsOwned >= 10) score += 10;

  // Age of home
  if (yearBuilt && yearBuilt <= 1975) score += 10;

  // Owner occupied
  if (lead.owner_occupied) score += 5;

  // Lien
  if (lead.lien_amount && parseMoney(lead.lien_amount) > 0) score += 10;

  // Property type
  if (/single|residential|condo|town/.test(propertyType)) score += 5;

  return Math.min(score, 100);
}

function getSegment(lead) {
  const situation = (lead.situation || '').toLowerCase();
  const propertyStatus = (lead.property_status || '').toLowerCase();
  const ownerType = (lead.propstream_owner_type || '').toLowerCase();
  const equity = lead.propstream_equity || 0;

  if (situation === 'probate' || ownerType.includes('probate')) return 'Probate / Estate Sale Candidate';
  if (situation === 'foreclosure' || ownerType.includes('foreclosure')) return 'Pre-Foreclosure';
  if (situation === 'divorce' || ownerType.includes('distressed')) return 'Divorce / Life Event';
  if (propertyStatus.includes('vacant')) return 'Vacant Property';
  if (ownerType.includes('absentee')) return 'Absentee Owner';
  if (equity >= 250000) return 'High Equity Owner';
  return 'General Homeowner';
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = [row[0], row[4], row[9], row[10], row[13], row[15]].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function exportToFacebookAudienceCSV(leads = []) {
  const headers = [
    'email', 'email2', 'email3', 'email4',
    'phone', 'phone2', 'phone3', 'phone4', 'phone5',
    'fn', 'ln', 'ct', 'st', 'zip', 'country',
    'external_id', 'value', 'segment'
  ];

  const allRows = [];

  leads.forEach((lead) => {
    const emails = [
      lead.contact_email,
      lead.contact_email_2,
      lead.contact_email_3,
      lead.contact_email_4
    ].map(cleanEmail);

    const phones = [
      lead.contact_phone,
      lead.contact_phone_2,
      lead.contact_phone_3,
      lead.contact_phone_4,
      lead.contact_phone_5
    ].map(cleanPhone);

    const fn = cleanName(lead.contact_name_first);
    const ln = cleanName(lead.contact_name_last);
    const ct = cleanText(lead.mailing_city || lead.property_city);
    const st = cleanText(lead.mailing_state || lead.property_state);
    const zip = cleanZip(lead.mailing_zip || lead.property_zip);

    const externalId = cleanText(lead.property_apn) || cleanText(lead.propstream_id) || lead.id.slice(0, 12);

    const value = calculateValue(lead);
    const segment = getSegment(lead);

    allRows.push([
      emails[0] || '', emails[1] || '', emails[2] || '', emails[3] || '',
      phones[0] || '', phones[1] || '', phones[2] || '', phones[3] || '', phones[4] || '',
      fn, ln, ct, st, zip, 'US',
      externalId, String(value), segment
    ]);
  });

  const dedupedRows = dedupeRows(allRows);

  const csv = [
    headers.join(','),
    ...dedupedRows.map((row) => row.map(csvEscape).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `facebook_custom_audience_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}