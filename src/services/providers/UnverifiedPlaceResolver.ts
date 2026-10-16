import type { ExtractedPlace, PlaceResolverProvider, ResolvedPlace } from '../../domain/types.ts';
/** Phase 1 has no official place API. OCR text cannot verify that a business exists. */
export class UnverifiedPlaceResolver implements PlaceResolverProvider {
  async resolve(candidate: ExtractedPlace): Promise<ResolvedPlace[]> {
    if (!candidate.addressHint || candidate.name === '장소 이름을 입력해 주세요') return [];
    return [{ name: candidate.name, address: candidate.addressHint, category: '기타', mapProvider: 'none', verification: 'unverified', confidence: Math.min(candidate.confidence, 0.65) }];
  }
}
