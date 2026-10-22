import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { buildAuthorityMatrix, restrictedZones } from '../../shared/authorityMatrix.ts';

/**
 * Chapter 19 P1 — MY SALE DAY: the server-side, least-privilege view for a
 * sale-team member on sale day. The caller must be the sale's operator, a
 * member of EstateSale.sale_team, or a platform admin (verified here, before
 * any data is read with the service role — identity is derived server-side,
 * never trusted from the payload).
 *
 *  action 'view'     → { sales: [...] } when no sale_id is given (selector),
 *                      otherwise the assembled least-privilege view model.
 *  action 'ack_brief' → records that the caller reviewed today's opening
 *                      brief (an Activity note; idempotent per user/day).
 *
 * PROJECTION RULES: only team-safe fields leave this function. NEVER exposed:
 * site_assessment/access_details (alarm/gate codes), controlled_location,
 * custody internals, negotiation-private deal economics, contact phone/email
 * of authorities, or anything the operator briefs staff on through tasks.
 */
const MAX_PAGE = 200;

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const firstItems = (res) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
};

const safeSaleZone = (z) => ({
  zone_id: z.zone_id,
  name: z.name,
  prep_status: z.prep_status,
  sale_day_status: z.sale_day_status || null,
  staging_purpose: z.staging_purpose || null,
  access_class: z.access_class || 'UNCLASSIFIED',
  signage_needs: z.signage_needs || '',
});

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = (body && body.action) || 'view';
    const saleId = body && body.sale_id;

    // ── Sales the caller may open (membership derived server-side) ──────────
    const memberOf = (sale) => {
      if (!sale) return false;
      const team = Array.isArray(sale.sale_team) ? sale.sale_team : [];
      return sale.operator_id === user.id || team.includes(user.id) || user.role === 'admin';
    };

    if (action === 'view' && !saleId) {
      const [teamRes, ownRes] = await Promise.all([
        base44.asServiceRole.entities.EstateSale.filter({ sale_team: { $in: [user.id] } }, { sort: '-created_date', limit: 50 }),
        base44.asServiceRole.entities.EstateSale.filter({ operator_id: user.id }, { sort: '-created_date', limit: 50 }),
      ]);
      const seen = new Set();
      const sales = [...firstItems(teamRes), ...firstItems(ownRes)]
        .filter((s) => memberOf(s) && !seen.has(s.id) && seen.add(s.id))
        .map((s) => ({ id: s.id, title: s.title, status: s.status, sale_dates: s.sale_dates || [] }));
      return Response.json({ sales });
    }

    if (!saleId) {
      return Response.json({ error: 'sale_id is required' }, { status: 400 });
    }

    const saleRows = firstItems(await base44.asServiceRole.entities.EstateSale.filter({ id: saleId }));
    const sale = saleRows[0];
    if (!sale) {
      return Response.json({ error: 'Sale not found' }, { status: 404 });
    }
    if (!memberOf(sale)) {
      return Response.json({ error: 'You are not on this sale team' }, { status: 403 });
    }

    // ── ack_brief: idempotent per user per day ───────────────────────────────
    if (action === 'ack_brief') {
      const dayStart = todayStart();
      const prior = firstItems(await base44.asServiceRole.entities.Activity.filter(
        { sale_id: sale.id, user_id: user.id, subject: 'Opening brief reviewed' },
        { sort: '-created_date', limit: 5 }
      ));
      const already = prior.some((a) => a.completed_date && a.completed_date >= dayStart);
      if (!already) {
        await base44.asServiceRole.entities.Activity.create({
          user_id: user.id,
          sale_id: sale.id,
          operator_id: sale.operator_id,
          activity_type: 'note',
          subject: 'Opening brief reviewed',
          description: `${user.full_name || user.email || 'A team member'} reviewed the opening brief in My Sale Day.`,
          status: 'completed',
          completed_date: new Date().toISOString(),
        });
      }
      return Response.json({ ok: true, already: !!already });
    }

    if (action !== 'view') {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    // ── assemble the view model (batched service-role reads) ─────────────────
    const myMemberRows = firstItems(await base44.asServiceRole.entities.TeamMember.filter({ user_id: user.id }, { limit: 10 }));
    const myMemberIds = myMemberRows.map((m) => m.id);

    const [itemRes, taskRes, issueRes, decRes, authRes, assignRes] = await Promise.all([
      base44.asServiceRole.entities.Item.filter({ estate_sale_id: sale.id }, { limit: MAX_PAGE }),
      base44.asServiceRole.entities.SaleTask.filter({ sale_id: sale.id }, { limit: MAX_PAGE }),
      base44.asServiceRole.entities.SaleIssue.filter({ sale_id: sale.id }, { limit: MAX_PAGE }),
      base44.asServiceRole.entities.SaleClientDecision.filter({ sale_id: sale.id }, { limit: MAX_PAGE }),
      base44.asServiceRole.entities.SaleAuthority.filter({ sale_id: sale.id }, { limit: 50 }),
      base44.asServiceRole.entities.SaleStaffAssignment.filter({ sale_id: sale.id }, { limit: 100 }),
    ]);

    const [docRes, ackRes, briefActRes] = await Promise.all([
      base44.asServiceRole.entities.BusinessDocument.filter({ operator_id: sale.operator_id, category: 'POLICY', status: 'ACTIVE' }, { limit: 50 }),
      base44.asServiceRole.entities.PolicyAcknowledgment.filter({ operator_id: sale.operator_id, user_id: user.id }, { limit: 50 }),
      base44.asServiceRole.entities.Activity.filter({ sale_id: sale.id, subject: 'Opening brief reviewed' }, { sort: '-created_date', limit: 20 }),
    ]);

    let company = null;
    if (sale.company_id) {
      company = firstItems(await base44.asServiceRole.entities.Company.filter({ id: sale.company_id }, { limit: 1 }))[0] || null;
    }
    if (!company) {
      company = firstItems(await base44.asServiceRole.entities.Company.filter({ primary_contact_user_id: sale.operator_id }, { limit: 1 }))[0] || null;
    }

    const items = firstItems(itemRes);
    const tasks = firstItems(taskRes);
    const issues = firstItems(issueRes);
    const decisions = firstItems(decRes);
    const authorities = firstItems(authRes);
    const assignments = firstItems(assignRes);
    const policyDocs = firstItems(docRes);
    const myAcks = firstItems(ackRes);
    const briefReviews = firstItems(briefActRes);

    const activeAssignments = assignments.filter((a) => (a.status || 'ACTIVE') === 'ACTIVE');
    const mine = (a) =>
      a.primary_user_id === user.id || a.backup_user_id === user.id ||
      myMemberIds.includes(a.primary_team_member_id) || myMemberIds.includes(a.backup_team_member_id);

    const highValueItems = items.filter((i) => i.inventory_level === 'HIGH_VALUE' || (i.display_attention && i.display_attention !== 'NONE'));
    const authorityMatrix = buildAuthorityMatrix({
      negotiationPolicy: (company && company.negotiation_policy) || {},
      hasHighValueItems: items.some((i) => i.inventory_level === 'HIGH_VALUE'),
    });

    const zones = (Array.isArray(sale.prep_zones) ? sale.prep_zones : []).map(safeSaleZone);
    const dayStart = todayStart();
    const todayIso = new Date().toISOString().slice(0, 10);

    // Open issues: URGENT first; include issues this person raised so they can
    // see whether their ask for help was resolved and what the answer was.
    const sortedIssues = [...issues].sort((a, b) => {
      const rank = { URGENT: 0, IMPORTANT: 1, ROUTINE: 2 };
      return (rank[a.urgency || 'ROUTINE'] ?? 2) - (rank[b.urgency || 'ROUTINE'] ?? 2);
    });
    const safeIssue = (i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      urgency: i.urgency || 'ROUTINE',
      status: i.status,
      resolution: i.status === 'RESOLVED' || i.status === 'CANCELLED' ? (i.resolution || '') : '',
      owner_name: i.owner_name || '',
      requested_by_name: i.requested_by_name || '',
      answer_by: i.answer_by || null,
      raised_by_me: i.created_by_id === user.id || (user.full_name && i.requested_by_name === user.full_name),
    });

    const openDecisions = decisions
      .filter((d) => d.status === 'open')
      .map((d) => ({
        id: d.id,
        subject: d.subject,
        decision_type: d.decision_type,
        current_decision: d.current_decision,
        status: d.status,
        request_pending: d.request_status === 'REQUESTED' || d.request_status === 'UNDER_REVIEW',
      }));

    const dayTasks = tasks.filter((t) => t.status !== 'completed' && t.due_date && t.due_date <= todayIso)
      .map((t) => ({ id: t.id, name: t.name, due_date: t.due_date, assignee_name: t.assignee_name || 'Unassigned' }));

    // Policies with short-lived signed file URLs + my acknowledgment state.
    const policies = await Promise.all(policyDocs.map(async (doc) => {
      let file_url = null;
      if (doc.file_uri) {
        try {
          const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
          file_url = signed && signed.signed_url ? signed.signed_url : null;
        } catch (e) {
          file_url = null;
        }
      }
      const ack = myAcks.find((a) => a.business_document_id === doc.id);
      return {
        id: doc.id,
        title: doc.title,
        policy_type: doc.policy_type || '',
        version: doc.version || 1,
        expiration_date: doc.expiration_date || null,
        file_url,
        my_ack: ack ? { status: ack.status, acknowledged_version: ack.acknowledged_version || null } : null,
      };
    }));

    const reviewedToday = briefReviews
      .filter((a) => a.completed_date && a.completed_date >= dayStart)
      .map((a) => a.user_id === user.id ? (user.full_name || 'You') : 'A team member');

    const brief = {
      sale_title: sale.title,
      responsibilities: activeAssignments.map((a) => ({
        responsibility_type: a.responsibility_type,
        zone_name: a.zone_name || '',
        primary_member_name: a.primary_member_name || 'Unassigned',
        backup_member_name: a.backup_member_name || '',
      })),
      tasks_due_today: dayTasks,
      authority_matrix: authorityMatrix,
      discount_policy_note: (company && company.negotiation_policy && company.negotiation_policy.notes) || '',
      pickup_plan: sale.pickup_plan || null,
      restricted_zones: restrictedZones(sale),
      excluded_areas: (sale.excluded_areas || []).map((e) => ({ name: e.name, note: e.note || '', resolved: !!e.resolved })),
      high_value_attention: highValueItems.map((i) => ({
        title: i.title,
        item_number: i.item_number || null,
        inventory_level: i.inventory_level,
        display_attention: i.display_attention || 'NONE',
      })),
      controlling_decisions: openDecisions,
      open_issues: sortedIssues.filter((i) => i.status === 'OPEN' || i.status === 'WAITING').slice(0, 15).map(safeIssue),
      special_instructions: sale.special_notes || '',
      customer_flow: sale.customer_flow || null,
    };

    return Response.json({
      me: { id: user.id, name: user.full_name || user.email },
      sale: {
        id: sale.id,
        title: sale.title,
        status: sale.status,
        sale_dates: sale.sale_dates || [],
        property_address: sale.property_address || null,
        // Team-safe ownership projections — the caller is a verified member,
        // and the Ask-for-Help seam needs them to write a valid SaleIssue.
        operator_id: sale.operator_id,
        operator_name: sale.operator_name || '',
        company_id: sale.company_id || '',
        sale_team: sale.sale_team || [],
      },
      my_responsibilities: activeAssignments.filter(mine).map((a) => ({
        id: a.id,
        responsibility_type: a.responsibility_type,
        zone_name: a.zone_name || '',
        primary_member_name: a.primary_member_name || '',
        backup_member_name: a.backup_member_name || '',
        is_backup: a.backup_user_id === user.id || myMemberIds.includes(a.backup_team_member_id),
        planned_hours: a.planned_hours || null,
        notes: a.notes || '',
      })),
      my_tasks: tasks
        .filter((t) => t.assignee_user_id === user.id && t.status !== 'completed')
        .map((t) => ({
          id: t.id, name: t.name, description: t.description || '',
          definition_of_done: t.definition_of_done || '', status: t.status, priority: t.priority,
          due_date: t.due_date || null, blocked: !!t.blocked, blocked_reason: t.blocked_reason || '',
        })),
      my_zones: (Array.isArray(sale.prep_zones) ? sale.prep_zones : [])
        .filter((z) => z.assignee_user_id === user.id)
        .map(safeSaleZone),
      my_issues: sortedIssues
        .filter((i) => i.created_by_id === user.id || (user.full_name && i.requested_by_name === user.full_name))
        .slice(0, 20).map(safeIssue),
      authorities: authorities.map((a) => ({
        full_name: a.full_name,
        relationship: a.relationship || '',
        authority_role: a.authority_role || '',
        is_primary: !!a.is_primary,
        verification_status: a.verification_status || 'UNRESOLVED',
      })),
      policies,
      brief,
      brief_reviewed_today_by: reviewedToday,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}