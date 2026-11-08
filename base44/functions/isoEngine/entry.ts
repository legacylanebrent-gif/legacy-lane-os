import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  rematchIso,
  rematchAllActive,
  duplicateKey,
  rows,
  srOf,
  str,
  num,
  brandKey,
  normalize,
} from '../../shared/isoMatching.ts';

/**
 * ISO engine — every customer-facing ISO action in one place:
 * photo identification, adaptive questions, saving an interest (with duplicate
 * prevention), the collector/reseller list intake, feedback, fulfilment and
 * dashboard reads. Matching itself lives in base44/shared/isoMatching.ts and is
 * the only writer of SaleIsoMatch.
 *
 * AI is used for interpretation only (what a photo shows, what to ask next). It is
 * never asked to decide a match and never asked to assert a brand that the photo
 * does not show. Anything it cannot establish stays in `uncertainties`.
 */

const MAX_QUESTIONS = 3;

function clean(value: any, max = 400): string {
  return str(value).replace(/\s+/g, ' ').slice(0, max);
}

function list(value: any, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(v => clean(v, 80)).filter(Boolean).slice(0, max);
}

async function ownIso(base44: any, user: any, isoId: string) {
  if (!isoId) return null;
  const iso = await base44.entities.WantedItem.get(isoId).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
  if (!iso) return null;
  if (str(iso.buyer_id) !== user.id && user.role !== 'admin') return false;
  return iso;
}

/** Brand registry resolution: the canonical record when it exists, with its aliases. */
async function resolveBrand(sr: any, name: string) {
  const cleaned = clean(name, 80);
  if (!cleaned) return { brand: '', brand_id: '', aliases: [] };
  const key = brandKey(cleaned);
  const res = await sr.entities.Brand.filter({ status: 'active' }, { limit: 500 }).catch(() => []);
  const match = rows(res).find((b: any) => brandKey(b.name) === key
    || (b.aliases || []).some((alias: string) => brandKey(alias) === key));
  if (!match) return { brand: cleaned, brand_id: '', aliases: [] };
  return { brand: str(match.name), brand_id: match.id, aliases: (match.aliases || []).map(str).filter(Boolean) };
}

