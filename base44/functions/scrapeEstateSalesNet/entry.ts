import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * scrapeEstateSalesNet — Stage 2
 *
 * FOR each active territory:
 *   Load search_urls → fetch listing page → extract sale cards
 *   For each card:
 *     - Extract title, URL, company, city, dates, images, address
 *     - Visit detail page ONLY if images < 2 or address missing
 *     - Capture max 5 images
 *     - Match operator by normalized company name (+ aliases)
 *     - Dedupe by source_sale_id
 *     - Save/update ImportedSale
 *     - If NEW sale:
 *         matched operator → notify operator: "We found your sale. Claim it."
 *         no match        → notify admin: "New operator found in territory."
 *
 * Payload: { territory_id? }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { territory_id } = body;

    const territories = territory_id
      ? await base44.asServiceRole.entities.ScrapedSaleTerritory.filter({ id: territory_id, is_active: true })
      : await base44.asServiceRole.entities.ScrapedSaleTerritory.filter({ is_active: true });

    if (!territories.length) {
      return Response.json({ message: 'No active territories found', scraped: 0 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const runId = `run_${Date.now()}`;

    // Pre-load operators and platform users once
    const allOperators = await base44.asServiceRole.entities.ScrapedSaleOperator.list('-created_date', 1000);
    const platformUsers = await base44.asServiceRole.entities.User.list('-created_date', 1000);

    // Admin emails for new-operator notifications
    const adminUsers = platformUsers.filter(u => u.role === 'admin');

    const results = [];

    for (const territory of territories) {
      if (!territory.search_urls?.length) {
        results.push({ territory: territory.name, skipped: true, reason: 'No search_urls' });
        continue;
      }

      let newCount = 0;
      let updatedCount = 0;
      let notifiedOperators = 0;
      let notifiedAdmin = 0;
      const errors = [];

      for (const searchUrl of territory.search_urls) {
        try {
          console.log(`Fetching listing page: ${searchUrl}`);
          const listingHtml = await fetchPage(searchUrl);
          if (!listingHtml) { errors.push(`Failed to fetch: ${searchUrl}`); continue; }

          const saleCards = extractSaleCards(listingHtml);
          console.log(`Found ${saleCards.length} cards on ${searchUrl}`);

          for (const card of saleCards) {
            // Skip past sales
            if (card.start_date && card.start_date < todayStr) continue;
            if (card.end_date && card.end_date < todayStr) continue;

            // --- Visit detail page if we need more data ---
            const needsDetail = !card.address_full ||
                                (card.image_urls_limited.length < 2 && card.image_count_source > 0);

            if (needsDetail && card.source_url) {
              try {
                console.log(`Fetching detail: ${card.source_url}`);
                const detailHtml = await fetchPage(card.source_url);
                if (detailHtml) enrichFromDetail(card, detailHtml);
              } catch (de) {
                console.log('Detail fetch error:', de.message);
              }
            }

            // Ensure max 5 images
            card.image_urls_limited = (card.image_urls_limited || []).slice(0, 5);

            // --- Dedup ---
            const existing = await base44.asServiceRole.entities.ImportedSale.filter({
              source_sale_id: card.source_sale_id,
              source: 'estatesales_net'
            });

            // --- Operator match ---
            const { operatorId, operatorRecord, platformUserId } = matchOperator(
              card.operator_name_raw, allOperators, platformUsers
            );

            const isMatched = !!(operatorId || platformUserId);

            if (existing.length > 0) {
              // Update existing record with any newly discovered data
              const prev = existing[0];
              await base44.asServiceRole.entities.ImportedSale.update(prev.id, {
                last_seen_at: new Date().toISOString(),
                scrape_run_id: runId,
                operator_id: operatorId || prev.operator_id || null,
                platform_operator_user_id: platformUserId || prev.platform_operator_user_id || null,
                status: prev.status === 'imported' && isMatched ? 'matched' : prev.status,
                image_urls_limited: card.image_urls_limited.length > (prev.image_urls_limited?.length || 0)
                  ? card.image_urls_limited : prev.image_urls_limited,
                address_full: card.address_full || prev.address_full || null,
                sale_times: card.sale_times?.length ? card.sale_times : prev.sale_times
              });
              updatedCount++;
            } else {
              // Create new ImportedSale
              const newSale = await base44.asServiceRole.entities.ImportedSale.create({
                source: 'estatesales_net',
                source_url: card.source_url,
                source_sale_id: card.source_sale_id,
                title: card.title,
                operator_name_raw: card.operator_name_raw,
                operator_id: operatorId || null,
                platform_operator_user_id: platformUserId || null,
                status: isMatched ? 'matched' : 'imported',
                city: card.city,
                state: card.state || territory.state,
                zip: card.zip,
                address_partial: card.address_partial,
                address_full: card.address_full || null,
                start_date: card.start_date,
                end_date: card.end_date,
                sale_times: card.sale_times || [],
                image_urls_limited: card.image_urls_limited,
                image_count_source: card.image_count_source || 0,
                categories: card.categories || [],
                description_snippet: card.description_snippet || null,
                territory_id: territory.id,
                last_seen_at: new Date().toISOString(),
                scrape_run_id: runId
              });
              newCount++;

              // Upsert ScrapedSaleOperator
              if (card.operator_name_raw) {
                await upsertOperator(base44, card, territory.id, allOperators);
              }

              // --- Notifications ---
              const saleLink = `https://estatesalen.com/ImportedSalesDashboard`;
              const claimLink = card.source_url;

              if (isMatched && (operatorRecord?.email || platformUserId)) {
                // Notify the matched operator
                const opEmail = operatorRecord?.email || null;
                const platformUser = platformUsers.find(u => u.id === platformUserId);
                const emailTo = opEmail || platformUser?.email;
                const opName = operatorRecord?.company_name || platformUser?.full_name || card.operator_name_raw;

                if (emailTo) {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to: emailTo,
                    subject: `We found your estate sale listing — claim it on EstateSalen`,
                    body: `Hi ${opName},\n\nWe found your upcoming estate sale on EstateSales.net:\n\n"${card.title}"\n${card.city}, ${card.state || territory.state} · ${card.start_date}\n\nClaim and complete your listing on EstateSalen.com to reach more buyers, manage your sale, and access our full marketing toolkit.\n\nView your sale: ${claimLink}\nClaim on EstateSalen: https://estatesalen.com\n\nThe EstateSalen Team`
                  });
                  notifiedOperators++;
                }
              } else {
                // Notify admin: new unmatched operator in territory
                const adminEmail = adminUsers[0]?.email;
                if (adminEmail) {
                  await base44.asServiceRole.integrations.Core.SendEmail({
                    to: adminEmail,
                    subject: `New operator found in ${territory.name}`,
                    body: `A new estate sale was scraped in the ${territory.name} territory with an unrecognized operator:\n\nCompany: ${card.operator_name_raw || 'Unknown'}\nSale: ${card.title}\nLocation: ${card.city}, ${card.state || territory.state}\nStart: ${card.start_date}\nSource: ${card.source_url}\n\nReview and match this operator in the dashboard:\n${saleLink}`
                  });
                  notifiedAdmin++;
                }
              }
            }
          }
        } catch (urlErr) {
          errors.push(`${searchUrl}: ${urlErr.message}`);
          console.error(urlErr);
        }
      }

      // Update territory stats
      await base44.asServiceRole.entities.ScrapedSaleTerritory.update(territory.id, {
        last_scraped_at: new Date().toISOString(),
        last_scrape_count: newCount + updatedCount
      });

      results.push({
        territory: territory.name,
        new_sales: newCount,
        updated_sales: updatedCount,
        notified_operators: notifiedOperators,
        notified_admin: notifiedAdmin,
        errors
      });
    }

    return Response.json({ success: true, run_id: runId, results });

  } catch (error) {
    console.error('scrapeEstateSalesNet fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Fetch ─────────────────────────────────────────────────────────────────

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

// ─── Listing Page Parser ────────────────────────────────────────────────────

function extractSaleCards(html) {
  const cards = [];
  const blocks = extractBlocks(html);
  for (const block of blocks) {
    try {
      const card = parseCard(block);
      if (card) cards.push(card);
    } catch (e) {
      console.log('Card parse error:', e.message);
    }
  }
  // Dedup within page by source_sale_id
  const seen = new Set();
  return cards.filter(c => {
    if (seen.has(c.source_sale_id)) return false;
    seen.add(c.source_sale_id);
    return true;
  });
}

function extractBlocks(html) {
  const blocks = [];
  let m;

  // Pattern 1: data-sale-id anchors — most reliable on EstateSales.net
  const p1 = /(?=<[^>]+data-sale-id=["'](\d+)["'])([\s\S]{100,3000}?)(?=<[^>]+data-sale-id=|$)/g;
  while ((m = p1.exec(html)) !== null) blocks.push(m[0]);
  if (blocks.length > 0) return blocks;

  // Pattern 2: sale-list-item / sale-card divs
  const p2 = /<(?:article|div|li)[^>]*class="[^"]*(?:sale-list|sale-card|sale-item)[^"]*"[^>]*>([\s\S]{50,3000}?)<\/(?:article|div|li)>/gi;
  while ((m = p2.exec(html)) !== null) blocks.push(m[0]);
  if (blocks.length > 0) return blocks;

  // Pattern 3: JSON-LD structured data events
  const p3 = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = p3.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      items.forEach(d => {
        if (d['@type'] === 'Event' || d['@type'] === 'SaleEvent') blocks.push(JSON.stringify(d));
      });
    } catch (_) {}
  }

  return blocks;
}

function parseCard(block) {
  // Source sale ID
  const idMatch = block.match(/data-sale-id=["'](\d{4,10})["']/i) ||
                  block.match(/\/(?:estate-sales|sales)\/(?:[^\/]+\/)?(\d{4,10})/i) ||
                  block.match(/"@id"[^"]*"[^"]*\/(\d{4,10})"/i);
  if (!idMatch) return null;
  const source_sale_id = idMatch[1];

  // URL
  const urlMatch = block.match(/href="(https?:\/\/[^"]*estatesales\.net[^"]{5,150})"/i) ||
                   block.match(/href="(\/(?:estate-sales|sales)\/[^"]{5,150})"/i);
  const source_url = urlMatch
    ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `https://www.estatesales.net${urlMatch[1]}`)
    : `https://www.estatesales.net/estate-sales/${source_sale_id}`;

  // Title
  const titleMatch = block.match(/<h[1-4][^>]*>([^<]{5,150})<\/h[1-4]>/i) ||
                     block.match(/class="[^"]*title[^"]*"[^>]*>([^<]{5,150})</i) ||
                     block.match(/"name"\s*:\s*"([^"]{5,150})"/i);
  const title = titleMatch ? cleanText(titleMatch[1]) : `Estate Sale #${source_sale_id}`;

  // Company/operator name
  const companyMatch =
    block.match(/class="[^"]*(?:company|conducted|organizer|operator)[^"]*"[^>]*>([^<]{2,80})</i) ||
    block.match(/(?:conducted by|company|operator)\s*[:>]\s*([^<\n]{2,80})/i) ||
    block.match(/"organizer"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]{2,80})"/i);
  const operator_name_raw = companyMatch ? cleanText(companyMatch[1]) : '';

  // City, State, ZIP
  const locMatch =
    block.match(/([A-Za-z][A-Za-z\s]{1,30}),\s*([A-Z]{2})\s*(\d{5})?/) ||
    block.match(/"addressLocality"\s*:\s*"([^"]{2,40})"[\s\S]{0,100}"addressRegion"\s*:\s*"([A-Z]{2})"/i);
  const city = locMatch ? cleanText(locMatch[1]) : '';
  const state = locMatch?.[2] || '';
  const zip = locMatch?.[3] || extractZip(block);
  const address_partial = [city, state, zip].filter(Boolean).join(', ');

  // Full address (sometimes visible on listing)
  const addrMatch = block.match(/\d{2,5}\s+[A-Za-z][^,<\n]{3,50},\s*[A-Za-z][^,<\n]{2,30},\s*[A-Z]{2}\s*\d{5}/);
  const address_full = addrMatch ? cleanText(addrMatch[0]) : null;

  // Dates
  const { start_date, end_date, sale_times } = parseDates(block);
  if (!start_date) return null; // Must have date to be useful

  // Images from listing card (up to 5)
  const imgMatches = [...block.matchAll(/src="(https?:\/\/[^"]{10,200}\.(?:jpg|jpeg|png|webp)(?:\?[^"]{0,100})?)"/gi)];
  const image_urls_limited = imgMatches
    .map(m => m[1])
    .filter(u => !u.includes('placeholder') && !u.includes('logo') && !u.includes('icon'))
    .slice(0, 5);

  // Image count reported by source
  const imgCountMatch = block.match(/(\d+)\s*(?:photos?|images?|pictures?)/i);
  const image_count_source = imgCountMatch ? parseInt(imgCountMatch[1]) : image_urls_limited.length;

  // Categories
  const categories = parseCategories(block);

  // Description
  const descMatch =
    block.match(/class="[^"]*desc[^"]*"[^>]*>([^<]{20,600})</i) ||
    block.match(/"description"\s*:\s*"([^"]{20,600})"/i);
  const description_snippet = descMatch ? cleanText(descMatch[1]).substring(0, 500) : null;

  return {
    source_sale_id, source_url, title, operator_name_raw,
    city, state, zip, address_partial, address_full,
    start_date, end_date, sale_times,
    image_urls_limited, image_count_source,
    categories, description_snippet
  };
}

// ─── Detail Page Enrichment ─────────────────────────────────────────────────
// Called only when listing card is missing images or address

function enrichFromDetail(card, html) {
  // Full address — detail pages often reveal it
  if (!card.address_full) {
    const addrMatch =
      html.match(/\d{2,5}\s+[A-Za-z][^,<\n]{3,50},\s*[A-Za-z][^,<\n]{2,30},\s*[A-Z]{2}\s*\d{5}/) ||
      html.match(/"streetAddress"\s*:\s*"([^"]{5,100})"/i);
    if (addrMatch) card.address_full = cleanText(addrMatch[0] || addrMatch[1]);
  }

  // More images — scrape the detail gallery (up to 5 total)
  if (card.image_urls_limited.length < 5) {
    const imgMatches = [...html.matchAll(/src="(https?:\/\/[^"]{10,200}\.(?:jpg|jpeg|png|webp)(?:\?[^"]{0,100})?)"/gi)];
    const moreImgs = imgMatches
      .map(m => m[1])
      .filter(u => !u.includes('placeholder') && !u.includes('logo') && !u.includes('icon'));

    const existingSet = new Set(card.image_urls_limited);
    for (const img of moreImgs) {
      if (!existingSet.has(img)) {
        card.image_urls_limited.push(img);
        existingSet.add(img);
      }
      if (card.image_urls_limited.length >= 5) break;
    }
  }

  // Update image count from detail page if better
  const detailCountMatch = html.match(/(\d+)\s*(?:photos?|images?|pictures?)/i);
  if (detailCountMatch) {
    const cnt = parseInt(detailCountMatch[1]);
    if (cnt > card.image_count_source) card.image_count_source = cnt;
  }

  // Description — detail pages have full text
  if (!card.description_snippet) {
    const descMatch =
      html.match(/class="[^"]*(?:desc|detail|about)[^"]*"[^>]*>([^<]{30,600})</i) ||
      html.match(/"description"\s*:\s*"([^"]{30,600})"/i);
    if (descMatch) card.description_snippet = cleanText(descMatch[1]).substring(0, 500);
  }

  // Sale times from detail
  if (!card.sale_times?.length) {
    const { sale_times } = parseDates(html);
    if (sale_times.length) card.sale_times = sale_times;
  }

  // Categories from detail
  if (!card.categories?.length) {
    card.categories = parseCategories(html);
  }
}

