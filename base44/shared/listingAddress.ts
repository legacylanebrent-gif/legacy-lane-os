// Address normalization + similarity for Agent Pending Listings matching.
// Deterministic only — no AI here. Unit designations are preserved so different
// units in the same building can never collapse into one match.

const SUFFIXES = {
  street: 'st', str: 'st', st: 'st',
  avenue: 'ave', av: 'ave', ave: 'ave',
  drive: 'dr', dr: 'dr', drv: 'dr',
  road: 'rd', rd: 'rd',
  lane: 'ln', ln: 'ln',
  court: 'ct', ct: 'ct', crt: 'ct',
  circle: 'cir', cir: 'cir', circ: 'cir',
  place: 'pl', pl: 'pl',
  terrace: 'ter', ter: 'ter', terr: 'ter',
  trail: 'trl', trl: 'trl',
  parkway: 'pkwy', pkwy: 'pkwy', pky: 'pkwy',
  highway: 'hwy', hwy: 'hwy',
  boulevard: 'blvd', blvd: 'blvd', blv: 'blvd',
  way: 'way',
  path: 'path',
  square: 'sq', sq: 'sq',
  loop: 'loop',
  crossing: 'xing', xing: 'xing',
  point: 'pt', pt: 'pt',
  cove: 'cv', cv: 'cv',
  bend: 'bnd', bnd: 'bnd',
  pass: 'pass',
  walk: 'walk',
  alley: 'aly', aly: 'aly',
  expressway: 'expy', expy: 'expy',
  freeway: 'fwy', fwy: 'fwy',
  turnpike: 'tpke', tpke: 'tpke',
  pike: 'pike',
  row: 'row',
  glen: 'gln', gln: 'gln',
  heights: 'hts', hts: 'hts',
  view: 'vw', vw: 'vw',
  landing: 'lndg', lndg: 'lndg',
  harbor: 'hbr', hbr: 'hbr',
  springs: 'spg', spg: 'spg',
  creek: 'crk', crk: 'crk',
  meadow: 'mdw', mdw: 'mdw',
  garden: 'gdn', gdn: 'gdn', gardens: 'gdns',
  grove: 'grv', grv: 'grv',
  orchard: 'orch', orch: 'orch',
  estates: 'est', est: 'est',
  village: 'vlg', vlg: 'vlg',
  station: 'sta', sta: 'sta',
  junction: 'jct', jct: 'jct',
  center: 'ctr', ctr: 'ctr', centre: 'ctr',
  park: 'park',
  manor: 'mnr', mnr: 'mnr',
  mills: 'mls', mls: 'mls',
  valley: 'vly', vly: 'vly',
  hills: 'hls', hls: 'hls',
  lake: 'lk', lk: 'lk',
  bay: 'bay',
  beach: 'bch', bch: 'bch',
  island: 'is', is: 'is',
  river: 'riv', riv: 'riv',
  forest: 'frst', frst: 'frst',
  summit: 'smt', smt: 'smt',
  haven: 'hvn', hvn: 'hvn',
  chase: 'chs', chs: 'chs',
  commons: 'cmns', cmns: 'cmns',
  gate: 'gt', gt: 'gt',
};

const DIRECTIONALS = {
  north: 'n', south: 's', east: 'e', west: 'w',
  northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw',
};

const UNIT_WORDS = new Set(['unit', 'apt', 'apartment', 'ste', 'suite', 'no', 'num', 'number', 'bldg', 'building', 'fl', 'floor']);

