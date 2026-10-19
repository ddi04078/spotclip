import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExtractedPlace, ResolvedPlace } from '../../src/domain/types.ts';
import { buildSearchPlan, placeEvidence, rankPlaceMatches } from '../../src/services/resolution/placeEvidence.ts';
import { EvidencePlaceResolver } from '../../src/services/resolution/EvidencePlaceResolver.ts';
import { createRemotePlaceSearch } from '../../src/services/resolution/RemotePlaceSearch.ts';
import { candidateMapTarget } from '../../src/services/maps/mapTargets.ts';
import { searchPlaces } from '../../server/kakao.mjs';
import { createHandler } from '../../server/handler.mjs';
const candidate:ExtractedPlace={name:'아이갓에브리씽 대역박점',aliases:['CAFE I GOT EVERYTHING'],addressHint:'서울 종로구 세종대로 193',confidence:.85};
const place:ResolvedPlace={name:candidate.name,address:candidate.addressHint!,category:'카페',mapProvider:'kakao',providerId:'123',verification:'official',confidence:.7};
test('Korean brand, branch, English alias, cafe and region form three ordered queries',()=>{
  assert.deepEqual(placeEvidence(candidate),{names:[candidate.name,'CAFE I GOT EVERYTHING'],brand:'아이갓에브리씽',branch:'대역박점',address:candidate.addressHint,region:'서울 종로구',category:'카페'});
  const plan=buildSearchPlan(candidate);
  assert.deepEqual(plan.map(s=>s.reason),['name','alias','address']);
  assert.equal(plan[0].query,'아이갓에브리씽 서울 종로구 카페');
  assert.equal(plan[1].query,'CAFE I GOT EVERYTHING 서울 종로구 카페');
  assert.equal(plan[2].query,'서울 종로구 세종대로 193 카페');
});
test('corrupt Korean is never promoted into a made-up Korean brand',()=>{
  const damaged={...candidate,name:'CAFE I GOT EVERYTHING',aliases:['ofolZtojl=2]d 대역박점']};
  assert.equal(placeEvidence(damaged).brand,undefined);
  assert.ok(buildSearchPlan(damaged).every(s=>!s.query.includes('ofol')));
  assert.ok(!JSON.stringify(buildSearchPlan(damaged)).includes('아이갓'));
});
test('name, road/building, branch and category affect ranking; same building alone is not enough',()=>{
  const matches=rankPlaceMatches(candidate,[{...place,name:'다른 카페',providerId:'2'},{...place,address:'서울 종로구 세종대로 194',providerId:'3'},place]);
  assert.equal(matches[0].providerId,'123');assert.equal(matches[0].confidence,.99);
  assert.ok(matches.find(m=>m.providerId==='2')!.confidence<.9);
  assert.ok(matches.find(m=>m.providerId==='3')!.confidence<.9);
  assert.ok(rankPlaceMatches(candidate,[{...place,category:'기타'}])[0].confidence<.9);
  assert.ok(rankPlaceMatches(candidate,[{...place,name:'아이갓에브리씽 성수점'}])[0].confidence<.9);
});
test('clear first match stops at one lookup; session cache prevents repeat calls',async()=>{
  let calls=0;const resolver=new EvidencePlaceResolver(async()=>{calls++;return[place];});
  assert.equal((await resolver.resolve(candidate))[0].providerId,'123');
  await resolver.resolve(candidate);assert.equal(calls,1);
});
test('ambiguous matches use at most three steps and retain both branches',async()=>{
  let calls=0;const resolver=new EvidencePlaceResolver(async()=>{calls++;return[place,{...place,providerId:'456'}];});
  assert.equal((await resolver.resolve(candidate)).length,2);assert.equal(calls,3);
});
test('failed requests are not cached and cache expires',async()=>{
  let calls=0,now=0;const resolver=new EvidencePlaceResolver(async()=>{calls++;if(calls===1)throw new Error('offline');return[place];},()=>now);
  await assert.rejects(resolver.resolve(candidate),/offline/);await resolver.resolve(candidate);assert.equal(calls,2);
  now=300001;await resolver.resolve(candidate);assert.equal(calls,3);
});
test('candidate links carry extracted name/region/category without saving or map API credentials',()=>{
  for(const app of ['naver','kakao']as const) assert.ok(decodeURIComponent(candidateMapTarget(candidate,app)).includes('아이갓에브리씽 서울 종로구 카페'));
});
test('OCR-only Kakao endpoint needs no AI key and cannot call OpenAI',async()=>{
  const urls:string[]=[];
  const result=await searchPlaces({query:'아이갓에브리씽 서울 종로구 카페'},{KAKAO_REST_API_KEY:'test'},async(url: any)=>{urls.push(String(url));return new Response(JSON.stringify({documents:[{id:'123',place_name:candidate.name,road_address_name:candidate.addressHint,x:'126.98',y:'37.57',category_group_code:'CE7'}]}));});
  assert.equal(result.matches[0].providerId,'123');assert.equal(urls.length,1);assert.ok(urls[0].startsWith('https://dapi.kakao.com/'));
  await assert.rejects(searchPlaces({query:'test'},{}),/카카오 API/);
});
test('shared search HTTP handler rejects unauthenticated clients without API requests',async()=>{
  let calls=0;const handle=createHandler({NODE_ENV:'test',SPOTCLIP_ACCESS_TOKEN:'a'.repeat(32)},async()=>{calls++;return new Response();},searchPlaces);
  const res={statusCode:0,setHeader(){},end(){}};await handle({method:'POST',headers:{}},res);assert.equal(res.statusCode,401);assert.equal(calls,0);
});
test('remote adapter requires consent and sends query only, not image or AI credentials',async()=>{
  let calls=0;const opts={endpoint:'https://search.example/api/search',token:async()=>'a'.repeat(32),consent:async()=>false,request:async(_url: string | URL | Request,init?:RequestInit)=>{calls++;assert.deepEqual(JSON.parse(init!.body as string),{query:'서울 카페'});return new Response(JSON.stringify({matches:[place]}));}};
  await assert.rejects(createRemotePlaceSearch(opts)('서울 카페'),/동의/);assert.equal(calls,0);
  assert.equal((await createRemotePlaceSearch({...opts,consent:async()=>true})('서울 카페'))[0].providerId,'123');
});