// ─── Date Parsing ───────────────────────────────────────────────────────────

function parseDates(block) {
  const todayStr = new Date().toISOString().split('T')[0];
  let start_date = null;
  let end_date = null;
  const sale_times = [];

  // ISO dates
  const isoMatches = [...block.matchAll(/(\d{4}-\d{2}-\d{2})/g)];
  const validDates = isoMatches.map(m => m[1]).filter(d => d >= todayStr).sort();
  if (validDates.length) {
    start_date = validDates[0];
    end_date = validDates[validDates.length - 1];
  }

  // Human-readable: "June 7, 2025" or "Jun 7 2025"
  if (!start_date) {
    const hMatch = block.match(/([A-Z][a-z]{2,8})\s+(\d{1,2}),?\s+(202[5-9])/);
    if (hMatch) {
      const parsed = new Date(`${hMatch[1]} ${hMatch[2]}, ${hMatch[3]}`);
      if (!isNaN(parsed) && parsed.toISOString().split('T')[0] >= todayStr) {
        start_date = parsed.toISOString().split('T')[0];
        end_date = start_date;
      }
    }
  }

  // Times: "9AM - 4PM" or "9:00 AM to 4:00 PM"
  if (start_date) {
    const timeMatches = [...block.matchAll(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*(?:–|-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi)];
    timeMatches.forEach((tm, i) => {
      const d = new Date(start_date + 'T12:00:00');
      d.setDate(d.getDate() + i);
      sale_times.push({
        date: d.toISOString().split('T')[0],
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

function parseCategories(block) {
  const known = [
    'furniture', 'antiques', 'jewelry', 'art', 'collectibles', 'tools',
    'clothing', 'books', 'electronics', 'kitchen', 'linens', 'rugs',
    'glassware', 'china', 'silver', 'coins', 'vintage', 'toys', 'musical instruments',
    'appliances', 'garden', 'outdoor', 'sporting goods', 'holiday'
  ];
  const lower = block.toLowerCase();
  return known.filter(cat => lower.includes(cat));
}

function cleanText(str) {
  return (str || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Operator Matching ──────────────────────────────────────────────────────

function normalizeName(name) {
  return (name || '').toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\b(llc|inc|corp|co|estate|sales|services|company|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchOperator(rawName, allOperators, platformUsers) {
  if (!rawName) return { operatorId: null, operatorRecord: null, platformUserId: null };
  const norm = normalizeName(rawName);

  for (const op of allOperators) {
    if (normalizeName(op.company_name) === norm ||
        (op.aliases || []).some(a => normalizeName(a) === norm)) {
      const platformUser = platformUsers.find(u => u.id === op.platform_user_id) || null;
      return { operatorId: op.id, operatorRecord: op, platformUserId: op.platform_user_id || null };
    }
  }

  // Try direct platform user match
  const pu = platformUsers.find(u => normalizeName(u.company_name) === norm);
  return { operatorId: null, operatorRecord: null, platformUserId: pu?.id || null };
}

async function upsertOperator(base44, card, territoryId, allOperators) {
  const norm = normalizeName(card.operator_name_raw);
  const exists = allOperators.find(o => normalizeName(o.company_name) === norm);

  if (exists) {
    const tids = new Set(exists.territory_ids || []);
    tids.add(territoryId);
    await base44.asServiceRole.entities.ScrapedSaleOperator.update(exists.id, {
      territory_ids: [...tids],
      last_seen_at: new Date().toISOString(),
      total_sales_scraped: (exists.total_sales_scraped || 0) + 1
    });
    exists.territory_ids = [...tids];
    exists.total_sales_scraped = (exists.total_sales_scraped || 0) + 1;
    return;
  }

  const newOp = await base44.asServiceRole.entities.ScrapedSaleOperator.create({
    company_name: card.operator_name_raw,
    aliases: [],
    territory_ids: [territoryId],
    match_confidence: 'unmatched',
    total_sales_scraped: 1,
    last_seen_at: new Date().toISOString()
  });
  allOperators.push(newOp);
}