import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { runPhotoWork } from './photoWork.ts';
import { openAIPhoto, lensPhoto } from './photoProviders.ts';
import { runPhotoAssessment } from './photoAssessment.ts';
import { assessPhotoWithBase44 } from './photoAssessmentLlm.ts';

export async function photoEndpoint(req, forcedType = null) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    if (!body.sale_id || !(body.photo_id || body.image_url)) return Response.json({ error: 'sale_id and photo_id are required' }, { status: 400 });
    const type = forcedType || body.type;
    // Step 1 photo sorting. Base44's onboard LLM only — no direct OpenAI and no
    // SerpAPI call is reachable from this branch.
    if (type === 'assess') {
      const result = await runPhotoAssessment({
        service: base44.asServiceRole, user, saleId: body.sale_id, target: body,
        action: body.action || 'run', retryFailed: body.retry_failed === true,
        assess: photo => assessPhotoWithBase44(base44.asServiceRole, photo),
      });
      return Response.json(result);
    }
    if (type === 'deep' && body.explicit_deep !== true) return Response.json({ error: 'Deep Scan requires explicit confirmation', status: 400 }, { status: 400 });
    const result = await runPhotoWork({ service: base44.asServiceRole, user, saleId: body.sale_id, target: body, type, action: body.action || 'run', retryUnknown: body.retry_unknown === true, provider: async (photo, kind, id) => {
      if (kind !== 'deep') return openAIPhoto(photo, kind, id);
      // Authorization, photo validity, revision and duplicate claim are checked
      // BEFORE credits or any paid provider call.
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id, status: 'pending' });
      if (user.subscription_status === 'trial' || subscriptions.some(s => s.renewal_date && new Date(s.renewal_date) > new Date())) throw Object.assign(new Error('Deep Scan is not included in the free trial'), { status: 403, definite_rejection: true });
      const credit = await base44.functions.invoke('checkGoogleLensCredits', {});
      if (!credit.data.allowed) throw Object.assign(new Error(credit.data.reason || 'No Deep Scan credits remaining'), { status: 403, definite_rejection: true });
      return lensPhoto(photo, id);
    } });
    return Response.json(result);
  } catch (error) {
    console.error('photo processing failed', { message: error.message, status: error.status });
    return Response.json({ error: error.message }, { status: error.status || 500, headers: error.status === 429 ? { 'Retry-After': String(error.retry_after || 30) } : {} });
  }
}