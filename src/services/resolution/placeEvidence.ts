import type { Category, ExtractedPlace, ResolvedPlace } from '../../domain/types.ts';
import { normalize } from '../../domain/textParser.ts';
export interface PlaceEvidence {
  names: string[]; brand?: string; branch?: string; region?: string; address?: string; category?: Category;
}
export interface SearchStep { query: string; reason: 'name' | 'alias' | 'address' }
const unique = (values: string[]) => [...new Map(values.filter(Boolean).map(s => [normalize(s), s])).values()];
const suspect = (name: string) => /[가-힣]/.test(name) && /[A-Za-z][A-Za-z0-9=|\[\]]{5,}/.test(name) && /[a-z=|\[\]0-9]/.test(name);
export function placeEvidence(candidate: ExtractedPlace): PlaceEvidence {
  const supplied = unique([candidate.name, ...(candidate.aliases || [])].map(s => s.trim()));
  const names = supplied.filter(s => !suspect(s));
  const korean = names.find(s => /[가-힣]/.test(s));
  const branch = korean?.match(/\s+([^\s]+점)$/)?.[1];
  const brand = korean ? korean.replace(/\s+[^\s]+점$/, '').trim() : undefined;
  const address = candidate.addressHint?.trim();
  const region = address?.match(/^(.+?(?:시|도)?\s+[^\s]+(?:구|군|시))(?=\s)/)?.[1] || candidate.regionHint?.trim();
  const category: Category | undefined = /\bCAFE\b|\bCOFFEE\b|\bBAKERY\b|카페|커피|제빵|베이커리/i.test(supplied.join(' ')) ? '카페' : undefined;
  return { names, brand, branch, address, region, category };
}
/** Up to three deduplicated steps; category is a hint, not a compulsory API filter. */
export function buildSearchPlan(candidate: ExtractedPlace): SearchStep[] {
  const e = placeEvidence(candidate); const steps: SearchStep[] = [];
  const add = (query: string, reason: SearchStep['reason']) => { const q = query.replace(/\s+/g, ' ').trim(); if (q && !steps.some(s => normalize(s.query) === normalize(q))) steps.push({ query:q,reason }); };
  const first = e.brand || e.names[0];
  if (first) add([first, e.region, e.category].filter(Boolean).join(' '), 'name');
  const alias = e.names.find(s => normalize(s) !== normalize(e.names.find(n => /[가-힣]/.test(n)) || first || ''));
  if (alias) add([alias, e.region, e.category].filter(Boolean).join(' '), 'alias');
  if (e.address) add([e.address, e.category].filter(Boolean).join(' '), 'address');
  return steps.slice(0,3);
}
const admin = (s: string) => normalize(s.replace(/특별자치시|특별자치도|특별시|광역시/g,''));
const road = (address: string) => normalize(address.match(/(?:[가-힣\d]+(?:대로|로|길))\s*\d+(?:-\d+)?/)?.[0] || '');
/** Conservative ranking: an official listing is not proof it is the photographed business. */
export function rankPlaceMatches(candidate: ExtractedPlace, matches: ResolvedPlace[]): ResolvedPlace[] {
  const e = placeEvidence(candidate);
  const names = unique([...e.names, ...(e.brand ? [e.brand] : [])]).map(normalize);
  const targetRoad = road(e.address || '');
  return matches.map(match => {
    const name = normalize(match.name);
    const exactName = names.includes(name);
    const brandName = names.some(n => n.length >= 4 && name.startsWith(n));
    const fullAddress = !!e.address && admin(e.address) === admin(match.address);
    const roadMatch = !!targetRoad && targetRoad === road(match.address);
    const regionMatch = !e.region || admin(match.address).startsWith(admin(e.region));
    const branchMatch = !e.branch || name.includes(normalize(e.branch));
    let confidence = exactName && fullAddress && branchMatch ? .99 : (exactName || brandName) && roadMatch && regionMatch && branchMatch ? .96 : (exactName || brandName) && regionMatch ? .78 : roadMatch && regionMatch && e.category === match.category ? .68 : .35;
    if (e.address && !roadMatch) confidence = Math.min(confidence,.55);
    if (!regionMatch || !branchMatch) confidence = Math.min(confidence,.4);
    if (e.category && match.category !== e.category) confidence = Math.min(confidence,.85);
    return { ...match, confidence };
  }).sort((a,b) => b.confidence-a.confidence);
}
