import type { AsyncKeyValueStorage } from '../../src/storage/LocalPlaceStorage.ts';
import type { Place, PlaceSource } from '../../src/domain/types.ts';
export class MemoryStorage implements AsyncKeyValueStorage {
  data = new Map<string, string>();
  failWrites = false;
  async getItem(key: string) { return this.data.get(key) ?? null; }
  async setItem(key: string, value: string) { if (this.failWrites) throw new Error('quota'); this.data.set(key, value); }
}
export function fixturePlace(overrides: Partial<Place> = {}): Place {
  return { id: 'place-1', name: '테라로사', address: '서울 종로구 삼청로 30', category: '카페', mapProvider: 'mock', providerId: 'mock-1', verification: 'mock', confidence: 0.97, createdAt: '2026-10-15T00:00:00.000Z', sourcePlatform: 'photo', sourceImageUri: 'file:///app/spotclip-images/abc.jpg', note: '', visited: false, ...overrides };
}
export const imageSource: PlaceSource = { kind: 'screenshot', images: [{ id: 'image-1', name: 'sns.jpg', mediaType: 'image/jpeg', size: 1234, reference: 'file:///app/spotclip-images/abc.jpg', thumbnail: 'file:///app/spotclip-images/abc.jpg' }] };
export function ids() { let i = 0; return () => `id-${++i}`; }
