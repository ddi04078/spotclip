import { UnverifiedPlaceResolver } from '../providers/UnverifiedPlaceResolver.ts';
import type { ExtractedPlace, PlaceExtractionProvider, PlaceRepository, PlaceResolverProvider, ResolvedPlace, SourceAnalysis } from '../../domain/types.ts';
import { createIngestService, SourceUnavailableError } from '../ingestPlaceSource.ts';
import { normalize } from '../../domain/textParser.ts';
import { placeEvidence } from '../resolution/placeEvidence.ts';
import { extractPlaceCandidates } from './placeCandidateExtractor.ts';
import type { OcrProvider } from './types.ts';
export function createOcrFirstServices(options: {
  ocr: OcrProvider; resolver: PlaceResolverProvider; repository: PlaceRepository; id: () => string;
  /** Future seam only. No fallback is invoked or enabled in this phase. */
  fallback?: PlaceExtractionProvider;
  maxResolverCandidates?: number;
}) {
  // Session-only, bounded memoization. Include address/region to keep branches separate.
  let resolutionCount = 0;
  const cache = new Map<string, Promise<ResolvedPlace[]>>();
  const resolver: PlaceResolverProvider = { async resolve(candidate) {
    const key = JSON.stringify([normalize(candidate.name), candidate.regionHint || '', candidate.addressHint || '', candidate.aliases || []]);
    let pending = cache.get(key);
    if (!pending) {
      if (options.maxResolverCandidates !== undefined && resolutionCount >= options.maxResolverCandidates) {
        candidate.recognitionWarning = [candidate.recognitionWarning, '이번 분석의 자동 장소 검색 한도에 도달했어요. 후보는 유지하며 직접 확인 후 저장할 수 있어요.'].filter(Boolean).join(' ');
        return new UnverifiedPlaceResolver().resolve(candidate);
      }
      resolutionCount++;
      pending = options.resolver.resolve(candidate); cache.set(key, pending);
      if (cache.size > 100) cache.delete(cache.keys().next().value!);
      pending.catch(() => cache.delete(key));
    }
    return (await pending).map(match => ({ ...match }));
  } };
  const extraction: PlaceExtractionProvider = { async extract(source, progress) {
    resolutionCount = 0;
    if (source.kind === 'url') throw new SourceUnavailableError();
    const candidates: ExtractedPlace[] = []; const seen = new Set<string>();
    const texts: string[] = [];
    const sources: SourceAnalysis[] = [];
    if (source.kind === 'text') texts.push(source.text);
    else for (const image of source.images) {
      progress?.(`기기에서 글자를 읽고 있어요… (${texts.length + 1}/${source.images.length})`);
      const index = texts.length;
      try { texts.push((await options.ocr.recognize(image)).text); sources.push({ imageId:image.id,index,status:'empty',count:0 }); }
      catch { texts.push(''); sources.push({ imageId:image.id,index,status:'error',count:0 }); }
    }
    for (let i = 0; i < texts.length; i++) {
      const found = extractPlaceCandidates(texts[i]); let added = 0;
      for (const c of found) {
        // Only merge known address identities. Similar names without addresses may be different branches.
        const key = normalize(c.name + '|' + (c.addressHint || '')) + (c.addressHint ? '' : `|photo:${i}`);
        if (seen.has(key)) continue;
        seen.add(key); added++;
        candidates.push({ ...c, regionHint: placeEvidence(c).region || c.regionHint, sourceImageUri: source.kind === 'image' || source.kind === 'screenshot' ? source.images[i].reference : undefined });
      }
      if(sources[i] && sources[i].status!=='error') sources[i]={...sources[i],status:added?'found':found.length?'duplicate':'empty',count:found.length};
    }
    // Empty/low-confidence OCR is surfaced for review; never silently spends money.
    return { mode: 'ocr', sources: source.kind === 'text' ? undefined : sources, candidates, rawText: texts.map((text, i) => `사진 ${i + 1} OCR 원문\n${text}`).join('\n\n').slice(0, 30000) };
  } };
  return createIngestService({ extraction, resolver, repository: options.repository, id: options.id, now: () => new Date().toISOString() });
}
