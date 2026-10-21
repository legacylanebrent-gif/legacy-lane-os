// Chapter 13 P1 — the smallest real TASK DEPENDENCY MODEL on the canonical
// SaleTask. blocked_by_task_ids / blocked_by_decision_ids / blocked_by_issue_ids
// are references (no graph engine); the boolean blocked flag is the display
// cache synced from them. Deterministic: a task is blocked while ANY
// dependency is unresolved; when all resolve it unblocks automatically but is
// NEVER auto-completed. A simple BFS guard prevents A→B→A cycles.
import { base44 } from '@/api/base44Client';

const asArr = (r) => (Array.isArray(r) ? r : (r && r.items) || []);

// A decision satisfies a dependency when it is resolved AND its controlling
// instruction is not an outstanding client request (REQUEST ≠ APPROVED).
const decisionSatisfied = (d) =>
  !!d && d.status === 'resolved' && (!d.request_status || d.request_status === 'APPROVED');

const issueSatisfied = (i) =>
  !!i && (i.status === 'RESOLVED' || i.status === 'CANCELLED');

export function unresolvedDeps(task, ctx) {
  const { tasksById = {}, decisionsById = {}, issuesById = {} } = ctx || {};
  const out = [];
  (task.blocked_by_task_ids || []).forEach((id) => {
    const t = tasksById[id];
    if (!t || t.status !== 'completed') {
      out.push({ kind: 'task', id, label: t ? `Task: ${t.name}` : 'Task (removed)' });
    }
  });
  (task.blocked_by_decision_ids || []).forEach((id) => {
    const d = decisionsById[id];
    if (!decisionSatisfied(d)) {
      out.push({ kind: 'decision', id, label: d ? `Client decision: ${d.subject}` : 'Client decision (removed)' });
    }
  });
  (task.blocked_by_issue_ids || []).forEach((id) => {
    const i = issuesById[id];
    if (!issueSatisfied(i)) {
      out.push({ kind: 'issue', id, label: i ? `Issue: ${i.title}` : 'Issue (removed)' });
    }
  });
  return out;
}

export const hasAnyDeps = (task) =>
  ((task.blocked_by_task_ids || []).length + (task.blocked_by_decision_ids || []).length +
   (task.blocked_by_issue_ids || []).length) > 0;

export const depReason = (unresolved) =>
  unresolved.length ? `Waiting on: ${unresolved.map((u) => u.label).join('; ')}` : '';

// Cycle guard (P1-33): can taskId be reached from the proposed dependencies by
// walking blocked_by_task_ids edges? If yes, adding them would let the task
// ultimately block itself.
export function wouldCreateCycle(allTasks, taskId, newDepTaskIds) {
  const byId = {};
  (allTasks || []).forEach((t) => { byId[t.id] = t; });
  const queue = [...(newDepTaskIds || [])];
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (id === taskId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const t = byId[id];
    if (t && Array.isArray(t.blocked_by_task_ids)) queue.push(...t.blocked_by_task_ids);
  }
  return false;
}

// Deterministic sync after ANY dependency source changes (task completed,
// decision approved, issue resolved/cancelled). Auto-unblocks tasks whose
// dependencies all resolved; auto-blocks tasks with unresolved dependencies;
// keeps the human-readable waiting-for reason current. Never completes tasks.
export async function syncTaskBlocks(saleId) {
  const [taskRes, decRes, issRes] = await Promise.all([
    base44.entities.SaleTask.filter({ sale_id: saleId }),
    base44.entities.SaleClientDecision.filter({ sale_id: saleId }),
    base44.entities.SaleIssue.filter({ sale_id: saleId }),
  ]);
  const tasks = asArr(taskRes);
  const decisions = asArr(decRes);
  const issues = asArr(issRes);
  const ctx = {
    tasksById: Object.fromEntries(tasks.map((t) => [t.id, t])),
    decisionsById: Object.fromEntries(decisions.map((d) => [d.id, d])),
    issuesById: Object.fromEntries(issues.map((i) => [i.id, i])),
  };
  const updates = [];
  for (const t of tasks) {
    if (t.status === 'completed') continue;
    const unresolved = unresolvedDeps(t, ctx);
    const shouldBlock = unresolved.length > 0;
    if (!hasAnyDeps(t)) continue; // manual flag stays operator-controlled
    const reason = depReason(unresolved);
    if (shouldBlock !== !!t.blocked || (shouldBlock && (t.blocked_reason || '') !== reason)) {
      updates.push(base44.entities.SaleTask.update(t.id, {
        blocked: shouldBlock,
        blocked_reason: shouldBlock ? reason : '',
      }));
    }
  }
  await Promise.all(updates);
  return { tasks, decisions, issues };
}