import type { ExtractedPlace } from '../../domain/types.ts';
import { extractPlaces, normalize } from '../../domain/textParser.ts';
const noise = /데이트\s*코스|이번\s*주말|꼭\s*가봐|추천|좋아요|팔로우|댓글|공유|저장|더\s*보기|광고|협찬|https?:|^@|^\d+[/:]\d+$/i;
const placeWord = /카페|커피|제빵|베이커리|감자탕|식당|식탁|국수|갈비|초밥|박물관|미술관|공원|서울숲|서점|호텔|상점|소품|스튜디오|전망대|성당|사찰|해수욕장|점$/i;
const englishPlace = (s: string) => /^[A-Z][A-Z\s&'|=-]{2,65}$/.test(s) && /\b(?:SEOUL|CAFE|COFFEE|BAKERY|MUSEUM|HOTEL)\b/.test(s);
const mixedGarbled = (s: string) => {
  if (!/[가-힣]/.test(s)) return false;
  const stem = s.replace(/\s+[가-힣]{1,6}점$/, '');
  const suspicious = /[A-Za-z][A-Za-z0-9=|\[\]{}~]{3,}/g;
  return (stem.match(suspicious) || []).some(token => /[=|\[\]{}~]/.test(token)
    || (/[a-z]/.test(token) && (/[A-Z0-9]/.test(token) || token.length >= 6))) && !/[가-힣]{4,}/.test(stem);
};
/** Remove isolated UI marks, not building numbers, hyphens, floors or parentheses. */
export function cleanOcrAddress(value: string): string {
  return value.replace(/[©®™ⓒ♫♪🔊👤]+.*$/u, '').replace(/\s+[|▶▷●]+\s*$/u, '').trim();
}
const isAddress = (s: string) => /^(?:서울|부산|경기|제주|[가-힣]+[시군구])\s+.*\d/.test(s);
export function normalizeOcrLines(text: string): string[] {
  const lines = text.slice(0, 30000).split(/\r?\n/).map(raw => raw.replace(/^[\s📍•·#]+/, '').replace(/^\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim()
    .replace(/^(?:주소|위치)\s*[:：]\s*/, '').replace(/^(서울|부산|대구|인천|광주|대전|울산|제주)(?=[가-힣]{1,6}[시군구])/, '$1 ')).filter(Boolean);
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/^(서울|부산|대구|인천|광주|대전|울산|제주|경기|[가-힣]+[시군구])/.test(line) && !/(?:로|길|동|리)\s*\d/.test(line)
      && lines[i + 1] && /(?:로|길|동|리)\s*\d/.test(lines[i + 1])) line += ' ' + lines[++i];
    result.push(isAddress(line) ? cleanOcrAddress(line) : line);
  }
  return result;
}
/** Group adjacent bilingual captions, retain evidence, never claim identity verification. */
export function extractPlaceCandidates(text: string, limit = 5): ExtractedPlace[] {
  const lines = normalizeOcrLines(text);
  const paired = extractPlaces(lines.join('\n')).map(place => ({ ...place, address: cleanOcrAddress(place.address) }));
  const consumed = new Set<number>();
  const results: ExtractedPlace[] = [];
  const used = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i)) continue;
    let name = lines[i];
    if (noise.test(name) || name.length < 2 || name.length > 100 || /^(?:서울|부산|경기|제주|[가-힣]+[시군구])\s+.*\d/.test(name)) continue;
    const nearby = normalize(lines.slice(i + 1, i + 4).join(' '));
    const p = paired.find(place => place.name !== '장소 이름을 입력해 주세요' && ((normalize(place.name) === normalize(name) && nearby.includes(normalize(place.address))) || normalize(name) === normalize(place.name + place.address)));
    if (p) name = p.name;
    if (!p && !placeWord.test(name) && !englishPlace(name)) continue;
    const aliases: string[] = [];
    let warning: string | undefined;
    let confidence = p ? .85 : .65;
    // Search across address/UI lines, but do not cross a different named place.
    let aliasIndex = -1;
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      if (englishPlace(lines[j])) {
        const englishAddress = paired.find(place => normalize(place.name) === normalize(lines[j]));
        const ownNextAddress = lines[j + 1];
        if (p && ((englishAddress && normalize(englishAddress.address) !== normalize(p.address))
          || (ownNextAddress && isAddress(ownNextAddress) && normalize(ownNextAddress) !== normalize(p.address)))) break;
        aliasIndex = j; break;
      }
      if (!isAddress(lines[j]) && !noise.test(lines[j]) && placeWord.test(lines[j])) break;
    }
    const next = aliasIndex >= 0 ? lines[aliasIndex] : undefined;
    const compatibleAlias = next && (mixedGarbled(name) || (/제빵|베이커리/.test(name) && /BAKERY/.test(next)) || (/미술관|박물관/.test(name) && /MMCA|MUSEUM/.test(next)) || (/카페|커피/.test(name) && /CAFE|COFFEE/.test(next)));
    if (/[가-힣]/.test(name) && next && englishPlace(next) && compatibleAlias) {
      aliases.push(next); consumed.add(aliasIndex);
      if (mixedGarbled(name)) { aliases[0] = name; name = next; confidence = .35; warning = '한글 상호 인식이 불확실해요. 영문 표기와 원본 사진을 확인해주세요.'; }
      else if (!p) warning = '인접한 한글·영문을 한 후보로 묶었어요. 같은 장소인지 확인해주세요.';
    } else if (mixedGarbled(name)) { confidence = .35; warning = '상호가 잘못 읽혔을 수 있어요. 주소만으로 정확한 장소라고 판단하지 않았어요.'; }
    const key = normalize(name) + '|' + normalize(p?.address || '');
    if (used.has(key)) continue;
    used.add(key);
    results.push({ name, addressHint: p?.address, confidence, aliases: aliases.length ? aliases : undefined, recognitionWarning: warning });
  }
  return results.slice(0, Math.max(0, Math.min(5, limit)));
}
