import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      lead_id, state, county, zip_code, life_event_type,
      needs_estate_sale, needs_realtor, needs_cleanout, wants_cash_offer,
      has_real_estate, lead_level, email,
    } = body;

    // ── 1. Fetch all active routing rules for this state ──
    const allRules = await base44.asServiceRole.entities.ProviderRoutingRule.filter({
      state,
      is_active: true,
    });

    // ── 2. Score and filter rules by geographic specificity ──
    // Priority: zip match > county match > state-only match
    const scoredRules = allRules.map(rule => {
      let geo = 0;
      if (zip_code && rule.zip_code && rule.zip_code === zip_code) geo = 3;
      else if (county && rule.county && rule.county.toLowerCase() === county.toLowerCase()) geo = 2;
      else if (!rule.county && !rule.zip_code) geo = 1;
      else geo = 0; // has a county/zip but doesn't match — skip
      return { ...rule, _geo: geo };
    })
      .filter(r => r._geo > 0)
      .sort((a, b) => {
        if (b._geo !== a._geo) return b._geo - a._geo; // better geo first
        return (a.priority_order || 0) - (b.priority_order || 0); // then priority
      });

    // ── 3. Match by service need — one provider per type ──
    const SERVICE_MAP = {
      estate_sale_company_owner: needs_estate_sale,
      realtor: needs_realtor,
      cleanout_vendor: needs_cleanout,
      investor: wants_cash_offer,
    };

    const assignments = {};
    const routedTo = [];
    let debugDirCount = 0, debugCandidates = 0, debugClaimed = 0;

    for (const rule of scoredRules) {
      const type = rule.provider_type;
      if (assignments[type]) continue; // already assigned
      if (SERVICE_MAP[type] === false) continue; // lead doesn't need this
      if (!SERVICE_MAP.hasOwnProperty(type)) continue; // unknown type

      assignments[type] = rule.provider_id;
      routedTo.push({
        provider_id: rule.provider_id,
        provider_type: type,
        rule_id: rule.id,
        geo_match: rule._geo === 3 ? 'zip' : rule._geo === 2 ? 'county' : 'state',
      });
    }

    // ── 3b. Directory fallback — match estate sale companies by county from MasterOperatorDirectory ──
    let directoryMatches = [];
    if (!assignments.estate_sale_company_owner && needs_estate_sale !== false && state && county) {
      const countyNorm = (s) => String(s || '').toLowerCase().trim().replace(/\s+county$/i, '');
      const leadCounty = countyNorm(county);
      const leadState = String(state).trim().toUpperCase();
      const fetchVariants = [
        { name: 'filter_q_only', fn: () => base44.asServiceRole.entities.MasterOperatorDirectory.filter({ state: leadState }) },
        { name: 'filter_q_sort_limit', fn: () => base44.asServiceRole.entities.MasterOperatorDirectory.filter({ state: leadState }, '-created_date', 2000) },
        { name: 'list_all', fn: () => base44.asServiceRole.entities.MasterOperatorDirectory.list(undefined, 3000) },
      ];
      let dirCompanies = [];
      let fetchVariant = 'none_succeeded';
      for (const v of fetchVariants) {
        try {
          const r = await v.fn();
          const arr = Array.isArray(r) ? r : (r.data || []);
          dirCompanies = v.name === 'list_all' ? arr.filter(c => String(c.state || '').trim().toUpperCase() === leadState) : arr;
          if (dirCompanies.length > 0) { fetchVariant = v.name; break; }
        } catch (e) {
          console.error('[route] fetch variant failed:', v.name, e.message);
        }
      }
      const tierRank = { elite: 3, platinum: 2, basic: 1, unknown: 0 };
      const candidates = dirCompanies.filter(c =>
        countyNorm(c.county) === leadCounty ||
        countyNorm(c.geocoded_county) === leadCounty);
      // ── Paid-subscriber + featured-listing boost ──
      // Highest paid plan first, then featured listings, then scraped tier / activity.
      const claimedUserIds = [...new Set(candidates.map(c => c.claimed_by_user_id).filter(Boolean))];
      const activeSubs = claimedUserIds.length
        ? await base44.asServiceRole.entities.Subscription.filter({ status: 'active' })
        : [];
      const bestSubByUser = new Map();
      for (const s of activeSubs) {
        if (!claimedUserIds.includes(s.user_id)) continue;
        const existing = bestSubByUser.get(s.user_id);
        if (!existing || (s.price || 0) > (existing.price || 0)) bestSubByUser.set(s.user_id, s);
      }
      const featuredSales = claimedUserIds.length
        ? [
          ...(await base44.asServiceRole.entities.EstateSale.filter({ local_featured: true })),
          ...(await base44.asServiceRole.entities.EstateSale.filter({ national_featured: true })),
        ]
        : [];
      const featuredCountByOperator = new Map();
      for (const f of featuredSales) {
        if (!f.operator_id) continue;
        featuredCountByOperator.set(f.operator_id, (featuredCountByOperator.get(f.operator_id) || 0) + 1);
      }
      for (const c of candidates) {
        const sub = c.claimed_by_user_id ? bestSubByUser.get(c.claimed_by_user_id) : null;
        c._paid_price = sub ? (sub.price || 0) : 0;
        c._sub_plan = sub ? (sub.package_name || sub.plan_type || sub.tier || '') : null;
        c._featured_count = c.claimed_by_user_id ? (featuredCountByOperator.get(c.claimed_by_user_id) || 0) : 0;
      }
      directoryMatches = candidates
        .sort((a, b) =>
          (b._paid_price || 0) - (a._paid_price || 0) ||
          (b._featured_count || 0) - (a._featured_count || 0) ||
          (tierRank[b.membership_tier] || 0) - (tierRank[a.membership_tier] || 0) ||
          (b.active_sales_count || 0) - (a.active_sales_count || 0) ||
          (b.sales_posted || 0) - (a.sales_posted || 0))
        .slice(0, 5);

      for (const c of directoryMatches) {
        routedTo.push({
          provider_id: c.id,
          provider_type: 'estate_sale_company_owner',
          rule_id: null,
          geo_match: 'county',
          provider_source: 'master_operator_directory',
        });
      }
      // Only assign a platform user if the top directory match has been claimed
      const top = directoryMatches[0];
      if (top && top.claimed_by_user_id) {
        assignments.estate_sale_company_owner = top.claimed_by_user_id;
      }
    }

    const noMatch = routedTo.length === 0;

    // ── 4. Build lead update payload ──
    const updateData = {
      routed_to: routedTo,
      routed_at: new Date().toISOString(),
      crm_status: noMatch ? 'new' : 'routed',
    };

    if (directoryMatches.length > 0) updateData.directory_matches = directoryMatches.map(c => ({
      directory_record_id: c.id,
      company_name: c.company_name,
      county: c.county,
      membership_tier: c.membership_tier,
      active_sales_count: c.active_sales_count,
      paid_plan: c._sub_plan || null,
      paid_price: c._paid_price || 0,
      featured_listing_count: c._featured_count || 0,
    }));
    if (assignments.estate_sale_company_owner) updateData.assigned_operator_id = assignments.estate_sale_company_owner;
    if (assignments.realtor) updateData.assigned_agent_id = assignments.realtor;
    if (assignments.cleanout_vendor) updateData.assigned_cleanout_vendor_id = assignments.cleanout_vendor;
    if (assignments.investor) updateData.assigned_investor_id = assignments.investor;

    if (lead_id) {
      await base44.asServiceRole.entities.EstateTransitionLead.update(lead_id, updateData);
    }

    // ── 5. Log activity for each assignment ──
    const activityLogs = [];

    if (lead_id) {
      if (routedTo.length > 0) {
        for (const r of routedTo) {
          activityLogs.push(
            base44.asServiceRole.entities.LeadActivityLog.create({
              lead_id,
              activity_type: 'routed',
              activity_notes: `Routed to ${r.provider_type} (provider: ${r.provider_id}) via ${r.geo_match} match`,
            })
          );
        }
      } else {
        activityLogs.push(
          base44.asServiceRole.entities.LeadActivityLog.create({
            lead_id,
            activity_type: 'other',
            activity_notes: 'No provider match found — assigned to admin review',
          })
        );
      }
      await Promise.all(activityLogs);
    }

    // ── 6. Admin notifications ──
    const notifyReasons = [];
    if (lead_level === 'urgent') notifyReasons.push('Lead is urgent (score 90+)');
    if (noMatch) notifyReasons.push('No provider match exists for this geography/service');
    if (has_real_estate && (needs_realtor || wants_cash_offer)) {
      notifyReasons.push('Lead has real estate and wants realtor or cash offer');
    }

    if (notifyReasons.length > 0) {
      const assignmentSummary = routedTo.length > 0
        ? routedTo.map(r => `${r.provider_type}: ${r.provider_id}`).join(', ')
        : 'None — needs admin assignment';

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'admin@estatesalen.com',
          subject: `[EstateSalen] Lead Alert — ${lead_level?.toUpperCase() || 'NEW'} Lead${noMatch ? ' · No Provider Match' : ''}`,
          body: `
A lead requires your attention.

Lead ID: ${lead_id || 'N/A'}
State: ${state || 'N/A'}
County: ${county || 'N/A'}
ZIP: ${zip_code || 'N/A'}
Level: ${lead_level || 'N/A'}
Email: ${email || 'N/A'}

Reasons for alert:
${notifyReasons.map(r => `• ${r}`).join('\n')}

Provider Assignments:
${assignmentSummary}

Review this lead in the admin dashboard → Lead CRM.
        `.trim(),
        });
      } catch (emailError) {
        console.error('[route] admin notification email failed:', emailError.message);
      }
    }

    return Response.json({
      routed_to: routedTo,
      assignments,
      no_match: noMatch,
      admin_notified: notifyReasons.length > 0,
      notify_reasons: notifyReasons,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});