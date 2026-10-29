import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  currentUser,
  isAdmin,
  canAccessAgentRecord,
  loadConfig,
  contactsForAgent,
  audit,
  json,
} from '../../shared/listingAccess.ts';
import { enrichOpportunity } from '../../shared/listingEnrichment.ts';
import { resolveScopedOpportunities } from '../../shared/listingScope.ts';

// Owner/property enrichment for the agent's own pending listings.
// Persistent job + bounded batches so the agent can leave and come back, and a
// duplicate click can never start a second identical run.

const MAX_TARGETS = 500;
const MAX_BATCH = 25;

const CONTACT_STATUSES = ['none', 'confirmed', 'incorrect', 'disconnected', 'not_owner'];
const PERMISSION_BASES = ['owner_written_permission', 'signed_agreement_advertising_clause', 'platform_opt_in', 'other_documented'];

function jobView(job) {
  if (!job) return null;
  const total = job.total_targets || 0;
  const processed = job.processed_count || 0;
  return {
    id: job.id,
    scope: job.scope,
    filter: job.filter || '',
    search_query: job.search_query || '',
    status: job.status,
    total_targets: total,
    processed_count: processed,
    remaining: Math.max(total - processed, 0),
    percent: total === 0 ? 0 : Math.min(100, Math.round((processed / total) * 100)),
    enriched_count: job.enriched_count || 0,
    current_count: job.current_count || 0,
    partial_count: job.partial_count || 0,
    review_required_count: job.review_required_count || 0,
    no_reference_count: job.no_reference_count || 0,
    failed_count: job.failed_count || 0,
    retry_count: job.retry_count || 0,
    last_error: job.last_error || '',
    started_at: job.started_at || '',
    last_batch_at: job.last_batch_at || '',
    completed_at: job.completed_at || '',
  };
}

async function loadJob(base44, user, jobId) {
  const rows = await base44.asServiceRole.entities.AgentListingEnrichJob.filter({ id: jobId });
  const job = (rows || [])[0];
  if (!job) return null;
  return canAccessAgentRecord(job, user) ? job : null;
}

