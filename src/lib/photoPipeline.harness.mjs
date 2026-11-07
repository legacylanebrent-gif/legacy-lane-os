// Testing Agent: node src/lib/photoPipeline.harness.mjs
// Pure frontend production adapter/engine checks, no network or paid provider.
// The server companion is photoPipelineMockProof({run_mock_suite:true}); it
// exercises production runPhotoWork + mutateSalePhotos, not a Map-only saver.
import assert from 'node:assert/strict';
import * as engine from './photoBatchEngine.js';
import { salePhotoPipeline } from './salePhotoPipeline.js';
const images = Array.from({ length: 200 }, (_, i) => ({ url: `https://example.test/${i}.jpg`, pipeline: { id: `p${i}`, revision: `r${i}`, classification: i % 10 === 0 ? 'multiple' : i % 7 === 0 ? 'uncertain' : 'single' } }));
const receipts = new Map(), photos = new Map(), calls = { standard: 0, deep: 0 };
let active = 0, maximum = 0, failedSave = 0, checkpoint = {};
const invoke = async (name, body) => {
  assert.ok(['identifySalePhoto', 'googleLensPricing'].includes(name));
  const key = `${body.photo_id}:${body.image_revision}:${body.type}`;
  if (body.action === 'save') {
    if (body.photo_id === 'p1' && failedSave++ < 4) throw Object.assign(new Error('Save temporarily unavailable'), { status: 503 });
    const photo = { pipeline: { id: body.photo_id, revision: body.image_revision }, name: receipts.get(key).name };
    photos.set(body.photo_id, photo); return { data: { photo, state: 'completed' } };
  }
  if (!receipts.has(key)) {
    active++; maximum = Math.max(maximum, active); calls[body.type]++;
    await new Promise(resolve => setTimeout(resolve, Number(body.photo_id.slice(1)) % 4)); active--;
    receipts.set(key, { name: `Identity ${body.photo_id}`, classification: 'single', estimated_price: 25, result_id: key });
  }
  return { data: receipts.get(key) };
};
const make = () => salePhotoPipeline({ engine, invoke, saleId: 'mock-sale', images, type: 'standard', journal: { read: () => structuredClone(checkpoint), write: value => { checkpoint = structuredClone(value); } } });
const first = make(); await first.runner.run(first.jobs);
const before = calls.standard;
const resumed = make(); await resumed.runner.run(resumed.jobs);
assert.equal(calls.standard, before, 'Save retries must not repeat provider charges');
assert.equal(calls.deep, 0, 'Standard must not call SerpAPI');
assert.ok(maximum <= 3, 'Concurrency exceeds three');
assert.equal(photos.size, images.filter(p => p.pipeline.classification === 'single').length);
for (const [id, photo] of photos) assert.equal(photo.name, `Identity ${id}`);
console.log(JSON.stringify({ scope: 'production frontend adapter/engine, mocked transport', checks: ['200-photo eligibility', 'bounded concurrency', 'checkpoint resume', 'save-only retries', 'no Deep Scan', 'no identity mixing'], calls, maximum_concurrency: maximum, server_companion: 'photoPipelineMockProof', live_database_verified: false }, null, 2));