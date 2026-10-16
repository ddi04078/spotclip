import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { randomUUID } from 'expo-crypto';
import type { AnalysisReport, Place, PlaceRepository, PlaceSource, ResolvedPlace, SourceImage } from '../domain/types.ts';
import type { MockScenario } from './providers/MockExtractionProvider.ts';
import { isOnDeviceOcrAvailable, onDeviceOcr } from '../platform/ocr';
import { createOcrFirstServices } from './ocr/createOcrFirstServices.ts';
import { MockPlaceResolver } from './providers/MockPlaceResolver.ts';
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
}
const defaults: AppDependencies = { storage: placeStorage, pickImages: pickScreenshots, pruneImages, openMap, id: randomUUID, settings: analysisSettingsStorage };
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
  const [ocrMode, setOcrMode] = useState(false);
  const [remote, setRemote] = useState<{ endpoint: string; token: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [urlBlocked, setUrlBlocked] = useState(false);
  const guard = useRef(false);
  const services = useMemo(() => ocrMode ? createOcrFirstServices({ ocr: onDeviceOcr, resolver: new MockPlaceResolver(), repository: deps.storage, id: deps.id }) : createServices(deps.storage, { scenario, mockAutoSave }, deps.id, remote ? {
    endpoint: remote.endpoint, accessToken: async () => remote.token, consent: async () => true,
    readImage: deps.readImage || readAnalysisImage, request: deps.request,
  } : undefined), [deps, scenario, mockAutoSave, remote, ocrMode]);
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
    setNotice('기기 OCR을 켰어요. 장소 검색은 아직 Mock이며 AI를 호출하지 않아요.');
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
  const remove = (id: string) => run(async () => { await deps.storage.remove(id); await reload(); await clean(); setNotice('장소를 삭제했어요.'); });
  const update = (place: Place) => run(async () => { await deps.storage.update(place); await reload(); setNotice('변경 내용을 저장했어요.'); });
  const map = (place: Place, app: MapApp) => run(() => deps.openMap(place, app));
  const reset = () => run(async () => { setReport(null); setUrlBlocked(false); await clean(null); });
  return { paidAnalysisEnabled, ocrMode, ocrAvailable: isOnDeviceOcrAvailable, enableOcr, realMode: !!remote, remoteEndpoint: remote?.endpoint || '', configureRemote, disableRemote, places, report, scenario, setScenario, mockAutoSave, setMockAutoSave, ready, busy, error, notice, urlBlocked, pick, ingestPlaceSource, save, choose, remove, update, map, reset };
}
function message(e: unknown): string { return e instanceof Error ? e.message : '처리하지 못했어요. 잠시 후 다시 시도해주세요.'; }
function saveMessage(saved: number, duplicates: number): string {
  return `${saved ? `${saved}곳 저장했어요.` : '새로 저장할 장소가 없어요.'}${duplicates ? ` 이미 저장한 ${duplicates}곳은 제외했어요.` : ''}`;
}
