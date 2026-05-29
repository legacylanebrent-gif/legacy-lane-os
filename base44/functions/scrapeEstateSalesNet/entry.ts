import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_IMAGES_PER_SALE = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeName(name = '') {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/llc|inc|co|company|estate|sales|services|the/g, '');
}

function extractSaleId(url) {
  const match = url.match(/\/(\d+)(?:$|\?)/);
  return match ? match[1] : url;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'EstateSalenBot/1.0 contact: support@estatesalen.com',
      'Accept': 'text/html'
    }
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return await res.text();
}

// ─── Listing Page Parser ────────────────────────────────────────────────────
// Extracts sale links from a search/listing page.
// Matches any state path pattern: /STATE/City/12345

function parseSaleCards(html, baseUrl = 'https://www.estatesales.net') {
  const sales = [];

  // Pattern 1: absolute URLs in href (e.g. https://www.estatesales.net/NJ/Somerset/08873/4924266)
  const absRegex = /href="(https?:\/\/www\.estatesales\.net\/[A-Z]{2}\/[^"\/]+\/\d{4,5}\/(\d{5,10})[^"]*)"/gi;
  let match;
  while ((match = absRegex.exec(html)) !== null) {
    const href = match[1].split('?')[0]; // strip query params
    const saleId = match[2];
    sales.push({ source_url: href, source_sale_id: saleId, title: '' });
  }

  // Pattern 2: relative URLs /STATE/City/ZIP/SaleID
  const relRegex = /href="(\/[A-Z]{2}\/[^"\/]+\/\d{4,5}\/(\d{5,10})[^"]*)"/gi;
  while ((match = relRegex.exec(html)) !== null) {
    const href = (baseUrl + match[1]).split('?')[0];
    const saleId = match[2];
    sales.push({ source_url: href, source_sale_id: saleId, title: '' });
  }

  // Pattern 3: relative URLs /STATE/City/SaleID (no ZIP — older pattern)
  const relNoZipRegex = /href="(\/[A-Z]{2}\/[^"\/]+\/(\d{6,10})[^"]*)"/gi;
  while ((match = relNoZipRegex.exec(html)) !== null) {
    const href = (baseUrl + match[1]).split('?')[0];
    const saleId = match[2];
    sales.push({ source_url: href, source_sale_id: saleId, title: '' });
  }

  // Dedup by source_sale_id, keeping first occurrence
  const seen = new Map();
  for (const s of sales) {
    if (!seen.has(s.source_sale_id)) seen.set(s.source_sale_id, s);
  }
  return [...seen.values()];
}

// ─── Detail Page Parser ─────────────────────────────────────────────────────

