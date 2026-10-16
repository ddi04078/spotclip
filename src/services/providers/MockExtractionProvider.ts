import type { ExtractionResult, PlaceExtractionProvider, PlaceSource } from '../../domain/types.ts';
import { extractPlaces } from '../../domain/textParser.ts';
import { SourceUnavailableError } from '../ingestPlaceSource.ts';
import { mockPlaces } from './mockPlaces.ts';
export type MockScenario = 'multiple' | 'single' | 'ambiguous';
export class MockExtractionProvider implements PlaceExtractionProvider {
  private scenario: MockScenario;
  constructor(scenario: MockScenario = 'multiple') { this.scenario = scenario; }
  async extract(source: PlaceSource, onProgress?: (message: string) => void): Promise<ExtractionResult> {
    if (source.kind === 'url') throw new SourceUnavailableError();
    onProgress?.(source.kind === 'text' ? '본문 분석 중…' : '사진 분석 중…');
    // Visible waiting state, no fake network requests. Fixture results never claim to read the photo.
    await new Promise(resolve => setTimeout(resolve, 650));
    if (source.kind === 'text') {
      const parsed = extractPlaces(source.text);
      return { mode: 'mock', rawText: source.text, candidates: parsed.length ? parsed.map(p => ({ name: p.name, addressHint: p.address, confidence: 0.8 })) : [{ name: source.text.trim().split('\n')[0].slice(0, 150), confidence: 0.8 }] };
    }
    const image = source.images[0]?.thumbnail;
    const candidates = this.scenario === 'ambiguous' ? [{ name: '카페 어니언', regionHint: '서울', confidence: 0.91, sourceImageUri: image }]
      : mockPlaces.slice(0, this.scenario === 'single' ? 1 : 3).map(p => ({ name: p.name, addressHint: p.address, confidence: p.confidence, sourceImageUri: image }));
    return { mode: 'mock', candidates };
  }
}
