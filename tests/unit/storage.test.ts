import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalPlaceStorage, STORAGE_KEY } from '../../src/storage/LocalPlaceStorage.ts';
import { fixturePlace, MemoryStorage } from './helpers.ts';
test('concurrent ingest calls serialize and do not lose updates or add duplicates', async () => {
  const storage = new LocalPlaceStorage(new MemoryStorage());
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => storage.saveMany([fixturePlace({ id: `id-${i}` })])));
  assert.equal(results.reduce((sum, item) => sum + item.saved.length, 0), 1);
  assert.equal((await storage.list()).length, 1);
});
test('official provider identity and normalized address prevent duplicates; different branches remain', async () => {
  const storage = new LocalPlaceStorage(new MemoryStorage());
  await storage.saveMany([fixturePlace()]);
  assert.equal((await storage.saveMany([fixturePlace({ id: 'two', providerId: 'different', name: '테라로사 ', address: '서울 종로구 삼청로30' })])).duplicates.length, 1);
  assert.equal((await storage.saveMany([fixturePlace({ id: 'three', providerId: 'branch-3', address: '서울 성동구 연무장길 1' })])).saved.length, 1);
  await storage.saveMany([fixturePlace({ id: 'official-1', providerId: '123', mapProvider: 'kakao', verification: 'official', address: '서울 종로구 새주소 1' })]);
  assert.equal((await storage.saveMany([fixturePlace({ id: 'official-2', providerId: '123', mapProvider: 'kakao', verification: 'official', name: '다르게 표기된 상호' })])).duplicates.length, 1);
});
test('corrupt storage is preserved and blocks writes, rather than silently resetting user data', async () => {
  const memory = new MemoryStorage(); memory.data.set(STORAGE_KEY, '{broken');
  const storage = new LocalPlaceStorage(memory);
  await assert.rejects(storage.list(), /덮어쓰지/);
  await assert.rejects(storage.saveMany([fixturePlace()]), /덮어쓰지/);
  assert.equal(memory.data.get(STORAGE_KEY), '{broken');
});
test('write failures do not report success; storage can recover and edit/delete later', async () => {
  const memory = new MemoryStorage(); const storage = new LocalPlaceStorage(memory);
  memory.failWrites = true;
  await assert.rejects(storage.saveMany([fixturePlace()]), /저장하지 못/);
  assert.equal((await storage.list()).length, 0);
  memory.failWrites = false;
  await storage.saveMany([fixturePlace()]);
  await storage.update(fixturePlace({ note: '가을에 가기', visited: true }));
  assert.equal((await storage.list())[0].note, '가을에 가기');
  await storage.remove('place-1');
  assert.equal((await storage.list()).length, 0);
});