function parseDetailPage(html) {
  const clean = html.replace(/\s+/g, ' ');

  // Company name — multiple patterns tried in order
  const companyMatch =
    // "Listed by CompanyName\n" (newline-terminated in rendered text)
    clean.match(/(?:Listed|Conducted|Presented)\s+by\s+([^\n<]{3,80})(?:\n|Last modified|<\/|\.)/i) ||
    // Angular-rendered: span/div containing company name after "Listed by"
    clean.match(/(?:Listed|Conducted|Presented)\s+by\s+<[^>]+>([^<]{3,80})<\//i) ||
    // Fallback: plain text "Listed by X" before period or tag
    clean.match(/(?:Listed|Conducted|Presented)\s+by\s+([^<.]{3,80})(?:[.<])/i) ||
    clean.match(/class="[^"]*company[^"]*"[^>]*>([^<]{3,80})</i);

  // Picture count
  const pictureMatch = clean.match(/(\d+)\s*(?:Pictures?|Photos?|Images?)/i);

  // Dates: look for structured date spans or human-readable ranges
  const dateMatch =
    clean.match(/<time[^>]*datetime="([^"]+)"[^>]*>/i) ||
    clean.match(/([A-Z][a-z]{2,8}\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?,?\s*202[5-9])/);

  // Address: street-level if revealed
  const addrMatch =
    clean.match(/\d{2,5}\s+[A-Za-z][^,<]{3,40},\s*[A-Za-z][^,<]{2,25},\s*[A-Z]{2}\s*\d{5}/) ||
    clean.match(/"streetAddress"\s*:\s*"([^"]{5,100})"/i);

  // City/State/ZIP
  const locMatch =
    clean.match(/"addressLocality"\s*:\s*"([^"]+)"[\s\S]{0,80}"addressRegion"\s*:\s*"([A-Z]{2})"/i) ||
    clean.match(/([A-Za-z][A-Za-z\s]{1,25}),\s*([A-Z]{2})\s*(\d{5})/);

  // Images — skip logos/icons, max 5
  const imageUrls = [];
  const imgRegex = /<img[^>]+src="([^"]+)"/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null && imageUrls.length < MAX_IMAGES_PER_SALE) {
    const src = imgMatch[1];
    if (/logo|icon|avatar|placeholder/i.test(src)) continue;
    if (!src.match(/\.(jpg|jpeg|png|webp)|cloudfront|images?\./i)) continue;
    imageUrls.push(src.startsWith('http') ? src : `https://www.estatesales.net${src}`);
  }

  // Sale times from JSON-LD or text
  const saleTimes = [];
  const timeMatches = [...html.matchAll(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi)];
  const todayStr = new Date().toISOString().split('T')[0];

  // Collect upcoming ISO dates from the page for sale_times mapping
  const isoDateMatches = [...html.matchAll(/(\d{4}-\d{2}-\d{2})/g)]
    .map(m => m[1])
    .filter(d => d >= todayStr)
    .sort();

  timeMatches.forEach((tm, i) => {
    saleTimes.push({
      date: isoDateMatches[i] || null,
      start_time: tm[1].toUpperCase().trim(),
      end_time: tm[2].toUpperCase().trim()
    });
  });

  // Parse start/end dates
  let start_date = isoDateMatches[0] || null;
  let end_date = isoDateMatches[isoDateMatches.length - 1] || null;

  if (!start_date && dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed)) {
      start_date = parsed.toISOString().split('T')[0];
      end_date = start_date;
    }
  }

  return {
    operator_name_raw: companyMatch?.[1]?.trim() || null,
    image_count_source: pictureMatch ? parseInt(pictureMatch[1]) : imageUrls.length,
    image_urls_limited: imageUrls,
    sale_times: saleTimes,
    start_date,
    end_date,
    city: locMatch?.[1]?.trim() || null,
    state: locMatch?.[2] || null,
    zip: locMatch?.[3] || null,
    address_full: addrMatch ? (addrMatch[1] || addrMatch[0])?.trim() : null,
    address_partial: [locMatch?.[1], locMatch?.[2], locMatch?.[3]].filter(Boolean).join(', ')
  };
}

// ─── Operator Matching ───────────────────────────────────────────────────────

async function matchOperator(operatorNameRaw, allOperators) {
  if (!operatorNameRaw) return null;
  const normalized = normalizeName(operatorNameRaw);

  return allOperators.find(op => {
    const names = [op.company_name, ...(op.aliases || [])];
    return names.some(name => normalizeName(name) === normalized);
  }) || null;
}

function findPlatformUser(operatorNameRaw, platformUsers) {
  if (!operatorNameRaw) return null;
  const norm = normalizeName(operatorNameRaw);
  return platformUsers.find(u => normalizeName(u.company_name || '') === norm) || null;
}

async function upsertScrapedOperator(base44, operatorNameRaw, territoryId, allOperators) {
  const norm = normalizeName(operatorNameRaw);
  const existing = allOperators.find(o => normalizeName(o.company_name) === norm);

  if (existing) {
    const tids = new Set(existing.territory_ids || []);
    tids.add(territoryId);
    await base44.asServiceRole.entities.ScrapedSaleOperator.update(existing.id, {
      territory_ids: [...tids],
      total_sales_scraped: (existing.total_sales_scraped || 0) + 1,
      last_seen_at: new Date().toISOString()
    });
    existing.territory_ids = [...tids];
    existing.total_sales_scraped = (existing.total_sales_scraped || 0) + 1;
    return existing;
  }

  const newOp = await base44.asServiceRole.entities.ScrapedSaleOperator.create({
    company_name: operatorNameRaw,
    aliases: [],
    territory_ids: [territoryId],
    match_confidence: 'unmatched',
    total_sales_scraped: 1,
    last_seen_at: new Date().toISOString()
  });
  allOperators.push(newOp);
  return newOp;
}

