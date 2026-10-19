import type { ResolvedPlace } from '../../domain/types.ts';
import { isPlace } from '../../domain/place.ts';
import type { PlaceSearch } from './EvidencePlaceResolver.ts';
export function createRemotePlaceSearch(options:{endpoint:string;token:()=>Promise<string>;consent:()=>Promise<boolean>;request?:typeof fetch}):PlaceSearch {
  const url=new URL(options.endpoint);
  if(url.username||url.password||url.search||url.hash||(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw new Error('안전한 장소 검색 서버 주소가 필요해요.');
  return async query=>{
    if(!await options.consent())throw new Error('상호·주소의 장소 검색 전송 동의가 필요해요.');
    const token=await options.token();if(token.length<32)throw new Error('장소 검색 서버 접근 토큰이 필요해요.');
    const r=await(options.request||fetch)(url.href,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({query}),signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw new Error('장소 검색에 실패했어요. 서버 설정과 연결을 확인해주세요.');
    const data=await r.json();
    if(!Array.isArray(data.matches)||data.matches.length>5)throw new Error('장소 검색 결과 형식이 올바르지 않아요.');
    return data.matches.filter((m:ResolvedPlace)=>m && m.verification==='official'&&m.mapProvider==='kakao'&&/^\d+$/.test(m.providerId||'')&&isPlace({...m,id:'validation',sourcePlatform:'text',createdAt:new Date().toISOString(),note:'',visited:false}));
  };
}
