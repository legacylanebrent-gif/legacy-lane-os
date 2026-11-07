import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { photoPipelineProof } from '../../shared/photoPipelineProof.ts';
export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (body.run_mock_suite !== true) return Response.json({ status: 'not_run', real_provider_calls: 0, real_database_writes: 0 });
  return Response.json(await photoPipelineProof());
}