// ─── Notifications ───────────────────────────────────────────────────────────

async function notifyOperator(base44, email, operatorName, sale) {
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: email,
    subject: `We found your estate sale listing — claim it on EstateSalen`,
    body: `Hi ${operatorName},\n\nWe found your upcoming estate sale:\n\n"${sale.title}"\n${sale.address_partial || sale.city + ', ' + sale.state}\nStarts: ${sale.start_date}\n\nClaim and complete your listing on EstateSalen.com to reach more buyers and access our full marketing toolkit.\n\nView source listing: ${sale.source_url}\nClaim on EstateSalen: https://estatesalen.com\n\nThe EstateSalen Team`
  });
}

async function notifyAdminDigest(base44, adminEmail, territory, newSales) {
  if (!newSales.length) return;
  const unmatchedCount = newSales.filter(s => !s.operator_id && !s.platform_operator_user_id).length;
  const matchedCount = newSales.length - unmatchedCount;
  const lines = newSales.slice(0, 10).map(s =>
    `• ${s.operator_name_raw || 'Unknown'} — ${s.address_partial || s.city || ''} (${s.start_date || 'unknown date'}) ${s.source_url}`
  ).join('\n');
  const more = newSales.length > 10 ? `\n...and ${newSales.length - 10} more` : '';
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: adminEmail,
    subject: `[EstateSalen] ${newSales.length} new sales scraped in ${territory.name}`,
    body: `Scrape run complete for territory: ${territory.name}\n\nTotal new: ${newSales.length} | Matched: ${matchedCount} | Unmatched: ${unmatchedCount}\n\nFirst ${Math.min(newSales.length, 10)} new listings:\n${lines}${more}\n\nReview in dashboard:\nhttps://estatesalen.com/ImportedSalesDashboard`
  });
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Use POST' }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const { territory_id } = body;

    // Load territories
    const territories = territory_id
      ? await base44.asServiceRole.entities.ScrapedSaleTerritory.filter({ id: territory_id, is_active: true })
      : await base44.asServiceRole.entities.ScrapedSaleTerritory.filter({ is_active: true });

    if (!territories.length) {
      return Response.json({ error: 'No active territories found' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const runId = `run_${Date.now()}`;

    // Pre-load for matching
    const allOperators = await base44.asServiceRole.entities.ScrapedSaleOperator.list('-created_date', 1000);
    const platformUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    const adminUsers = platformUsers.filter(u => u.role === 'admin');
    const adminEmail = adminUsers[0]?.email || null;

    const allResults = [];

    for (const territory of territories) {
      if (!territory.search_urls?.length) {
        allResults.push({ territory: territory.name, skipped: true, reason: 'No search_urls' });
        continue;
      }

      const results = [];
      const errors = [];
      const newUnmatchedSales = [];

      for (const searchUrl of territory.search_urls) {
        try {
          console.log(`[${territory.name}] Fetching listing: ${searchUrl}`);
          const listingHtml = await fetchHtml(searchUrl);
          const saleCards = parseSaleCards(listingHtml);
          console.log(`[${territory.name}] Found ${saleCards.length} cards`);

          for (const card of saleCards) {
            try {
              // Always fetch detail page for full data
              console.log(`  Detail: ${card.source_url}`);
              const detailHtml = await fetchHtml(card.source_url);
              const detail = parseDetailPage(detailHtml);

              // Skip past sales
              if (detail.start_date && detail.start_date < todayStr) continue;
              if (detail.end_date && detail.end_date < todayStr) continue;

              // Match operator
              const matchedOp = await matchOperator(detail.operator_name_raw, allOperators);
              const platformUser = findPlatformUser(detail.operator_name_raw, platformUsers);

              const operatorId = matchedOp?.id || null;
              const platformUserId = matchedOp?.platform_user_id || platformUser?.id || null;
              const isMatched = !!(operatorId || platformUserId);

              // Dedup check
              const existing = await base44.asServiceRole.entities.ImportedSale.filter({
                source: 'estatesales_net',
                source_sale_id: card.source_sale_id
              });

              const payload = {
                source: 'estatesales_net',
                source_url: card.source_url,
                source_sale_id: card.source_sale_id,
                title: card.title,
                operator_name_raw: detail.operator_name_raw,
                operator_id: operatorId,
                platform_operator_user_id: platformUserId,
                status: isMatched ? 'matched' : 'imported',
                city: detail.city,
                state: detail.state || territory.state,
                zip: detail.zip,
                address_partial: detail.address_partial,
                address_full: detail.address_full || null,
                start_date: detail.start_date,
                end_date: detail.end_date,
                sale_times: detail.sale_times,
                image_count_source: detail.image_count_source,
                image_urls_limited: detail.image_urls_limited,
                territory_id: territory.id,
                last_seen_at: new Date().toISOString(),
                scrape_run_id: runId
              };

              const isNew = !existing?.length;

              if (isNew) {
                await base44.asServiceRole.entities.ImportedSale.create(payload);

                // Upsert scraped operator record
                if (detail.operator_name_raw) {
                  await upsertScrapedOperator(base44, detail.operator_name_raw, territory.id, allOperators);
                }

                // Notifications — only on new sales
                if (isMatched) {
                  const opEmail = matchedOp?.email ||
                    platformUsers.find(u => u.id === platformUserId)?.email || null;
                  const opName = matchedOp?.company_name ||
                    platformUsers.find(u => u.id === platformUserId)?.full_name ||
                    detail.operator_name_raw;
                  if (opEmail) {
                    await notifyOperator(base44, opEmail, opName, { ...payload });
                  }
                } else {
                  newUnmatchedSales.push({ ...payload });
                }
              } else {
                // Update existing — refresh images, dates, status
                const prev = existing[0];
                await base44.asServiceRole.entities.ImportedSale.update(prev.id, {
                  last_seen_at: new Date().toISOString(),
                  scrape_run_id: runId,
                  operator_id: operatorId || prev.operator_id,
                  platform_operator_user_id: platformUserId || prev.platform_operator_user_id,
                  status: prev.status === 'imported' && isMatched ? 'matched' : prev.status,
                  image_urls_limited: detail.image_urls_limited.length
                    ? detail.image_urls_limited : prev.image_urls_limited,
                  image_count_source: detail.image_count_source || prev.image_count_source,
                  address_full: detail.address_full || prev.address_full,
                  sale_times: detail.sale_times.length ? detail.sale_times : prev.sale_times
                });
              }

              results.push({ ...payload, is_new: isNew });

            } catch (cardErr) {
              errors.push(`Card ${card.source_sale_id}: ${cardErr.message}`);
              console.error(cardErr);
            }
          }

        } catch (urlErr) {
          errors.push(`${searchUrl}: ${urlErr.message}`);
          console.error(urlErr);
        }
      }

      // Send one digest email per territory (not per sale)
      if (adminEmail && newUnmatchedSales.length) {
        await notifyAdminDigest(base44, adminEmail, territory, newUnmatchedSales);
      }

      // Update territory stats
      await base44.asServiceRole.entities.ScrapedSaleTerritory.update(territory.id, {
        last_scraped_at: new Date().toISOString(),
        last_scrape_count: results.length
      });

      allResults.push({
        territory: territory.name,
        imported_count: results.filter(r => r.is_new).length,
        updated_count: results.filter(r => !r.is_new).length,
        total: results.length,
        errors
      });
    }

    return Response.json({ success: true, run_id: runId, results: allResults });

  } catch (error) {
    console.error('scrapeEstateSalesNet fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});