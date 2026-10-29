import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { waitUntil } from 'base44:runtime';
import { currentUser, loadConfig, audit, json } from '../../shared/listingAccess.ts';
import { processImport } from '../../shared/listingImportEngine.ts';

// Agent import pipeline: create the persisted import + rows, then process them in
// bounded, resumable chunks. Agent identity is ALWAYS the authenticated session.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'start';

    if (action === 'start') {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const headers = Array.isArray(body.headers) ? body.headers : [];
      const mapping = body.mapping && typeof body.mapping === 'object' ? body.mapping : {};
      const fileName = String(body.file_name || 'pending-listings.csv').slice(0, 200);

      if (!rows.length) return json({ error: 'No rows found in the file.' }, 400);
      if (!mapping.street || !mapping.city || !mapping.state) {
        return json({ error: 'Map the street address, city and state columns before importing.', code: 'mapping_incomplete' }, 400);
      }

      const config = await loadConfig(base44);
      const maxRows = config.max_rows_per_import || 500;
      if (rows.length > maxRows) {
        return json({
          error: `This file has ${rows.length} rows. One import can process up to ${maxRows} rows — split the file and import the rest next.`,
          code: 'row_limit',
          limit: maxRows,
        }, 400);
      }

      const headerSignature = headers.map((h) => String(h).trim().toLowerCase()).sort().join('|').slice(0, 500);
      const importRec = await base44.asServiceRole.entities.AgentListingImport.create({
        agent_user_id: user.id,
        agent_name: user.full_name || user.email || '',
        agent_email: user.email || '',
        file_name: fileName,
        source_label: String(body.source_label || '').slice(0, 160),
        source_date: body.source_date || '',
        imported_at: new Date().toISOString(),
        column_mapping: mapping,
        header_signature: headerSignature,
        raw_headers: headers.slice(0, 200),
        total_rows: rows.length,
        status: 'queued',
      });

      const chunks = [];
      for (let i = 0; i < rows.length; i += 40) chunks.push(rows.slice(i, i + 40));
      let index = 0;
      for (const chunk of chunks) {
        await base44.asServiceRole.entities.AgentListingImportRow.bulkCreate(
          chunk.map((raw) => ({
            import_id: importRec.id,
            agent_user_id: user.id,
            row_index: index++,
            raw: raw && typeof raw === 'object' ? raw : {},
            status: 'pending',
          })),
        );
      }

      // Saved column mapping for this export shape, so the next upload is one click.
      if (body.save_mapping) {
        try {
          const existing = await base44.asServiceRole.entities.AgentListingMapping.filter({
            agent_user_id: user.id,
            header_signature: headerSignature,
          });
          if (existing && existing.length) {
            await base44.asServiceRole.entities.AgentListingMapping.update(existing[0].id, {
              mapping,
              use_count: (existing[0].use_count || 0) + 1,
              last_used_at: new Date().toISOString(),
              name: String(body.source_label || existing[0].name || 'Saved mapping').slice(0, 120),
            });
          } else {
            await base44.asServiceRole.entities.AgentListingMapping.create({
              agent_user_id: user.id,
              name: String(body.source_label || 'Saved mapping').slice(0, 120),
              header_signature: headerSignature,
              mapping,
              use_count: 1,
              last_used_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('[agentListingImport] mapping save failed:', error?.message);
        }
      }

      await audit(base44, {
        agent_user_id: user.id,
        actor_user_id: user.id,
        actor_name: user.full_name || user.email || '',
        actor_role: 'agent',
        event_type: 'import_started',
        import_id: importRec.id,
        details: { file_name: fileName, total_rows: rows.length, source_date: body.source_date || '', source_label: body.source_label || '' },
      });

      return json({ import_id: importRec.id, total_rows: rows.length, status: 'queued' });
    }

    if (action === 'process' || action === 'resume') {
      let importId = body.import_id;
      if (action === 'resume' || !importId) {
        const open = await base44.asServiceRole.entities.AgentListingImport.filter(
          { agent_user_id: user.id },
          '-created_date',
          10,
          0,
        );
        const unfinished = (open || []).find((r) => r.status === 'queued' || r.status === 'processing');
        if (!unfinished) return json({ import_id: null, status: 'idle', has_more: false });
        importId = unfinished.id;
      }

      const result = await processImport(base44, importId, {
        agentUserId: user.id,
        agent: { id: user.id, full_name: user.full_name, email: user.email },
        actor: { actor_user_id: user.id, actor_name: user.full_name || user.email || '', actor_role: 'agent' },
        maxRows: body.max_rows || 25,
      });
      if (result.not_found) return json({ error: 'Import not found' }, 404);

      // Keep working for one more chunk after responding, so progress continues
      // even if the agent navigates away.
      if (result.has_more) {
        waitUntil(processImport(base44, importId, {
          agentUserId: user.id,
          agent: { id: user.id, full_name: user.full_name, email: user.email },
          maxRows: 25,
        }).catch((error) => console.error('[agentListingImport] background chunk failed:', error?.message)));
      }
      return json(result);
    }

    if (action === 'list') {
      const imports = await base44.asServiceRole.entities.AgentListingImport.filter(
        { agent_user_id: user.id },
        '-imported_at',
        30,
        0,
      );
      return json({ imports: imports || [] });
    }

    if (action === 'progress') {
      const imports = await base44.asServiceRole.entities.AgentListingImport.filter(
        { agent_user_id: user.id },
        '-created_date',
        5,
        0,
      );
      const active = (imports || []).find((r) => r.status === 'queued' || r.status === 'processing');
      return json({ active: active || null });
    }

    if (action === 'detail') {
      const rows = await base44.asServiceRole.entities.AgentListingImport.filter({ id: body.import_id });
      const importRec = (rows || [])[0];
      if (!importRec || importRec.agent_user_id !== user.id) return json({ error: 'Import not found' }, 404);
      const importRows = await base44.asServiceRole.entities.AgentListingImportRow.filter(
        { import_id: importRec.id },
        'row_index',
        Math.min(body.row_limit || 100, 200),
        0,
      );
      return json({ import: importRec, rows: importRows || [] });
    }

    if (action === 'mapping_lookup') {
      const signature = String(body.header_signature || '').slice(0, 500);
      if (!signature) return json({ mapping: null });
      const found = await base44.asServiceRole.entities.AgentListingMapping.filter({
        agent_user_id: user.id,
        header_signature: signature,
      });
      return json({ mapping: (found && found[0]?.mapping) || null, name: found?.[0]?.name || '' });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('[agentListingImport] error:', error?.message, error?.stack);
    return json({ error: error?.message || 'Import failed' }, 500);
  }
}