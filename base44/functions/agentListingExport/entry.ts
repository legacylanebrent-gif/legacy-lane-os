import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  currentUser,
  isAdmin,
  loadConfig,
  audit,
  json,
} from '../../shared/listingAccess.ts';
import { resolveScopedOpportunities } from '../../shared/listingScope.ts';
import { evaluateAudience, buildCustomerListCsv, ELIGIBILITY } from '../../shared/facebookAudience.ts';

// Facebook customer-list export for the agent's OWN records.
// Visibility of a contact is not advertising permission: every person is evaluated
// separately, and the CSV is built into the authenticated response — nothing is
// written to public storage and no identifiers are recorded in the audit trail.

const FILE_TTL_MINUTES = 15;

function groupedExclusions(people) {
  const groups = {};
  for (const person of people) {
    if (person.status === 'eligible') continue;
    if (!groups[person.status]) {
      groups[person.status] = { status: person.status, label: ELIGIBILITY[person.status], count: 0, reason: person.reason, people: [] };
    }
    groups[person.status].count += 1;
    if (groups[person.status].people.length < 40) {
      groups[person.status].people.push({ owner_name: person.ownerName || 'Unnamed owner', detail: person.reason });
    }
  }
  return Object.values(groups).sort((a, b) => b.count - a.count);
}

async function evaluate(base44, user, body, config) {
  const scope = body.scope === 'filtered' ? 'filtered' : 'selected';
  const opportunities = await resolveScopedOpportunities(base44, user, {
    scope,
    opportunity_ids: body.opportunity_ids || [],
    filter: String(body.filter || 'work_today'),
    q: String(body.q || ''),
    limit: 500,
  });
  const evaluation = await evaluateAudience(base44, opportunities, config);
  return { scope, opportunities, evaluation };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'preview';
    const actor = { actor_user_id: user.id, actor_name: user.full_name || user.email || '', actor_role: isAdmin(user) ? 'admin' : 'agent' };
    const config = await loadConfig(base44);

    if (action === 'preview' || action === 'generate') {
      const { scope, opportunities, evaluation } = await evaluate(base44, user, body, config);
      if (opportunities.length === 0) {
        return json({
          ok: false,
          error: 'No properties in that scope. Select properties or change the filter first.',
        }, 400);
      }

      const eligiblePeople = evaluation.people.filter((p) => p.status === 'eligible');
      const base = {
        scope,
        opportunity_count: opportunities.length,
        summary: evaluation.summary,
        exclusions: groupedExclusions(evaluation.people),
        export_fields: ['email', 'phone', 'fn', 'ln', 'ct', 'st', 'zip', 'country'],
        policy_version: evaluation.summary.policy_version,
      };

      if (action === 'preview') {
        await audit(base44, {
          agent_user_id: user.id,
          ...actor,
          event_type: 'export_previewed',
          details: {
            scope,
            opportunities: opportunities.length,
            people: evaluation.summary.people_evaluated,
            eligible: evaluation.summary.eligible,
            excluded: evaluation.summary.excluded,
            policy_version: evaluation.summary.policy_version,
          },
        });
        return json({ ok: true, ...base });
      }

      if (eligiblePeople.length === 0) {
        return json({
          ok: false,
          error: 'No one qualifies for a customer-list export yet. See the excluded reasons below.',
          ...base,
        }, 400);
      }

      const { csv, rowCount, fields } = buildCustomerListCsv(eligiblePeople);
      const now = new Date();
      const expires = new Date(now.getTime() + FILE_TTL_MINUTES * 60000);
      const fileName = `meta-customer-list-${now.toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}.csv`;

      const exportRecord = await base44.asServiceRole.entities.AgentListingExport.create({
        agent_user_id: user.id,
        agent_name: user.full_name || user.email || '',
        scope,
        filter: scope === 'filtered' ? String(body.filter || 'work_today') : '',
        search_query: scope === 'filtered' ? String(body.q || '') : '',
        opportunity_count: opportunities.length,
        people_evaluated: evaluation.summary.people_evaluated,
        eligible_count: eligiblePeople.length,
        excluded_counts: evaluation.summary.counts,
        export_fields: fields,
        format: 'meta_customer_list_csv',
        policy_version: evaluation.summary.policy_version,
        row_count: rowCount,
        file_name: fileName,
        file_expires_at: expires.toISOString(),
        requested_at: now.toISOString(),
      });

      await audit(base44, {
        agent_user_id: user.id,
        ...actor,
        event_type: 'export_downloaded',
        export_id: exportRecord.id,
        details: {
          label: 'CSV downloaded',
          scope,
          opportunities: opportunities.length,
          people_evaluated: evaluation.summary.people_evaluated,
          eligible: eligiblePeople.length,
          excluded: evaluation.summary.excluded,
          excluded_counts: evaluation.summary.counts,
          policy_version: evaluation.summary.policy_version,
          file_name: fileName,
          file_expires_at: expires.toISOString(),
        },
      });

      return json({
        ok: true,
        ...base,
        file_name: fileName,
        row_count: rowCount,
        expires_at: expires.toISOString(),
        csv,
      });
    }

    if (action === 'history') {
      const rows = await base44.asServiceRole.entities.AgentListingExport.filter(
        { agent_user_id: user.id },
        '-requested_at',
        10,
        0,
      );
      return json({
        exports: (rows || []).map((r) => ({
          id: r.id,
          scope: r.scope,
          requested_at: r.requested_at,
          people_evaluated: r.people_evaluated,
          eligible_count: r.eligible_count,
          row_count: r.row_count,
          policy_version: r.policy_version,
          file_expires_at: r.file_expires_at,
        })),
      });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('[agentListingExport] failed:', error?.message, error?.stack);
    return json({ error: 'The export could not be created. Nothing was downloaded.' }, 500);
  }
}