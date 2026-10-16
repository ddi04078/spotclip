import type { ExtractedPlace } from '../../domain/types.ts';
import { extractPlaces, normalize } from '../../domain/textParser.ts';
const noise = /데이트\s*코스|이번\s*주말|꼭\s*가봐|추천|좋아요|팔로우|댓글|공유|저장|더\s*보기|광고|협찬|https?:|^@|^\d+[/:]\d+$/i;
const placeWord = /카페|커피|제빵|베이커리|감자탕|식당|식탁|국수|갈비|초밥|박물관|미술관|공원|서울숲|서점|호텔|상점|소품|스튜디오|전망대|성당|사찰|해수욕장/i;
/** Conservative, capped heuristics: these strings are suggestions, not verified places. */
export function extractPlaceCandidates(text: string, limit = 5): ExtractedPlace[] {
  const results: ExtractedPlace[] = [];
  const seen = new Set<string>();
  function add(candidate: ExtractedPlace) {
    const key = normalize(candidate.name);
    if (!key || seen.has(key) || noise.test(candidate.name) || candidate.name === '장소 이름을 입력해 주세요') return;
    seen.add(key); results.push(candidate);
  }
  const bounded = text.slice(0, 30000);
  const paired = extractPlaces(bounded.replace(/(\S)(서울|부산|경기|제주)(?=\s+[가-힣])/g, '$1\n$2'));
  for (const p of paired) add({ name: p.name, addressHint: p.address, confidence: .92 });
  const lines = bounded.split(/\r?\n/);
  for (const [index, raw] of lines.entries()) {
    const name = raw.replace(/^[\s📍•·#\d.)-]+/, '').replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > 60 || noise.test(name)) continue;
    if (/^(?:서울|부산|경기|제주).*\d/.test(name)) continue;
    const englishPlace = /^[A-Z][A-Z\s&'-]{2,50}$/.test(name) && /\b(?:SEOUL|CAFE|COFFEE|BAKERY|MUSEUM|HOTEL)\b/.test(name);
    const nearby = normalize(lines.slice(Math.max(0, index - 2), index + 3).join(' '));
    if (englishPlace && paired.some(p => /[가-힣]/.test(p.name) && nearby.includes(normalize(p.name)) && nearby.includes(normalize(p.address)))) continue;
    if (placeWord.test(name) || englishPlace) add({ name, confidence: .7 });
  }
  return results.slice(0, Math.max(0, Math.min(5, limit)));
}
