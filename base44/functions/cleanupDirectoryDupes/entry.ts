import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const CUTOFF = '2026-07-01'; // records created before the broken rebuild = original keepers
const normName = (n) => {
  if (!n || typeof n !== 'string') return null;
  const c = n.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\b(estate sale[s]?|estates sale[s]?|llc|inc|co|company|the)\b/g, ' ').replace(/\s+/g, ' ').trim();
  return c.length >= 3 ? c : null;
};
const normState = (s) => (s || '').toString().trim().toLowerCase();
const digitsOf = (r) => (r.phone_normalized || r.phone || '').replace(/\D/g, '');

// Merge dupes' non-empty fields into keeper (keeper values win; empty keeper fields filled)
function buildKeeperUpdates(keeper, dupes) {
  const updates = {};
  const sources = new Set(keeper.sources || []);
  const srcIds = { ...(keeper.source_record_ids || {}) };
  for (const d of dupes) {
    (d.sources || []).forEach(s => sources.add(s));
    Object.assign(srcIds, d.source_record_ids || {});
    for (const [f, v] of Object.entries(d)) {
      if (['id', 'created_date', 'updated_date', 'created_by_id', 'sources', 'source_record_ids', 'merge_status', 'name_state_key'].includes(f)) continue;
      if (Array.isArray(v)) {
        if (v.length > 0) updates[f] = Array.from(new Set([...(Array.isArray(updates[f]) ? updates[f] : (keeper[f] || [])), ...v]));
      } else if (typeof v === 'boolean') {
        if (v === true) updates[f] = true;
      } else if (v !== null && v !== undefined && v !== '') {
        const cur = updates[f] !== undefined ? updates[f] : keeper[f];
        if (cur === null || cur === undefined || cur === '') updates[f] = v;
      }
    }
  }
  const n = normName(keeper.company_name);
  if (n) updates.name_state_key = n + '|' + normState(keeper.state);
  else if (keeper.name_state_key) updates.name_state_key = keeper.name_state_key;
  const finalSources = [...sources];
  updates.sources = finalSources;
  updates.source_record_ids = srcIds;
  updates.merge_status = finalSources.length > 1 ? 'merged' : (keeper.merge_status || 'single_source');
  return updates;
}

function unionFindGroups(records) {
  const parent = new Map();
  // correct iterative find with full path compression
  const find = (x) => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r);
    while (x !== r) { const nx = parent.get(x); parent.set(x, r); x = nx; }
    return r;
  };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (const r of records) parent.set(r.id, r.id);
  const keyToIds = new Map();
  for (const r of records) {
    const d = digitsOf(r);
    if (d.length >= 7) {
      const pk = 'p:' + d;
      if (keyToIds.has(pk)) union(keyToIds.get(pk), r.id); else keyToIds.set(pk, r.id);
    }
    const n = normName(r.company_name);
    if (n) {
      const nk = 'n:' + n + '|' + normState(r.state);
      if (keyToIds.has(nk)) union(keyToIds.get(nk), r.id); else keyToIds.set(nk, r.id);
    }
  }
  const comps = new Map();
  for (const r of records) { const root = find(r.id); if (!comps.has(root)) comps.set(root, []); comps.get(root).push(r); }
  return [...comps.values()];
}

