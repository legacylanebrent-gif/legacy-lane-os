/**
 * Chapter 25 P1 — COMPANY KNOWLEDGE seam.
 *
 * The ONE employee-facing approved-knowledge surface (and the operator's SOP
 * lifecycle manager). Doctrine:
 *   AUTHORIZE FIRST. FETCH SECOND. AI THIRD.
 *   SEARCHABILITY DOES NOT OVERRIDE PERMISSION — the corpus is constrained by
 *   authorization BEFORE any search/match; there is no "search everything then
 *   redact".
 *   A DRAFT PROCEDURE IS NOT APPROVED POLICY — only the human 'approve' action
 *   (operator/admin) writes APPROVED, and approving supersedes the prior
 *   approved version (never overwritten, preserved as SUPERSEDED).
 *   AI MAY DRAFT. AI MAY NOT APPROVE — 'ai_draft' only ever creates DRAFT
 *   records labeled ai_generated, which remain invisible to employees.
 *
 * Employees NEVER touch the vault directly (BusinessDocument RLS stays
 * operator/admin-only). This seam returns ONLY safe projections of
 * knowledge.employee_visible === true AND knowledge.sop_status === 'APPROVED'
 * records belonging to an operator the caller genuinely works for.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const KNOWLEDGE_CATEGORIES = ['SOP', 'POLICY', 'TRAINING', 'CHECKLIST'];
const OBSERVATION_LABEL = 'Process observation';

const jerr = (code, message, status = 400) =>
  Response.json({ error: { code, message } }, { status });

const pageOf = (p) => (p && Array.isArray(p.items)) ? p.items : (Array.isArray(p) ? p : []);

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'list');

    // ── AUTHORIZATION: which operator's knowledge may this caller see? ──────
    // Admin: any operator (body.operator_id, default their own record set).
    // Operator: their own. Employee: operators whose TeamMember directory
    // record carries their user_id, or whose sale_team they belong to.
    // The sale-team/TeamMember relationships are derived SERVER-SIDE — never
    // trusted from the payload.
    let operatorIds: string[] = [];
    let isManager = false;
    if (user.role === 'admin') {
      operatorIds = [String(body.operator_id || user.id)];
      isManager = true;
    } else {
      const [members, teamSales] = await Promise.all([
        pageOf(await service.entities.TeamMember.filter({ user_id: user.id }, { limit: 200 })),
        pageOf(await service.entities.EstateSale.filter({ sale_team: user.id }, { limit: 200 })),
      ]);
      const ids = new Set<string>();
      for (const m of members) if (m.operator_id) ids.add(m.operator_id);
      for (const s of teamSales) if (s.operator_id) ids.add(s.operator_id);
      operatorIds = [...ids];
      // A caller who IS one of these operators has manager rights over their
      // own knowledge.
      isManager = operatorIds.includes(user.id);
      if (!operatorIds.length) {
        return jerr('no_company_relationship',
          'You are not on any company team — ask your operator to add you.', 403);
      }
      // Non-admin callers may never target a foreign operator.
      if (body.operator_id && !operatorIds.includes(String(body.operator_id))) {
        return jerr('not_authorized', 'Not your company', 403);
      }
    }
    const targetOperatorId = String(body.operator_id || operatorIds[0]);
    if (!operatorIds.includes(targetOperatorId)) {
      return jerr('not_authorized', 'Not your company', 403);
    }

    // The caller's own Ch19 roles (TeamMember.preferred_roles) — drives the
    // audience_roles server-side filter for non-manager callers.
    let myRoles: string[] = [];
    if (!isManager) {
      const members = pageOf(await service.entities.TeamMember.filter(
        { operator_id: targetOperatorId, user_id: user.id }, { limit: 50 }));
      myRoles = [...new Set(members.flatMap((m) => m.preferred_roles || []))];
    }

    switch (action) {
      case 'context': return context(service, user, operatorIds, myRoles);
      case 'list': return list(service, targetOperatorId, myRoles, isManager, body);
      case 'search': return search(service, targetOperatorId, myRoles, isManager, body);
      case 'get': return getDoc(service, targetOperatorId, myRoles, isManager, body);
      case 'observe': return observe(service, user, operatorIds, body);
      case 'manage_list': return manageList(service, user, targetOperatorId, isManager);
      case 'propose': return propose(service, user, targetOperatorId, isManager, body);
      case 'ai_draft': return aiDraft(service, base44, user, targetOperatorId, isManager, body);
      case 'submit_review': return submitReview(service, user, targetOperatorId, isManager, body);
      case 'approve': return approve(service, user, targetOperatorId, isManager, body);
      case 'review_effectiveness': return reviewEffectiveness(service, user, targetOperatorId, isManager, body);
      case 'suggestions': return suggestions(service, targetOperatorId, isManager);
      case 'audit': return audit(service, targetOperatorId, isManager);
      default: return jerr('unknown_action', 'Unknown action', 400);
    }
  } catch (error) {
    console.error('companyKnowledge error:', error && error.message);
    return jerr('internal_error', 'Unexpected', 500);
  }
}

// ── CORPUS ──────────────────────────────────────────────────────────────────
// Fetch operator knowledge docs, then constrain: APPROVED + employee_visible.
// Only AFTER that are role filters and search applied. Drafts, in-review,
// superseded and non-knowledge categories NEVER enter the employee corpus.
async function fetchCorpus(service, operatorId, { employeesOnly = true } = {}) {
  const docs = pageOf(await service.entities.BusinessDocument.filter(
    { operator_id: operatorId, category: { $in: KNOWLEDGE_CATEGORIES } }, { limit: 500 }));
  return docs.filter((d) => {
    const k = d.knowledge || {};
    if (employeesOnly) return k.employee_visible === true && k.sop_status === 'APPROVED';
    return !!k.sop_status;
  });
}

const roleMatch = (doc, myRoles, isManager) => {
  if (isManager) return true;
  const audience = (doc.knowledge && doc.knowledge.audience_roles) || [];
  if (!audience.length || audience.includes('ALL_STAFF')) return true;
  return audience.some((r: string) => myRoles.includes(r));
};

// Safe projection — NEVER file_uri, notes, uploaded_by, or scope references.
const project = (d, { snippet = null } = {}) => {
  const k = d.knowledge || {};
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    version: d.version || 1,
    purpose: k.purpose || '',
    audience_roles: k.audience_roles || [],
    steps: k.steps || [],
    decision_points: k.decision_points || [],
    exceptions: k.exceptions || [],
    escalation: k.escalation || {},
    completion_standard: k.completion_standard || '',
    change_reason: k.change_reason || '',
    supersedes_document_id: k.supersedes_document_id || null,
    approved_by_name: k.approved_by_name || null,
    approved_at: k.approved_at || null,
    review_date: k.review_date || null,
    source_type: k.source_type || 'MANUAL',
    source_label: k.source_label || '',
    contributor_name: k.contributor_name || '',
    ai_generated: k.ai_generated === true,
    updated_date: d.updated_date || null,
    snippet,
  };
};

async function context(service, user, operatorIds, myRoles) {
  const sales = operatorIds.length === 1
    ? pageOf(await service.entities.EstateSale.filter({ operator_id: operatorIds[0] }, { limit: 100 }))
    : [];
  return Response.json({
    ok: true,
    operators: operatorIds,
    roles: myRoles,
    sales: sales.filter((s) => (s.sale_team || []).includes(user.id) || user.role === 'admin')
      .map((s) => ({ id: s.id, title: s.title })),
  });
}

async function list(service, operatorId, myRoles, isManager, body) {
  const corpus = await fetchCorpus(service, operatorId);
  const category = body.category && KNOWLEDGE_CATEGORIES.includes(body.category)
    ? body.category : null;
  const items = corpus
    .filter((d) => (!category || d.category === category) && roleMatch(d, myRoles, isManager))
    .sort((a, b) => String(b.updated_date || '').localeCompare(String(a.updated_date || '')))
    .map((d) => project(d));
  return Response.json({ ok: true, items });
}

const searchText = (d) => {
  const k = d.knowledge || {};
  return [
    d.title, k.purpose, k.completion_standard, k.change_reason,
    ...(k.steps || []).map((s) => s.text),
    ...(k.decision_points || []).flatMap((p) => [p.condition, p.if_yes, p.if_no]),
    ...(k.exceptions || []),
    k.escalation ? [k.escalation.stop_when, k.escalation.escalate_to, k.escalation.provide] : [],
  ].filter(Boolean).join(' \n ');
};

async function search(service, operatorId, myRoles, isManager, body) {
  const q = String(body.q || '').trim().toLowerCase();
  if (q.length < 2) return jerr('query_required', 'Enter at least 2 characters');
  // Corpus FIRST (authorized, approved, employee-visible), then match —
  // never search-then-redact.
  const corpus = (await fetchCorpus(service, operatorId))
    .filter((d) => roleMatch(d, myRoles, isManager));
  const results = [];
  for (const d of corpus) {
    const text = searchText(d);
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) continue;
    const snippet = text.slice(Math.max(0, idx - 60), idx + 90).replace(/\s+/g, ' ').trim();
    results.push(project(d, { snippet }));
  }
  return Response.json({ ok: true, results, query: q });
}

async function getDoc(service, operatorId, myRoles, isManager, body) {
  const id = String(body.id || '');
  if (!id) return jerr('id_required', 'id required');
  const doc = await service.entities.BusinessDocument.get(id).catch(() => null);
  if (!doc || doc.operator_id !== operatorId) return jerr('not_found', 'Not found', 404);
  const k = doc.knowledge || {};
  if (!(k.employee_visible === true && k.sop_status === 'APPROVED')) {
    // Never reveal that a draft/private document exists here.
    return jerr('not_found', 'Not found', 404);
  }
  if (!roleMatch(doc, myRoles, isManager)) return jerr('not_authorized', 'Not for your role', 403);
  return Response.json({ ok: true, doc: project(doc) });
}

// ── EMPLOYEE PROCESS OBSERVATION (suggestion — never policy) ────────────────
async function observe(service, user, operatorIds, body) {
  const saleId = String(body.sale_id || '');
  const title = String(body.title || '').trim();
  if (!saleId || !title) return jerr('sale_and_title_required', 'Pick a sale and summarize what happened');
  const sale = await service.entities.EstateSale.get(saleId).catch(() => null);
  if (!sale) return jerr('sale_not_found', 'Sale not found', 404);
  const member = (sale.sale_team || []).includes(user.id)
    || (user.role === 'admin') || sale.operator_id === user.id
    || operatorIds.includes(sale.operator_id);
  if (!member) return jerr('not_authorized', 'You are not on this sale team', 403);
  const parts = [
    body.what_happened && `WHAT HAPPENED: ${body.what_happened}`,
    body.workflow && `WORKFLOW INVOLVED: ${body.workflow}`,
    body.difficult && `WHAT WAS DIFFICULT: ${body.difficult}`,
    body.workaround && `WORKAROUND USED: ${body.workaround}`,
    body.better && `WHAT MIGHT WORK BETTER: ${body.better}`,
  ].filter(Boolean);
  if (!parts.length) return jerr('observation_required', 'Describe what happened');
  const created = await service.entities.SaleIssue.create({
    sale_id: sale.id,
    operator_id: sale.operator_id,
    sale_team_ids: sale.sale_team || [],
    title: title.slice(0, 160),
    description: parts.join('\n\n'),
    category: 'other',
    urgency: 'ROUTINE',
    status: 'OPEN',
    source_type: 'MANUAL',
    source_label: OBSERVATION_LABEL,
    requested_by_name: user.full_name || 'Team member',
  });
  return Response.json({ ok: true, observation_id: created.id, status: 'stored as suggestion — it does NOT change any procedure' });
}

// ── OPERATOR/MANAGER SOP LIFECYCLE ─────────────────────────────────────────
function requireManager(isManager) {
  if (!isManager) return jerr('manager_required', 'Only the operator (or an admin) may manage procedures', 403);
  return null;
}

async function manageList(service, user, operatorId, isManager) {
  const denied = requireManager(isManager); if (denied) return denied;
  const docs = await fetchCorpus(service, operatorId, { employeesOnly: false });
  const items = docs
    .sort((a, b) => String(b.updated_date || '').localeCompare(String(a.updated_date || '')))
    .map((d) => {
      const p = project(d);
      p.sop_status = (d.knowledge || {}).sop_status;
      p.employee_visible = (d.knowledge || {}).employee_visible === true;
      p.effectiveness_reviews = (d.knowledge || {}).effectiveness_reviews || [];
      return p;
    });
  return Response.json({ ok: true, items });
}

async function propose(service, user, operatorId, isManager, body) {
  const denied = requireManager(isManager); if (denied) return denied;
  const title = String(body.title || '').trim();
  if (!title) return jerr('title_required', 'Title required');
  let version = 1;
  let supersedesId = String(body.supersedes_document_id || '') || null;
  if (body.mode === 'revise') {
    if (!supersedesId) return jerr('supersedes_required', 'Revision needs the current version');
    const old = await service.entities.BusinessDocument.get(supersedesId).catch(() => null);
    if (!old || old.operator_id !== operatorId) return jerr('not_found', 'Current version not found', 404);
    const oldK = old.knowledge || {};
    if (oldK.sop_status !== 'APPROVED') return jerr('not_approved', 'Only an APPROVED version can be revised');
    version = (old.version || 1) + 1;
  }
  const knowledge = {
    sop_status: 'DRAFT',
    purpose: String(body.purpose || ''),
    audience_roles: Array.isArray(body.audience_roles) ? body.audience_roles.filter(Boolean) : [],
    steps: (Array.isArray(body.steps) ? body.steps : []).map((t) => ({ text: String(t) })).filter((s) => s.text),
    decision_points: (Array.isArray(body.decision_points) ? body.decision_points : [])
      .filter((p) => p && p.condition),
    exceptions: (Array.isArray(body.exceptions) ? body.exceptions : []).filter(Boolean),
    escalation: body.escalation && typeof body.escalation === 'object' ? {
      stop_when: body.escalation.stop_when || '',
      escalate_to: body.escalation.escalate_to || '',
      provide: body.escalation.provide || '',
    } : {},
    completion_standard: String(body.completion_standard || ''),
    change_reason: String(body.change_reason || ''),
    supersedes_document_id: supersedesId,
    source_type: KNOWLEDGE_SOURCES.includes(body.source_type) ? body.source_type : 'MANUAL',
    source_id: String(body.source_id || '') || null,
    source_label: String(body.source_label || '').slice(0, 120),
    contributor_name: String(body.contributor_name || user.full_name || ''),
    ai_generated: body.ai_generated === true,
    employee_visible: false, // drafts are NEVER employee-visible
  };
  const created = await service.entities.BusinessDocument.create({
    operator_id: operatorId,
    title,
    category: KNOWLEDGE_CATEGORIES.includes(body.category) ? body.category : 'SOP',
    scope: 'business',
    status: 'ACTIVE',
    version,
    knowledge,
  });
  return Response.json({ ok: true, document_id: created.id, sop_status: 'DRAFT' });
}
const KNOWLEDGE_SOURCES = ['EMPLOYEE_OBSERVATION', 'SALE_ISSUE', 'NEAR_MISS', 'SALE_RECAP', 'MANAGER_OBSERVATION', 'MANUAL'];

// AI DRAFT — Chapter 24 governance: generates a DRAFT, never approval truth.
async function aiDraft(service, base44, user, operatorId, isManager, body) {
  const denied = requireManager(isManager); if (denied) return denied;
  const sourceText = String(body.source_text || '').trim();
  if (sourceText.length < 20) return jerr('source_text_required', 'Provide the observation/lesson text (20+ characters)');
  const currentSop = String(body.current_sop_text || '').slice(0, 4000);
  const prompt = `You are drafting an INTERNAL OPERATING PROCEDURE for an estate sale company from a real-world observation. This is a DRAFT for human review — it is not approved policy.

${currentSop ? `CURRENT APPROVED PROCEDURE (revising):\n${currentSop}\n` : ''}
OBSERVATION / LESSON / SOURCE:
${sourceText}

Write a practical, plain-language procedure an estate sale floor employee can follow. Hedge honestly — never claim legal, safety, or compliance certification. Escalation must route to the operator/manager via the existing Ask-for-Help path and must never grant the employee authority. Keep steps concise (5-9 steps).`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        purpose: { type: 'string' },
        steps: { type: 'array', items: { type: 'string' } },
        decision_points: {
          type: 'array',
          items: {
            type: 'object',
            properties: { condition: { type: 'string' }, if_yes: { type: 'string' }, if_no: { type: 'string' } },
          },
        },
        exceptions: { type: 'array', items: { type: 'string' } },
        escalation: {
          type: 'object',
          properties: { stop_when: { type: 'string' }, escalate_to: { type: 'string' }, provide: { type: 'string' } },
        },
        completion_standard: { type: 'string' },
        change_reason: { type: 'string' },
      },
    },
  });
  const draft = result || {};
  const payload = {
    action: 'propose',
    title: String(draft.title || 'Draft procedure').slice(0, 160),
    category: body.category || 'SOP',
    purpose: draft.purpose || '',
    steps: draft.steps || [],
    decision_points: draft.decision_points || [],
    exceptions: draft.exceptions || [],
    escalation: draft.escalation || {},
    completion_standard: draft.completion_standard || '',
    change_reason: draft.change_reason || sourceText.slice(0, 300),
    source_type: body.source_type || 'MANAGER_OBSERVATION',
    source_id: body.source_id || null,
    source_label: body.source_label || 'AI draft from observation',
    contributor_name: body.contributor_name || '',
    mode: body.mode || 'new',
    supersedes_document_id: body.supersedes_document_id || null,
    ai_generated: true,
  };
  const res = await propose(service, user, operatorId, isManager, payload);
  const data = await res.json();
  return Response.json({ ...data, ai_generated: true, draft: true });
}

async function submitReview(service, user, operatorId, isManager, body) {
  const denied = requireManager(isManager); if (denied) return denied;
  const doc = await loadOwn(service, operatorId, body.id);
  if (!doc) return jerr('not_found', 'Not found', 404);
  const k = doc.knowledge || {};
  if (k.sop_status !== 'DRAFT') return jerr('not_draft', 'Only a DRAFT can be submitted for review');
  await service.entities.BusinessDocument.update(doc.id, { knowledge: { ...k, sop_status: 'IN_REVIEW' } });
  return Response.json({ ok: true, sop_status: 'IN_REVIEW' });
}

async function loadOwn(service, operatorId, id) {
  const doc = await service.entities.BusinessDocument.get(String(id || '')).catch(() => null);
  return doc && doc.operator_id === operatorId ? doc : null;
}

async function approve(service, user, operatorId, isManager, body) {
  const denied = requireManager(isManager); if (denied) return denied;
  const doc = await loadOwn(service, operatorId, body.id);
  if (!doc) return jerr('not_found', 'Not found', 404);
  const k = doc.knowledge || {};
  if (k.sop_status !== 'DRAFT' && k.sop_status !== 'IN_REVIEW') {
    return jerr('not_draftable', 'Only a DRAFT or IN_REVIEW procedure can be approved');
  }
  const employeeVisible = body.employee_visible !== false; // default true
  // Supersede the previous approved version (preserved, never overwritten).
  if (k.supersedes_document_id) {
    const old = await loadOwn(service, operatorId, k.supersedes_document_id);
    if (old && (old.knowledge || {}).sop_status === 'APPROVED') {
      await service.entities.BusinessDocument.update(old.id, {
        knowledge: { ...old.knowledge, sop_status: 'SUPERSEDED' },
      });
    }
  }
  await service.entities.BusinessDocument.update(doc.id, {
    knowledge: {
      ...k,
      sop_status: 'APPROVED',
      employee_visible: employeeVisible,
      approved_by: user.id,
      approved_by_name: user.full_name || 'Operator',
      approved_at: new Date().toISOString(),
      review_date: body.review_date || k.review_date || null,
    },
  });
  return Response.json({
    ok: true,
    sop_status: 'APPROVED',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    employee_visible: employeeVisible,
    prior_version_superseded: !!k.supersedes_document_id,
  });
}

async function reviewEffectiveness(service, user, operatorId, isManager, body) {
  const denied = requireManager(isManager); if (denied) return denied;
  const doc = await loadOwn(service, operatorId, body.id);
  if (!doc) return jerr('not_found', 'Not found', 404);
  const k = doc.knowledge || {};
  const outcomes = ['BETTER', 'NO_CHANGE', 'WORSE', 'INSUFFICIENT_EVIDENCE'];
  if (!outcomes.includes(body.outcome)) return jerr('outcome_required', 'Outcome required');
  const reviews = (k.effectiveness_reviews || []);
  reviews.push({
    at: new Date().toISOString(),
    outcome: body.outcome,
    note: String(body.note || '').slice(0, 1000),
    by_name: user.full_name || 'Operator',
  });
  await service.entities.BusinessDocument.update(doc.id, {
    knowledge: { ...k, effectiveness_reviews: reviews, review_date: body.next_review_date || null },
  });
  return Response.json({ ok: true, reviews: reviews.length });
}

async function suggestions(service, operatorId, isManager) {
  const denied = requireManager(isManager); if (denied) return denied;
  const issues = pageOf(await service.entities.SaleIssue.filter(
    { operator_id: operatorId, source_label: OBSERVATION_LABEL, status: { $in: ['OPEN', 'WAITING'] } },
    { limit: 100, sort: '-created_date' }));
  return Response.json({
    ok: true,
    items: issues.map((i) => ({
      id: i.id, title: i.title, description: i.description,
      requested_by_name: i.requested_by_name, created_date: i.created_date,
    })),
  });
}

async function audit(service, operatorId, isManager) {
  const denied = requireManager(isManager); if (denied) return denied;
  const docs = await fetchCorpus(service, operatorId, { employeesOnly: false });
  const today = new Date().toISOString().slice(0, 10);
  const byStatus = (s) => docs.filter((d) => (d.knowledge || {}).sop_status === s);
  const approved = byStatus('APPROVED');
  const issues = pageOf(await service.entities.SaleIssue.filter(
    { operator_id: operatorId, source_label: OBSERVATION_LABEL, status: { $in: ['OPEN', 'WAITING'] } },
    { limit: 200 }));
  return Response.json({
    ok: true,
    counts: {
      current_approved: approved.length,
      draft: byStatus('DRAFT').length,
      in_review: byStatus('IN_REVIEW').length,
      superseded: byStatus('SUPERSEDED').length,
      due_for_review: approved.filter((d) => (d.knowledge || {}).review_date && (d.knowledge || {}).review_date <= today).length,
      open_suggestions: issues.length,
      approved_without_audience: approved.filter((d) => !((d.knowledge || {}).audience_roles || []).length).length,
    },
  });
}