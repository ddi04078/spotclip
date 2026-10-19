import { buildSearchPlan } from '../resolution/placeEvidence.ts';
import type { Place, ExtractedPlace } from '../../domain/types.ts';
export type MapApp = 'naver' | 'kakao';
export function mapTarget(place: Pick<Place, 'name' | 'address' | 'latitude' | 'longitude' | 'verification' | 'mapProvider' | 'providerId'>, app: MapApp): string {
  const address = place.verification === 'mock' ? place.address.replace(/\s*· 테스트 주소$/, '') : place.address;
  const query = encodeURIComponent(`${place.name} ${address}`.trim());
  if (app === 'naver') return `https://map.naver.com/p/search/${query}`;
  if (place.verification === 'official' && place.mapProvider === 'kakao' && /^\d+$/.test(place.providerId || '')) return `https://map.kakao.com/link/map/${place.providerId}`;
  if (place.verification === 'official' && Number.isFinite(place.latitude) && Number.isFinite(place.longitude)) return `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`;
  return `https://map.kakao.com/link/search/${query}`;
}

export function candidateMapTarget(candidate: ExtractedPlace, app: MapApp): string {
  const query = buildSearchPlan(candidate)[0]?.query;
  if (!query) throw new Error('지도에서 검색할 상호 또는 주소가 필요해요.');
  return mapTarget({ name: query, address: '', verification: 'unverified', mapProvider: 'none' }, app);
}
