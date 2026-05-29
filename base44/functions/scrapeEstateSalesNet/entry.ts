import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * scrapeEstateSalesNet
 *
 * Stage 1 scraper: fetches upcoming sale listings from EstateSales.net for
 * one or all active ScrapedSaleTerritory records.
 *
 * Payload (all optional):
 *   { territory_id }  — scrape a single territory only
 *   {}                — scrape all active territories
 *
 * What it does per territory:
 *   1. Fetches each search_url (EstateSales.net listing pages)
 *   2. Parses sale cards from the HTML
 *   3. Filters to upcoming sales only (start_date >= today)
 *   4. Upserts ImportedSale records (dedup on source_sale_id)
 *   5. Tries to match operator names → ScrapedSaleOperator → platform User
 *   6. Updates territory last_scraped_at + last_scrape_count
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { territory_id } = body;

    const territories = territory_id
      ? await base44.asServiceRole.entities.ScrapedSaleTerritory.filter({ id: territory_id, is_active: true })
      : await base44.asServiceRole.entities.ScrapedSaleTerritory.filter({ is_active: true });

    if (!territories.length) {
      return Response.json({ message: 'No active territories found', scraped: 0 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const runId = `run_${Date.now()}`;

    // Load existing operators once for matching
    const allOperators = await base44.asServiceRole.entities.ScrapedSaleOperator.list('-created_date', 500);
    // Load platform users (operators) for linking
    const platformUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);

    const results = [];

    for (const territory of territories) {
      if (!territory.search_urls?.length) {
        results.push({ territory: territory.name, skipped: true, reason: 'No search_urls configured' });
        continue;
      }

      let territoryNewCount = 0;
      let territoryUpdateCount = 0;
      const errors = [];

      for (const searchUrl of territory.search_urls) {
        try {
          // Fetch the listing page
          const html = await fetchPage(searchUrl);
          if (!html) { errors.push(`Failed to fetch: ${searchUrl}`); continue; }

          // Parse sale cards from HTML
          const saleCards = parseSaleCards(html, searchUrl);

          for (const card of saleCards) {
            // Skip past sales
            if (card.start_date && card.start_date < todayStr) continue;
            if (card.end_date && card.end_date < todayStr) continue;

            // Dedup check
            const existing = await base44.asServiceRole.entities.ImportedSale.filter({
              source_sale_id: card.source_sale_id,
              source: 'estatesales_net'
            });

            // Match operator
            const { operatorId, platformUserId } = matchOperator(
              card.operator_name_raw,
              allOperators,
              platformUsers
            );

            const saleData = {
              source: 'estatesales_net',
              source_url: card.source_url,
              source_sale_id: card.source_sale_id,
              title: card.title,
              operator_name_raw: card.operator_name_raw,
              operator_id: operatorId || null,
              platform_operator_user_id: platformUserId || null,
              status: operatorId ? 'matched' : 'imported',
              city: card.city,
              state: card.state || territory.state,
              zip: card.zip,
              address_partial: card.address_partial,
              address_full: card.address_full || null,
              start_date: card.start_date,
              end_date: card.end_date,
              sale_times: card.sale_times || [],
              image_urls_limited: card.image_urls_limited || [],
              image_count_source: card.image_count_source || 0,
              categories: card.categories || [],
              description_snippet: card.description_snippet || null,
              territory_id: territory.id,
              last_seen_at: new Date().toISOString(),
              scrape_run_id: runId
            };

            if (existing.length > 0) {
              // Update last_seen_at and any new data
              await base44.asServiceRole.entities.ImportedSale.update(existing[0].id, {
                last_seen_at: new Date().toISOString(),
                scrape_run_id: runId,
                operator_id: operatorId || existing[0].operator_id || null,
                platform_operator_user_id: platformUserId || existing[0].platform_operator_user_id || null,
                status: existing[0].status === 'imported' && operatorId ? 'matched' : existing[0].status,
                image_urls_limited: card.image_urls_limited?.length ? card.image_urls_limited : existing[0].image_urls_limited,
                sale_times: card.sale_times?.length ? card.sale_times : existing[0].sale_times
              });
              territoryUpdateCount++;
            } else {
              await base44.asServiceRole.entities.ImportedSale.create(saleData);
              territoryNewCount++;

              // Upsert operator record
              if (card.operator_name_raw && !operatorId) {
                await upsertOperator(base44, card, territory.id, allOperators);
              }
            }
          }
        } catch (urlErr) {
          errors.push(`Error on ${searchUrl}: ${urlErr.message}`);
          console.error(urlErr);
        }
      }

      // Update territory stats
      await base44.asServiceRole.entities.ScrapedSaleTerritory.update(territory.id, {
        last_scraped_at: new Date().toISOString(),
        last_scrape_count: territoryNewCount + territoryUpdateCount
      });

      results.push({
        territory: territory.name,
        new_sales: territoryNewCount,
        updated_sales: territoryUpdateCount,
        errors
      });
    }

    return Response.json({ success: true, run_id: runId, results });

  } catch (error) {
    console.error('scrapeEstateSalesNet fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── HTML Fetcher ──────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.error('fetchPage error:', e.message);
    return null;
  }
}

// ─── HTML Parser ───────────────────────────────────────────────────────────

function parseSaleCards(html, baseUrl) {
  const sales = [];

  // EstateSales.net sale cards are in <div class="sale-list-item"> or similar
  // We parse using regex since we have no DOM in Deno
  
  // Extract individual sale blocks — try multiple known patterns
  const saleBlocks = extractSaleBlocks(html);

  for (const block of saleBlocks) {
    try {
      const sale = parseSingleCard(block, baseUrl);
      if (sale) sales.push(sale);
    } catch (e) {
      console.log('Card parse error:', e.message);
    }
  }

  return sales;
}

function extractSaleBlocks(html) {
  const blocks = [];
  
  // Pattern 1: article or div with data-sale-id
  const dataSalePattern = /data-sale-id="(\d+)"[^]*?(?=data-sale-id="\d+"|$)/g;
  let m;
  while ((m = dataSalePattern.exec(html)) !== null) {
    blocks.push(m[0]);
  }
  if (blocks.length > 0) return blocks;

  // Pattern 2: sale list item divs
  const divPattern = /<(?:article|div)[^>]*class="[^"]*sale[^"]*"[^>]*>([\s\S]*?)<\/(?:article|div)>/gi;
  while ((m = divPattern.exec(html)) !== null) {
    if (m[0].length > 200) blocks.push(m[0]); // filter tiny fragments
  }
  if (blocks.length > 0) return blocks;

  // Pattern 3: JSON-LD structured data
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      if (Array.isArray(data)) data.forEach(d => blocks.push(JSON.stringify(d)));
      else if (data['@type']) blocks.push(JSON.stringify(data));
    } catch (_) {}
  }

  return blocks;
}

