import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Email regex ──────────────────────────────────────────────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// ── Helpers ──────────────────────────────────────────────────────────────────
async function fetchPage(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmailEnricher/1.0)' }
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch { clearTimeout(t); return null; }
}

function extractEmails(html) {
  if (!html) return [];
  const decoded = html.replace(/&#64;/g, '@').replace(/%40/g, '@').replace(/\[at\]/gi, '@').replace(/\s*\(at\)\s*/gi, '@');
  const found = decoded.match(EMAIL_REGEX) || [];
  // Filter obvious false-positives
  const BLOCKED_DOMAINS = ['example.com','sentry.io','wix.com','squarespace.com','instagram.com','facebook.com','twitter.com','tiktok.com','linkedin.com','youtube.com','google.com','gmail.com','yahoo.com','hotmail.com','outlook.com','apple.com','amazonaws.com','cloudflare.com','godaddy.com','shopify.com','wordpress.com','weebly.com','webflow.io'];
  return [...new Set(found)].filter(e =>
    !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.gif') &&
    !e.includes('@2x') && e.length < 100 &&
    !BLOCKED_DOMAINS.some(d => e.endsWith('@' + d) || e.includes('@' + d + '.'))
  );
}

function guessPatterns(domain, ownerName) {
  const prefixes = ['info', 'contact', 'sales', 'hello', 'support'];
  if (ownerName) {
    const first = ownerName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    if (first) prefixes.push(first);
  }
  return prefixes.map(p => `${p}@${domain}`);
}

function extractDomain(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
}

// Find contact page URLs by scanning href attributes in HTML
function findContactLinks(html, baseUrl) {
  if (!html) return [];
  const base = new URL(baseUrl.startsWith('http') ? baseUrl : 'https://' + baseUrl);
  const hrefRegex = /href=["']([^"']+)["']/gi;
  const contactLinks = new Set();
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    if (/contact|reach|get-in-touch|email-us/i.test(href)) {
      try {
        const resolved = href.startsWith('http') ? href : new URL(href, base).href;
        if (resolved.startsWith(base.origin)) contactLinks.add(resolved);
      } catch { /* skip malformed */ }
    }
  }
  return [...contactLinks].slice(0, 5);
}

async function verifyEmail(email, apiKey, provider) {
  if (!apiKey || !email) return { status: 'unknown', score: 50 };

  try {
    if (provider === 'zerobounce') {
      const res = await fetch(`https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`);
      const data = await res.json();
      const statusMap = { valid: 'valid', invalid: 'invalid', catch_all: 'catch_all', spamtrap: 'risky', abuse: 'risky', do_not_mail: 'risky', unknown: 'unknown' };
      return { status: statusMap[data.status] || 'unknown', score: data.status === 'valid' ? 90 : data.status === 'catch_all' ? 60 : 10 };
    }
    if (provider === 'hunter') {
      const res = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`);
      const data = await res.json();
      const s = data.data?.result;
      const statusMap = { deliverable: 'valid', undeliverable: 'invalid', risky: 'risky', unknown: 'unknown' };
      return { status: statusMap[s] || 'unknown', score: s === 'deliverable' ? 90 : s === 'risky' ? 50 : 10 };
    }
    if (provider === 'neverbounce') {
      const res = await fetch(`https://api.neverbounce.com/v4/single/check?key=${apiKey}&email=${encodeURIComponent(email)}`);
      const data = await res.json();
      const statusMap = { valid: 'valid', invalid: 'invalid', disposable: 'risky', catchall: 'catch_all', unknown: 'unknown' };
      return { status: statusMap[data.result] || 'unknown', score: data.result === 'valid' ? 90 : data.result === 'catchall' ? 60 : 10 };
    }
  } catch (e) {
    return { status: 'unknown', score: 40, error: e.message };
  }
  return { status: 'unverified', score: 50 };
}

