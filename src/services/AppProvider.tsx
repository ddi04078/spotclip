import { confirmOcrBatch } from './ocr/reviewBatch.ts';
import { EvidencePlaceResolver } from './resolution/EvidencePlaceResolver.ts';
import { createRemotePlaceSearch } from './resolution/RemotePlaceSearch.ts';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { randomUUID } from 'expo-crypto';
import type { AnalysisReport, Place, PlaceRepository, PlaceSource, ResolvedPlace, SourceImage, ExtractedPlace, PlaceResolverProvider } from '../domain/types.ts';
import type { MockScenario } from './providers/MockExtractionProvider.ts';
import { isOnDeviceOcrAvailable, onDeviceOcr } from '../platform/ocr';
import { createOcrFirstServices } from './ocr/createOcrFirstServices.ts';
import { UnverifiedPlaceResolver } from './providers/UnverifiedPlaceResolver.ts';
import { placeEvidence } from './resolution/placeEvidence.ts';
import { openCandidateSearch } from '../platform/linking/openMap.ts';
import { createServices } from './createServices.ts';
import { SourceUnavailableError } from './ingestPlaceSource.ts';
import { placeStorage, analysisSettingsStorage } from '../platform/nativeStorage.ts';
import type { AnalysisSettingsStorage } from '../storage/LocalAnalysisSettings.ts';
import { pickScreenshots, pruneImages, readAnalysisImage } from '../platform/images/nativeImages';
import { openMap } from '../platform/linking/openMap.ts';
import type { MapApp } from './maps/mapTargets.ts';

