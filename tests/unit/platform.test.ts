import test from 'node:test';
import assert from 'node:assert/strict';
import { mapTarget } from '../../src/services/maps/mapTargets.ts';
import { sourceFromShare } from '../../src/platform/share/payload.ts';
import { detectPlatform, isPlace, parsePublicUrl } from '../../src/domain/place.ts';
import { fixturePlace } from './helpers.ts';
test('Naver and Kakao links encode names/addresses; official Kakao IDs open exact places', () => {
  const place = fixturePlace({ name: '카페 & 티 #1' });
  const naver = mapTarget(place, 'naver');
  assert.equal(new URL(naver).hostname, 'map.naver.com');
  assert.equal(decodeURIComponent(naver.split('/search/')[1]), '카페 & 티 #1 서울 종로구 삼청로 30');
  assert.match(mapTarget(place, 'kakao'), /^https:\/\/map.kakao.com\/link\/search\//);
  assert.equal(mapTarget(fixturePlace({ verification: 'official', mapProvider: 'kakao', providerId: '12345' }), 'kakao'), 'https://map.kakao.com/link/map/12345');
  assert.match(mapTarget(fixturePlace({ providerId: '12345' }), 'kakao'), /\/search\//); // Mock IDs cannot imply a real match.
});
test('native share adapters produce the same domain source type for URL/text/image', () => {
  const image = { id: 'img', name: 'x.jpg', mediaType: 'image/jpeg', size: 1, reference: 'file:///app/x.jpg' };
  const source = sourceFromShare({ images: [image], url: 'https://www.instagram.com/p/abc/' });
  assert.equal(source.kind, 'image');
  assert.ok(source.kind === 'image' && source.platform === 'instagram');
  assert.equal(sourceFromShare({ url: 'https://threads.com/@x/post/123' }).kind, 'url');
  assert.equal(sourceFromShare({ text: '테라로사' }).kind, 'text');
  assert.throws(() => sourceFromShare({}), /공유받은/);
});
test('unsafe URLs and malformed records are rejected without platform side effects', () => {
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'https://user:password@example.com']) assert.equal(parsePublicUrl(url), null);
  assert.equal(detectPlatform('https://instagram.com.evil.example/p/abc'), 'web');
  assert.equal(detectPlatform('https://m.blog.naver.com/foo'), 'naver-blog');
  assert.equal(isPlace(fixturePlace({ latitude: 91, longitude: 127 })), false);
  assert.equal(isPlace(fixturePlace({ confidence: NaN })), false);
  assert.equal(isPlace(fixturePlace({ sourceImageUri: 'https://untrusted.example/photo.jpg' })), false);
});
