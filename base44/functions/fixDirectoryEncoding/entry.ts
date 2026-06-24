import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Mojibake → correct character map.
// These are the classic UTF-8-bytes-read-as-Windows1252 patterns.
const MOJIBAKE_MAP = [
  // Smart quotes
  ['â€™', "'"],
  ['â€˜', "'"],
  ['â€œ', '"'],
  ['â€\u009D', '"'], // right double quote (0x9D variant)
  ['â€\u009C', '"'], // left double quote (0x9C variant)
  ['â€', '"'],
  ['â€œ', '"'],
  // Dashes
  ['â€"', '—'],  // em dash
  ['â€"', '–'],  // en dash
  ['â€“', '–'],
  ['â€”', '—'],
  // Ellipsis
  ['â€¦', '…'],
  // Bullet
  ['â€¢', '•'],
  // Single char accented letters
  ['Ã©', 'é'],
  ['Ã¨', 'è'],
  ['Ãª', 'ê'],
  ['Ã«', 'ë'],
  ['Ã¡', 'á'],
  ['Ã ', 'à'],
  ['Ã¢', 'â'],
  ['Ã£', 'ã'],
  ['Ã³', 'ó'],
  ['Ã²', 'ò'],
  ['Ã´', 'ô'],
  ['Ãµ', 'õ'],
  ['Ã­', 'í'],
  ['Ã¬', 'ì'],
  ['Ã®', 'î'],
  ['Ã¯', 'ï'],
  ['Ãº', 'ú'],
  ['Ã¹', 'ù'],
  ['Ã»', 'û'],
  ['Ã¼', 'ü'],
  ['Ã±', 'ñ'],
  ['Ã§', 'ç'],
  ['Ã¶', 'ö'],
  ['ÃŸ', 'ß'],
  ['Ã¦', 'æ'],
  ['Ã¸', 'ø'],
  ['Ã¥', 'å'],
  // Capital accented
  ['Ã‰', 'É'],
  ['Ãˆ', 'È'],
  ['Ã', 'Á'],
  ['Ã€', 'À'],
  ['Ã"', 'Â'],
  ['Ã"', 'Ã'],
  ['Ã"', 'Ó'],
  ['Ã"', 'Ò'],
  ['Ã"', 'Ô'],
  ['Ã"', 'Õ'],
  ['Ã', 'Í'],
  ['Ãš', 'Ú'],
  ['Ã™', 'Ù'],
  ['Ãœ', 'Ü'],
  ['Ã‘', 'Ñ'],
  ['Ã‡', 'Ç'],
  ['Ã–', 'Ö'],
  // Degree, copyright, trademark
  ['Â°', '°'],
  ['Â©', '©'],
  ['Â®', '®'],
  ['â„¢', '™'],
  // Stray leading Â (non-breaking space artifact) — only when followed by space or punctuation
  ['Â ', ' '],
  // Tilde
  ['Ã±', 'ñ'],
];

const TEXT_FIELDS = [
  'company_name', 'phone', 'email', 'website', 'owner_name',
  'city', 'state', 'zip_code', 'county',
  'geocoded_address', 'geocoded_city', 'geocoded_county', 'geocoded_zip',
  'facebook', 'instagram', 'about_text', 'notes',
  'profile_url', 'company_id'
];

const ARRAY_FIELDS = [
  'services_offered', 'memberships', 'credentials', 'service_area_cities', 'sources'
];

const TIME_BUDGET_MS = 25000;
const BATCH_SIZE = 200;

function cleanString(str) {
  if (typeof str !== 'string' || !str) return str;
  let out = str;
  for (const [bad, good] of MOJIBAKE_MAP) {
    if (out.includes(bad)) {
      out = out.split(bad).join(good);
    }
  }
  return out;
}

function hasMojibake(str) {
  if (typeof str !== 'string' || !str) return false;
  for (const [bad] of MOJIBAKE_MAP) {
    if (str.includes(bad)) return true;
  }
  return false;
}

function cleanRecord(rec) {
  const updates = {};
  let changed = false;
  for (const f of TEXT_FIELDS) {
    const val = rec[f];
    if (typeof val === 'string' && hasMojibake(val)) {
      const cleaned = cleanString(val);
      if (cleaned !== val) {
        updates[f] = cleaned;
        changed = true;
      }
    }
  }
  for (const f of ARRAY_FIELDS) {
    const arr = rec[f];
    if (Array.isArray(arr) && arr.some(x => hasMojibake(x))) {
      const cleaned = arr.map(x => (typeof x === 'string' ? cleanString(x) : x));
      updates[f] = cleaned;
      changed = true;
    }
  }
  return changed ? updates : null;
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { /* no user */ }
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const cursor = body.cursor || { skip: 0, scanned: 0, fixed: 0, updated: 0 };

    const master = base44.asServiceRole.entities.MasterOperatorDirectory;

    while (Date.now() - startedAt < TIME_BUDGET_MS) {
      const batch = await master.list('-created_date', BATCH_SIZE, cursor.skip);
      if (batch.length === 0) {
        return Response.json({ done: true, cursor });
      }

      const toUpdate = [];
      for (const rec of batch) {
        const updates = cleanRecord(rec);
        if (updates) {
          toUpdate.push({ id: rec.id, ...updates });
          cursor.fixed += 1;
        }
      }
      cursor.scanned += batch.length;

      if (toUpdate.length > 0) {
        // bulkUpdate in sub-chunks of 100 to stay safe
        for (let i = 0; i < toUpdate.length; i += 100) {
          const chunk = toUpdate.slice(i, i + 100);
          try {
            await master.bulkUpdate(chunk);
            cursor.updated += chunk.length;
          } catch (e) {
            console.error('bulkUpdate error:', e.message);
          }
        }
      }

      cursor.skip += batch.length;
      if (batch.length < BATCH_SIZE) {
        return Response.json({ done: true, cursor });
      }
    }

    return Response.json({ done: false, cursor });
  } catch (error) {
    console.error('fixDirectoryEncoding error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});