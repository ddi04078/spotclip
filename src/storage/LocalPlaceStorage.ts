import { isPlace, samePlace } from '../domain/place.ts';
import type { Place, PlaceRepository, SaveOutcome } from '../domain/types.ts';

export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export const STORAGE_KEY = '@spotclip/places/v1';
export class PlaceStorageError extends Error {}

/** AsyncStorage adapter, serialized so simultaneous ingests cannot overwrite one another. */
export class LocalPlaceStorage implements PlaceRepository {
  private storage: AsyncKeyValueStorage;
  private queue: Promise<void> = Promise.resolve();
  constructor(storage: AsyncKeyValueStorage) { this.storage = storage; }
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
  private async read(): Promise<Place[]> {
    try {
      const raw = await this.storage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      const data = JSON.parse(raw);
      if (data?.version !== 1 || !Array.isArray(data.places) || !data.places.every(isPlace)) throw new Error();
      return data.places;
    } catch { throw new PlaceStorageError('저장한 장소를 읽지 못했어요. 기존 데이터를 덮어쓰지 않았습니다. 앱을 다시 열어주세요.'); }
  }
  private async write(places: Place[]) {
    if (!places.every(isPlace)) throw new PlaceStorageError('장소 이름과 주소를 확인해주세요.');
    try { await this.storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, places })); }
    catch { throw new PlaceStorageError('저장하지 못했어요. 기기 저장 공간을 확인하고 다시 시도해주세요.'); }
  }
  list(): Promise<Place[]> { return this.exclusive(() => this.read()); }
  saveMany(incoming: Place[]): Promise<SaveOutcome> {
    return this.exclusive(async () => {
      const next = await this.read();
      const saved: Place[] = [], duplicates: Place[] = [];
      for (const place of incoming) {
        if (!isPlace(place)) throw new PlaceStorageError('올바르지 않은 장소 데이터입니다.');
        if (next.some(p => samePlace(p, place))) duplicates.push(place);
        else {
          if (next.some(p => p.id === place.id)) throw new PlaceStorageError('장소 ID가 중복됩니다.');
          next.unshift(place); saved.push(place);
        }
      }
      if (saved.length) await this.write(next);
      return { saved, duplicates };
    });
  }
  update(place: Place): Promise<void> {
    return this.exclusive(async () => {
      const current = await this.read();
      if (!current.some(p => p.id === place.id)) throw new PlaceStorageError('삭제된 장소예요. 다시 확인해주세요.');
      if (current.some(p => p.id !== place.id && samePlace(p, place))) throw new PlaceStorageError('이미 저장한 장소예요.');
      await this.write(current.map(p => p.id === place.id ? place : p));
    });
  }
  remove(id: string): Promise<void> {
    return this.exclusive(async () => this.write((await this.read()).filter(p => p.id !== id)));
  }
}