function pickKeeper(recs) {
  return [...recs].sort((a, b) =>
    (a.created_date < b.created_date ? -1 : 1) ||
    ((b.sources || []).length - (a.sources || []).length))[0];
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const m = base44.asServiceRole.entities.MasterOperatorDirectory;
    const body = await req.json().catch(() => ({}));
    const cursor = body.cursor || { phase: 'absorb', oldSkip: 0 };
    const startedAt = Date.now();
    const stats = { ...((body.stats || cursor.stats) || {}) };
    stats.batchesProcessed = (stats.batchesProcessed || 0) + 1;

    if (cursor.phase === 'bulk') {
      // Recompute all duplicate groups from one full table read each call (read-only loads,
      // so no pagination-shift issue), then merge keepers and delete dupes within the budget.
      let all = [];
      for (let skip = 0; skip < 30000; skip += 2000) {
        const page = await m.filter({}, '-created_date', 2000, skip);
        all = all.concat(page);
        if (page.length < 2000) break;
      }
      const groups = unionFindGroups(all).filter(g => g.length > 1);
      const keepersToUpdate = [];
      const toDelete = [];
      for (const recs of groups) {
        const keeper = pickKeeper(recs);
        const dupes = recs.filter(r => r.id !== keeper.id);
        keepersToUpdate.push({ id: keeper.id, ...buildKeeperUpdates(keeper, dupes) });
        dupes.forEach(d => toDelete.push(d.id));
      }
      for (let i = 0; i < keepersToUpdate.length; i += 100) await m.bulkUpdate(keepersToUpdate.slice(i, i + 100));
      // Count ONLY real delete successes — failed deletes stay in the table and will
      // be recomputed and retried on the next pass (never counted as progress).
      let deleted = 0, deleteFailures = 0;
      for (let i = 0; i < toDelete.length; i += 5) {
        const results = await Promise.all(
          toDelete.slice(i, i + 5).map(id => m.delete(id).then(() => true).catch((e) => {
            console.log(`[cleanupDupes] delete failed for ${id}: ${e?.message || e}`);
            return false;
          }))
        );
        deleted += results.filter(Boolean).length;
        deleteFailures += results.filter(r => !r).length;
        if (Date.now() - startedAt > 50000) break;
      }
      stats.deleted = (stats.deleted || 0) + deleted;
      stats.deleteFailures = (stats.deleteFailures || 0) + deleteFailures;
      const remainingInSet = toDelete.length - deleted;
      return Response.json({
        done: remainingInSet <= 0 && deleteFailures === 0,
        stats,
        cursor: { phase: 'bulk', stats }
      });
    }

    if (cursor.phase === 'absorb') {
      const PAGE = 100;
      // Keyset pagination on created_date: immune to the offset shift that deletions cause
      let lastDate = cursor.lastDate || null;
      const pagesDone = [];
      // keep processing pages until the time budget runs out
      // scanGte (pass 2): page over post-cutoff records (rebuild-created dupes) instead of pre-cutoff originals
      const scanFilter = cursor.scanGte
        ? { created_date: { $gte: CUTOFF, ...(lastDate ? { $lt: lastDate } : {}) } }
        : { created_date: { $lt: CUTOFF, ...(lastDate ? { $lt: lastDate } : {}) } };
      while (Date.now() - startedAt < 25000) {
        const oldPage = await m.filter(scanFilter, 'created_date', PAGE, 0);
        if (oldPage.length === 0) {
          return Response.json({ done: false, cursor: { phase: 'verify', oldSkip: 0, stats }, stats });
        }
        const phones = new Set(); const nskSet = new Set();
        for (const r of oldPage) {
          const d = digitsOf(r);
          if (d.length >= 7) phones.add(d);
          const n = normName(r.company_name);
          if (n) nskSet.add(n + '|' + normState(r.state));
        }
        const matched = new Map();
        if (phones.size > 0) {
          const res = await m.filter({ phone_normalized: { $in: [...phones] } }, undefined, 2000);
          res.forEach(r => matched.set(r.id, r));
        }
        if (nskSet.size > 0) {
          const res = await m.filter({ name_state_key: { $in: [...nskSet] } }, undefined, 2000);
          res.forEach(r => matched.set(r.id, r));
        }
        const groups = unionFindGroups([...oldPage, ...matched.values()]).filter(g => g.length > 1);
        const keepersToUpdate = [];
        const toDelete = [];
        for (const recs of groups) {
          const keeper = pickKeeper(recs);
          const dupes = recs.filter(r => r.id !== keeper.id);
          keepersToUpdate.push({ id: keeper.id, ...buildKeeperUpdates(keeper, dupes) });
          dupes.forEach(d => toDelete.push(d.id));
        }
        if (keepersToUpdate.length > 0) {
          for (let i = 0; i < keepersToUpdate.length; i += 100) await m.bulkUpdate(keepersToUpdate.slice(i, i + 100));
        }
        let deleted = 0;
        for (let i = 0; i < toDelete.length; i += 10) {
          await Promise.all(toDelete.slice(i, i + 10).map(id => m.delete(id).catch(() => null)));
          deleted += Math.min(10, toDelete.length - i);
          if (Date.now() - startedAt > 45000) break;
        }
        stats.deleted = (stats.deleted || 0) + deleted;
        const finishedDeletes = deleted >= toDelete.length;
        if (!finishedDeletes) {
          pagesDone.push(oldPage.length);
          return Response.json({
            done: false,
            pagesDone,
            stats,
            cursor: { phase: 'absorb', scanGte: !!cursor.scanGte, lastDate: oldPage[oldPage.length - 1].created_date, stats }
          });
        }
        pagesDone.push(oldPage.length);
        lastDate = oldPage[oldPage.length - 1].created_date;
      }
      return Response.json({
        done: false,
        pagesDone,
        stats,
        cursor: { phase: 'absorb', scanGte: !!cursor.scanGte, lastDate, stats }
      });
    }

    if (cursor.phase === 'verify') {
      // Read-only, paged: count remaining duplicate groups across the whole table
      let all = [];
      for (let skip = 0; skip < 30000; skip += 2000) {
        const page = await m.filter({}, '-created_date', 2000, skip);
        all = all.concat(page);
        if (page.length < 2000) break;
      }
      const groups = unionFindGroups(all).filter(g => g.length > 1);
      const junk = all.filter(r => digitsOf(r).length < 7 && !normName(r.company_name));
      return Response.json({
        done: true,
        cursor: { phase: 'done', oldSkip: 0, stats },
        stats: { ...stats, totalRecords: all.length, remainingDupes: groups.reduce((s, g) => s + g.length - 1, 0), remainingDupGroups: groups.length, junkRecords: junk.length }
      });
    }

    return Response.json({ done: true, cursor: { phase: 'done', oldSkip: 0, stats }, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}