test('administrative address spelling differences retain a strong match',()=>{
  assert.ok(rankPlaceMatches(candidate,[{...place,address:'서울특별시 종로구 세종대로 193'}])[0].confidence>=.95);
});
test('misspelled Korean falls back to address search and returns canonical official name for review, never fabricated',async()=>{
  const queries:string[]=[];
  const resolver=new EvidencePlaceResolver(async query=>{queries.push(query);return query.startsWith('서울 종로구 세종대로')?[place]:[];});
  const matches=await resolver.resolve({...candidate,name:'아이갓에브리싱 대역박점',aliases:[]});
  assert.equal(matches[0].name,candidate.name);assert.ok(matches[0].confidence<.9);assert.equal(queries.length,2);
});
test('OCR common pipeline can use evidence resolver without calling the AI fallback',async()=>{
  const {createOcrFirstServices}=await import('../../src/services/ocr/createOcrFirstServices.ts');
  const {LocalPlaceStorage}=await import('../../src/storage/LocalPlaceStorage.ts');
  const {MemoryStorage,ids}=await import('./helpers.ts');
  let paid=0;
  const service=createOcrFirstServices({repository:new LocalPlaceStorage(new MemoryStorage()),id:ids(),ocr:{async recognize(){return{text:'아이갓에브리씽 대역박점\nCAFE I GOT EVERYTHING\n서울 종로구 세종대로 193'};}},resolver:new EvidencePlaceResolver(async()=>[place]),fallback:{async extract(){paid++;throw new Error('paid');}}});
  const report=await service.ingestPlaceSource({kind:'text',text:'아이갓에브리씽 대역박점\nCAFE I GOT EVERYTHING\n서울 종로구 세종대로 193'});
  assert.equal(report.items[0].selected?.providerId,'123');assert.equal(report.items[0].selected?.category,'카페');
  assert.equal(paid,0);assert.equal(report.automatic.saved.length,0);
});

test('authorized OCR-only HTTP request works without OpenAI configuration',async()=>{
  const token='a'.repeat(32);let calls=0;let output='';
  const handle=createHandler({NODE_ENV:'test',SPOTCLIP_ACCESS_TOKEN:token,KAKAO_REST_API_KEY:'test'},async()=>{calls++;return new Response(JSON.stringify({documents:[]}));},searchPlaces);
  const res={statusCode:0,setHeader(){},end(value:string){output=value;}};
  await handle({method:'POST',headers:{authorization:`Bearer ${token}`},body:{query:'서울 종로구 카페'}},res);
  assert.equal(res.statusCode,200);assert.deepEqual(JSON.parse(output),{matches:[]});assert.equal(calls,1);
});
