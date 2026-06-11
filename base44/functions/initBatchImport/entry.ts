import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('initBatchImport received:', body);
    const { filename, total_rows } = body;
    
    if (!filename || !total_rows) {
      console.error('Validation failed:', { filename, total_rows });
      return Response.json({ error: 'filename and total_rows required' }, { status: 400 });
    }
    
    // Create a batch record
    const batch = await base44.asServiceRole.entities.PropstreamImportBatch.create({
      uploaded_file_name: filename,
      uploaded_by: user.id,
      total_rows,
      imported_count: 0,
      duplicate_count: 0,
      error_count: 0,
      import_status: 'processing'
    });
    
    return Response.json({ batch_id: batch.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});