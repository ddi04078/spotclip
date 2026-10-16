import type { ResolvedPlace } from '../../domain/types.ts';
/** Deliberate fixtures, not business directory records. Never assign real provider IDs. */
export const mockPlaces: ResolvedPlace[] = [
  { name: '도온정 홍대', address: '서울 마포구 · 테스트 주소', category: '맛집', mapProvider: 'mock', providerId: 'mock-doonjeong', confidence: 0.97, verification: 'mock' },
  { name: '테라로사 국립현대미술관 서울점', address: '서울 종로구 삼청로 30', category: '카페', mapProvider: 'mock', providerId: 'mock-terarosa', confidence: 0.95, verification: 'mock' },
  { name: '카페 산아래', address: '서울 강북구 · 테스트 주소', category: '카페', mapProvider: 'mock', providerId: 'mock-sanaerae', confidence: 0.93, verification: 'mock' },
];
export const onionBranches: ResolvedPlace[] = ['안국', '성수', '미아'].map((branch, index) => ({
  name: `카페 어니언 ${branch}`, address: `${['서울 종로구', '서울 성동구', '서울 강북구'][index]} · 테스트 주소`,
  category: '카페', mapProvider: 'mock', providerId: `mock-onion-${branch}`, confidence: 0.84 - index * 0.01, verification: 'mock',
}));
