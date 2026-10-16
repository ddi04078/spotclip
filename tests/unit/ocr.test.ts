import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPlaceCandidates } from '../../src/services/ocr/placeCandidateExtractor.ts';
import { createOcrFirstServices } from '../../src/services/ocr/createOcrFirstServices.ts';
import { LocalPlaceStorage } from '../../src/storage/LocalPlaceStorage.ts';
import { MemoryStorage, ids } from './helpers.ts';
const image = { id: '1', name: 'capture.png', reference: 'file:///capture.png', mediaType: 'image/png', size: 100 };
test('OCR noise is filtered; likely Korean and English place names survive', () => {
  assert.deepEqual(extractPlaceCandidates('성수 데이트 코스\n소문난성수감자탕\nLCDC SEOUL\n서울숲\n이번 주말 꼭 가봐').map(c => c.name), ['소문난성수감자탕', 'LCDC SEOUL', '서울숲']);
  assert.equal(extractPlaceCandidates('좋아요 123\n공유\n팔로우\n이번 주말 꼭 가봐').length, 0);
});
test('OCR pairs names and addresses without calling a network service', () => {
  const found = extractPlaceCandidates('하이그라운드 제빵소\nHIGHGROUND BAKERY\n서울 강북구 삼양로181길 161');
  assert.equal(found.length, 1); // Korean + English captions describe one place.
  assert.equal(found[0].name, '하이그라운드 제빵소');
  assert.equal(found[0].addressHint, '서울 강북구 삼양로181길 161');
});
test('multiple screenshots dedupe/cap resolver calls, successful repeated lookups are cached, AI is never invoked', async () => {
  let calls = 0, paidCalls = 0;
  const repository = new LocalPlaceStorage(new MemoryStorage());
  const service = createOcrFirstServices({ repository, id: ids(), ocr: { async recognize() { return { text: '카페 하나\n카페 둘\n카페 셋\n카페 넷\n카페 다섯\n카페 여섯' }; } },
    resolver: { async resolve(c) { calls++; return [{ name: c.name, address: '서울 종로구 1', category: '카페', mapProvider: 'kakao', providerId: String(calls), verification: 'official', confidence: .99 }]; } },
    fallback: { async extract() { paidCalls++; throw new Error('must never call'); } },
  });
  const first = await service.ingestPlaceSource({ kind: 'screenshot', images: [image, { ...image, id: '2' }] });
  assert.equal(first.mode, 'ocr'); assert.equal(calls, 5); assert.equal(first.items.length, 5);
  assert.equal(first.automatic.saved.length, 0); // name-only OCR is deliberately low confidence
  await service.ingestPlaceSource({ kind: 'screenshot', images: [image] });
  assert.equal(calls, 5); assert.equal(paidCalls, 0);
});
test('empty OCR and OCR failures do not fabricate or save places and never trigger paid fallback', async () => {
  let calls = 0;
  const repository = new LocalPlaceStorage(new MemoryStorage());
  const service = createOcrFirstServices({ repository, id: ids(), ocr: { async recognize() { return { text: '좋아요\n공유' }; } }, resolver: { async resolve() { calls++; return []; } }, fallback: { async extract() { throw new Error('paid fallback'); } } });
  assert.equal((await service.ingestPlaceSource({ kind: 'image', images: [image] })).items.length, 0);
  assert.equal(calls, 0); assert.equal((await repository.list()).length, 0);
  const broken = createOcrFirstServices({ repository, id: ids(), ocr: { async recognize() { throw new Error('OCR unavailable'); } }, resolver: { async resolve() { return []; } } });
  await assert.rejects(broken.ingestPlaceSource({ kind: 'image', images: [image] }), /OCR unavailable/);
});
