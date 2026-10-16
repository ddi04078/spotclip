import { normalize } from '../../domain/place.ts';
import type { ExtractedPlace, PlaceResolverProvider, ResolvedPlace } from '../../domain/types.ts';
import { mockPlaces, onionBranches } from './mockPlaces.ts';
export class MockPlaceResolver implements PlaceResolverProvider {
  async resolve(candidate: ExtractedPlace): Promise<ResolvedPlace[]> {
    if (normalize(candidate.name) === normalize('카페 어니언')) return onionBranches.map(p => ({ ...p }));
    const known = [...mockPlaces, ...onionBranches].find(p => normalize(p.name) === normalize(candidate.name));
    if (known) return [{ ...known }];
    // No invented businesses for unknown text. This is a transparent, unverified OCR hint.
    return candidate.addressHint ? [{ name: candidate.name, address: candidate.addressHint, category: '기타', mapProvider: 'none', verification: 'unverified', confidence: Math.min(0.65, candidate.confidence) }] : [];
  }
}
