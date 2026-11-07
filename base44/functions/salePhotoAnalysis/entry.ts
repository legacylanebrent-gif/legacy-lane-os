import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { runPhotoAnalysis } from '../../shared/photoAnalysis.ts';
import { lensPhoto } from '../../shared/photoProviders.ts';

/**
 * The single canonical entry point for photo descriptions, identification and
 * suggested pricing. No other path writes photo name / description / AI price.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.sale_id) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    const result = await runPhotoAnalysis({
      service: base44.asServiceRole,
      user,
      saleId: body.sale_id,
      body,
      credits: async () => (await base44.functions.invoke('checkGoogleLensCredits', { check_only: true })).data,
      spendCredit: async () => (await base44.functions.invoke('checkGoogleLensCredits', {})).data,
      lens: photo => lensPhoto(photo, crypto.randomUUID()),
    });

    return Response.json(result);
  } catch (error) {
    console.error('salePhotoAnalysis failed', {
      message: error?.message,
      status: error?.status,
      stack: error?.stack,
    });
    return Response.json(
      { error: error?.message || 'Photo analysis failed' },
      { status: error?.status || 500, headers: error?.status === 429 ? { 'Retry-After': '30' } : {} },
    );
  }
}