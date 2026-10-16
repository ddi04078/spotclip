export const categories = ['맛집', '카페', '여행', '쇼핑', '기타'] as const;
export type Category = typeof categories[number];
export type SourcePlatform = 'instagram' | 'threads' | 'tiktok' | 'youtube' | 'naver-blog' | 'web' | 'photo' | 'text';
export type Verification = 'mock' | 'official' | 'unverified';
export type MapProvider = 'mock' | 'kakao' | 'naver' | 'none';

/** An opaque asset reference. Native file URIs are prepared by platform adapters. */
export interface SourceImage {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  reference: string;
  thumbnail?: string;
  /** Transient analysis data; never copy this into saved Place records. */
  analysisData?: string;
}
export type PlaceSource =
  | { kind: 'image' | 'screenshot'; images: SourceImage[]; platform?: SourcePlatform; sourceUrl?: string }
  | { kind: 'url'; url: string }
  | { kind: 'text'; text: string; platform?: SourcePlatform; sourceUrl?: string };

export interface ExtractedPlace {
  name: string;
  regionHint?: string;
  addressHint?: string;
  confidence: number;
  sourceImageUri?: string;
}
export interface ResolvedPlace {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  category: Category;
  mapProvider: MapProvider;
  providerId?: string;
  confidence: number;
  verification: Verification;
}
export interface Place extends ResolvedPlace {
  id: string;
  sourcePlatform: SourcePlatform;
  sourceUrl?: string;
  sourceImageUri?: string;
  createdAt: string;
  note: string;
  visited: boolean;
}
export interface ExtractionResult {
  candidates: ExtractedPlace[];
  mode: 'mock' | 'ocr' | 'api';
  rawText?: string;
}
export interface PlaceExtractionProvider {
  extract(source: PlaceSource, onProgress?: (message: string) => void): Promise<ExtractionResult>;
}
export interface PlaceResolverProvider {
  resolve(candidate: ExtractedPlace): Promise<ResolvedPlace[]>;
}
export interface SaveOutcome { saved: Place[]; duplicates: Place[] }
/** Async boundary: a Supabase repository can implement this without changing UI/domain. */
export interface PlaceRepository {
  list(): Promise<Place[]>;
  saveMany(places: Place[]): Promise<SaveOutcome>;
  update(place: Place): Promise<void>;
  remove(id: string): Promise<void>;
}
export interface AnalysisItem {
  id: string;
  candidate: ExtractedPlace;
  matches: ResolvedPlace[];
  selected?: ResolvedPlace;
  decision: 'ready' | 'choose' | 'unresolved' | 'saved' | 'duplicate';
  confirmed: boolean;
}
export interface AnalysisReport {
  source: PlaceSource;
  mode: ExtractionResult['mode'];
  rawText?: string;
  items: AnalysisItem[];
  automatic: SaveOutcome;
}
