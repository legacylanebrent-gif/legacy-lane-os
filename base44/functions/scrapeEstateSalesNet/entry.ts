import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_IMAGES_PER_SALE = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeName(name = '') {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/llc|inc|co|company|estate|sales|services|the/g, '');
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EstateSalenBot/1.0; +https://estatesalen.com)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return await res.text();
}

// ─── Listing Page Parser ─────────────────────────────────────────────────────
// Extracts sale detail URLs from an Angular-rendered ZIP listing page.
// The page embeds href links to individual sales in the static HTML shell.

function parseSaleCards(html) {
  const seen = new Map();

  // Match: /STATE/City/ZIP/SaleID or /STATE/City/SaleID (absolute or relative)
  const regex = /href="(?:https?:\/\/www\.estatesales\.net)?(\/[A-Z]{2}\/[^"?\/]+\/(?:\d{4,5}\/)?(\d{5,10}))(?:\?[^"]*)?"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const path = match[1];
    const saleId = match[2];
    // Filter out non-sale links (company profiles, search pages, etc.)
    if (/\/companies\/|\/search\/|\/sign-up|\/contact|\/print/.test(path)) continue;
    const fullUrl = `https://www.estatesales.net${path}`;
    if (!seen.has(saleId)) {
      seen.set(saleId, { source_url: fullUrl, source_sale_id: saleId });
    }
  }

  return [...seen.values()];
}

// ─── Detail Page Parser ──────────────────────────────────────────────────────
// Parses a server-rendered Angular sale detail page.
// Key patterns confirmed from live HTML:
//   - Title:   <h1 ... class="sale-title">TITLE</h1>
//   - Company: <h3 ...>COMPANY NAME</h3>  (first h3 after sale-title section)
//   - Address: href="https://maps.google.com/maps?q=STREET+,+CITY,+STATE,+ZIP"
//   - Pictures: ?picture=XXXXXX links — count them for image count
//   - Thumbnail: first cloudfront image src

