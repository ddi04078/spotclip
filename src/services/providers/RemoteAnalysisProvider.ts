import type { ExtractedPlace, ExtractionResult, PlaceExtractionProvider, PlaceResolverProvider, PlaceSource, ResolvedPlace, SourceImage } from '../../domain/types.ts';
import { isPlace } from '../../domain/place.ts';
import { SourceUnavailableError } from '../ingestPlaceSource.ts';
export interface RemoteAnalysisOptions {
  endpoint: string;
  /** Read from user input/secure credential storage; never bundle a shared token. */
  accessToken: () => Promise<string>;
  /** UI must disclose third-party image transmission before returning true. */
  consent: () => Promise<boolean>;
  readImage: (image: SourceImage) => Promise<string>;
  request?: typeof fetch;
}
/** One request per analysis; resolver consumes only this request's official search results. */
export function createRemoteProviders(options: RemoteAnalysisOptions): { extraction: PlaceExtractionProvider; resolver: PlaceResolverProvider } {
  const endpoint = new URL(options.endpoint);
  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))) throw new Error('분석 서버는 HTTPS 주소를 사용해주세요.');
  let matches = new WeakMap<ExtractedPlace, ResolvedPlace[]>();
  return {
    extraction: {
      async extract(source: PlaceSource, onProgress): Promise<ExtractionResult> {
        matches = new WeakMap();
        if (source.kind === 'url') throw new SourceUnavailableError();
        if (!await options.consent()) throw new Error('사진·본문 전송에 동의한 뒤 분석할 수 있어요.');
        const token = await options.accessToken();
        if (token.length < 32) throw new Error('분석 서버 접근 토큰이 필요해요.');
        onProgress?.('실제 장소를 분석하고 있어요…');
        const body = source.kind === 'text' ? { kind: source.kind, text: source.text } : { kind: source.kind, images: await Promise.all(source.images.map(options.readImage)) };
        const serialized = JSON.stringify(body);
        if (new TextEncoder().encode(serialized).length > 4_000_000) throw new Error('한 번에 보내는 사진 크기를 줄여주세요.');
        const response = await (options.request || fetch)(endpoint.href, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: serialized, signal: AbortSignal.timeout(180000),
        });
        if (!response.ok) {
          if (response.status === 401) throw new Error('분석 서버 접근 토큰을 확인해주세요.');
          if (response.status === 503) throw new Error('분석 서버의 API 설정이 필요해요.');
          throw new Error('분석하지 못했어요. 사진 크기와 연결을 확인하고 다시 시도해주세요.');
        }
        const data = await response.json();
        if (data.mode !== 'api' || !Array.isArray(data.items) || data.items.length > 10) throw new Error('분석 결과 형식이 올바르지 않아요.');
        const candidates: ExtractedPlace[] = [];
        for (const item of data.items) {
          const c = item.candidate;
          if (!c || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 300 || !Number.isFinite(c.confidence) || c.confidence < 0 || c.confidence > 1 || !Array.isArray(item.matches)) throw new Error('분석 결과 형식이 올바르지 않아요.');
          const candidate: ExtractedPlace = { name: c.name, confidence: c.confidence,
            regionHint: typeof c.regionHint === 'string' ? c.regionHint.slice(0, 300) : undefined,
            addressHint: typeof c.addressHint === 'string' ? c.addressHint.slice(0, 300) : undefined };
          const verified = item.matches.filter((m: ResolvedPlace) => m.verification === 'official' && m.mapProvider === 'kakao' && /^\d+$/.test(m.providerId || '') && isPlace({ ...m, id: 'validation', sourcePlatform: 'photo', createdAt: new Date().toISOString(), note: '', visited: false }));
          matches.set(candidate, verified);
          candidates.push(candidate);
        }
        return { mode: 'api', candidates };
      },
    },
    resolver: { async resolve(candidate) { return matches.get(candidate) || []; } },
  };
}
