import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOcrFirstServices } from '../../src/services/ocr/createOcrFirstServices.ts';
import { confirmOcrBatch, canReviewInBatch } from '../../src/services/ocr/reviewBatch.ts';
import { UnverifiedPlaceResolver } from '../../src/services/providers/UnverifiedPlaceResolver.ts';
import { LocalPlaceStorage } from '../../src/storage/LocalPlaceStorage.ts';
import { MemoryStorage, ids } from './helpers.ts';
const text='카페 하나\n서울 종로구 삼청로 30\n카페 둘\n서울 종로구 세종대로 193\n카페 주소없음';
function setup(){const repository=new LocalPlaceStorage(new MemoryStorage());return{repository,service:createOcrFirstServices({repository,id:ids(),ocr:{async recognize(){return{text};}},resolver:new UnverifiedPlaceResolver()})};}
test('explicit batch confirmation saves all complete OCR candidates once and keeps incomplete candidate pending',async()=>{
  const {repository,service}=setup();const report=await service.ingestPlaceSource({kind:'text',text});
  assert.equal(report.items.filter(canReviewInBatch).length,2);assert.equal((await repository.list()).length,0);
  const reviewed=confirmOcrBatch(report);assert.equal(report.items[0].confirmed,false);
  const {outcome,report:done}=await service.saveReviewed(reviewed);
  assert.equal(outcome.saved.length,2);assert.ok(outcome.saved.every(p=>p.verification==='unverified'));
  assert.equal(done.items[2].decision,'unresolved');assert.equal(done.items.filter(canReviewInBatch).length,0);
});
test('batch uses edited names and addresses and does not duplicate saved places',async()=>{
  const {repository,service}=setup();
  for(let i=0;i<2;i++){
    const report=await service.ingestPlaceSource({kind:'text',text});
    report.items[0].candidate={...report.items[0].candidate,name:'카페 수정',addressHint:'서울 종로구 수정로 10'};
    const result=await service.saveReviewed(confirmOcrBatch(report));
    assert.equal(result.outcome.saved.length,i===0?2:0);assert.equal(result.outcome.duplicates.length,i===0?0:2);
  }
  assert.equal((await repository.list()).length,2);assert.ok((await repository.list()).some(p=>p.name==='카페 수정'&&p.address==='서울 종로구 수정로 10'));
});
test('batch never selects an ambiguous official map branch on behalf of the user',async()=>{
  const {service}=setup();const report=await service.ingestPlaceSource({kind:'text',text});
  const item=report.items[0];item.selected=undefined;item.confirmed=false;item.decision='choose';
  item.matches=[{name:'카페 하나 안국',address:'서울 종로구 삼청로 30',category:'카페',mapProvider:'kakao',providerId:'1',verification:'official',confidence:.8}];
  assert.equal(canReviewInBatch(item),false);assert.equal(confirmOcrBatch(report).items[0].decision,'choose');
});
