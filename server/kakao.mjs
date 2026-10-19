import { RequestError } from './errors.mjs';
const clean = s => typeof s==='string' && s.trim().length<=300 ? s.trim() : '';
/** Shared official search used by both legacy AI and the OCR-only endpoint. Server keys only. */
export async function searchKakao(query,env,request=fetch) {
  if(!env.KAKAO_REST_API_KEY) throw new RequestError(503,'장소 검색 서버의 카카오 API 설정이 필요해요.');
  if(typeof query!=='string'||!query.trim()||query.length>300) throw new RequestError(400,'검색어를 300자 이하로 넣어주세요.');
  const params=new URLSearchParams({query:query.trim(),size:'5'});
  const response=await request(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,{headers:{Authorization:`KakaoAK ${env.KAKAO_REST_API_KEY}`},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new RequestError(502,'장소 검색 서비스가 응답하지 않아요.');
  const result=await response.json();
  if(!Array.isArray(result.documents))throw new RequestError(502,'장소 검색 결과를 읽지 못했어요.');
  return result.documents.slice(0,5).flatMap(d=>{
    const address=clean(d.road_address_name)||clean(d.address_name),latitude=Number(d.y),longitude=Number(d.x);
    if(!clean(d.place_name)||!address||!/^\d+$/.test(String(d.id))||!d.x||!d.y||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return[];
    return[{name:d.place_name,address,latitude,longitude,category:d.category_group_code==='CE7'?'카페':d.category_group_code==='FD6'?'맛집':d.category_group_code==='AT4'?'여행':d.category_group_code==='MT1'?'쇼핑':'기타',mapProvider:'kakao',providerId:String(d.id),verification:'official',confidence:.7}];
  });
}
export async function searchPlaces(body,env,request=fetch) {
  if(!body||typeof body.query!=='string')throw new RequestError(400,'장소 검색어가 필요해요.');
  return {matches:await searchKakao(body.query,env,request)};
}
