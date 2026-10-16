import test from 'node:test';
import assert from 'node:assert/strict';
import { createIngestService, SourceUnavailableError } from '../../src/services/ingestPlaceSource.ts';
import { createServices } from '../../src/services/createServices.ts';
import { LocalPlaceStorage } from '../../src/storage/LocalPlaceStorage.ts';
import { MemoryStorage, ids, imageSource } from './helpers.ts';
import type { PlaceExtractionProvider, PlaceResolverProvider } from '../../src/domain/types.ts';

test('single photo → one mock place → reviewed save → new repository instance retains it', async () => {
  const memory = new MemoryStorage(), storage = new LocalPlaceStorage(memory);
  const service = createServices(storage, { scenario: 'single', mockAutoSave: false }, ids());
  const report = await service.ingestPlaceSource(imageSource);
  assert.equal(report.items.length, 1);
  assert.equal(report.items[0].decision, 'ready');
  assert.equal((await storage.list()).length, 0);
  const result = await service.saveReviewed(report);
  assert.equal(result.outcome.saved.length, 1);
  const restored = await new LocalPlaceStorage(memory).list();
  assert.equal(restored[0].name, '도온정 홍대');
  assert.equal(restored[0].verification, 'mock');
  assert.match(restored[0].sourceImageUri!, /^file:/);
});
test('multiple places are saved in one operation; repeated analysis prevents duplicates', async () => {
  const storage = new LocalPlaceStorage(new MemoryStorage());
  const service = createServices(storage, { scenario: 'multiple', mockAutoSave: false }, ids());
  const first = await service.saveReviewed(await service.ingestPlaceSource(imageSource));
  assert.equal(first.outcome.saved.length, 3);
  const repeated = await service.saveReviewed(await service.ingestPlaceSource(imageSource));
  assert.equal(repeated.outcome.saved.length, 0);
  assert.equal(repeated.outcome.duplicates.length, 3);
  assert.ok(repeated.report.items.every(item => item.decision === 'duplicate'));
  assert.equal((await storage.list()).length, 3);
});
test('explicit mock-auto-save policy exercises the automatic flow without claiming official verification', async () => {
  const storage = new LocalPlaceStorage(new MemoryStorage());
  const service = createServices(storage, { scenario: 'multiple', mockAutoSave: true }, ids());
  const report = await service.ingestPlaceSource(imageSource);
  assert.equal(report.automatic.saved.length, 3);
  assert.ok((await storage.list()).every(p => p.verification === 'mock' && p.mapProvider === 'mock'));
  const repeated = await service.ingestPlaceSource(imageSource);
  assert.equal(repeated.automatic.saved.length, 0);
  assert.equal(repeated.automatic.duplicates.length, 3);
});
test('ambiguous branches never auto-save; one selection is sufficient', async () => {
  const storage = new LocalPlaceStorage(new MemoryStorage());
  const service = createServices(storage, { scenario: 'ambiguous', mockAutoSave: true }, ids());
  const report = await service.ingestPlaceSource(imageSource);
  assert.equal(report.items[0].decision, 'choose');
  assert.deepEqual(report.items[0].matches.map(p => p.name), ['카페 어니언 안국', '카페 어니언 성수', '카페 어니언 미아']);
  assert.equal((await storage.list()).length, 0);
  report.items[0] = { ...report.items[0], selected: report.items[0].matches[1], decision: 'ready', confirmed: true };
  await service.saveReviewed(report);
  assert.equal((await storage.list())[0].name, '카페 어니언 성수');
});
test('confidence policy auto-saves only high-confidence unambiguous official matches', async () => {
  for (const [extractionConfidence, matchConfidence, verification, expected] of [[0.96, 0.97, 'official', 1], [0.6, 0.97, 'official', 0], [0.96, 0.6, 'official', 0], [0.99, 0.99, 'unverified', 0], [0.99, 0.99, 'mock', 0]] as const) {
    const storage = new LocalPlaceStorage(new MemoryStorage());
    const extraction: PlaceExtractionProvider = { extract: async () => ({ mode: 'api', candidates: [{ name: '테라로사', confidence: extractionConfidence }] }) };
    const resolver: PlaceResolverProvider = { resolve: async () => [{ name: '테라로사', address: '서울 종로구 삼청로 30', confidence: matchConfidence, verification, mapProvider: verification === 'official' ? 'kakao' : 'none', category: '카페' }] };
    const service = createIngestService({ extraction, resolver, repository: storage, id: ids(), now: () => '2026-10-15T00:00:00Z' });
    const report = await service.ingestPlaceSource(imageSource);
    assert.equal(report.automatic.saved.length, expected);
  }
});
test('generic SNS URLs fail safely with screenshot fallback and no saved fictional result', async () => {
  const storage = new LocalPlaceStorage(new MemoryStorage());
  const service = createServices(storage, { scenario: 'multiple', mockAutoSave: true }, ids());
  for (const url of ['https://www.instagram.com/p/abc/', 'https://www.threads.com/@x/post/abc', 'https://www.tiktok.com/@x/video/123', 'https://blog.naver.com/example/123']) await assert.rejects(service.ingestPlaceSource({ kind: 'url', url }), SourceUnavailableError);
  await assert.rejects(service.ingestPlaceSource({ kind: 'url', url: 'javascript:alert(1)' }), /링크/);
  assert.equal((await storage.list()).length, 0);
});
test('unknown text is never fabricated into an officially verified place', async () => {
  const storage = new LocalPlaceStorage(new MemoryStorage());
  const service = createServices(storage, { scenario: 'multiple', mockAutoSave: true }, ids());
  const report = await service.ingestPlaceSource({ kind: 'text', text: '알 수 없는 카페' });
  assert.equal(report.items[0].decision, 'unresolved');
  assert.equal((await storage.list()).length, 0);
});
