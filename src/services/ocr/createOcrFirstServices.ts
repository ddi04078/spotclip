import type { ExtractedPlace, PlaceExtractionProvider, PlaceRepository, PlaceResolverProvider, ResolvedPlace } from '../../domain/types.ts';
import { createIngestService, SourceUnavailableError } from '../ingestPlaceSource.ts';
import { normalize } from '../../domain/textParser.ts';
import { extractPlaceCandidates } from './placeCandidateExtractor.ts';
import type { OcrProvider } from './types.ts';
export function createOcrFirstServices(options: {
  ocr: OcrProvider; resolver: PlaceResolverProvider; repository: PlaceRepository; id: () => string;
  /** Future seam only. No fallback is invoked or enabled in this phase. */
  fallback?: PlaceExtractionProvider;
}) {
  // Session-only, bounded memoization. Include address/region to keep branches separate.
  const cache = new Map<string, Promise<ResolvedPlace[]>>();
  const resolver: PlaceResolverProvider = { async resolve(candidate) {
    const key = normalize([candidate.name, candidate.regionHint || '', candidate.addressHint || ''].join('|'));
    let pending = cache.get(key);
    if (!pending) {
      pending = options.resolver.resolve(candidate); cache.set(key, pending);
      if (cache.size > 100) cache.delete(cache.keys().next().value!);
      pending.catch(() => cache.delete(key));
    }
    return (await pending).map(match => ({ ...match }));
  } };
  const extraction: PlaceExtractionProvider = { async extract(source, progress) {
    if (source.kind === 'url') throw new SourceUnavailableError();
    const candidates: ExtractedPlace[] = []; const seen = new Set<string>();
    const texts: string[] = [];
    if (source.kind === 'text') texts.push(source.text);
    else for (const image of source.images) {
      progress?.(`기기에서 글자를 읽고 있어요… (${texts.length + 1}/${source.images.length})`);
      texts.push((await options.ocr.recognize(image)).text);
    }
    for (let i = 0; i < texts.length; i++) for (const c of extractPlaceCandidates(texts[i])) {
      const key = normalize(c.name + '|' + (c.addressHint || ''));
      if (seen.has(key) || candidates.length >= 5) continue;
      seen.add(key); candidates.push({ ...c, sourceImageUri: source.kind === 'image' || source.kind === 'screenshot' ? source.images[i].reference : undefined });
    }
    // Empty/low-confidence OCR is surfaced for review; never silently spends money.
    return { mode: 'ocr', candidates, rawText: texts.map((text, i) => `사진 ${i + 1} OCR 원문\n${text}`).join('\n\n').slice(0, 30000) };
  } };
  return createIngestService({ extraction, resolver, repository: options.repository, id: options.id, now: () => new Date().toISOString() });
}
