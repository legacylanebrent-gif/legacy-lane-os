import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { resolveBrand } from '../../shared/brandRegistry.ts';

/**
 * The shared brands list, for the forms where an operator types a brand
 * (inventory items and marketplace listings). Reading the list needs no server
 * call — this is only the sanctioned WRITE path, so a brand an operator actually
 * typed is registered once and reused forever, and the list stays trustworthy.
 * An existing brand is always reused; a new one is created under its normalized key.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body: any = await req.json().catch(() => ({}));
    const action = String(body.action || 'resolve');
    if (action !== 'resolve') {
      return Response.json({ error: 'Unsupported action' }, { status: 400 });
    }

    const name = String(body.name || '').trim();
    if (!name) return Response.json({ error: 'A brand name is required' }, { status: 400 });

    const resolved = await resolveBrand(base44.asServiceRole, name, 'operator');
    if (!resolved) {
      return Response.json({ error: 'That is not a usable brand name' }, { status: 422 });
    }
    return Response.json({ brand: resolved });
  } catch (error: any) {
    console.error('brandCatalog failed:', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}