// PropStream RE Listings → Facebook / Meta Custom Audience CSV Export
// Multi-email + multi-phone columns included
// Maps PropstreamREListing entity fields to Facebook's expected CSV format

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

function isTruthy(value) {
  if (!value) return false;
  const v = String(value).trim().toLowerCase();
  return ['yes', 'true', '1', 'y', 'x'].includes(v);
}

function getYearsOwned(lastSaleDate) {
  if (!lastSaleDate) return 0;
  const date = new Date(lastSaleDate);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return diff / (1000 * 60 * 60 * 24 * 365);
}

function calculateValue(listing) {
  let score = 10;

  const equity = listing.equity_estimate || 0;
  const propertyValue = listing.estimated_value || 0;
  const ltv = listing.estimated_ltv || 0;
  const yearBuilt = listing.year_built || 0;
  const marketingLists = (listing.marketing_lists || '').toLowerCase();
  const propertyStatus = (listing.property_status || '').toLowerCase();
  const propertyType = (listing.property_type || '').toLowerCase();
  const deceased = listing.deceased_owner;

  // Life events
  if (deceased || listing.probate_indicator) score += 30;
  if (listing.senior_owner_indicator) score += 15;
  if (listing.absentee_owner) score += 15;
  if (listing.vacant) score += 20;

  if (listing.divorce_date) score += 20;
  if (listing.prefc_recording_date) score += 25;
  if (listing.prefc_auction_date) score += 30;
  if (listing.bk_date) score += 15;

  if (listing.lien_type || (listing.lien_amount && parseMoney(listing.lien_amount) > 0)) score += 10;

  if (propertyStatus.includes('vacant')) score += 20;

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

  // Years owned
  const yearsOwned = getYearsOwned(listing.last_sale_date);
  if (yearsOwned >= 25) score += 30;
  else if (yearsOwned >= 20) score += 25;
  else if (yearsOwned >= 15) score += 20;
  else if (yearsOwned >= 10) score += 10;

  if (yearBuilt && yearBuilt <= 1975) score += 10;

  if (listing.owner_occupied) score += 5;

  if (/single|residential|condo|town/.test(propertyType)) score += 5;

  return Math.min(score, 100);
}

function getSegment(listing) {
  const marketingLists = (listing.marketing_lists || '').toLowerCase();
  const propertyStatus = (listing.property_status || '').toLowerCase();

  if (listing.deceased_owner || listing.probate_indicator || marketingLists.includes('probate')) {
    return 'Probate / Estate Sale Candidate';
  }
  if (listing.prefc_recording_date || listing.prefc_auction_date) return 'Pre-Foreclosure';
  if (listing.divorce_date) return 'Divorce / Life Event';
  if (listing.bk_date) return 'Bankruptcy';
  if (listing.lien_type || (listing.lien_amount && parseMoney(listing.lien_amount) > 0)) return 'Lien / Distress';
  if (propertyStatus.includes('vacant')) return 'Vacant Property';
  if (listing.absentee_owner) return 'Absentee Owner';
  if ((listing.equity_estimate || 0) >= 250000) return 'High Equity Owner';
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

export function exportREListingsToFacebookAudienceCSV(listings = []) {
  const headers = [
    'email', 'email2', 'email3', 'email4',
    'phone', 'phone2', 'phone3', 'phone4', 'phone5',
    'fn', 'ln', 'ct', 'st', 'zip', 'country',
    'external_id', 'value', 'segment'
  ];

  const allRows = [];

  listings.forEach((listing) => {
    const emails = [
      listing.email_1,
      listing.email_2,
      listing.email_3,
      listing.email_4
    ].map(cleanEmail);

    const phones = [
      listing.phone_1,
      listing.phone_2,
      listing.phone_3,
      listing.phone_4,
      listing.phone_5
    ].map(cleanPhone);

    const fn = cleanName(listing.owner_1_first_name);
    const ln = cleanName(listing.owner_1_last_name);
    const ct = cleanText(listing.owner_mailing_city || listing.city);
    const st = cleanText(listing.owner_mailing_state || listing.state);
    const zip = cleanZip(listing.owner_mailing_zip || listing.zip);

    const externalId = cleanText(listing.apn) || cleanText(listing.propstream_property_id) || listing.id.slice(0, 12);

    const value = calculateValue(listing);
    const segment = getSegment(listing);

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
  link.download = `facebook_custom_audience_re_listings_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}