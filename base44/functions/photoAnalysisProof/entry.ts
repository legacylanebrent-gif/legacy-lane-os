import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { photoAnalysisProof } from '../../shared/photoAnalysisProof.ts';

// Mock-provider proof suite for the canonical photo analysis pipeline.
// Admin only: it spends no real credits but it must not be public either.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
    const result = await photoAnalysisProof();
    return Response.json({ status: 'pass', ...result });
  } catch (error) {
    console.error('photoAnalysisProof failed', { message: error?.message, stack: error?.stack });
    return Response.json({ status: 'fail', error: error?.message }, { status: 500 });
  }
}