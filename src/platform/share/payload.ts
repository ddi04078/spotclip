import { parsePublicUrl, detectPlatform } from '../../domain/place.ts';
import type { PlaceSource, SourceImage } from '../../domain/types.ts';
/** A future Share Extension/Intent copies files into app storage, then calls this adapter. */
export interface NativeSharePayload { url?: string; text?: string; images?: SourceImage[] }
export function sourceFromShare(payload: NativeSharePayload): PlaceSource {
  const url = payload.url ? parsePublicUrl(payload.url) : undefined;
  if (payload.url && !url) throw new Error('올바른 게시물 링크가 아니에요.');
  if (payload.images?.length) return { kind: 'image', images: payload.images, sourceUrl: url || undefined, platform: url ? detectPlatform(url) : 'photo' };
  if (payload.text?.trim()) return { kind: 'text', text: payload.text.trim(), sourceUrl: url || undefined, platform: url ? detectPlatform(url) : 'text' };
  if (url) return { kind: 'url', url };
  throw new Error('공유받은 사진이나 링크가 없어요.');
}
