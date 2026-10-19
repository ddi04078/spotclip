import { categories, type Place, type PlaceSource, type SourcePlatform } from './types.ts';

export function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]/gu, '');
}
export function samePlace(a: Place, b: Place): boolean {
  if (a.mapProvider !== 'none' && a.mapProvider === b.mapProvider && a.providerId && a.providerId === b.providerId) return true;
  if (!a.address.trim() && !b.address.trim() && a.verification==='unverified' && b.verification==='unverified') return !!a.sourceImageUri && a.sourceImageUri===b.sourceImageUri && normalize(a.name)===normalize(b.name);
  return !!a.address && !!b.address && normalize(a.name) === normalize(b.name) && normalize(a.address) === normalize(b.address);
}
export function parsePublicUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname) return null;
    return url.href;
  } catch { return null; }
}
export function detectPlatform(url?: string): SourcePlatform {
  const safe = url && parsePublicUrl(url);
  if (!safe) return 'web';
  const host = new URL(safe).hostname.replace(/^www\./, '');
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (is('instagram.com')) return 'instagram';
  if (is('threads.net') || is('threads.com')) return 'threads';
  if (is('tiktok.com')) return 'tiktok';
  if (is('youtube.com') || is('youtu.be')) return 'youtube';
  if (is('blog.naver.com')) return 'naver-blog';
  return 'web';
}
export function sourceInfo(source: PlaceSource): { platform: SourcePlatform; url?: string } {
  if (source.kind === 'url') return { platform: detectPlatform(source.url), url: parsePublicUrl(source.url) || undefined };
  return { platform: source.platform || (source.sourceUrl ? detectPlatform(source.sourceUrl) : source.kind === 'text' ? 'text' : 'photo'), url: source.sourceUrl ? parsePublicUrl(source.sourceUrl) || undefined : undefined };
}
export function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false;
  const p = value as Place;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
  const optionalText = (v: unknown, max: number) => v === undefined || text(v, max);
  const coord = (v: unknown, bound: number) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= bound;
  return text(p.id, 200) && !!p.id && text(p.name, 150) && !!p.name.trim() && text(p.address, 300) && (!!p.address.trim() || (p.verification === 'unverified' && p.mapProvider === 'none'))
    && categories.includes(p.category) && ['mock', 'official', 'unverified'].includes(p.verification)
    && ['mock', 'kakao', 'naver', 'none'].includes(p.mapProvider) && optionalText(p.providerId, 150)
    && typeof p.confidence === 'number' && Number.isFinite(p.confidence) && p.confidence >= 0 && p.confidence <= 1
    && text(p.createdAt, 100) && Number.isFinite(Date.parse(p.createdAt)) && text(p.note, 1000) && typeof p.visited === 'boolean'
    && ['instagram', 'threads', 'tiktok', 'youtube', 'naver-blog', 'web', 'photo', 'text'].includes(p.sourcePlatform)
    && (p.sourceUrl === undefined || (text(p.sourceUrl, 5000) && !!parsePublicUrl(p.sourceUrl)))
    && (p.sourceImageUri === undefined || (text(p.sourceImageUri, 5000) && /^(file|content|ph):\/\//.test(p.sourceImageUri)) || (text(p.sourceImageUri, 300_000) && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.sourceImageUri)))
    && ((p.latitude === undefined && p.longitude === undefined) || (coord(p.latitude, 90) && coord(p.longitude, 180)));
}
