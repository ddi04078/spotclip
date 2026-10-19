import type { ExtractedPlace, PlaceResolverProvider, ResolvedPlace } from '../../domain/types.ts';
import { buildSearchPlan, rankPlaceMatches } from './placeEvidence.ts';
export type PlaceSearch = (query: string) => Promise<ResolvedPlace[]>;
/** Reuses a supplied official search adapter; never invokes image AI. */
export class EvidencePlaceResolver implements PlaceResolverProvider {
  private cache = new Map<string,{ until:number; value:ResolvedPlace[] }>();
  private inFlight = new Map<string,Promise<ResolvedPlace[]>>();
  private search: PlaceSearch;
  private now: () => number;
  constructor(search:PlaceSearch, now:()=>number = Date.now) { this.search=search; this.now=now; }
  private async query(query:string) {
    const cached=this.cache.get(query);
    if(cached && cached.until>this.now()) return cached.value.map(p=>({...p}));
    let task=this.inFlight.get(query);
    if(!task) {
      task=this.search(query).then(value=>{
        this.cache.set(query,{until:this.now()+300000,value:value.map(p=>({...p}))});
        if(this.cache.size>100)this.cache.delete(this.cache.keys().next().value!);
        return value;
      }).finally(()=>this.inFlight.delete(query));
      this.inFlight.set(query,task);
    }
    return (await task).map(p=>({...p}));
  }
  async resolve(candidate:ExtractedPlace):Promise<ResolvedPlace[]> {
    const found=new Map<string,ResolvedPlace>();
    for(const step of buildSearchPlan(candidate)) {
      for(const p of await this.query(step.query)) found.set(`${p.mapProvider}:${p.providerId || p.name+'|'+p.address}`,p);
      const ranked=rankPlaceMatches(candidate,[...found.values()]);
      if(ranked[0]?.verification==='official' && ranked[0].confidence>=.95 && (!ranked[1] || ranked[0].confidence-ranked[1].confidence>=.15)) return ranked;
    }
    return rankPlaceMatches(candidate,[...found.values()]);
  }
}
