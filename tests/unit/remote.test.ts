import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../server/analysis.mjs';
import { createHandler } from '../../server/handler.mjs';
import { createRemoteProviders } from '../../src/services/providers/RemoteAnalysisProvider.ts';
const env = { NODE_ENV: 'test' as const, OPENAI_API_KEY: 'test', KAKAO_REST_API_KEY: 'test', SPOTCLIP_ACCESS_TOKEN: 'a'.repeat(32), SPOTCLIP_ALLOWED_ORIGINS: 'https://test.example' };
const candidate = { name: '카페 테스트', regionHint: '서울', addressHint: '서울 종로구 1', confidence: .98 };
const doc = { id: '123', place_name: candidate.name, road_address_name: candidate.addressHint, x: '126.98', y: '37.57', category_group_code: 'CE7' };
const fixture = (p = candidate, documents = [doc]) => async (url: string | URL | Request) => new Response(JSON.stringify(String(url).includes('openai.com') ? { output: [{ content: [{ type: 'output_text', text: JSON.stringify({ places: [p] }) }] }] } : { documents }));
test('AI extraction resolves official listings; exact address needed for auto-save confidence', async () => {
  const result = await analyze({ kind: 'text', text: '카페 테스트 서울 종로구 1' }, env, fixture());
  assert.equal(result.items[0].matches[0].confidence, .99);
  assert.equal(result.items[0].matches[0].providerId, '123');
  const fuzzy = await analyze({ kind: 'text', text: '카페 테스트' }, env, fixture({ ...candidate, addressHint: '' }));
  assert.equal(fuzzy.items[0].matches[0].confidence, .7);
});
test('multiple branches remain ambiguous and unsupported URLs never get fetched', async () => {
  const result = await analyze({ kind: 'text', text: '카페 테스트' }, env, fixture(candidate, [doc, { ...doc, id: '456' }]));
  assert.equal(result.items[0].matches.length, 2);
  let calls = 0;
  await assert.rejects(analyze({ kind: 'url', url: 'http://localhost/private' }, env, async () => { calls++; return new Response(); }), /캡처/);
  assert.equal(calls, 0);
});
test('invalid input and upstream failures do not return pretend places', async () => {
  await assert.rejects(analyze({ kind: 'image', images: ['https://host/image.png'] }, env, fixture()), /분석 이미지/);
  await assert.rejects(analyze({ kind: 'text', text: '장소' }, env, async () => new Response('{}', { status: 429 })), /응답하지/);
});
test('HTTP boundary rejects unauthorized clients and disallowed origins without spending API calls', async () => {
  let calls = 0;
  const handle = createHandler(env, async () => { calls++; return new Response(); });
  for (const [headers, status] of [[{}, 401], [{ origin: 'https://evil.example' }, 403]] as const) {
    const res = { statusCode: 0, setHeader() {}, end() {} };
    await handle({ method: 'POST', headers }, res);
    assert.equal(res.statusCode, status);
  }
  assert.equal(calls, 0);
});
test('remote adapter requires consent and returns validated official results through common pipeline interfaces', async () => {
  let calls = 0;
  const options = { endpoint: 'https://api.example/api/analyze', accessToken: async () => env.SPOTCLIP_ACCESS_TOKEN, consent: async () => false, readImage: async () => '', request: async () => { calls++; return new Response(); } };
  await assert.rejects(createRemoteProviders(options).extraction.extract({ kind: 'text', text: '장소' }), /동의/);
  assert.equal(calls, 0);
  const data = await analyze({ kind: 'text', text: '카페 테스트' }, env, fixture());
  const providers = createRemoteProviders({ ...options, consent: async () => true, request: async () => new Response(JSON.stringify(data)) });
  const result = await providers.extraction.extract({ kind: 'text', text: '장소' });
  assert.equal(result.mode, 'api');
  assert.equal((await providers.resolver.resolve(result.candidates[0]))[0].verification, 'official');
});
