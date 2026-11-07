// No real providers or entities. Exercises the same production work and CAS
// functions used by both sale-photo endpoints. Real DB atomicity is a separate
// live verification; this cannot certify it.
import { runPhotoWork } from './photoWork.ts';
import { mutateSalePhotos } from './photoStore.ts';
import { structuralPhotoEdit, operatorPhotoEdit } from './photoMutations.ts';

export async function photoPipelineProof() {
  const clone = value => structuredClone(value);
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const user = { id: 'mock-operator', role: 'admin' };
  let version = 1, conflicts = 0, active = 0, maximum = 0;
  const calls = { classify: 0, standard: 0, deep: 0 };
  let record = { id: 'mock-sale-200', operator_id: user.id, updated_date: 'v1', images: Array.from({ length: 200 }, (_, i) => ({ url: `https://example.test/${i}.jpg`, name: i % 13 === 0 ? `Operator ${i}` : '', price: i % 13 === 0 ? 777 : null, pipeline: { id: `p${i}`, revision: `r${i}`, edit_revision: 'initial', operator_fields: i % 13 === 0 ? ['name', 'price'] : [], jobs: {} } })) };
  const service = { entities: { EstateSale: {
    get: async () => clone(record),
    updateMany: async (query, update) => {
      await Promise.resolve();
      assert(query.id === record.id && !!query.updated_date, 'Unversioned mutation');
      if (query.updated_date !== record.updated_date) { conflicts++; return { updated: 0 }; }
      record = { ...record, ...clone(update.$set), updated_date: `v${++version}` }; return { updated: 1 };
    }
  } } };
  const kind = photo => Number(photo.pipeline.id.slice(1)) % 10 === 0 ? 'multiple' : Number(photo.pipeline.id.slice(1)) % 7 === 0 ? 'uncertain' : 'single';
  const provider = async (photo, type) => {
    calls[type]++; active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, Number(photo.pipeline.id.slice(1)) % 5)); active--;
    if (type === 'classify') return { classification: kind(photo), reason: 'Mock visual classification' };
    if (type === 'deep') return { classification: 'single', identified: true, matches: [{ title: 'Mock comparable', price: 100, evidence: 'asking', link: 'https://example.test/comparable' }], price_range: { min: 100, max: 100, avg: 100 }, price_note: 'Asking comparison, not sold evidence' };
    return { identified: true, name: `Identity ${photo.pipeline.id}`, description: `Description ${photo.pipeline.id}`, estimated_price: 25, confidence: 'medium', uncertainty_note: 'Mock model estimate' };
  };
  const target = photo => ({ photo_id: photo.pipeline.id, image_revision: photo.pipeline.revision });
  const run = (photo, type, action = 'run', resultId = null) => runPhotoWork({ service, user, saleId: record.id, target: { ...target(photo), result_id: resultId }, type, action, provider });
  const savedReceipts = [];
  async function process(photo, type) {
    const result = await run(photo, type);
    savedReceipts.push({ photo, type, result_id: result.result_id });
    return run(photo, type, 'save', result.result_id);
  }
  async function bounded(photos, type) {
    const queue = [...photos];
    await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await process(queue.shift(), type); }));
  }
  await bounded(clone(record.images), 'classify');
  const single = clone(record.images.filter(p => p.pipeline.classification === 'single'));
  await Promise.all([
    bounded(single, 'standard'),
    mutateSalePhotos(service, record.id, user, photos => structuralPhotoEdit(photos, { order: photos.map(p => p.pipeline.id).reverse(), updates: [{ photo_id: 'p5', fields: { rotation: 90 } }], append: [{ url: 'https://example.test/appended.jpg' }] }))
  ]);
  assert(calls.classify === 200, 'Classification count'); assert(maximum <= 3, 'Concurrency bound'); assert(conflicts > 0, 'CAS conflicts were not exercised');
  const beforeResume = calls.standard;
  await bounded(single, 'standard'); assert(calls.standard === beforeResume, 'Resume repeated providers');
  for (const photo of record.images.filter(p => /^p\d+$/.test(p.pipeline.id))) {
    const i = Number(photo.pipeline.id.slice(1));
    assert(photo.name === (i % 13 === 0 ? `Operator ${i}` : kind(photo) === 'single' ? `Identity p${i}` : ''), `Identity contamination ${photo.pipeline.id}`);
    assert(photo.price === (i % 13 === 0 ? 777 : null), 'Listing price overwritten');
  }
  assert(record.images.find(p => p.pipeline.id === 'p5').rotation === 90, 'Structural change lost');
  assert(record.images.some(p => p.url.endsWith('appended.jpg')), 'Append lost');
  assert(calls.deep === 0, 'Standard called Deep Scan');
  await process(record.images.find(p => p.pipeline.id === 'p1'), 'deep'); assert(calls.deep === 1, 'Explicit Deep Scan count');
  const stalePhoto = clone(record.images.find(p => p.pipeline.id === 'p2'));
  await mutateSalePhotos(service, record.id, user, photos => structuralPhotoEdit(photos, { updates: [{ photo_id: 'p2', replace_url: 'https://example.test/replaced.jpg' }] }));
  let rejected = false; try { await run(stalePhoto, 'standard'); } catch (error) { rejected = error.status === 409; }
  assert(rejected, 'Stale revision accepted');
  const p3 = clone(record.images.find(p => p.pipeline.id === 'p3'));
  await mutateSalePhotos(service, record.id, user, photos => operatorPhotoEdit(photos, { photo_id: 'p3', edit_revision: p3.pipeline.edit_revision }, { name: 'Operator correction', price: 99 }));
  await run(p3, 'standard', 'save', p3.pipeline.jobs.standard.id);
  assert(record.images.find(p => p.pipeline.id === 'p3').name === 'Operator correction', 'Operator edit lost');
  return { scope: '200 mocked photos through production server processor/persistence; no real database or provider calls', checks_passed: ['classification_count', 'concurrency_bound', 'conditional_conflicts', 'resume_cache', 'unique_identity', 'operator_price_protection', 'structural_edits', 'explicit_deep_only', 'stale_revision_rejection', 'operator_edit_protection'], mock_provider_calls: calls, live_provider_calls: 0, maximum_concurrency: maximum, conditional_conflicts: conflicts, live_database_atomicity_verified: false };
}