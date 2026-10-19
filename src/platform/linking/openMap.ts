import { Linking } from 'react-native';
import { candidateMapTarget } from '../../services/maps/mapTargets.ts';
import type { Place, ExtractedPlace } from '../../domain/types.ts';
import { mapTarget, type MapApp } from '../../services/maps/mapTargets.ts';
/** Official HTTPS map links: installed-app handoff is decided by OS; otherwise opens mobile web. */
export async function openMap(place: Place, app: MapApp): Promise<void> {
  try { await Linking.openURL(mapTarget(place, app)); }
  catch { throw new Error('지도를 열지 못했어요. 네트워크나 기본 브라우저 설정을 확인해주세요.'); }
}

/** User-initiated public search. Does not save or certify a place. */
export async function openCandidateSearch(candidate: ExtractedPlace, app: MapApp): Promise<void> {
  try { await Linking.openURL(candidateMapTarget(candidate, app)); }
  catch { throw new Error('지도 검색을 열지 못했어요. 네트워크를 확인해주세요.'); }
}