async function logStep(base44, companyId, companyName, actionType, sourceChecked, result, emailFound, verificationStatus, confidenceScore, errorMessage) {
  try {
    await base44.asServiceRole.entities.EnrichmentLog.create({
      company_id: companyId,
      company_name: companyName,
      action_type: actionType,
      source_checked: sourceChecked || '',
      result: result || '',
      email_found: emailFound || '',
      verification_status: verificationStatus || '',
      confidence_score: confidenceScore || 0,
      error_message: errorMessage || ''
    });
  } catch (e) { /* non-blocking */ }
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { company_id, entity = 'FutureEstateOperator' } = await req.json();
    const isLead = entity === 'FutureOperatorLead';
    if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

    // Support both FutureEstateOperator and FutureOperatorLead as target entity
    const targetEntity = base44.asServiceRole.entities[entity];
    if (!targetEntity) return Response.json({ error: `Unknown entity: ${entity}` }, { status: 400 });

    const company = await targetEntity.get(company_id);
    if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

    if (company.do_not_contact || company.unsubscribe_status) {
      return Response.json({ skipped: true, reason: 'do_not_contact or unsubscribed' });
    }

    // Mark as searching
    await targetEntity.update(company_id, { enrichment_status: 'searching' });

    const verifyApiKey = Deno.env.get('EMAIL_VERIFY_API_KEY') || '';
    const verifyProvider = Deno.env.get('EMAIL_VERIFY_PROVIDER') || 'none'; // zerobounce | hunter | neverbounce
    const serpApiKey = Deno.env.get('SERPAPI_KEY') || '';

    let foundEmails = [];
    let emailSourceUrl = '';
    let emailSourceType = '';
    let websiteUrl = isLead ? (company.website || company.website_url || '') : (company.website_url || company.website || '');

    // ── Step 1: Crawl official website ──────────────────────────────────────
    const SOCIAL_DOMAINS = ['facebook.com','instagram.com','twitter.com','tiktok.com','linkedin.com','youtube.com','t.co'];
    const isSocialWebsite = websiteUrl && SOCIAL_DOMAINS.some(d => websiteUrl.includes(d));
    // Always attempt to crawl — social media pages (especially Facebook) often list email addresses.
    if (websiteUrl) {
      const domain = extractDomain(websiteUrl);
      const normalizedBase = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;

      // Fetch homepage + contact page in parallel
      const contactUrl = `https://${domain}/contact`;
      const [homepageHtml, contactHtml] = await Promise.all([
        fetchPage(normalizedBase, 6000),
        fetchPage(contactUrl, 6000),
      ]);

      for (const [html, pageUrl] of [[homepageHtml, normalizedBase], [contactHtml, contactUrl]]) {
        if (foundEmails.length > 0) break;
        const emails = extractEmails(html);
        if (emails.length > 0) {
          foundEmails = [...new Set([...foundEmails, ...emails])].slice(0, 5);
          emailSourceUrl = pageUrl;
          emailSourceType = 'official_website';
          await logStep(base44, company_id, company.company_name, 'website_crawl', pageUrl, `Found ${emails.length} email(s)`, emails[0], '', 0, '');
        }
      }
    }

    // ── Step 2: Search for email via Facebook using SerpAPI ─────────────────
    // Facebook blocks direct scraping and returns login-wall HTML with irrelevant emails.
    // Instead, use SerpAPI to search the Facebook page's content for an email address.
    const facebookUrl = company.facebook || '';
    if (facebookUrl && foundEmails.length < 5 && serpApiKey) {
      // Extract the Facebook page slug/username from the URL
      const fbSlugMatch = facebookUrl.match(/facebook\.com\/([^/?#]+)/i);
      const fbSlug = fbSlugMatch ? fbSlugMatch[1] : null;

      if (fbSlug && fbSlug !== 'pages') {
        // Search Google for the email on that specific Facebook page
        const fbSearchQuery = `site:facebook.com/${fbSlug} email OR contact`;
        const fbSearchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(fbSearchQuery)}&api_key=${serpApiKey}&num=3`;
        try {
          const fbSearchHtml = await fetchPage(fbSearchUrl, 10000);
          if (fbSearchHtml) {
            const fbData = JSON.parse(fbSearchHtml);
            // Check snippets and knowledge graph for email
            const snippets = [
              ...(fbData.organic_results || []).map(r => (r.snippet || '') + ' ' + (r.title || '')),
              JSON.stringify(fbData.knowledge_graph || {}),
              JSON.stringify(fbData.answer_box || {})
            ].join(' ');
            const snippetEmails = extractEmails(snippets);
            if (snippetEmails.length > 0) {
              const newEmails = snippetEmails.filter(e => !foundEmails.includes(e));
              foundEmails = [...foundEmails, ...newEmails].slice(0, 5);
              if (!emailSourceUrl) emailSourceUrl = facebookUrl;
              if (!emailSourceType) emailSourceType = 'facebook';
              await logStep(base44, company_id, company.company_name, 'web_search', fbSearchUrl, `Found ${snippetEmails.length} email(s) via FB search`, snippetEmails[0], '', 0, '');
            }
          }
        } catch (e) {
          await logStep(base44, company_id, company.company_name, 'web_search', facebookUrl, 'Facebook search failed', '', '', 0, e.message);
        }
      }

      // Also search Google directly: company name + facebook + email
      if (foundEmails.length < 5) {
        const directFbQuery = `"${company.company_name}" facebook email contact`;
        const directFbUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(directFbQuery)}&api_key=${serpApiKey}&num=5`;
        try {
          const directHtml = await fetchPage(directFbUrl, 10000);
          if (directHtml) {
            const directData = JSON.parse(directHtml);
            const allText = [
              ...(directData.organic_results || []).map(r => (r.snippet || '') + ' ' + (r.title || '')),
              JSON.stringify(directData.knowledge_graph || {}),
            ].join(' ');
            const directEmails = extractEmails(allText);
            if (directEmails.length > 0) {
              const newEmails = directEmails.filter(e => !foundEmails.includes(e));
              foundEmails = [...foundEmails, ...newEmails].slice(0, 5);
              if (!emailSourceUrl) emailSourceUrl = facebookUrl;
              if (!emailSourceType) emailSourceType = 'facebook';
              await logStep(base44, company_id, company.company_name, 'web_search', directFbUrl, `Found ${directEmails.length} email(s) via direct FB query`, directEmails[0], '', 0, '');
            }
          }
        } catch (e) { /* non-blocking */ }
      }
    }

    // ── Step 3: Web search snippets only (no page crawls to avoid timeout) ────
    if (foundEmails.length === 0 && serpApiKey) {
      const query = `"${company.company_name}" ${company.city} ${company.state} estate sales email contact`;
      const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=5`;
      try {
        const html = await fetchPage(searchUrl, 8000);
        if (html) {
          const data = JSON.parse(html);
          // Extract emails from snippets only — no secondary page fetches
          const snippetText = [
            ...(data.organic_results || []).map(r => (r.snippet || '') + ' ' + (r.title || '')),
            JSON.stringify(data.knowledge_graph || {}),
            JSON.stringify(data.answer_box || {}),
          ].join(' ');
          const snippetEmails = extractEmails(snippetText);
          if (snippetEmails.length > 0) {
            foundEmails = [...new Set([...foundEmails, ...snippetEmails])].slice(0, 5);
            if (!emailSourceUrl) emailSourceUrl = searchUrl;
            if (!emailSourceType) emailSourceType = 'google_search';
            await logStep(base44, company_id, company.company_name, 'web_search', searchUrl, `Found ${snippetEmails.length} email(s) in snippets`, snippetEmails[0], '', 0, '');
          }
        }
      } catch (e) { /* non-blocking */ }
    }

    // ── Step 4: Guess email patterns from domain (skip social profiles — no meaningful domain) ──
    let guessedPatterns = [];
    if (foundEmails.length === 0 && websiteUrl && !isSocialWebsite) {
      const domain = extractDomain(websiteUrl);
      if (domain) {
        guessedPatterns = guessPatterns(domain, company.company_name);
        foundEmails = guessedPatterns;
        emailSourceType = 'guessed_pattern';
        await logStep(base44, company_id, company.company_name, 'pattern_guess', websiteUrl, `Generated ${guessedPatterns.length} patterns`, guessedPatterns[0], '', 0, '');
      }
    }

    if (foundEmails.length === 0) {
      const failPayload = { enrichment_status: 'failed' };
      if (!isLead) {
        failPayload.enrichment_notes = 'No email found after website crawl, web search, and pattern generation.';
        failPayload.email_last_checked = new Date().toISOString();
        failPayload.website_url = websiteUrl || company.website_url || '';
      }
      await targetEntity.update(company_id, failPayload);
      return Response.json({ success: false, message: 'No email found' });
    }

    // ── Step 4: Verify emails ─────────────────────────────────────────────────
    let bestEmail = foundEmails[0];
    let bestScore = emailSourceType === 'official_website' ? 70 : emailSourceType === 'google_search' ? 50 : 30;
    let bestVerifiedStatus = 'unverified';
    const alternates = [];

    for (const email of foundEmails.slice(0, 5)) {
      const verification = await verifyEmail(email, verifyApiKey, verifyProvider);
      await logStep(base44, company_id, company.company_name, 'verification', email, verification.status, email, verification.status, verification.score, verification.error || '');

      if (verification.score > bestScore) {
        if (bestEmail !== email) alternates.push(bestEmail);
        bestEmail = email;
        bestScore = verification.score;
        bestVerifiedStatus = verification.status;
      } else if (email !== bestEmail) {
        alternates.push(email);
      }
    }

    // Boost score for official website
    if (emailSourceType === 'official_website') bestScore = Math.min(100, bestScore + 20);

    // FutureOperatorLead only supports: not_started | searching | found | failed
    const enrichmentStatus = isLead
      ? (bestScore >= 40 ? 'found' : 'failed')
      : (bestScore >= 75 ? 'verified' : bestScore >= 40 ? 'found' : 'needs_manual_review');

    const updatePayload = {
      email: bestEmail,
      enrichment_status: enrichmentStatus,
    };

    if (!isLead) {
      // FutureEstateOperator has all these extra fields
      Object.assign(updatePayload, {
        alternate_emails: alternates.slice(0, 5),
        email_source_url: emailSourceUrl,
        email_source_type: emailSourceType,
        email_confidence_score: bestScore,
        email_verified_status: bestVerifiedStatus,
        email_last_checked: new Date().toISOString(),
        enrichment_notes: `Found via ${emailSourceType}. Confidence: ${bestScore}.`,
        website_url: websiteUrl || company.website_url || '',
      });
    }

    await targetEntity.update(company_id, updatePayload);

    return Response.json({ success: true, email: bestEmail, score: bestScore, status: bestVerifiedStatus, enrichment_status: enrichmentStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});