function isoPayload(body: any, user: any) {
  const identification = body.identification || {};
  return {
    buyer_id: user.id,
    buyer_name: user.full_name || user.email,
    title: clean(body.title, 140),
    description: clean(body.description, 1200),
    original_wording: clean(body.original_wording, 1200),
    brand: clean(body.brand, 80),
    brand_status: body.brand ? (body.brand_status === 'suggested_uncertain' ? 'suggested_uncertain' : 'confirmed_by_customer') : 'none',
    category: clean(body.category, 60),
    subcategory: clean(body.subcategory, 60),
    item_type: clean(body.item_type, 60),
    style: clean(body.style, 60),
    era: clean(body.era, 60),
    material: clean(body.material, 60),
    color: clean(body.color, 60),
    intent: body.intent === 'one_time' ? 'one_time' : 'ongoing',
    intent_confirmed: body.intent_confirmed === true,
    purpose: ['personal', 'collector', 'reseller', 'other'].includes(str(body.purpose)) ? body.purpose : 'personal',
    match_mode: body.match_mode === 'exact' ? 'exact' : 'similar',
    required_attributes: (body.required_attributes && typeof body.required_attributes === 'object') ? body.required_attributes : {},
    flexible_preferences: (body.flexible_preferences && typeof body.flexible_preferences === 'object') ? body.flexible_preferences : {},
    uncertain_attributes: list(body.uncertain_attributes),
    exclusions: list(body.exclusions),
    budget_min: num(body.budget_min),
    budget_max: num(body.budget_max),
    condition: ['any', 'new', 'used_like_new', 'used_good', 'used_fair'].includes(str(body.condition)) ? body.condition : 'any',
    distance: num(body.distance) != null ? Math.round(num(body.distance) as number) : null,
    zip_code: clean(body.zip_code, 12),
    state: clean(body.state, 4).toUpperCase(),
    shipping_ok: body.shipping_ok !== false,
    pickup_ok: body.pickup_ok !== false,
    allow_dealer_contact: body.allow_dealer_contact === true,
    reference_photo_uri: clean(body.reference_photo_uri, 500),
    reference_photo_shared: body.reference_photo_shared === true,
    identification: {
      summary: clean(identification.summary, 600),
      item_type: clean(identification.item_type, 80),
      category: clean(identification.category, 60),
      style: clean(identification.style, 80),
      material: clean(identification.material, 80),
      colors: list(identification.colors, 6),
      features: list(identification.features, 8),
      brand_suggestion: clean(identification.brand_suggestion, 80),
      brand_supported: identification.brand_supported === true,
      multiple_objects: identification.multiple_objects === true,
      focused_object: clean(identification.focused_object, 120),
      uncertainties: list(identification.uncertainties, 8),
      needs_closer_photo: identification.needs_closer_photo === true,
      confirmed_at: identification.confirmed_at || (body.identification_confirmed ? new Date().toISOString() : ''),
    },
    clarification_answers: (body.clarification_answers && typeof body.clarification_answers === 'object') ? body.clarification_answers : {},
    entry_path: ['describe', 'guided', 'photo', 'list', 'item', 'legacy'].includes(str(body.entry_path)) ? body.entry_path : 'describe',
    parent_intake_id: clean(body.parent_intake_id, 60),
    alerts_enabled: body.alerts_enabled !== false,
    public_visibility: body.public_visibility === true,
    image_url: clean(body.image_url, 500),
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = str(body.action) || 'dashboard';
    const sr = srOf(base44);

    // ── Dashboard: the customer's own interests, matches and list intakes ──
    if (action === 'dashboard') {
      const [isoRes, intakeRes] = await Promise.all([
        base44.entities.WantedItem.filter({ buyer_id: user.id }, { limit: 100, sort: '-created_date' }),
        base44.entities.IsoIntake.filter({ buyer_id: user.id }, { limit: 20, sort: '-created_date' }),
      ]);
      const isos = rows(isoRes);
      const isoIds = isos.map((i: any) => i.id);
      let matches: any[] = [];
      if (isoIds.length) {
        const matchRes = await base44.entities.SaleIsoMatch.filter(
          { wanted_item_id: { $in: isoIds } },
          { limit: 300, sort: '-last_matched_at' },
        );
        // Only rows this engine produced are customer-facing: they carry a quality
        // and a source. Older records without them cannot be explained, so they are
        // left out rather than shown as unexplained numbers.
        matches = rows(matchRes).filter((m: any) => m.match_quality && m.source_type);
      }
      const prefsRes = await base44.entities.NotificationPreference.filter({ user_id: user.id }, { limit: 1 }).catch(() => []);
      return Response.json({ isos, matches, intakes: rows(intakeRes), prefs: rows(prefsRes)[0] || null });
    }

    // ── Photo identification (interpretation only) ──
    if (action === 'identify_photo') {
      const fileUri = clean(body.file_uri, 500);
      const imageUrl = clean(body.image_url, 500);
      if (!fileUri && !imageUrl) return Response.json({ error: 'A photo is required' }, { status: 400 });

      let url = imageUrl;
      let expiresAt = '';
      if (fileUri) {
        const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 900 });
        url = signed.signed_url;
        expiresAt = new Date(Date.now() + 900 * 1000).toISOString();
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: [
          'A customer wants us to help them find an item they photographed. Describe ONLY what the photograph shows.',
          'First check for sensitive material (documents, IDs, bank or medical records, credentials, private correspondence). If present, return sensitive=true and empty everything else; do not describe or transcribe it.',
          'Return:',
          '- item_type and category (plain words, e.g. "sofa", "furniture").',
          '- style, material, colors, and distinguishing features you can actually see.',
          '- brand_model ONLY when the photograph itself shows brand evidence: a readable label, logo, stamp, hallmark or maker mark. Style, resemblance, or what such an item usually is are NOT evidence. Otherwise leave it empty and set brand_supported=false.',
          '- multiple_objects=true plus a short label for each visible main object when more than one notable object competes for attention.',
          '- uncertainties: short phrases for anything you cannot establish (material, era, maker, exact model, size).',
          '- needs_closer_photo=true only when a closer photo or a label shot would materially change the identification.',
          '- summary: two sentences a customer can confirm or correct, with no authenticity, age or value claims.',
          'Never state or imply authenticity, provenance, age or value.',
        ].join('\n'),
        file_urls: [url],
        response_json_schema: {
          type: 'object',
          properties: {
            sensitive: { type: 'boolean' },
            item_type: { type: 'string' },
            category: { type: 'string' },
            style: { type: 'string' },
            material: { type: 'string' },
            colors: { type: 'array', items: { type: 'string' } },
            features: { type: 'array', items: { type: 'string' } },
            brand_model: { type: 'string' },
            brand_supported: { type: 'boolean' },
            multiple_objects: { type: 'boolean' },
            objects: { type: 'array', items: { type: 'string' } },
            uncertainties: { type: 'array', items: { type: 'string' } },
            needs_closer_photo: { type: 'boolean' },
            summary: { type: 'string' },
          },
          required: ['sensitive', 'item_type', 'category', 'summary', 'brand_supported'],
        },
      });

      if (result.sensitive === true) {
        return Response.json({
          sensitive: true,
          message: 'That photo looks like it may contain private documents or personal information. Please use a photo of the item itself, or describe what you are looking for instead.',
        });
      }

      return Response.json({
        sensitive: false,
        identification: {
          item_type: clean(result.item_type, 80),
          category: clean(result.category, 60),
          style: clean(result.style, 80),
          material: clean(result.material, 80),
          colors: list(result.colors, 5),
          features: list(result.features, 8),
          brand_suggestion: result.brand_supported === true ? clean(result.brand_model, 80) : '',
          brand_supported: result.brand_supported === true,
          multiple_objects: result.multiple_objects === true,
          objects: list(result.objects, 6),
          uncertainties: list(result.uncertainties, 8),
          needs_closer_photo: result.needs_closer_photo === true,
          summary: clean(result.summary, 600),
        },
        photo: { file_uri: fileUri, url, url_expires_at: expiresAt },
      });
    }

    // ── Adaptive questions (max 3, never repeat an answered topic) ──
    if (action === 'suggest_questions') {
      const known = body.known || {};
      const asked = list(body.asked_topics, 20);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: [
          'You are helping a customer describe an item they want to buy at estate sales.',
          `What we already know: ${JSON.stringify({
            title: known.title, description: known.description, brand: known.brand,
            category: known.category, item_type: known.item_type, style: known.style,
            material: known.material, color: known.color, era: known.era,
            budget_max: known.budget_max, condition: known.condition,
            location: known.location, shipping_ok: known.shipping_ok,
            match_mode: known.match_mode, purpose: known.purpose,
          })}`,
          `Topics already asked (never repeat): ${asked.join(', ') || 'none'}`,
          `Customer preferences from their account: ${JSON.stringify(body.account_preferences || {})}`,
          `Return at most ${MAX_QUESTIONS} questions that would most improve matching, chosen only from what is still unknown.`,
          'Each question must offer 2-5 selectable answers, allow free text, and allow "No preference". Keep questions short and concrete.',
          'Also suggest intent: one_time (buy it once) or ongoing (keep finding these items), with one short reason. The customer decides.',
          'Allowed topics: budget, condition, style_or_era, material, color, size, location_or_pickup, shipping, exactness, exclusions, timing.',
        ].join('\n'),
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  topic: { type: 'string' },
                  question: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  allow_free_text: { type: 'boolean' },
                  why: { type: 'string' },
                },
                required: ['id', 'topic', 'question', 'options'],
              },
            },
            intent_suggestion: { type: 'string' },
            intent_reason: { type: 'string' },
          },
          required: ['questions', 'intent_suggestion'],
        },
      });

      const questions = (result.questions || [])
        .filter((q: any) => q && q.question && !asked.includes(str(q.topic)))
        .slice(0, MAX_QUESTIONS)
        .map((q: any, index: number) => ({
          id: clean(q.id, 40) || `q${index + 1}`,
          topic: clean(q.topic, 40),
          question: clean(q.question, 200),
          options: list(q.options, 5),
          allow_free_text: q.allow_free_text !== false,
          why: clean(q.why, 160),
        }));

      return Response.json({
        questions,
        intent_suggestion: result.intent_suggestion === 'one_time' ? 'one_time' : 'ongoing',
        intent_reason: clean(result.intent_reason, 200),
      });
    }

    // ── Save or update one interest, then match it immediately ──
    if (action === 'save_iso') {
      const payload = isoPayload(body, user);
      if (!payload.title) return Response.json({ error: 'Give your search a short name first' }, { status: 400 });
      if (!payload.intent_confirmed) return Response.json({ error: 'Confirm whether this is a one-time or ongoing search' }, { status: 400 });

      const brand = await resolveBrand(sr, payload.brand);
      payload.brand = brand.brand;
      payload.brand_id = brand.brand_id;
      payload.brand_aliases = brand.aliases;
      const key = duplicateKey(payload);

      const existingRes = await base44.entities.WantedItem.filter({ buyer_id: user.id }, { limit: 200 });
      const existing = rows(existingRes);
      const prior = body.iso_id ? existing.find((i: any) => i.id === body.iso_id) : null;
      const clash = existing.find((i: any) =>
        i.id !== (prior?.id || '')
        && ['active', 'paused'].includes(str(i.status))
        && (i.duplicate_key || duplicateKey(i)) === key);
      if (clash && body.allow_duplicate !== true) {
        return Response.json({
          duplicate: true,
          duplicate_of: { id: clash.id, title: clash.title },
          message: `You already have an active search for this: “${clash.title}”.`,
        }, { status: 409 });
      }

      let iso;
      if (prior) {
        iso = await base44.entities.WantedItem.update(prior.id, { ...payload, duplicate_key: key, status: str(prior.status) === 'archived' ? 'active' : prior.status });
      } else {
        iso = await base44.entities.WantedItem.create({ ...payload, duplicate_key: key, status: 'active' });
      }

      const match = await rematchIso(sr, iso.id, { notify: true });
      return Response.json({ iso, duplicate: false, match });
    }

    // ── Collector / reseller list intake ──
    if (action === 'build_list') {
      const intakeInput = body.intake || {};
      const selections = Array.isArray(body.selections) ? body.selections : [];
      if (!selections.length) return Response.json({ error: 'Select at least one category or brand' }, { status: 400 });

      const intake = await base44.entities.IsoIntake.create({
        buyer_id: user.id,
        buyer_name: user.full_name || user.email,
        list_name: clean(intakeInput.list_name, 120) || 'My collector list',
        role: ['collector', 'reseller', 'both'].includes(str(intakeInput.role)) ? intakeInput.role : 'collector',
        specialties: list(intakeInput.specialties, 12),
        categories: list(intakeInput.categories),
        item_types: list(intakeInput.item_types),
        brands: (intakeInput.brands || []).slice(0, 40).map((b: any) => ({
          brand_id: clean(b.brand_id, 60),
          name: clean(b.name, 80),
          tier: ['accessible', 'midrange', 'premium'].includes(str(b.tier)) ? b.tier : 'unknown',
        })).filter((b: any) => b.name),
        exclusions: list(intakeInput.exclusions),
        budget_min: num(intakeInput.budget_min),
        budget_max: num(intakeInput.budget_max),
        sourcing: {
          city: clean(intakeInput.city, 80),
          state: clean(intakeInput.state, 4).toUpperCase(),
          zip_code: clean(intakeInput.zip_code, 12),
          radius_miles: num(intakeInput.radius_miles) != null ? Math.round(num(intakeInput.radius_miles) as number) : null,
        },
        pickup_ok: intakeInput.pickup_ok !== false,
        shipping_ok: intakeInput.shipping_ok !== false,
        match_mode: intakeInput.match_mode === 'exact' ? 'exact' : 'similar',
        status: 'saved',
      });

      const existingRes = await base44.entities.WantedItem.filter({ buyer_id: user.id }, { limit: 200 });
      const seen = new Set(rows(existingRes)
        .filter((i: any) => ['active', 'paused'].includes(str(i.status)))
        .map((i: any) => i.duplicate_key || duplicateKey(i)));

      const created: any[] = [];
      const skipped: string[] = [];
      for (const selection of selections.slice(0, 30)) {
        const title = clean(selection.title, 140) || [selection.brand, selection.item_type, selection.category].filter(Boolean).join(' ');
        if (!title) continue;
        const brand = await resolveBrand(sr, selection.brand || '');
        const payload = isoPayload({
          title,
          description: clean(selection.description, 800) || `Collector list interest: ${title}`,
          original_wording: clean(selection.original_wording, 800),
          brand,
          brand_status: brand.brand ? 'confirmed_by_customer' : 'none',
          category: selection.category,
          item_type: selection.item_type,
          exclusions: intakeInput.exclusions,
          budget_min: intakeInput.budget_min ?? selection.budget_min,
          budget_max: intakeInput.budget_max ?? selection.budget_max,
          condition: selection.condition || 'any',
          zip_code: intakeInput.zip_code,
          state: intakeInput.state,
          shipping_ok: intakeInput.shipping_ok,
          pickup_ok: intakeInput.pickup_ok,
          match_mode: intakeInput.match_mode,
          intent: 'ongoing',
          intent_confirmed: true,
          purpose: intake.role === 'reseller' ? 'reseller' : intake.role === 'both' ? 'collector' : 'collector',
          entry_path: 'list',
          parent_intake_id: intake.id,
          public_visibility: false,
        }, user);
        const key = duplicateKey(payload);
        if (seen.has(key)) {
          skipped.push(title);
          continue;
        }
        seen.add(key);
        const iso = await base44.entities.WantedItem.create({ ...payload, duplicate_key: key, status: 'active' });
        created.push(iso);
      }

      const savedIntake = await base44.entities.IsoIntake.update(intake.id, {
        created_interest_count: created.length,
        skipped_duplicates: skipped,
      });

      for (const iso of created) {
        try {
          await rematchIso(sr, iso.id, { notify: false });
        } catch (error) {
          console.error('ISO list rematch failed', iso.id, error);
        }
      }

      return Response.json({ intake: savedIntake, created, skipped });
    }

    // ── Match control ──
    if (action === 'rematch') {
      if (body.iso_id) {
        const iso = await ownIso(base44, user, str(body.iso_id));
        if (iso === false) return Response.json({ error: 'Forbidden' }, { status: 403 });
        if (!iso) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json(await rematchIso(sr, iso.id, { notify: body.notify !== false }));
      }
      if (user.role !== 'admin') return Response.json({ error: 'Administrator access required' }, { status: 403 });
      return Response.json(await rematchAllActive(sr, { limit: body.limit }));
    }

    // ── Feedback, seen, lifecycle ──
    if (action === 'feedback') {
      const matchId = str(body.match_id);
      const feedback = ['relevant', 'not_meant', 'hidden', 'none'].includes(str(body.feedback)) ? body.feedback : null;
      if (!matchId || !feedback) return Response.json({ error: 'match_id and feedback are required' }, { status: 400 });
      const match = await base44.entities.SaleIsoMatch.get(matchId).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
      if (!match) return Response.json({ error: 'Not found' }, { status: 404 });
      if (str(match.buyer_id) !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      await base44.entities.SaleIsoMatch.update(matchId, {
        feedback,
        feedback_at: new Date().toISOString(),
        status: feedback === 'hidden' ? 'dismissed' : 'new',
        seen: true,
      });
      return Response.json({ ok: true });
    }

    if (action === 'mark_seen') {
      const iso = await ownIso(base44, user, str(body.iso_id));
      if (iso === false) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!iso) return Response.json({ error: 'Not found' }, { status: 404 });
      const res = await base44.entities.SaleIsoMatch.filter({ wanted_item_id: iso.id, seen: false }, { limit: 300 });
      const unseen = rows(res);
      if (unseen.length) {
        await base44.entities.SaleIsoMatch.bulkUpdate(unseen.map((m: any) => ({ id: m.id, seen: true })));
      }
      return Response.json({ ok: true, marked: unseen.length });
    }

    if (action === 'fulfill') {
      const iso = await ownIso(base44, user, str(body.iso_id));
      if (iso === false) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!iso) return Response.json({ error: 'Not found' }, { status: 404 });
      const updated = await base44.entities.WantedItem.update(iso.id, {
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
        fulfilled_item_key: clean(body.item_key, 120),
        alerts_enabled: false,
      });
      return Response.json({ iso: updated });
    }

    if (action === 'set_status') {
      const next = ['active', 'paused', 'archived'].includes(str(body.status)) ? body.status : null;
      if (!next) return Response.json({ error: 'status must be active, paused or archived' }, { status: 400 });
      const iso = await ownIso(base44, user, str(body.iso_id));
      if (iso === false) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!iso) return Response.json({ error: 'Not found' }, { status: 404 });
      const updated = await base44.entities.WantedItem.update(iso.id, {
        status: next,
        alerts_enabled: next === 'active' ? iso.alerts_enabled !== false : false,
      });
      if (next === 'active') await rematchIso(sr, iso.id, { notify: false });
      return Response.json({ iso: updated });
    }

    if (action === 'delete_iso') {
      const iso = await ownIso(base44, user, str(body.iso_id));
      if (iso === false) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!iso) return Response.json({ error: 'Not found' }, { status: 404 });
      await base44.entities.WantedItem.delete(iso.id);
      return Response.json({ ok: true });
    }

    if (action === 'brand_search') {
      const query = normalize(body.query);
      const res = await base44.entities.Brand.filter({ status: 'active' }, { limit: 300 }).catch(() => []);
      const brands = rows(res)
        .filter((b: any) => !query || normalize(b.name).includes(query) || (b.aliases || []).some((a: string) => normalize(a).includes(query)))
        .slice(0, 25)
        .map((b: any) => ({ id: b.id, name: b.name, aliases: b.aliases || [] }));
      return Response.json({ brands });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('isoEngine error:', error);
    return Response.json({ error: error.message || 'ISO request failed' }, { status: 500 });
  }
}