export function normText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/[^a-z0-9#\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUnit(value) {
  if (value === null || value === undefined) return '';
  const cleaned = String(value).toLowerCase().replace(/[#.:]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(' ').filter((p) => p && !UNIT_WORDS.has(p));
  return parts.join('');
}

// "49 Cherry Tree Farm Road" -> "49 cherry tree farm rd"
// "12 N Main St Apt 4B" -> "12 n main st|4b"
export function normalizeStreet(street, unit) {
  const raw = normText(street);
  if (!raw) return '';
  const unitNorm = normalizeUnit(unit);

  // A unit sometimes rides inside the street line ("12 Main St Apt 4").
  let inlineUnit = '';
  const unitMatch = raw.match(/\b(?:unit|apt|apartment|ste|suite|#)\s*([a-z0-9-]+)\s*$/);
  let streetOnly = raw;
  if (unitMatch) {
    inlineUnit = unitMatch[1];
    streetOnly = raw.slice(0, unitMatch.index).trim();
  }

  const tokens = streetOnly.split(' ').filter(Boolean);
  const out = tokens.map((token, i) => {
    const suffix = SUFFIXES[token];
    // Only convert a suffix word when it is not the first token (e.g. "Street Rd").
    if (suffix && i > 0) return suffix;
    const dir = DIRECTIONALS[token];
    if (dir) return dir;
    return token;
  });

  const base = out.join(' ');
  const finalUnit = unitNorm || inlineUnit;
  return finalUnit ? `${base}|${finalUnit}` : base;
}

export function normalizeZip(zip) {
  if (zip === null || zip === undefined) return '';
  const digits = String(zip).replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.length > 5 ? digits.slice(0, 5) : digits;
}

export function normalizeState(state) {
  const s = normText(state);
  if (!s) return '';
  if (s.length === 2) return s.toUpperCase();
  const map = {
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
    connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
    illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
    maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
    mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
    pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
    tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
    'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
  };
  return map[s] || s.toUpperCase();
}

export function normalizeAddress(input) {
  const street = normalizeStreet(input?.street, input?.unit);
  const city = normText(input?.city);
  const state = normalizeState(input?.state);
  const zip = normalizeZip(input?.zip);
  return {
    street,
    city,
    state,
    zip,
    match_key: [street, city, state, zip].filter(Boolean).join('~'),
  };
}

export function formatAddress(input) {
  const parts = [];
  const street = input?.street || '';
  const unit = input?.unit ? ` #${String(input.unit).replace(/^#/, '')}` : '';
  if (street) parts.push(`${street}${unit}`);
  const cityState = [input?.city, input?.state].filter(Boolean).join(', ');
  if (cityState) parts.push(cityState);
  if (input?.zip) parts.push(normalizeZip(input.zip));
  return parts.join(', ');
}

// Dice coefficient over token sets — cheap, deterministic, order-insensitive.
function dice(a, b) {
  const at = new Set(a.split(' ').filter(Boolean));
  const bt = new Set(b.split(' ').filter(Boolean));
  if (at.size === 0 || bt.size === 0) return 0;
  let shared = 0;
  for (const token of at) if (bt.has(token)) shared += 1;
  return (2 * shared) / (at.size + bt.size);
}

// Street-number agreement is decisive: same street name at a different number is
// a different property, so it can never score into review range.
export function streetNumber(a, b) {
  const m = String(a || '').trim().match(/^(\d+[a-z]?)/);
  return m ? m[1] : '';
}

export function addressSimilarity(subject, candidate) {
  const subj = normalizeAddress(subject);
  const cand = normalizeAddress(candidate);
  const reasons = [];
  let score = 0;

  if (subj.state && cand.state && subj.state !== cand.state) {
    return { score: 0, reasons: ['Different state'], blocked: 'different_state' };
  }
  if (subj.city && cand.city && subj.city !== cand.city) {
    return { score: 0, reasons: ['Different city'], blocked: 'different_city' };
  }

  const subjNum = streetNumber(subj.street);
  const candNum = streetNumber(cand.street);
  if (subjNum && candNum && subjNum !== candNum) {
    return { score: 0, reasons: ['Different street number'], blocked: 'different_street_number' };
  }

  const subjBase = subj.street.split('|')[0];
  const candBase = cand.street.split('|')[0];
  const subjUnit = subj.street.includes('|') ? subj.street.split('|')[1] : '';
  const candUnit = cand.street.includes('|') ? cand.street.split('|')[1] : '';

  // Different explicit units in the same building are never the same property.
  if (subjUnit && candUnit && subjUnit !== candUnit) {
    return { score: 0, reasons: ['Different unit'], blocked: 'different_unit' };
  }

  // Street NAME must genuinely agree. Sharing only a generic suffix (Way, Drive)
  // is a different property, never a review candidate.
  const nameOnly = (value) => value
    .split(' ')
    .filter((t) => t && !/^\d/.test(t) && t !== SUFFIXES[t])
    .join(' ');
  const subjName = nameOnly(subjBase);
  const candName = nameOnly(candBase);
  if (subjName && candName) {
    const nameScore = dice(subjName, candName);
    if (nameScore < 0.7) {
      return { score: 0, reasons: ['Street name differs'], blocked: 'street_name_mismatch' };
    }
  }

  const streetScore = dice(subjBase, candBase);
  score += streetScore * 70;
  if (subjNum && candNum && subjNum === candNum) {
    score += 12;
    reasons.push('Street number matches');
  }
  if (subjBase === candBase) {
    score += 8;
    reasons.push('Normalized street matches exactly');
  }
  if (subjUnit && candUnit && subjUnit === candUnit) {
    score += 8;
    reasons.push('Unit matches');
  } else if (!subjUnit && !candUnit) {
    score += 4;
    reasons.push('Neither record carries a unit');
  } else if (subjUnit && !candUnit) {
    reasons.push('Reference record has no unit recorded');
  }
  if (subj.zip && cand.zip && subj.zip === cand.zip) {
    score += 6;
    reasons.push('ZIP matches');
  } else if (subj.zip && cand.zip && subj.zip !== cand.zip) {
    score -= 10;
    reasons.push('ZIP differs');
  }
  if (subj.city && cand.city && subj.city === cand.city) {
    score += 4;
    reasons.push('City matches');
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons, blocked: null };
}

export function normalizeParcel(value) {
  if (!value) return '';
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function ownershipTypeFromRecord(record) {
  const name = `${record?.owner_name || ''} ${record?.owner_1_last_name || ''}`.toLowerCase();
  if (!name.trim()) return 'unknown';
  if (/\btrust\b|\btrustee\b|\brevocable\b|\birrevocable\b/.test(name)) return 'trust';
  if (/\bllc\b|\binc\b|\bcorp\b|\bcompany\b|\bco\b|\bltd\b|\btrust co\b|\bbank\b|\bproperties\b/.test(name)) return 'company';
  return 'individual';
}

export function ownerNameFromRecord(record) {
  if (!record) return '';
  if (record.owner_name) return String(record.owner_name).trim();
  const parts = [
    record.owner_1_first_name,
    record.owner_1_last_name,
    record.owner_2_first_name,
    record.owner_2_last_name,
  ].filter(Boolean);
  return parts.join(' ').trim();
}

export function ownerMailingAddressFromRecord(record) {
  if (!record) return '';
  const parts = [];
  if (record.owner_mailing_address) {
    parts.push(record.owner_mailing_unit
      ? `${record.owner_mailing_address} #${record.owner_mailing_unit}`
      : record.owner_mailing_address);
  }
  const cityState = [record.owner_mailing_city, record.owner_mailing_state].filter(Boolean).join(', ');
  if (cityState) parts.push(cityState);
  if (record.owner_mailing_zip) parts.push(String(record.owner_mailing_zip));
  return parts.join(', ');
}