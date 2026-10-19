import { isPlace, parsePublicUrl, sourceInfo } from '../domain/place.ts';
import type { AnalysisItem, AnalysisReport, Place, PlaceExtractionProvider, PlaceRepository, PlaceResolverProvider, PlaceSource, ResolvedPlace, SaveOutcome } from '../domain/types.ts';

export class SourceUnavailableError extends Error {
  constructor() { super('이 게시물은 직접 읽을 수 없어요. 게시물 화면을 캡처해서 올려주세요.'); this.name = 'SourceUnavailableError'; }
}
export interface IngestDependencies {
  extraction: PlaceExtractionProvider;
  resolver: PlaceResolverProvider;
  repository: PlaceRepository;
  id: () => string;
  now: () => string;
  allowMockAutoSave?: boolean;
}
export function createIngestService(deps: IngestDependencies) {
  function toPlace(match: ResolvedPlace, source: PlaceSource, image?: string): Place {
    const info = sourceInfo(source);
    return { ...match, id: deps.id(), sourcePlatform: info.platform, sourceUrl: info.url, sourceImageUri: image, createdAt: deps.now(), note: '', visited: false };
  }
  return {
    async ingestPlaceSource(source: PlaceSource, onProgress?: (message: string) => void): Promise<AnalysisReport> {
      if (source.kind === 'url' && !parsePublicUrl(source.url)) throw new Error('올바른 http 또는 https 게시물 링크를 넣어주세요.');
      if (source.kind === 'text' && (!source.text.trim() || source.text.length > 15000)) throw new Error('본문을 15,000자 이하로 넣어주세요.');
      if ((source.kind === 'image' || source.kind === 'screenshot') && (!source.images.length || source.images.length > 10)) throw new Error('사진을 1~10장 선택해주세요.');
      const extracted = await deps.extraction.extract(source, onProgress);
      onProgress?.('찾은 장소를 확인하고 있어요…');
      const items: AnalysisItem[] = [];
      const auto: Place[] = [];
      for (const candidate of extracted.candidates.slice(0, 50)) {
        if (!candidate.name.trim() || !Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) continue;
        const matches = (await deps.resolver.resolve(candidate)).filter(match => isPlace(toPlace(match, source, candidate.sourceImageUri))).sort((a, b) => b.confidence - a.confidence);
        const best = matches[0];
        const unambiguous = !!best && best.confidence >= 0.9 && (!matches[1] || best.confidence - matches[1].confidence >= 0.15);
        const selected = matches.length === 1 || unambiguous ? best : undefined;
        const item: AnalysisItem = { id: deps.id(), candidate, matches, selected, decision: selected ? 'ready' : matches.length ? 'choose' : 'unresolved', confirmed: selected?.verification !== 'unverified' && !!selected };
        // Mock automation is an explicit test policy; saved records retain verification='mock'.
        const mayAutoSave = (extracted.mode !== 'mock' && best?.verification === 'official')
          || (deps.allowMockAutoSave === true && extracted.mode === 'mock' && best?.verification === 'mock');
        if (mayAutoSave && unambiguous && candidate.confidence >= 0.9) {
          const place = toPlace(best, source, candidate.sourceImageUri);
          auto.push(place);
          item.decision = 'saved';
        }
        items.push(item);
      }
      const automatic: SaveOutcome = auto.length ? await deps.repository.saveMany(auto) : { saved: [], duplicates: [] };
      // Track automatic duplicates without assuming repository ordering or mutating fixture matches.
      const savedIds = new Set(automatic.saved.map(p => p.id));
      let index = 0;
      for (const item of items) if (item.decision === 'saved') item.decision = savedIds.has(auto[index++].id) ? 'saved' : 'duplicate';
      return { source, sources: extracted.sources, mode: extracted.mode, rawText: extracted.rawText, items, automatic };
    },
    async saveReviewed(report: AnalysisReport): Promise<{ outcome: SaveOutcome; report: AnalysisReport }> {
      const pending = report.items.filter(item => item.decision === 'ready' && item.selected && item.confirmed);
      const records = pending.map(item => toPlace(item.selected!, report.source, item.candidate.sourceImageUri));
      if (!records.every(isPlace)) throw new Error('장소 이름과 주소를 확인해주세요.');
      const outcome = records.length ? await deps.repository.saveMany(records) : { saved: [], duplicates: [] };
      const savedIds = new Set(outcome.saved.map(p => p.id));
      const decisions = new Map(pending.map((item, index) => [item.id, savedIds.has(records[index].id) ? 'saved' as const : 'duplicate' as const]));
      return { outcome, report: { ...report, items: report.items.map(item => ({ ...item, decision: decisions.get(item.id) || item.decision })) } };
    },
  };
}
