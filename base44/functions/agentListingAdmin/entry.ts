import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  currentUser,
  isAdmin,
  loadConfig,
  audit,
  json,
  DEFAULT_ALLOWED_ENRICHMENT,
  DEFAULT_CONTACT_SOURCE_FIELDS,
  DEFAULT_PROPERTY_FACT_FIELDS,
} from '../../shared/listingAccess.ts';
import { applyMatch } from '../../shared/listingMatch.ts';
import { processImport } from '../../shared/listingImportEngine.ts';

// Admin workspace for agent listing imports: monitor, resolve, retry, reassign,
// tune matching policy, and watch reference freshness. Admin role enforced server-side.

const NEEDS_MATCH = new Set(['unmatched', 'no_match', 'failed', 'reference_unavailable']);

function matchesFilters(rec, filters) {
  if (filters.status && rec.status !== filters.status) return false;
  if (filters.agent_email && String(rec.agent_email || '').toLowerCase() !== String(filters.agent_email).toLowerCase()) return false;
  if (filters.from && String(rec.imported_at || '').slice(0, 10) < filters.from) return false;
  if (filters.to && String(rec.imported_at || '').slice(0, 10) > filters.to) return false;
  return true;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (!isAdmin(user)) return json({ error: 'Forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'overview';
    const config = await loadConfig(base44);
    const actor = { actor_user_id: user.id, actor_name: user.full_name || user.email || '', actor_role: 'admin' };

    if (action === 'overview' || action === 'list_imports') {
      const imports = await base44.asServiceRole.entities.AgentListingImport.filter({}, '-imported_at', 100, 0);
      const filtered = (imports || []).filter((rec) => matchesFilters(rec, body.filters || {}));
      const opportunities = await base44.asServiceRole.entities.AgentListingOpportunity.filter({}, '-created_date', 400, 0);
      const opps = opportunities || [];

      const reviewQueue = opps
        .filter((o) => o?.ownership?.match_status === 'possible' || o?.ownership?.conflict_note)
        .slice(0, 40)
        .map((o) => ({
          id: o.id,
          agent_name: o.agent_name,
          address: o.address?.formatted_address || '',
          match_status: o.ownership?.match_status,
          review_status: o.ownership?.review_status,
          rule_used: o.ownership?.rule_used,
          candidate_count: (o.ownership?.candidates || []).length,
          conflict_note: o.ownership?.conflict_note || '',
          matched_at: o.ownership?.matched_at || '',
        }));

      return json({
        imports: filtered,
        summary: {
          total_imports: (imports || []).length,
          processing: (imports || []).filter((r) => r.status === 'processing' || r.status === 'queued').length,
          failed: (imports || []).filter((r) => r.status === 'failed').length,
          partial: (imports || []).filter((r) => r.status === 'partial').length,
          opportunities: opps.length,
          verified: opps.filter((o) => o.ownership?.match_status === 'verified').length,
          needs_review: opps.filter((o) => o.ownership?.match_status === 'possible').length,
          unmatched: opps.filter((o) => NEEDS_MATCH.has(o.ownership?.match_status || 'unmatched')).length,
          conflicts: opps.filter((o) => !!o.ownership?.conflict_note).length,
        },
        review_queue: reviewQueue,
        config,
        default_fields: DEFAULT_ALLOWED_ENRICHMENT,
        default_contact_fields: DEFAULT_CONTACT_SOURCE_FIELDS,
        default_fact_fields: DEFAULT_PROPERTY_FACT_FIELDS,
      });
    }

    if (action === 'import_detail') {
      const importRec = (await base44.asServiceRole.entities.AgentListingImport.filter({ id: body.import_id }))[0];
      if (!importRec) return json({ error: 'Import not found' }, 404);
      const rows = await base44.asServiceRole.entities.AgentListingImportRow.filter(
        { import_id: importRec.id },
        'row_index',
        200,
        0,
      );
      const opportunities = await base44.asServiceRole.entities.AgentListingOpportunity.filter(
        { last_import_id: importRec.id },
        '-created_date',
        200,
        0,
      );
      return json({ import: importRec, rows: rows || [], opportunities: opportunities || [] });
    }

    if (action === 'resolve_match') {
      const opp = (await base44.asServiceRole.entities.AgentListingOpportunity.filter({ id: body.opportunity_id }))[0];
      if (!opp) return json({ error: 'Opportunity not found' }, 404);
      const decision = body.decision === 'reject' ? 'reject' : 'confirm';
      const ownership = { ...(opp.ownership || {}) };
      const candidates = ownership.candidates || [];
      const chosen = candidates.find((c) => c.id === body.candidate_id) || null;

      if (decision === 'confirm') {
        if (!chosen && ownership.match_status !== 'verified') {
          return json({ error: 'Pick the candidate record that is the same property before confirming.' }, 400);
        }
        if (chosen) {
          ownership.owner_of_record = chosen.owner_of_record || ownership.owner_of_record || '';
          ownership.ownership_type = chosen.ownership_type || ownership.ownership_type || 'unknown';
          ownership.owner_mailing_address = chosen.owner_mailing_address || ownership.owner_mailing_address || '';
          ownership.parcel_id = chosen.apn || ownership.parcel_id || '';
          ownership.characteristics = chosen.characteristics || ownership.characteristics || {};
          ownership.source_record_id = chosen.id;
          ownership.source = chosen.source || ownership.source || 'PropStream';
          ownership.source_date = chosen.source_date || ownership.source_date || '';
        }
        ownership.match_status = 'verified';
        ownership.review_status = 'confirmed';
        ownership.rule_used = 'admin_confirmed';
        ownership.confidence_basis = chosen
          ? `Administrator confirmed candidate ${chosen.id} as the same property.`
          : 'Administrator confirmed the existing verified match.';
        ownership.conflict_note = '';
      } else {
        ownership.review_status = 'rejected';
        ownership.match_status = 'no_match';
        ownership.rule_used = 'admin_rejected';
        ownership.confidence_basis = 'Administrator reviewed the candidates and rejected them as a different property.';
      }
      ownership.resolved_by_name = user.full_name || user.email || '';
      ownership.resolved_at = new Date().toISOString();
      ownership.note = String(body.note || '').slice(0, 1000);

      await base44.asServiceRole.entities.AgentListingOpportunity.update(opp.id, {
        ownership,
        last_activity_at: new Date().toISOString(),
      });
      await audit(base44, {
        agent_user_id: opp.agent_user_id,
        ...actor,
        event_type: decision === 'confirm' ? 'match_confirmed' : 'match_rejected',
        opportunity_id: opp.id,
        property_id: opp.property_id,
        details: { candidate_id: body.candidate_id || '', note: ownership.note, previous_status: opp.ownership?.match_status },
      });
      return json({ ok: true, ownership });
    }

    if (action === 'retry_import') {
      const importRec = (await base44.asServiceRole.entities.AgentListingImport.filter({ id: body.import_id }))[0];
      if (!importRec) return json({ error: 'Import not found' }, 404);
      const failedRows = await base44.asServiceRole.entities.AgentListingImportRow.filter(
        { import_id: importRec.id, status: 'failed' },
        'row_index',
        200,
        0,
      );
      for (const row of failedRows || []) {
        await base44.asServiceRole.entities.AgentListingImportRow.update(row.id, {
          status: 'pending',
          error_code: '',
          error_message: '',
        });
      }
      await base44.asServiceRole.entities.AgentListingImport.update(importRec.id, {
        status: 'queued',
        reprocess_count: (importRec.reprocess_count || 0) + 1,
        last_error: '',
      });
      await audit(base44, {
        agent_user_id: importRec.agent_user_id,
        ...actor,
        event_type: 'import_retried',
        import_id: importRec.id,
        details: { requeued_rows: (failedRows || []).length },
      });
      const result = await processImport(base44, importRec.id, { maxRows: 25, actor });
      return json({ ok: true, requeued: (failedRows || []).length, progress: result });
    }

    if (action === 'recheck_unmatched') {
      const all = await base44.asServiceRole.entities.AgentListingOpportunity.filter({}, '-created_date', 300, 0);
      const targets = (all || [])
        .filter((o) => NEEDS_MATCH.has(o?.ownership?.match_status || 'unmatched'))
        .filter((o) => !body.state || String(o.address?.state || '').toUpperCase() === String(body.state).toUpperCase())
        .slice(0, body.limit || 8);
      const results = [];
      for (const opp of targets) {
        try {
          const ownership = await applyMatch(base44, opp, config, { actor });
          results.push({ opportunity_id: opp.id, match_status: ownership.match_status });
        } catch (error) {
          console.error('[agentListingAdmin] recheck failed:', opp.id, error?.message);
          results.push({ opportunity_id: opp.id, error: error?.message });
        }
      }
      if (results.length) {
        await audit(base44, {
          agent_user_id: targets[0].agent_user_id,
          ...actor,
          event_type: 'reference_recheck',
          details: { checked: results.length, scope_state: body.state || 'all' },
        });
      }
      return json({ processed: results, remaining: Math.max(0, targets.length - results.length) });
    }

    if (action === 'reassign') {
      const opp = (await base44.asServiceRole.entities.AgentListingOpportunity.filter({ id: body.opportunity_id }))[0];
      if (!opp) return json({ error: 'Opportunity not found' }, 404);
      const email = String(body.to_agent_email || '').toLowerCase().trim();
      if (!email) return json({ error: 'Target agent email is required' }, 400);
      const users = await base44.asServiceRole.entities.User.filter({ email });
      const target = (users || [])[0];
      if (!target) return json({ error: 'No platform user with that email' }, 404);

      const duplicate = await base44.asServiceRole.entities.AgentListingOpportunity.filter({
        agent_user_id: target.id,
        property_id: opp.property_id,
      });
      if (duplicate && duplicate.length) {
        return json({ error: 'That agent already has an opportunity for this property.' }, 409);
      }

      await base44.asServiceRole.entities.AgentListingOpportunity.update(opp.id, {
        agent_user_id: target.id,
        agent_name: target.full_name || target.email || '',
        last_activity_at: new Date().toISOString(),
      });
      if (opp.crm_opportunity_id) {
        try {
          await base44.asServiceRole.entities.Opportunity.update(opp.crm_opportunity_id, { assigned_owner: target.id });
        } catch (error) {
          console.error('[agentListingAdmin] CRM reassignment failed:', error?.message);
        }
      }
      await audit(base44, {
        agent_user_id: target.id,
        ...actor,
        event_type: 'opportunity_reassigned',
        opportunity_id: opp.id,
        property_id: opp.property_id,
        details: { from_agent: opp.agent_email || opp.agent_user_id, to_agent: target.email, from_agent_id: opp.agent_user_id, to_agent_id: target.id },
      });
      return json({ ok: true, to_agent: target.email });
    }

    if (action === 'config_get') {
      return json({
        config,
        default_fields: DEFAULT_ALLOWED_ENRICHMENT,
        default_contact_fields: DEFAULT_CONTACT_SOURCE_FIELDS,
        default_fact_fields: DEFAULT_PROPERTY_FACT_FIELDS,
      });
    }

    // Enrichment job and export-activity monitoring. Admin oversight only: counts,
    // scope and outcomes — never the exported contact values themselves.
    if (action === 'enrichment_overview') {
      const jobs = await base44.asServiceRole.entities.AgentListingEnrichJob.filter({}, '-created_date', 40, 0);
      const exports = await base44.asServiceRole.entities.AgentListingExport.filter({}, '-requested_at', 40, 0);
      const opps = await base44.asServiceRole.entities.AgentListingOpportunity.filter({}, '-created_date', 400, 0);
      const withContacts = (opps || []).filter((o) => (o.contacts || []).length > 0);
      const needsReview = (opps || []).filter((o) => o.enrichment?.status === 'review_required');
      const failed = (opps || []).filter((o) => o.enrichment?.status === 'failed');

      return json({
        jobs: (jobs || []).map((j) => ({
          id: j.id,
          agent_name: j.agent_name,
          agent_user_id: j.agent_user_id,
          scope: j.scope,
          status: j.status,
          total_targets: j.total_targets || 0,
          processed_count: j.processed_count || 0,
          enriched_count: j.enriched_count || 0,
          current_count: j.current_count || 0,
          partial_count: j.partial_count || 0,
          review_required_count: j.review_required_count || 0,
          no_reference_count: j.no_reference_count || 0,
          failed_count: j.failed_count || 0,
          retry_count: j.retry_count || 0,
          last_error: j.last_error || '',
          started_at: j.started_at || '',
          completed_at: j.completed_at || '',
        })),
        exports: (exports || []).map((e) => ({
          id: e.id,
          agent_name: e.agent_name,
          requested_at: e.requested_at,
          scope: e.scope,
          opportunity_count: e.opportunity_count,
          people_evaluated: e.people_evaluated,
          eligible_count: e.eligible_count,
          excluded_counts: e.excluded_counts || {},
          policy_version: e.policy_version,
          row_count: e.row_count,
          file_expires_at: e.file_expires_at,
        })),
        summary: {
          jobs_total: (jobs || []).length,
          jobs_running: (jobs || []).filter((j) => j.status === 'processing' || j.status === 'queued').length,
          jobs_failed: (jobs || []).filter((j) => j.status === 'failed' || j.status === 'partial').length,
          records_with_contacts: withContacts.length,
          records_needing_review: needsReview.length,
          records_failed: failed.length,
          exports_total: (exports || []).length,
          people_exported: (exports || []).reduce((sum, e) => sum + (e.eligible_count || 0), 0),
        },
        source_use_policy: config.source_use_policy || {},
      });
    }

    if (action === 'config_set') {
      const incoming = body.config || {};
      const numeric = (value, fallback, min, max) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
      };
      const allowed = Array.isArray(incoming.allowed_enrichment_fields)
        ? incoming.allowed_enrichment_fields.filter((f) => DEFAULT_ALLOWED_ENRICHMENT.includes(f))
        : config.allowed_enrichment_fields;
      const patch = {
        key: 'default',
        matching_version: String(incoming.matching_version || config.matching_version || 'v1').slice(0, 20),
        auto_verify_min_score: numeric(incoming.auto_verify_min_score, config.auto_verify_min_score, 60, 100),
        possible_min_score: numeric(incoming.possible_min_score, config.possible_min_score, 40, 95),
        ambiguity_gap: numeric(incoming.ambiguity_gap, config.ambiguity_gap, 0, 40),
        max_candidates: numeric(incoming.max_candidates, config.max_candidates, 1, 10),
        max_rows_per_import: numeric(incoming.max_rows_per_import, config.max_rows_per_import, 50, 2000),
        max_ai_calls_per_import: numeric(incoming.max_ai_calls_per_import, config.max_ai_calls_per_import, 0, 200),
        ai_assist_enabled: incoming.ai_assist_enabled !== undefined ? !!incoming.ai_assist_enabled : config.ai_assist_enabled,
        allowed_enrichment_fields: allowed.length ? allowed : DEFAULT_ALLOWED_ENRICHMENT,
        contact_source_fields: Array.isArray(incoming.contact_source_fields)
          ? (incoming.contact_source_fields.filter((f) => DEFAULT_CONTACT_SOURCE_FIELDS.includes(f)).length
            ? incoming.contact_source_fields.filter((f) => DEFAULT_CONTACT_SOURCE_FIELDS.includes(f))
            : config.contact_source_fields)
          : config.contact_source_fields,
        property_fact_fields: Array.isArray(incoming.property_fact_fields)
          ? (incoming.property_fact_fields.filter((f) => DEFAULT_PROPERTY_FACT_FIELDS.includes(f)).length
            ? incoming.property_fact_fields.filter((f) => DEFAULT_PROPERTY_FACT_FIELDS.includes(f))
            : config.property_fact_fields)
          : config.property_fact_fields,
        source_use_policy: incoming.source_use_policy
          ? {
            customer_list_export_enabled: incoming.source_use_policy.customer_list_export_enabled === true,
            allowed_use_note: String(incoming.source_use_policy.allowed_use_note || '').slice(0, 500),
            policy_version: String(incoming.source_use_policy.policy_version || config.source_use_policy?.policy_version || 'v1').slice(0, 20),
            updated_by_name: user.full_name || user.email || '',
            updated_at: new Date().toISOString(),
          }
          : config.source_use_policy,
        updated_by_name: user.full_name || user.email || '',
        updated_at: new Date().toISOString(),
      };
      const existing = await base44.asServiceRole.entities.AgentListingConfig.filter({ key: 'default' });
      if (existing && existing.length) {
        await base44.asServiceRole.entities.AgentListingConfig.update(existing[0].id, patch);
      } else {
        await base44.asServiceRole.entities.AgentListingConfig.create(patch);
      }
      await audit(base44, {
        agent_user_id: user.id,
        ...actor,
        event_type: 'config_updated',
        details: { patch },
      });
      return json({ ok: true, config: patch });
    }

    if (action === 'trends') {
      const all = await base44.asServiceRole.entities.AgentListingOpportunity.filter({}, '-created_date', 400, 0);
      const opps = all || [];
      const byState = {};
      for (const opp of opps) {
        const state = String(opp.address?.state || 'Unknown').toUpperCase();
        if (!byState[state]) byState[state] = { state, total: 0, unmatched: 0, verified: 0, possible: 0 };
        byState[state].total += 1;
        const status = opp.ownership?.match_status;
        if (status === 'verified') byState[state].verified += 1;
        else if (status === 'possible') byState[state].possible += 1;
        else byState[state].unmatched += 1;
      }
      const referenceSample = await base44.asServiceRole.entities.PropstreamREListing.filter({}, '-created_date', 1000, 0);
      const referenceTotal = (referenceSample || []).length;
      const newest = (referenceSample || []).slice(0, 1);
      const imports = await base44.asServiceRole.entities.AgentListingImport.filter({}, '-imported_at', 100, 0);
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
      return json({
        reference: {
          total_records: referenceTotal,
          newest_record_added: newest?.[0]?.created_date || '',
          newest_source_date: newest?.[0]?.list_date || newest?.[0]?.last_sale_date || '',
        },
        by_state: Object.values(byState).sort((a, b) => b.unmatched - a.unmatched),
        imports_30d: (imports || []).filter((i) => (i.imported_at || '') >= cutoff).length,
        rows_imported_30d: (imports || [])
          .filter((i) => (i.imported_at || '') >= cutoff)
          .reduce((sum, i) => sum + (i.imported_count || 0) + (i.updated_count || 0), 0),
      });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('[agentListingAdmin] error:', error?.message, error?.stack);
    return json({ error: error?.message || 'Admin request failed' }, 500);
  }
}