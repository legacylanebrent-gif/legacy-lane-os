import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
// Identity work is now explicit and operator-initiated. An unattended SEO
// schedule may not identify merchandise or spend photo provider credits.
export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
  return Response.json({ status: 'disabled', images_enriched: 0, provider_calls: 0, reason: 'Use initial classification followed by Standard Identify & Price. Background identity writing is retired.' });
}