function parseSingleCard(block, baseUrl) {
  // Extract source sale ID
  const saleIdMatch = block.match(/(?:data-sale-id|sale[_-]id|\/sales\/)["=\/]?(\d{4,10})/i);
  if (!saleIdMatch) return null;
  const source_sale_id = saleIdMatch[1];

  // Extract URL
  const urlMatch = block.match(/href="([^"]*\/sales\/[^"]+)"/i) ||
                   block.match(/href="([^"]*sale[^"]{5,80})"/i);
  const source_url = urlMatch
    ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `https://www.estatesales.net${urlMatch[1]}`)
    : `https://www.estatesales.net/sales/${source_sale_id}`;

  // Extract title
  const titleMatch = block.match(/<h[123][^>]*>([^<]{5,120})<\/h[123]>/i) ||
                     block.match(/(?:title|heading)[^>]*>([^<]{5,120})</i) ||
                     block.match(/"name"\s*:\s*"([^"]{5,120})"/i);
  const title = titleMatch ? cleanText(titleMatch[1]) : `Estate Sale #${source_sale_id}`;

  // Extract operator/company name
  const companyMatch = block.match(/(?:company|conducted-by|operator|seller)[^>]*>([^<]{3,80})</i) ||
                       block.match(/<(?:span|p|a)[^>]*class="[^"]*company[^"]*"[^>]*>([^<]{3,80})<\//i) ||
                       block.match(/"organizer"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i);
  const operator_name_raw = companyMatch ? cleanText(companyMatch[1]) : '';

  // Extract location
  const cityStateMatch = block.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})?/) ||
                         block.match(/"addressLocality"\s*:\s*"([^"]+)"/) ;
  const city = cityStateMatch ? cleanText(cityStateMatch[1]) : '';
  const stateFromMatch = cityStateMatch?.[2] || '';
  const zip = cityStateMatch?.[3] || extractZip(block);

  const address_partial = [city, stateFromMatch, zip].filter(Boolean).join(', ');

  // Try to extract full address (sometimes revealed)
  const addrMatch = block.match(/\d{1,5}\s+[A-Za-z][^,<]{3,50},\s*[A-Za-z\s]+,\s*[A-Z]{2}/);
  const address_full = addrMatch ? cleanText(addrMatch[0]) : null;

  // Extract dates
  const { start_date, end_date, sale_times } = extractDates(block);

  // Extract images (up to 3)
  const imgMatches = [...block.matchAll(/src="(https?:\/\/[^"]*(?:jpg|jpeg|png|webp)[^"]*)"/gi)];
  const image_urls_limited = imgMatches.slice(0, 3).map(m => m[1]).filter(u => !u.includes('placeholder'));

  // Image count
  const imgCountMatch = block.match(/(\d+)\s*(?:photos?|images?|pictures?)/i);
  const image_count_source = imgCountMatch ? parseInt(imgCountMatch[1]) : image_urls_limited.length;

  // Categories
  const categories = extractCategories(block);

  // Description
  const descMatch = block.match(/<(?:p|div)[^>]*class="[^"]*desc[^"]*"[^>]*>([^<]{20,500})</i) ||
                    block.match(/"description"\s*:\s*"([^"]{20,500})"/i);
  const description_snippet = descMatch ? cleanText(descMatch[1]).substring(0, 500) : null;

  if (!start_date) return null; // Must have a date to be useful

  return {
    source_sale_id,
    source_url,
    title,
    operator_name_raw,
    city,
    state: stateFromMatch,
    zip,
    address_partial,
    address_full,
    start_date,
    end_date,
    sale_times,
    image_urls_limited,
    image_count_source,
    categories,
    description_snippet
  };
}