function parseDetailPage(html) {
  // ── Title ──────────────────────────────────────────────────────────────────
  const titleMatch = html.match(/class="sale-title"[^>]*>([^<]{3,200})<\/h1>/i) ||
    html.match(/<h1[^>]*>([^<]{3,200})<\/h1>/i);
  const title = titleMatch?.[1]?.trim() || null;

  // ── Company name ──────────────────────────────────────────────────────────
  // Structure: <h3 ...>PC'S Pine Cone and Sons</h3>  (first h3 on the page, inside operator card)
  const companyMatch =
    html.match(/class="[^"]*company[^"]*"[^>]*>([^<]{3,100})<\/[a-z]+>/i) ||
    html.match(/<h3[^>]*>\s*([^<]{3,100})\s*<\/h3>/i);
  const operator_name_raw = companyMatch?.[1]?.trim() || null;

  // ── Address via Google Maps href ───────────────────────────────────────────
  // href="https://maps.google.com/maps?q=2278+Edgewood+Terrace+,+Scotch+Plains,+NJ,+07076"
  const mapsMatch = html.match(/maps\.google\.com\/maps\?q=([^"&]+)/i);
  let address_full = null, city = null, state = null, zip = null, address_partial = null;
  if (mapsMatch) {
    const decoded = decodeURIComponent(mapsMatch[1].replace(/\+/g, ' ')).replace(/\s*,\s*/g, ', ').trim();
    address_full = decoded;
    // Parse: "2278 Edgewood Terrace , Scotch Plains, NJ, 07076"
    const parts = decoded.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      city = parts[parts.length - 3] || null;
      const stateZip = (parts[parts.length - 2] || '') + ' ' + (parts[parts.length - 1] || '');
      const stateMatch = stateZip.match(/([A-Z]{2})/);
      const zipMatch = stateZip.match(/(\d{5})/);
      state = stateMatch?.[1] || null;
      zip = zipMatch?.[1] || null;
    }
    address_partial = [city, state, zip].filter(Boolean).join(', ');
  }

  // ── Picture count & thumbnail ──────────────────────────────────────────────
  // Pictures are linked as ?picture=XXXXXX — count unique picture IDs
  const pictureIds = new Set();
  const picRegex = /\?picture=(\d+)/g;
  let picMatch;
  while ((picMatch = picRegex.exec(html)) !== null) {
    pictureIds.add(picMatch[1]);
  }
  const image_count_source = pictureIds.size;

  // Thumbnail: first cloudfront image (not logo/icon/placeholder)
  const imageUrls = [];
  const imgRegex = /<img[^>]+src="([^"]+)"/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null && imageUrls.length < MAX_IMAGES_PER_SALE) {
    const src = imgMatch[1];
    if (/logo|icon|avatar|placeholder|greyscale|svg/i.test(src)) continue;
    if (!src.match(/cloudfront|estatesales\.net.*\.(jpg|jpeg|png|webp)/i)) continue;
    imageUrls.push(src);
  }

  // ── Sale dates & times ─────────────────────────────────────────────────────
  // Pattern in HTML: <h6 ...>May 29</h6><span ...>8am to 3pm</span>
  const saleTimes = [];
  const dateBlockRegex = /<h6[^>]*>([A-Za-z]+ \d{1,2})<\/h6>[\s\S]{0,200}?<span[^>]*>(\d{1,2}(?::\d{2})?(?:am|pm))\s+to\s+(\d{1,2}(?::\d{2})?(?:am|pm))/gi;
  let dbMatch;
  const currentYear = new Date().getFullYear();
  while ((dbMatch = dateBlockRegex.exec(html)) !== null) {
    const dateStr = dbMatch[1]; // "May 29"
    const parsed = new Date(`${dateStr}, ${currentYear}`);
    const isoDate = !isNaN(parsed) ? parsed.toISOString().split('T')[0] : null;
    saleTimes.push({
      date: isoDate,
      start_time: dbMatch[2].toUpperCase(),
      end_time: dbMatch[3].toUpperCase()
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const futureDates = saleTimes.map(s => s.date).filter(d => d && d >= todayStr).sort();
  const start_date = futureDates[0] || null;
  const end_date = futureDates[futureDates.length - 1] || null;

  // ── Description snippet ────────────────────────────────────────────────────
  const descMatch = html.match(/Description &amp; Details[\s\S]{0,100}?<\/h4>([\s\S]{20,1000}?)(?:View More|<\/section|<app-)/i);
  const description_snippet = descMatch
    ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
    : null;

  return {
    title,
    operator_name_raw,
    address_full,
    address_partial,
    city,
    state,
    zip,
    image_count_source,
    image_urls_limited: imageUrls,
    sale_times: saleTimes,
    start_date,
    end_date,
    description_snippet
  };
}

// ─── Operator Matching ────────────────────────────────────────────────────────

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

// ─── Notifications ────────────────────────────────────────────────────────────

async function notifyOperator(base44, email, operatorName, sale) {
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: email,
    subject: `We found your estate sale listing — claim it on EstateSalen`,
    body: `Hi ${operatorName},\n\nWe found your upcoming estate sale:\n\n"${sale.title}"\n${sale.address_partial || ''}\nStarts: ${sale.start_date}\n\nClaim and complete your listing on EstateSalen.com to reach more buyers and access our full marketing toolkit.\n\nView source listing: ${sale.source_url}\nClaim on EstateSalen: https://estatesalen.com\n\nThe EstateSalen Team`
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

// ─── Main Handler ─────────────────────────────────────────────────────────────

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

    const territories = territory_id
      ? await base44.asServiceRole.entities.ScrapedSaleTerritory.filter({ id: territory_id, is_active: true })
      : await base44.asServiceRole.entities.ScrapedSaleTerritory.filter({ is_active: true });

    if (!territories.length) {
      return Response.json({ error: 'No active territories found' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const runId = `run_${Date.now()}`;

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

      // Collect all unique sale URLs across all search_urls for this territory
      const allSaleCards = new Map();

      for (const searchUrl of territory.search_urls) {
        try {
          console.log(`[${territory.name}] Fetching listing: ${searchUrl}`);
          const listingHtml = await fetchHtml(searchUrl);
          const cards = parseSaleCards(listingHtml);
          console.log(`[${territory.name}] Found ${cards.length} sale links from ${searchUrl}`);
          for (const card of cards) {
            if (!allSaleCards.has(card.source_sale_id)) {
              allSaleCards.set(card.source_sale_id, card);
            }
          }
        } catch (urlErr) {
          errors.push(`${searchUrl}: ${urlErr.message}`);
          console.error(urlErr);
        }
      }

      console.log(`[${territory.name}] Total unique sales to process: ${allSaleCards.size}`);

      for (const card of allSaleCards.values()) {
        try {
          console.log(`  Detail: ${card.source_url}`);
          const detailHtml = await fetchHtml(card.source_url);
          const detail = parseDetailPage(detailHtml);

          // Skip past sales
          if (detail.start_date && detail.start_date < todayStr) continue;
          if (detail.end_date && detail.end_date < todayStr) continue;

          const matchedOp = await matchOperator(detail.operator_name_raw, allOperators);
          const platformUser = findPlatformUser(detail.operator_name_raw, platformUsers);

          const operatorId = matchedOp?.id || null;
          const platformUserId = matchedOp?.platform_user_id || platformUser?.id || null;
          const isMatched = !!(operatorId || platformUserId);

          const existing = await base44.asServiceRole.entities.ImportedSale.filter({
            source: 'estatesales_net',
            source_sale_id: card.source_sale_id
          });

          const payload = {
            source: 'estatesales_net',
            source_url: card.source_url,
            source_sale_id: card.source_sale_id,
            title: detail.title || card.source_sale_id,
            operator_name_raw: detail.operator_name_raw,
            operator_id: operatorId,
            platform_operator_user_id: platformUserId,
            status: isMatched ? 'matched' : 'imported',
            city: detail.city,
            state: detail.state || territory.state,
            zip: detail.zip,
            address_partial: detail.address_partial,
            address_full: detail.address_full || null,
            description_snippet: detail.description_snippet || null,
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

            if (detail.operator_name_raw) {
              await upsertScrapedOperator(base44, detail.operator_name_raw, territory.id, allOperators);
            }

            if (isMatched) {
              const opEmail = matchedOp?.email ||
                platformUsers.find(u => u.id === platformUserId)?.email || null;
              const opName = matchedOp?.company_name ||
                platformUsers.find(u => u.id === platformUserId)?.full_name ||
                detail.operator_name_raw;
              if (opEmail) {
                await notifyOperator(base44, opEmail, opName, payload);
              }
            } else {
              newUnmatchedSales.push(payload);
            }
          } else {
            const prev = existing[0];
            await base44.asServiceRole.entities.ImportedSale.update(prev.id, {
              last_seen_at: new Date().toISOString(),
              scrape_run_id: runId,
              title: detail.title || prev.title,
              operator_name_raw: detail.operator_name_raw || prev.operator_name_raw,
              operator_id: operatorId || prev.operator_id,
              platform_operator_user_id: platformUserId || prev.platform_operator_user_id,
              status: prev.status === 'imported' && isMatched ? 'matched' : prev.status,
              image_urls_limited: detail.image_urls_limited.length ? detail.image_urls_limited : prev.image_urls_limited,
              image_count_source: detail.image_count_source || prev.image_count_source,
              address_full: detail.address_full || prev.address_full,
              description_snippet: detail.description_snippet || prev.description_snippet,
              sale_times: detail.sale_times.length ? detail.sale_times : prev.sale_times
            });
          }

          results.push({ ...payload, is_new: isNew });

        } catch (cardErr) {
          errors.push(`Card ${card.source_sale_id}: ${cardErr.message}`);
          console.error(cardErr);
        }
      }

      // One digest email per territory
      if (adminEmail && newUnmatchedSales.length) {
        await notifyAdminDigest(base44, adminEmail, territory, newUnmatchedSales);
      }

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