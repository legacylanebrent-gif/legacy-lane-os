import { applyPhotoFields, photoUrl } from './photoFields.ts';
import { blockedPhoto, initializePhoto, locatePhoto, photoError } from './photoStore.ts';

const STRUCTURAL = ['rotation', 'skip_item', 'skip_serp_search', 'serp_search_status', 'skip_updated_at', 'excluded_from_public', 'thumbnail_url'];
const OPERATOR_FIELDS = ['name', 'description', 'synopsis', 'price', 'categories'];
export function operatorPhotoEdit(images, target, fields) {
  const photo = locatePhoto(images, target);
  if (blockedPhoto(photo) && Object.hasOwn(fields, 'price') && fields.price !== photo.price) throw photoError('Resolve the do-not-search hold before pricing.', 422);
  if (target.edit_revision && photo.pipeline.edit_revision !== target.edit_revision) throw photoError('Newer operator edit exists; reload before saving.');
  for (const key of OPERATOR_FIELDS) if (Object.hasOwn(fields, key)) photo[key] = fields[key];
  photo.pipeline.edit_revision = crypto.randomUUID();
  photo.pipeline.operator_fields = [...new Set([...(photo.pipeline.operator_fields || []), ...Object.keys(fields).filter(k => OPERATOR_FIELDS.includes(k))])];
  photo.pipeline.review_required = false;
  return photo;
}
export function applyScanReceipt(images, target, type) {
  const photo = locatePhoto(images, target);
  const receipt = photo.pipeline.jobs?.[type];
  if (!receipt?.result || receipt.id !== target.result_id) throw photoError('Saved provider receipt is required', 400);
  if (receipt.state === 'completed' || receipt.state === 'needs_review') return photo;
  if (receipt.revision !== photo.pipeline.revision || receipt.edit_revision !== photo.pipeline.edit_revision || blockedPhoto(photo)) {
    receipt.state = 'stale'; return photo;
  }
  if (type === 'classify') {
    photo.pipeline.classification = receipt.result.classification;
    photo.pipeline.classification_reason = receipt.result.reason || '';
    receipt.state = 'completed'; return photo;
  }
  const raw = receipt.result;
  const classification = photo.pipeline.classification;
  if (classification !== 'single') { receipt.state = 'needs_review'; return photo; }
  const fields = { name: raw.name || raw.item_title, description: raw.description };
  if (type === 'standard') fields.ai_first_search_price = raw.estimated_price;
  else { fields.ai_deep_search_price = raw.price_range?.avg; fields.synopsis = raw.price_note; }
  for (const key of photo.pipeline.operator_fields || []) delete fields[key];
  const applied = applyPhotoFields(photo, fields, 'fill_empty');
  Object.assign(photo, applied.photo);
  receipt.state = raw.identified === false ? 'needs_review' : 'completed';
  photo.pipeline.review_required = raw.identified === false || (raw.confidence === 'low');
  return photo;
}
export function structuralPhotoEdit(images, body) {
  for (const change of body.updates || []) {
    const photo = locatePhoto(images, change);
    for (const key of STRUCTURAL) if (Object.hasOwn(change.fields || {}, key)) photo[key] = change.fields[key];
    if (change.clear_data === true) {
      for (const key of ['name', 'description', 'synopsis']) photo[key] = '';
      for (const key of ['price', 'ai_first_search_price', 'ai_deep_search_price']) photo[key] = null;
      photo.pipeline = { ...photo.pipeline, revision: crypto.randomUUID(), edit_revision: crypto.randomUUID(), jobs: {}, classification: null, review_required: true, operator_fields: [] };
    }
    if (blockedPhoto(photo)) photo.pipeline.edit_revision = crypto.randomUUID();
    if (change.replace_url) {
      photo.url = change.replace_url;
      photo.pipeline = { id: photo.pipeline.id, revision: crypto.randomUUID(), edit_revision: crypto.randomUUID(), jobs: {}, review_required: true };
      photo.name = ''; photo.description = ''; photo.ai_first_search_price = null; photo.ai_deep_search_price = null;
    }
  }
  for (const target of body.remove || []) {
    const photo = locatePhoto(images, typeof target === 'string' ? { photo_id: target } : target);
    images.splice(images.indexOf(photo), 1);
  }
  for (const candidate of body.append || []) {
    const url = photoUrl(candidate);
    if (url && !images.some(p => photoUrl(p) === url)) images.push(initializePhoto({ url, rotation: candidate.rotation || 0, thumbnail_url: candidate.thumbnail_url || '' }));
  }
  if (body.order?.length) {
    const byKey = new Map(images.map(p => [p.pipeline.id, p]));
    const ordered = [];
    for (const key of body.order) {
      const photo = byKey.get(key) || images.find(p => photoUrl(p) === key && byKey.has(p.pipeline.id));
      if (photo) { ordered.push(photo); byKey.delete(photo.pipeline.id); }
    }
    images.splice(0, images.length, ...ordered, ...byKey.values());
  }
  return { photo_count: images.length };
}