function extractDates(block) {
  const sale_times = [];
  let start_date = null;
  let end_date = null;

  // ISO date pattern
  const isoMatches = [...block.matchAll(/(\d{4}-\d{2}-\d{2})/g)];
  const validDates = isoMatches
    .map(m => m[1])
    .filter(d => d >= new Date().toISOString().split('T')[0])
    .sort();

  if (validDates.length > 0) {
    start_date = validDates[0];
    end_date = validDates[validDates.length - 1];
  }

  // Human-readable date fallback: "June 7, 2025"
  if (!start_date) {
    const humanDate = block.match(/([A-Z][a-z]+)\s+(\d{1,2}),?\s+(202[5-9])/);
    if (humanDate) {
      const parsed = new Date(`${humanDate[1]} ${humanDate[2]}, ${humanDate[3]}`);
      if (!isNaN(parsed)) {
        start_date = parsed.toISOString().split('T')[0];
        end_date = start_date;
      }
    }
  }

  // Extract times
  const timeMatches = [...block.matchAll(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(?:–|-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi)];
  if (start_date && timeMatches.length > 0) {
    timeMatches.forEach((tm, i) => {
      const date = new Date(start_date);
      date.setDate(date.getDate() + i);
      sale_times.push({
        date: date.toISOString().split('T')[0],
        start_time: tm[1].toUpperCase().trim(),
        end_time: tm[2].toUpperCase().trim()
      });
    });
  }

  return { start_date, end_date, sale_times };
}

function extractZip(block) {
  const m = block.match(/\b(\d{5})\b/);
  return m ? m[1] : '';
}

function extractCategories(block) {
  const known = [
    'furniture', 'antiques', 'jewelry', 'art', 'collectibles', 'tools',
    'clothing', 'books', 'electronics', 'kitchen', 'linens', 'rugs',
    'glassware', 'china', 'silver', 'coins', 'vintage', 'toys', 'musical'
  ];
  const lower = block.toLowerCase();
  return known.filter(cat => lower.includes(cat));
}

function cleanText(str) {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Operator Matching ─────────────────────────────────────────────────────

function normalizeCompanyName(name) {
  return (name || '').toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(llc|inc|corp|co|estate|sales|services|company)\b/g, '')
    .trim();
}

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

function matchOperator(rawName, allOperators, platformUsers) {
  if (!rawName) return { operatorId: null, platformUserId: null };

  const normalizedRaw = normalizeCompanyName(rawName);

  // Match against ScrapedSaleOperator records
  for (const op of allOperators) {
    const norm = normalizeCompanyName(op.company_name);
    if (norm && normalizedRaw && norm === normalizedRaw) {
      // Also try to link to platform user
      const platformUserId = op.platform_user_id ||
        findPlatformUser(rawName, platformUsers)?.id || null;
      return { operatorId: op.id, platformUserId };
    }
    // Check aliases
    if ((op.aliases || []).some(a => normalizeCompanyName(a) === normalizedRaw)) {
      return { operatorId: op.id, platformUserId: op.platform_user_id || null };
    }
  }

  // Try to match directly against platform users
  const platformUser = findPlatformUser(rawName, platformUsers);
  return { operatorId: null, platformUserId: platformUser?.id || null };
}

function findPlatformUser(rawName, platformUsers) {
  const norm = normalizeCompanyName(rawName);
  return platformUsers.find(u => {
    const cn = normalizeCompanyName(u.company_name);
    return cn && norm && cn === norm;
  }) || null;
}

async function upsertOperator(base44, card, territoryId, allOperators) {
  const norm = normalizeCompanyName(card.operator_name_raw);
  const exists = allOperators.find(o => normalizeCompanyName(o.company_name) === norm);
  if (exists) {
    // Add territory if not present
    const tids = exists.territory_ids || [];
    if (!tids.includes(territoryId)) {
      await base44.asServiceRole.entities.ScrapedSaleOperator.update(exists.id, {
        territory_ids: [...tids, territoryId],
        last_seen_at: new Date().toISOString(),
        total_sales_scraped: (exists.total_sales_scraped || 0) + 1
      });
    }
    allOperators.push({ ...exists }); // prevent re-creation in same run
    return;
  }

  const newOp = await base44.asServiceRole.entities.ScrapedSaleOperator.create({
    company_name: card.operator_name_raw,
    aliases: [],
    territory_ids: [territoryId],
    source_profile_url: null,
    match_confidence: 'unmatched',
    total_sales_scraped: 1,
    last_seen_at: new Date().toISOString()
  });
  allOperators.push(newOp);
}