function bumpCounters(job, category) {
  const patch = { processed_count: (job.processed_count || 0) + 1 };
  if (category === 'enriched') patch.enriched_count = (job.enriched_count || 0) + 1;
  else if (category === 'current') patch.current_count = (job.current_count || 0) + 1;
  else if (category === 'partial') patch.partial_count = (job.partial_count || 0) + 1;
  else if (category === 'review_required') patch.review_required_count = (job.review_required_count || 0) + 1;
  else if (category === 'no_reference') patch.no_reference_count = (job.no_reference_count || 0) + 1;
  else patch.failed_count = (job.failed_count || 0) + 1;
  return patch;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'status';
    const actor = { actor_user_id: user.id, actor_name: user.full_name || user.email || '', actor_role: isAdmin(user) ? 'admin' : 'agent' };
    const config = await loadConfig(base44);

    if (action === 'start') {
      const scope = body.scope === 'filtered' ? 'filtered' : 'selected';
      const filter = String(body.filter || 'work_today');
      const q = String(body.q || '');
      const targets = await resolveScopedOpportunities(base44, user, {
        scope,
        opportunity_ids: body.opportunity_ids || [],
        filter,
        q,
        limit: MAX_TARGETS,
      });

      if (targets.length === 0) {
        return json({ ok: false, error: 'No records in that scope. Select properties or change the filter first.' }, 400);
      }

      // Duplicate-click protection: one open job per agent.
      const open = (await base44.asServiceRole.entities.AgentListingEnrichJob.filter({ agent_user_id: user.id }, '-created_date', 10, 0))
        .find((j) => j.status === 'queued' || j.status === 'processing');
      if (open) {
        return json({ ok: true, job: jobView(open), already_running: true });
      }

      const job = await base44.asServiceRole.entities.AgentListingEnrichJob.create({
        agent_user_id: user.id,
        agent_name: user.full_name || user.email || '',
        scope,
        filter: scope === 'filtered' ? filter : '',
        search_query: scope === 'filtered' ? q : '',
        target_ids: targets.map((t) => t.id),
        total_targets: targets.length,
        status: 'queued',
      });

      await audit(base44, {
        agent_user_id: user.id,
        ...actor,
        event_type: 'enrichment_started',
        enrich_job_id: job.id,
        details: { scope, filter: scope === 'filtered' ? filter : '', targets: targets.length },
      });

      return json({ ok: true, job: jobView(job) });
    }

    if (action === 'process') {
      const job = await loadJob(base44, user, body.job_id);
      if (!job) return json({ error: 'Not found' }, 404);
      if (job.status === 'completed') return json({ ok: true, job: jobView(job), done: true });

      const batchSize = Math.min(Math.max(Number(body.batch_size) || 15, 1), MAX_BATCH);
      const startedAt = Date.now();
      const timeBudget = 55000;

      let cursor = job.cursor_index || 0;
      let counters = { ...job };
      const targetIds = Array.isArray(job.target_ids) ? job.target_ids : [];
      const batchRows = [];

      await base44.asServiceRole.entities.AgentListingEnrichJob.update(job.id, {
        status: 'processing',
        started_at: job.started_at || new Date().toISOString(),
      });

      for (let i = 0; i < batchSize && cursor < targetIds.length; i += 1) {
        if (Date.now() - startedAt > timeBudget) break;
        const id = targetIds[cursor];
        cursor += 1;
        try {
          const opp = (await base44.asServiceRole.entities.AgentListingOpportunity.filter({ id }))[0];
          if (!opp || opp.agent_user_id !== job.agent_user_id) {
            counters = { ...counters, ...bumpCounters(counters, 'failed'), cursor_index: cursor };
            continue;
          }
          const result = await enrichOpportunity(base44, opp, config, job.id);
          await base44.asServiceRole.entities.AgentListingOpportunity.update(opp.id, result.patch);
          counters = { ...counters, ...bumpCounters(counters, result.category), cursor_index: cursor };
          batchRows.push({ opportunity_id: opp.id, category: result.category });
          if (result.category === 'failed') {
            await audit(base44, {
              agent_user_id: opp.agent_user_id,
              ...actor,
              event_type: 'enrichment_row_failed',
              enrich_job_id: job.id,
              opportunity_id: opp.id,
              property_id: opp.property_id,
              details: { message: String(result.message || '').slice(0, 240) },
            });
          }
        } catch (error) {
          console.error('[agentListingEnrich] row failed:', error?.message);
          counters = { ...counters, ...bumpCounters(counters, 'failed'), cursor_index: cursor, last_error: String(error?.message || 'Row failed') };
          await audit(base44, {
            agent_user_id: job.agent_user_id,
            ...actor,
            event_type: 'enrichment_row_failed',
            enrich_job_id: job.id,
            details: { message: String(error?.message || '').slice(0, 240) },
          });
        }
      }

      const done = cursor >= targetIds.length;
      const failed = counters.failed_count || 0;
      const patch = {
        cursor_index: cursor,
        processed_count: counters.processed_count || 0,
        enriched_count: counters.enriched_count || 0,
        current_count: counters.current_count || 0,
        partial_count: counters.partial_count || 0,
        review_required_count: counters.review_required_count || 0,
        no_reference_count: counters.no_reference_count || 0,
        failed_count: failed,
        last_error: counters.last_error || '',
        last_batch_at: new Date().toISOString(),
        status: done ? (failed > 0 ? 'partial' : 'completed') : 'processing',
        completed_at: done ? new Date().toISOString() : '',
      };
      await base44.asServiceRole.entities.AgentListingEnrichJob.update(job.id, patch);

      await audit(base44, {
        agent_user_id: job.agent_user_id,
        ...actor,
        event_type: done ? 'enrichment_completed' : 'enrichment_batch',
        enrich_job_id: job.id,
        details: {
          processed: patch.processed_count,
          enriched: patch.enriched_count,
          current: patch.current_count,
          partial: patch.partial_count,
          review_required: patch.review_required_count,
          no_reference: patch.no_reference_count,
          failed: patch.failed_count,
          rows: batchRows.length,
        },
      });

      const updated = await loadJob(base44, user, job.id);
      return json({ ok: true, job: jobView(updated), done });
    }

    if (action === 'status' || action === 'list') {
      const jobs = await base44.asServiceRole.entities.AgentListingEnrichJob.filter(
        { agent_user_id: user.id },
        '-created_date',
        10,
        0,
      );
      const active = (jobs || []).find((j) => j.status === 'queued' || j.status === 'processing') || null;
      const requested = body.job_id ? (jobs || []).find((j) => j.id === body.job_id) : null;
      return json({
        jobs: (jobs || []).map(jobView),
        active: jobView(active),
        job: jobView(requested || (jobs || [])[0] || null),
      });
    }

    if (action === 'retry') {
      const job = await loadJob(base44, user, body.job_id);
      if (!job) return json({ error: 'Not found' }, 404);
      const targets = await resolveScopedOpportunities(base44, user, {
        scope: 'selected',
        opportunity_ids: (job.target_ids || []).slice(0, MAX_TARGETS),
        limit: MAX_TARGETS,
      });
      const failedIds = targets
        .filter((opp) => (opp.enrichment?.status || 'never') === 'failed')
        .map((opp) => opp.id);
      const ids = failedIds.length > 0 ? failedIds : targets.map((opp) => opp.id);

      const open = (await base44.asServiceRole.entities.AgentListingEnrichJob.filter({ agent_user_id: user.id }, '-created_date', 10, 0))
        .find((j) => j.status === 'queued' || j.status === 'processing');
      if (open) return json({ ok: true, job: jobView(open), already_running: true });

      await base44.asServiceRole.entities.AgentListingEnrichJob.update(job.id, { retry_count: (job.retry_count || 0) + 1 });
      const next = await base44.asServiceRole.entities.AgentListingEnrichJob.create({
        agent_user_id: user.id,
        agent_name: user.full_name || user.email || '',
        scope: 'selected',
        target_ids: ids,
        total_targets: ids.length,
        status: 'queued',
      });
      await audit(base44, {
        agent_user_id: user.id,
        ...actor,
        event_type: 'enrichment_retried',
        enrich_job_id: next.id,
        details: { previous_job_id: job.id, targets: ids.length, retried_failed_only: failedIds.length > 0 },
      });
      return json({ ok: true, job: jobView(next) });
    }

    if (action === 'mark_contact') {
      const rows = await base44.asServiceRole.entities.AgentListingOpportunity.filter({ id: body.opportunity_id });
      const opp = (rows || [])[0];
      if (!opp || opp.agent_user_id !== user.id) return json({ error: 'Not found' }, 404);
      const status = String(body.status || 'none');
      if (!CONTACT_STATUSES.includes(status)) return json({ error: 'Unknown contact mark' }, 400);

      const at = new Date().toISOString();
      let found = false;
      const contacts = (Array.isArray(opp.contacts) ? opp.contacts : []).map((c) => {
        if (c.contact_id !== body.contact_id && c.value !== body.contact_id) return c;
        found = true;
        return {
          ...c,
          agent_status: status,
          agent_status_by_name: status === 'none' ? '' : (user.full_name || user.email || ''),
          agent_status_at: status === 'none' ? '' : at,
        };
      });
      if (!found) return json({ error: 'Contact value not found on this record' }, 404);

      await base44.asServiceRole.entities.AgentListingOpportunity.update(opp.id, {
        contacts,
        last_activity_at: at,
      });
      await audit(base44, {
        agent_user_id: opp.agent_user_id,
        ...actor,
        event_type: 'contact_marked',
        opportunity_id: opp.id,
        property_id: opp.property_id,
        details: { kind: String(body.kind || ''), status },
      });

      const view = contactsForAgent({ ...opp, contacts });
      return json({ ok: true, contacts: view.contacts, withheld: view.withheld });
    }

    if (action === 'set_permission') {
      const rows = await base44.asServiceRole.entities.AgentListingOpportunity.filter({ id: body.opportunity_id });
      const opp = (rows || [])[0];
      if (!opp || opp.agent_user_id !== user.id) return json({ error: 'Not found' }, 404);
      const at = new Date().toISOString();

      if (body.granted === false) {
        const permission = {
          ...(opp.advertising_permission || {}),
          granted: false,
          revoked_at: at,
        };
        await base44.asServiceRole.entities.AgentListingOpportunity.update(opp.id, {
          advertising_permission: permission,
          last_activity_at: at,
        });
        await audit(base44, {
          agent_user_id: opp.agent_user_id,
          ...actor,
          event_type: 'advertising_permission_revoked',
          opportunity_id: opp.id,
          property_id: opp.property_id,
          details: {},
        });
        return json({ ok: true, advertising_permission: permission });
      }

      const basis = String(body.basis || '');
      const reference = String(body.reference || '').trim().slice(0, 400);
      if (!PERMISSION_BASES.includes(basis)) {
        return json({ error: 'Choose how permission was obtained.' }, 400);
      }
      if (reference.length < 4) {
        return json({ error: 'Record where the permission evidence lives. A checkbox alone is not evidence.' }, 400);
      }

      const permission = {
        granted: true,
        basis,
        reference,
        scope_note: String(body.scope_note || '').slice(0, 400),
        captured_by_name: user.full_name || user.email || '',
        captured_at: at,
        revoked_at: '',
      };
      await base44.asServiceRole.entities.AgentListingOpportunity.update(opp.id, {
        advertising_permission: permission,
        last_activity_at: at,
      });
      await audit(base44, {
        agent_user_id: opp.agent_user_id,
        ...actor,
        event_type: 'advertising_permission_recorded',
        opportunity_id: opp.id,
        property_id: opp.property_id,
        details: { basis, has_reference: true },
      });
      return json({ ok: true, advertising_permission: permission });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('[agentListingEnrich] failed:', error?.message, error?.stack);
    return json({ error: 'Enrichment failed. Nothing was changed for the failed record.' }, 500);
  }
}