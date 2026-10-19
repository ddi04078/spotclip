import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOcrFirstServices } from '../../src/services/ocr/createOcrFirstServices.ts';
import { confirmOcrBatch, canReviewInBatch } from '../../src/services/ocr/reviewBatch.ts';
import { UnverifiedPlaceResolver } from '../../src/services/providers/UnverifiedPlaceResolver.ts';
import { LocalPlaceStorage } from '../../src/storage/LocalPlaceStorage.ts';
import { MemoryStorage, ids } from './helpers.ts';
const text='카페 하나\n서울 종로구 삼청로 30\n카페 둘\n서울 종로구 세종대로 193\n카페 주소없음';
function setup(){const repository=new LocalPlaceStorage(new MemoryStorage());return{repository,service:createOcrFirstServices({repository,id:ids(),ocr:{async recognize(){return{text};}},resolver:new UnverifiedPlaceResolver()})};}
test('explicit batch confirmation saves all named OCR candidates including unknown address without inventing an address',async()=>{
  const {repository,service}=setup();const report=await service.ingestPlaceSource({kind:'text',text});
  assert.equal(report.items.filter(canReviewInBatch).length,3);assert.equal((await repository.list()).length,0);
  const reviewed=confirmOcrBatch(report);assert.equal(report.items[0].confirmed,false);
  const {outcome,report:done}=await service.saveReviewed(reviewed);
  assert.equal(outcome.saved.length,3);assert.ok(outcome.saved.every(p=>p.verification==='unverified'));
  assert.equal(done.items[2].decision,'saved');assert.equal(outcome.saved[2].address,'');assert.equal(done.items.filter(canReviewInBatch).length,0);
});
test('batch uses edited names and addresses and does not duplicate saved places',async()=>{
  const {repository,service}=setup();
  for(let i=0;i<2;i++){
    const report=await service.ingestPlaceSource({kind:'image',images:[{id:'1',name:'capture.png',reference:'file:///capture.png',mediaType:'image/png',size:100}]});
    report.items[0].candidate={...report.items[0].candidate,name:'카페 수정',addressHint:'서울 종로구 수정로 10'};
    const result=await service.saveReviewed(confirmOcrBatch(report));
    assert.equal(result.outcome.saved.length,i===0?3:0);assert.equal(result.outcome.duplicates.length,i===0?0:3);
  }
  assert.equal((await repository.list()).length,3);assert.ok((await repository.list()).some(p=>p.name==='카페 수정'&&p.address==='서울 종로구 수정로 10'));
});
test('batch never selects an ambiguous official map branch on behalf of the user',async()=>{
  const {service}=setup();const report=await service.ingestPlaceSource({kind:'text',text});
  const item=report.items[0];item.selected=undefined;item.confirmed=false;item.decision='choose';
  item.matches=[{name:'카페 하나 안국',address:'서울 종로구 삼청로 30',category:'카페',mapProvider:'kakao',providerId:'1',verification:'official',confidence:.8}];
  assert.equal(canReviewInBatch(item),false);assert.equal(confirmOcrBatch(report).items[0].decision,'choose');
});

test('three photos with only one readable address still save three named places and keep each photo identity',async()=>{
  const repository=new LocalPlaceStorage(new MemoryStorage());
  const images=[1,2,3].map(n=>({id:String(n),name:`${n}.png`,reference:`file:///capture-${n}.png`,mediaType:'image/png',size:100}));
  const texts=['하이그라운드 제빵소\nHIGHGROUND BAKERY','테라로사 국립현대미술관 서울점\nTERAROSA MMCA SEOUL','ofolZtojl=2]d 대역박점\nCAFE I GOT EVERYTHING\n서울 종로구 세종대로 193 ©'];
  const service=createOcrFirstServices({repository,id:ids(),ocr:{async recognize(image){return{text:texts[Number(image.id)-1]};}},resolver:new UnverifiedPlaceResolver()});
  for(let i=0;i<2;i++){
    const report=await service.ingestPlaceSource({kind:'screenshot',images});
    assert.equal(report.sources?.length,3);assert.equal(report.items.length,3);assert.equal(report.items.filter(canReviewInBatch).length,3);
    const {outcome}=await service.saveReviewed(confirmOcrBatch(report));assert.equal(outcome.saved.length,i===0?3:0);assert.equal(outcome.duplicates.length,i===0?0:3);
  }
  const stored=await repository.list();assert.equal(stored.length,3);assert.equal(stored.filter(p=>p.address==='').length,2);assert.ok(stored.every(p=>p.verification==='unverified'&&p.sourceImageUri));
});
test('one OCR error and one empty photo cannot discard a successful photo or disappear from the report',async()=>{
  const {repository}=setup();const images=[1,2,3].map(n=>({id:String(n),name:`${n}.png`,reference:`file:///capture-${n}.png`,mediaType:'image/png',size:100}));
  const service=createOcrFirstServices({repository,id:ids(),ocr:{async recognize(image){if(image.id==='2')throw new Error('bad image');return{text:image.id==='1'?'카페 하나\n서울 종로구 삼청로 30':''};}},resolver:new UnverifiedPlaceResolver()});
  const report=await service.ingestPlaceSource({kind:'image',images});assert.equal(report.items.length,1);
  assert.deepEqual(report.sources?.map(s=>s.status),['found','error','empty']);assert.equal(report.items[0].candidate.sourceImageUri,images[0].reference);
});
test('the first photo cannot consume the candidate allowance of the second and third photos',async()=>{
  const {repository}=setup();const images=[1,2,3].map(n=>({id:String(n),name:`${n}.png`,reference:`file:///capture-${n}.png`,mediaType:'image/png',size:100}));
  const service=createOcrFirstServices({repository,id:ids(),ocr:{async recognize(image){return{text:image.id==='1'?'카페 하나\n카페 둘\n카페 셋\n카페 넷\n카페 다섯':`카페 사진${image.id}`};}},resolver:new UnverifiedPlaceResolver()});
  const report=await service.ingestPlaceSource({kind:'image',images});assert.equal(report.items.length,7);assert.deepEqual(report.sources?.map(s=>s.count),[5,1,1]);
});

test('unknown addresses are allowed only for unverified local records, and unknown branches are not deduped by name',async()=>{
  const {fixturePlace}=await import('./helpers.ts');const {isPlace,samePlace}=await import('../../src/domain/place.ts');
  const local=fixturePlace({address:'',verification:'unverified',mapProvider:'none',providerId:undefined});
  assert.equal(isPlace(local),true);assert.equal(isPlace({...local,verification:'official',mapProvider:'kakao'}),false);
  assert.equal(samePlace(local,{...local,id:'2'}),true);
  assert.equal(samePlace(local,{...local,id:'3',sourceImageUri:'file:///different-photo.jpg'}),false);
});

test('keeping extra photos does not expand configured automatic lookup budget or discard candidates',async()=>{
  let queries=0;const {repository}=setup();
  const service=createOcrFirstServices({repository,id:ids(),maxResolverCandidates:1,ocr:{async recognize(){return{text};}},resolver:{async resolve(){queries++;return[];}}});
  const report=await service.ingestPlaceSource({kind:'text',text});
  assert.equal(queries,1);assert.equal(report.items.length,3);assert.equal(report.items.filter(canReviewInBatch).length,3);
  assert.ok(report.items[1].candidate.recognitionWarning?.includes('검색 한도'));
});
