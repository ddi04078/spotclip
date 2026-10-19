import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPlaceSearch } from '../../scripts/check-place-search.mjs';
const env={SPOTCLIP_ACCESS_TOKEN:'test-token-'.repeat(4),SPOTCLIP_SEARCH_ENDPOINT:'https://search.example/api/search'};
test('deployment check is free and offline by default; validates endpoint before sending credentials',async()=>{
  let calls=0;const request=async()=>{calls++;throw new Error('must not call');};
  assert.match(await checkPlaceSearch(env,request),/아직/);
  await assert.rejects(checkPlaceSearch({...env,SPOTCLIP_ACCESS_TOKEN:''},request),/32자/);
  for(const endpoint of ['http://search.example/api/search','https://user:password@search.example/api/search','https://search.example/api/search?token=secret','https://search.example/api/analyze']) {
    await assert.rejects(checkPlaceSearch({...env,SPOTCLIP_SEARCH_ENDPOINT:endpoint},request,true));
  }
  assert.equal(calls,0);
});
test('explicit live check sends exactly one text query and validates official response',async()=>{
  let calls=0;
  const request=async(url:any,init:any)=>{calls++;assert.equal(url,env.SPOTCLIP_SEARCH_ENDPOINT);assert.equal(init.redirect,'error');assert.deepEqual(JSON.parse(init.body),{query:'국립현대미술관 서울'});return new Response(JSON.stringify({matches:[{name:'테스트',address:'서울',providerId:'1',verification:'official',mapProvider:'kakao'}]}));};
  assert.match(await checkPlaceSearch(env,request,true),/1개 확인/);assert.equal(calls,1);
});
test('deployment failures do not expose server responses or secret values',async()=>{
  await assert.rejects(checkPlaceSearch(env,async()=>new Response(env.SPOTCLIP_ACCESS_TOKEN,{status:401}),true),e=>String(e).includes('HTTP 401')&&!String(e).includes(env.SPOTCLIP_ACCESS_TOKEN));
  await assert.rejects(checkPlaceSearch(env,async()=>new Response('<html>login</html>'),true),/JSON/);
  await assert.rejects(checkPlaceSearch(env,async()=>new Response(JSON.stringify({matches:[]})),true),/공식 카카오/);
  await assert.rejects(checkPlaceSearch(env,async()=>{throw new Error(env.SPOTCLIP_ACCESS_TOKEN);},true),e=>!String(e).includes(env.SPOTCLIP_ACCESS_TOKEN));
});