export interface AppDependencies {
  storage: PlaceRepository;
  pickImages: () => Promise<SourceImage[] | null>;
  pruneImages: (keepUris: string[]) => Promise<void>;
  openMap: (place: Place, app: MapApp) => Promise<void>;
  id: () => string;
  settings?: AnalysisSettingsStorage;
  readImage?: (image: SourceImage) => Promise<string>;
  request?: typeof fetch;
  /** Explicit injected policy; shipping defaults keep paid analysis disabled. */
  paidAnalysisEnabled?: boolean;
  defaultOcr?: boolean;
  placeResolver?: PlaceResolverProvider;
  searchCandidate?: (candidate: ExtractedPlace, app: MapApp) => Promise<void>;
}
const defaults: AppDependencies = { storage: placeStorage, pickImages: pickScreenshots, pruneImages, openMap, id: randomUUID, settings: analysisSettingsStorage, defaultOcr: isOnDeviceOcrAvailable };
const AppContext = createContext<ReturnType<typeof useController> | null>(null);
export function AppProvider({ children, dependencies = defaults }: { children: ReactNode; dependencies?: AppDependencies }) {
  const controller = useController(dependencies);
  return <AppContext.Provider value={controller}>{children}</AppContext.Provider>;
}
export function useSpotClip() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider is required');
  return value;
}
function useController(deps: AppDependencies) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [report, setReportState] = useState<AnalysisReport | null>(null);
  const reportRef = useRef<AnalysisReport | null>(null);
  const [scenario, setScenarioState] = useState<MockScenario>('multiple');
  const [mockAutoSave, setMockAutoSaveState] = useState(true);
  const settingsRef = useRef({ scenario, mockAutoSave });
  function setScenario(next: MockScenario) {
    settingsRef.current = { ...settingsRef.current, scenario: next }; setScenarioState(next);
    void deps.settings?.save(settingsRef.current).catch(e => setError(message(e)));
  }
  function setMockAutoSave(next: boolean) {
    settingsRef.current = { ...settingsRef.current, mockAutoSave: next }; setMockAutoSaveState(next);
    void deps.settings?.save(settingsRef.current).catch(e => setError(message(e)));
  }
  // Runtime only: credentials and transmission consent never enter browser/AsyncStorage.
  const [ocrMode, setOcrMode] = useState(deps.defaultOcr === true);
  const [placeSearchRemote, setPlaceSearchRemote] = useState<{endpoint:string;token:string}|null>(null);
  const evidenceResolver = useMemo(() => placeSearchRemote ? new EvidencePlaceResolver(createRemotePlaceSearch({endpoint:placeSearchRemote.endpoint, token:async()=>placeSearchRemote.token, consent:async()=>true, request:deps.request})) : null, [placeSearchRemote,deps.request]);
  const [remote, setRemote] = useState<{ endpoint: string; token: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [urlBlocked, setUrlBlocked] = useState(false);
  const guard = useRef(false);
  const services = useMemo(() => ocrMode ? createOcrFirstServices({ ocr: onDeviceOcr, resolver: deps.placeResolver || evidenceResolver || new UnverifiedPlaceResolver(), repository: deps.storage, id: deps.id }) : createServices(deps.storage, { scenario, mockAutoSave }, deps.id, remote ? {
    endpoint: remote.endpoint, accessToken: async () => remote.token, consent: async () => true,
    readImage: deps.readImage || readAnalysisImage, request: deps.request,
  } : undefined), [deps, scenario, mockAutoSave, remote, ocrMode, evidenceResolver]);
  const setReport = (next: AnalysisReport | null) => { reportRef.current = next; setReportState(next); };
  async function reload() { const data = await deps.storage.list(); setPlaces(data); return data; }
  async function clean(keepReport = reportRef.current) {
    const saved = await deps.storage.list();
    const pending = keepReport && (keepReport.source.kind === 'image' || keepReport.source.kind === 'screenshot') ? keepReport.source.images.map(p => p.reference) : [];
    // Failed cleanup never turns a successful save into an error or removes users' originals.
    await deps.pruneImages([...saved.flatMap(p => p.sourceImageUri ? [p.sourceImageUri] : []), ...pending]).catch(() => undefined);
  }
  useEffect(() => {
    void (async () => {
      try {
        if (deps.settings) {
          try {
            const settings = await deps.settings.load(); settingsRef.current = settings;
            setScenarioState(settings.scenario); setMockAutoSaveState(settings.mockAutoSave);
          } catch (e) { setError(message(e)); }
        }
        await reload(); await clean(null);
      }
      catch (e) { setError(message(e)); }
      finally { setReady(true); }
    })();
  }, []);
  async function run(action: () => Promise<void>): Promise<boolean> {
    if (guard.current || !ready) return false;
    guard.current = true; setError(''); setNotice(''); setBusy('준비 중…');
    try { await action(); return true; }
    catch (e) { setError(message(e)); if (e instanceof SourceUnavailableError) setUrlBlocked(true); return false; }
    finally { guard.current = false; setBusy(''); }
  }
  async function analyze(source: PlaceSource) {
    setReport(null); setUrlBlocked(false);
    try {
      const next = await services.ingestPlaceSource(source, setBusy);
      setReport(next); await reload();
      if (next.automatic.saved.length || next.automatic.duplicates.length) setNotice(saveMessage(next.automatic.saved.length, next.automatic.duplicates.length));
    } finally { await clean(); }
  }
  const paidAnalysisEnabled = deps.paidAnalysisEnabled === true;
  const configurePlaceSearch = (endpoint: string, token: string, consent: boolean) => run(async () => {
    if (!isOnDeviceOcrAvailable) throw new Error('현재 환경은 사진 OCR을 지원하지 않아요.');
    if (!consent) throw new Error('상호·주소의 외부 검색 전송에 동의해주세요.');
    if (token.trim().length < 32) throw new Error('서버 접근 토큰은 32자 이상이어야 해요. 카카오 API 키를 넣지 마세요.');
    createRemotePlaceSearch({ endpoint: endpoint.trim(), token:async()=>token.trim(), consent:async()=>true });
    setPlaceSearchRemote({ endpoint:endpoint.trim(),token:token.trim() }); setOcrMode(true); setRemote(null); setReport(null);
    setNotice('장소 검색을 설정했어요. 첫 분석 요청에서 서버 연결을 확인해요. 사진이나 유료 AI 요청은 보내지 않아요.');
  });
  const disconnectPlaceSearch = () => run(async () => {setPlaceSearchRemote(null);setReport(null);setNotice('자동 장소 검색을 껐어요. OCR은 계속 사용할 수 있어요.');});
  const configureRemote = (endpoint: string, token: string, consent: boolean) => run(async () => {
    if (!paidAnalysisEnabled) throw new Error('이번 검증 단계에서는 유료 AI 분석을 사용하지 않아요. Mock 또는 기기 OCR을 사용해주세요.');
    if (!consent) throw new Error('사진·본문의 외부 전송에 동의해주세요.');
    let url: URL;
    try { url = new URL(endpoint.trim()); } catch { throw new Error('올바른 분석 서버 주소를 넣어주세요.'); }
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('인증정보·쿼리 없는 HTTPS 분석 서버 주소를 넣어주세요.');
    if (token.trim().length < 32) throw new Error('접근 토큰은 32자 이상이어야 해요. API 키를 넣지 마세요.');
    setReport(null); setUrlBlocked(false);
    setRemote({ endpoint: url.href, token: token.trim() });
    setNotice('실제 분석 모드를 켰어요. 서버 연결은 분석할 때 확인해요.');
  });
  const disableRemote = () => run(async () => {
    setRemote(null); setOcrMode(false); setReport(null); setUrlBlocked(false); setNotice('Mock 체험으로 돌아왔어요.');
  });
  const enableOcr = () => run(async () => {
    if (!isOnDeviceOcrAvailable) throw new Error('기기 OCR은 iPhone Development Build가 필요해요.');
    setRemote(null); setOcrMode(true); setReport(null); setUrlBlocked(false);
    setNotice('사진 속 글자를 읽어요. 지도 API로 확인하지 않은 후보는 직접 확인 후 저장해주세요.');
  });
  const pick = () => run(async () => {
    setBusy('사진을 선택해주세요…');
    const images = await deps.pickImages();
    if (images) await analyze({ kind: 'screenshot', images });
  });
  const ingestPlaceSource = (source: PlaceSource) => run(() => analyze(source));
  const save = () => run(async () => {
    if (!reportRef.current) return;
    setBusy('장소를 저장하고 있어요…');
    const result = await services.saveReviewed(reportRef.current);
    setReport(result.report); await reload(); setNotice(saveMessage(result.outcome.saved.length, result.outcome.duplicates.length));
  });
  function choose(id: string, selected: ResolvedPlace) {
    const current = reportRef.current;
    if (!current || guard.current) return;
    setReport({ ...current, items: current.items.map(item => item.id === id ? { ...item, selected, decision: 'ready', confirmed: selected.verification !== 'unverified' } : item) });
  }
  function editCandidate(id: string, name: string, address: string) {
    const current=reportRef.current;
    if(guard.current || !current || current.mode!=='ocr')return;
    setReport({...current,items:current.items.map(item=>item.id===id && !['saved','duplicate'].includes(item.decision) && !item.matches.some(m=>m.verification==='official') ? {...item,candidate:{...item.candidate,name,addressHint:address},selected:item.selected?{...item.selected,name,address}:undefined,confirmed:false} : item)});
  }
  const saveBatch = () => run(async () => {
    const current=reportRef.current;if(!current || current.mode!=='ocr')return;
    setBusy('확인한 장소를 한 번에 저장하고 있어요…');
    const result=await services.saveReviewed(confirmOcrBatch(current));
    setReport(result.report);await reload();setNotice(saveMessage(result.outcome.saved.length,result.outcome.duplicates.length));
  });
  function confirmCandidate(id: string, name: string, address: string) {
    if (guard.current || !name.trim() || !address.trim() || name.length > 200 || address.length > 300) return;
    const current = reportRef.current;
    if (!current || current.mode !== 'ocr') return;
    setReport({ ...current, items: current.items.map(item => item.id === id ? {
      ...item, selected: { name: name.trim(), address: address.trim(), category: placeEvidence(item.candidate).category || '기타', mapProvider: 'none', confidence: Math.min(.65, item.candidate.confidence), verification: 'unverified' }, decision: 'ready', confirmed: true,
    } : item) });
  }
  const remove = (id: string) => run(async () => { await deps.storage.remove(id); await reload(); await clean(); setNotice('장소를 삭제했어요.'); });
  const update = (place: Place) => run(async () => { await deps.storage.update(place); await reload(); setNotice('변경 내용을 저장했어요.'); });
  const searchCandidate = (candidate: ExtractedPlace, app: MapApp) => run(() => (deps.searchCandidate || openCandidateSearch)(candidate, app));
  const map = (place: Place, app: MapApp) => run(() => deps.openMap(place, app));
  const reset = () => run(async () => { setReport(null); setUrlBlocked(false); await clean(null); });
  return { editCandidate, saveBatch, placeSearchConfigured: !!placeSearchRemote, configurePlaceSearch, disconnectPlaceSearch, searchCandidate, confirmCandidate, paidAnalysisEnabled, ocrMode, ocrAvailable: isOnDeviceOcrAvailable, enableOcr, realMode: !!remote, remoteEndpoint: remote?.endpoint || '', configureRemote, disableRemote, places, report, scenario, setScenario, mockAutoSave, setMockAutoSave, ready, busy, error, notice, urlBlocked, pick, ingestPlaceSource, save, choose, remove, update, map, reset };
}
function message(e: unknown): string { return e instanceof Error ? e.message : '처리하지 못했어요. 잠시 후 다시 시도해주세요.'; }
function saveMessage(saved: number, duplicates: number): string {
  return `${saved ? `${saved}곳 저장했어요.` : '새로 저장할 장소가 없어요.'}${duplicates ? ` 이미 저장한 ${duplicates}곳은 제외했어요.` : ''}`;
}
