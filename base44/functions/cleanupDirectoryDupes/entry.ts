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
  const find = (x) => { while (parent.get(x) !== x) parent.set(x, parent.get(parent.get(x))); return parent.get(x); };
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

    if (cursor.phase === 'probe') {
      const t0 = Date.now();
      const page = await m.filter({ created_date: { $lt: CUTOFF } }, 'created_date', 5, 0);
      const t1 = Date.now();
      const big = await m.filter({ created_date: { $lt: CUTOFF } }, 'created_date', 250, 0);
      const t2 = Date.now();
      const q = await m.filter({ phone_normalized: { $in: ['0000000000'] } }, undefined, 10);
      const t3 = Date.now();
      // probe delete: load 250 old page, find its dupes, time deleting 10 of them
      const oldPage = await m.filter({ created_date: { $lt: CUTOFF } }, 'created_date', 250, 0);
      const phones = new Set();
      for (const r of oldPage) {
        const d = (r.phone_normalized || r.phone || '').replace(/\D/g, '');
        if (d.length >= 7) phones.add(d);
      }
      const matched = await m.filter({ phone_normalized: { $in: [...phones] } }, undefined, 2000);
      const oldIds = new Set(oldPage.map(r => r.id));
      const dupes = matched.filter(r => !oldIds.has(r.id)).slice(0, 10);
      const t4 = Date.now();
      const delTimes = [];
      for (const d of dupes) {
        const s = Date.now();
        try { await m.delete(d.id); } catch (e) { delTimes.push('err:' + e.message); continue; }
        delTimes.push(Date.now() - s);
      }
      return Response.json({ probe: { load5Ms: t1 - t0, load250Ms: t2 - t1, inQueryMs: t3 - t2, pageLens: [page.length, big.length, q.length], oldPageLen: oldPage.length, matchedLen: matched.length, dupesSampled: dupes.length, delTimes, probeMs: Date.now() - t4 } });
    }

    if (cursor.phase === 'absorb') {
      const PAGE = 250;
      const oldSkip = cursor.oldSkip || 0;
      const oldPage = await m.filter({ created_date: { $lt: CUTOFF } }, 'created_date', PAGE, oldSkip);
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
        for (let i = 0; i < keepersToUpdate.length; i += 500) await m.bulkUpdate(keepersToUpdate.slice(i, i + 500));
      }
      let deleted = 0;
      for (let i = 0; i < toDelete.length; i += 10) {
        await Promise.all(toDelete.slice(i, i + 10).map(id => m.delete(id).catch(() => null)));
        deleted += Math.min(10, toDelete.length - i);
        if (Date.now() - startedAt > 55000) {
          stats.deleted = (stats.deleted || 0) + deleted;
          return Response.json({
            done: false,
            cursor: { phase: 'absorb', oldSkip: oldSkip, stats },
            stats
          });
        }
      }
      stats.deleted = (stats.deleted || 0) + deleted;
      const nextSkip = oldSkip + PAGE;
      return Response.json({
        done: false,
        cursor: { phase: nextSkip >= 20000 ? 'verify' : 'absorb', oldSkip: nextSkip, stats },
        stats
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