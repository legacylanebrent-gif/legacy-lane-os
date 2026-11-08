import { base44 } from '@/api/base44Client';

/**
 * One thin client for the ISO engine. Every read and write about a customer's
 * searches goes through the sanctioned function so the same rules (duplicates,
 * ownership, matching) apply everywhere.
 */
export async function isoCall(payload) {
  const res = await base44.functions.invoke('isoEngine', payload);
  return res.data || {};
}

export async function loadIsoDashboard() {
  return isoCall({ action: 'dashboard' });
}

export async function identifyIsoPhoto({ fileUri, imageUrl }) {
  return isoCall({ action: 'identify_photo', file_uri: fileUri, image_url: imageUrl });
}

export async function suggestIsoQuestions({ known, askedTopics, accountPreferences }) {
  return isoCall({
    action: 'suggest_questions',
    known,
    asked_topics: askedTopics || [],
    account_preferences: accountPreferences || {},
  });
}

export async function saveIso(payload) {
  const res = await base44.functions.invoke('isoEngine', { action: 'save_iso', ...payload });
  return { status: res.status, data: res.data || {} };
}

export async function buildIsoList({ intake, selections }) {
  return isoCall({ action: 'build_list', intake, selections });
}

export async function isoFeedback({ matchId, feedback }) {
  return isoCall({ action: 'feedback', match_id: matchId, feedback });
}

export async function isoSetStatus({ isoId, status }) {
  return isoCall({ action: 'set_status', iso_id: isoId, status });
}

export async function isoFulfill({ isoId, itemKey }) {
  return isoCall({ action: 'fulfill', iso_id: isoId, item_key: itemKey });
}

export async function isoDelete(isoId) {
  return isoCall({ action: 'delete_iso', iso_id: isoId });
}

export async function isoRematch(isoId) {
  return isoCall({ action: 'rematch', iso_id: isoId });
}

export async function searchBrands(query) {
  return isoCall({ action: 'brand_search', query });
}