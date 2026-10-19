import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test.beforeEach(async ({ page, context }) => {
  const html = await readFile('dist-html/SpotClip.html', 'utf8');
  await context.route('http://localhost:18181/spotclip/', r => r.fulfill({ contentType: 'text/html', body: html }));
  await context.route('http://localhost:18181/spotclip/ocr/**', async r => {
    const name = new URL(r.request().url()).pathname.split('/').pop()!;
    await r.fulfill({ body: await readFile('dist-html/ocr/' + name), contentType: name.endsWith('.js') ? 'application/javascript' : name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' });
  });
  await context.setOffline(true);
  await page.goto('http://localhost:18181/spotclip/');
});
async function candidates(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: '링크 · 본문', exact: true }).click();
  await page.getByLabel('게시물 링크 또는 본문', { exact:true }).fill('카페 하나\n서울 종로구 삼청로 30\n카페 둘\n서울 종로구 세종대로 193');
  await page.getByRole('button', {name:'장소 찾기',exact:true}).click();
  await expect(page.getByRole('heading',{name:'미확인 후보 2개',exact:true})).toBeVisible();
}
async function upload(page: import('@playwright/test').Page, name: string, buffer: Buffer) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'사진 / 스크린샷 올리기',exact:true}).click();
  await (await chooser).setFiles({name,mimeType:'image/png',buffer});
}
test('touch gesture scrolls the main result list to the bottom', async ({page}) => {
  await candidates(page);
  const session = await page.context().newCDPSession(page);
  // synthesizeScrollGesture emitted no scroll in this Chromium; dispatch actual touch sequences.
  for(let j=0;j<4;j++) {
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:18,y:650}]});
    for(let i=1;i<=12;i++) { await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:18,y:650-i*40}]}); await page.waitForTimeout(25); }
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await expect(page.getByRole('button',{name:/다른 사진으로 새로 담기/})).toBeInViewport();
  await expect(page.getByRole('tab',{name:'내 장소',exact:true})).toBeInViewport();
});
test('focused input remains usable with reduced viewport simulating software keyboard', async ({page}) => {
  await candidates(page);
  await page.getByLabel('후보 장소명',{exact:true}).last().focus();
  await page.setViewportSize({width:390,height:480});
  await page.getByLabel('후보 장소명',{exact:true}).last().fill('카페 수정');
  await page.getByRole('button',{name:'확인하고 저장',exact:true}).last().click();
  await expect(page.getByText('1곳 저장했어요.',{exact:true})).toBeVisible();
});
test('CSS 200 percent enlargement retains reachable controls', async ({page}) => {
  await page.setViewportSize({width:1280,height:900});
  await candidates(page);
  await page.evaluate(()=>{document.documentElement.style.zoom='2';});
  const last=page.getByRole('button',{name:/다른 사진으로 새로 담기/});
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await expect(page.getByRole('tab',{name:'내 장소',exact:true})).toBeInViewport();
});
test('damaged image is rejected without fictional results or writes', async ({page}) => {
  await upload(page,'damaged.png',Buffer.from('not a png'));
  await expect(page.getByText(/사진을 읽지 못했어요/)).toBeVisible();
  await expect(page.getByTestId('analysis-results')).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
test('OCR download failure surfaces an error without mock fallback or API calls', async ({page,context}) => {
  let paidCalls=0;
  await context.route(/openai\.com|dapi\.kakao\.com/,async r=>{paidCalls++;await r.abort();});
  await context.route('http://localhost:18181/spotclip/ocr/worker.min.js',r=>r.fulfill({status:503,contentType:'application/javascript',body:'Service Unavailable'}));
  const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const img=await readFile('assets/icon.png');await upload(page,'capture.png',img);
  await expect(page.getByText('사진 1: 분석 실패 · 다른 사진의 결과는 유지했어요',{exact:true})).toBeVisible({timeout:15000});
  await expect(page.getByRole('heading',{name:'미확인 후보 0개',exact:true})).toBeVisible();
  expect(paidCalls).toBe(0);expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
test('blank image has zero candidates and no saved places',async({page})=>{
  test.setTimeout(60000);
  const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=700;c.height=1000;const x=c.getContext('2d')!;x.fillStyle='white';x.fillRect(0,0,700,1000);return c.toDataURL().split(',')[1];});
  await upload(page,'blank.png',Buffer.from(data,'base64'));
  await expect(page.getByRole('heading',{name:'미확인 후보 0개',exact:true})).toBeVisible({timeout:45000});
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});


test('blurred social UI text does not become a fictional place',async({page})=>{
  test.setTimeout(60000);
  const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=700;c.height=1000;const x=c.getContext('2d')!;x.fillStyle='#333';x.fillRect(0,0,700,1000);x.filter='blur(2px)';x.fillStyle='white';x.font='32px sans-serif';x.fillText('좋아요 123',40,800);x.fillText('공유 팔로우',40,900);return c.toDataURL().split(',')[1];});
  await upload(page,'blurred.png',Buffer.from(data,'base64'));
  await expect(page.getByRole('heading',{name:'미확인 후보 0개',exact:true})).toBeVisible({timeout:45000});
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});

test('reported corrupted mixed-case caption, separated English and copyright mark produce three clean review candidates',async({page})=>{
  await page.getByRole('tab',{name:'링크 · 본문',exact:true}).click();
  await page.getByLabel('게시물 링크 또는 본문',{exact:true}).fill('하이그라운드 제빵소\nHIGHGROUND BAKERY\n주소: 서울강북구\n삼양로181길 161 ©\n테라로사 국립현대미술관 서울점\nTERAROSA MMCA SEOUL\n서울 종로구 삼청로 30\nofolZtojl=2]d 대역박점\n서울 종로구 세종대로 193 ©\nCAFE I GOT EVERYTHING');
  await page.getByRole('button',{name:'장소 찾기',exact:true}).click();
  await expect(page.getByRole('heading',{name:'미확인 후보 3개',exact:true})).toBeVisible();
  expect(await page.getByLabel('후보 장소명',{exact:true}).evaluateAll(els=>els.map(e=>(e as HTMLInputElement).value))).toEqual(['하이그라운드 제빵소','테라로사 국립현대미술관 서울점','CAFE I GOT EVERYTHING']);
  expect(await page.getByLabel('후보 주소',{exact:true}).evaluateAll(els=>els.map(e=>(e as HTMLInputElement).value))).toEqual(['서울 강북구 삼양로181길 161','서울 종로구 삼청로 30','서울 종로구 세종대로 193']);
  await expect(page.getByText('한글 상호 인식이 불확실해요. 영문 표기와 원본 사진을 확인해주세요.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});

test('evidence plan and public map search use cafe/region without an automatic API request',async({page,context})=>{
  await page.getByRole('tab',{name:'링크 · 본문',exact:true}).click();
  await page.getByLabel('게시물 링크 또는 본문',{exact:true}).fill('아이갓에브리씽 대역박점\nCAFE I GOT EVERYTHING\n서울 종로구 세종대로 193');
  await page.getByRole('button',{name:'장소 찾기',exact:true}).click();
  await expect(page.getByText('업종 단서: 카페 · 지역 단서: 서울 종로구',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'검색 단서 보기',exact:true}).click();
  await expect(page.getByText('1. 아이갓에브리씽 서울 종로구 카페',{exact:true})).toBeVisible();
  await context.route('https://map.kakao.com/**',r=>r.fulfill({contentType:'text/html',body:'<title>Test map target</title>'}));
  const popup=page.waitForEvent('popup');
  await page.getByRole('button',{name:'카카오맵에서 찾기',exact:true}).click();
  const map=await popup;expect(decodeURIComponent(map.url())).toContain('아이갓에브리씽 서울 종로구 카페');await map.close();
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});

test('OCR-only server setup uses consent, bounded queries and official results without uploading images; token is forgotten',async({page,context})=>{
  const token='personal-search-test-'.repeat(3);let calls=0;
  await context.route('https://search.example/api/search',async r=>{
    calls++;expect(r.request().headers().authorization).toBe(`Bearer ${token}`);
    const body=r.request().postDataJSON();expect(Object.keys(body)).toEqual(['query']);expect(body.query).toBe('아이갓에브리씽 서울 종로구 카페');
    await r.fulfill({contentType:'application/json',body:JSON.stringify({matches:[{name:'아이갓에브리씽 대역박점',address:'서울 종로구 세종대로 193',category:'카페',mapProvider:'kakao',providerId:'123',verification:'official',confidence:.7}]})});
  });
  await page.getByRole('button',{name:'설정 및 사용 안내',exact:true}).click();
  await page.getByLabel('장소 검색 서버 주소',{exact:true}).fill('https://search.example/api/search');
  await page.getByLabel('장소 검색 서버 접근 토큰',{exact:true}).fill(token);
  await expect(page.getByRole('button',{name:'AI 없이 장소 검색 연결',exact:true})).toBeDisabled();
  await page.getByRole('switch',{name:'장소 검색어 외부 전송 동의',exact:true}).click();
  await page.getByRole('button',{name:'AI 없이 장소 검색 연결',exact:true}).click();
  await expect(page.getByLabel('장소 검색 서버 접근 토큰',{exact:true})).toHaveValue('');
  await page.getByRole('button',{name:'설정 닫기',exact:true}).click();
  await page.getByRole('tab',{name:'링크 · 본문',exact:true}).click();
  await page.getByLabel('게시물 링크 또는 본문',{exact:true}).fill('아이갓에브리씽 대역박점\nCAFE I GOT EVERYTHING\n서울 종로구 세종대로 193');
  await page.getByRole('button',{name:'장소 찾기',exact:true}).click();
  await expect(page.getByRole('button',{name:'모두 저장 (1곳)',exact:true})).toBeVisible();
  expect(calls).toBe(1);
  await page.getByRole('button',{name:'모두 저장 (1곳)',exact:true}).click();
  await expect(page.getByText('1곳 저장했어요.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(token);
  await page.reload();await page.getByRole('button',{name:'설정 및 사용 안내',exact:true}).click();
  await expect(page.getByRole('button',{name:'자동 장소 검색 끄기',exact:true})).toHaveCount(0);
});

test('simple no-API cycle: review edits, save complete candidates together, reload and prevent duplicates',async({page})=>{
  const text='카페 하나\n서울 종로구 삼청로 30\n카페 둘\n서울 종로구 세종대로 193\n카페 주소없음';
  for(let attempt=0;attempt<2;attempt++){
    await page.getByRole('tab',{name:'링크 · 본문',exact:true}).click();
    await page.getByLabel('게시물 링크 또는 본문',{exact:true}).fill(text);
    await page.getByRole('button',{name:'장소 찾기',exact:true}).click();
    await expect(page.getByRole('heading',{name:'미확인 후보 3개',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'카카오맵에서 찾기',exact:true})).toHaveCount(0);
    await page.getByLabel('후보 장소명',{exact:true}).first().fill('카페 수정');
    await page.getByLabel('후보 주소',{exact:true}).first().fill('서울 종로구 수정로 10');
    await page.getByLabel('후보 주소',{exact:true}).last().fill('서울 종로구 보완로 3');
    const save=page.getByRole('button',{name:'한 번에 저장 (3곳)',exact:true});
    await expect(save).toBeDisabled();

    await page.getByRole('switch',{name:'일괄 저장할 이름과 주소 확인',exact:true}).click();
    await save.click();
    await expect(page.getByText(attempt?/이미 저장한 3곳은 제외/: '3곳 저장했어요.',{exact:!attempt})).toBeVisible();
    await page.getByRole('button',{name:'내 장소에서 확인하기',exact:true}).click();
    await expect(page.getByTestId('place-card')).toHaveCount(3);
    await expect(page.getByText('카페 수정',{exact:true})).toBeVisible();
    await page.getByRole('tab',{name:'추가',exact:true}).click();
  }
  await page.reload();await page.getByRole('tab',{name:'내 장소',exact:true}).click();
  await expect(page.getByTestId('place-card')).toHaveCount(3);
  await expect(page.getByText('미확인 · 직접 저장',{exact:true})).toHaveCount(3);
});

test('two selected photos complete the OCR to batch-save to durable-list cycle without map search or API setup',async({page})=>{
  test.setTimeout(90000);
  const files=[];
  for(const [name,address] of [['카페 하나','서울 종로구 삼청로 30'],['카페 둘','서울 종로구 세종대로 193']]){
    const data=await page.evaluate(({name,address})=>{const c=document.createElement('canvas');c.width=1400;c.height=600;const x=c.getContext('2d')!;x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='bold 52px "Noto Sans CJK KR", sans-serif';x.fillText(name,60,250);x.font='42px "Noto Sans CJK KR", sans-serif';x.fillText(address,60,350);return c.toDataURL().split(',')[1];},{name,address});
    files.push({name:name+'.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
  }
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 / 스크린샷 올리기',exact:true}).click();await(await chooser).setFiles(files);
  await expect(page.getByRole('heading',{name:'미확인 후보 2개',exact:true})).toBeVisible({timeout:60000});
  expect(await page.getByLabel('후보 장소명',{exact:true}).evaluateAll(els=>els.map(e=>(e as HTMLInputElement).value.replace(/\s/g,'')))).toEqual(['카페하나','카페둘']);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
  await page.getByRole('switch',{name:'일괄 저장할 이름과 주소 확인',exact:true}).click();
  await page.getByRole('button',{name:'한 번에 저장 (2곳)',exact:true}).click();
  await expect(page.getByText('2곳 저장했어요.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'내 장소에서 확인하기',exact:true}).click();
  await expect(page.getByTestId('place-card')).toHaveCount(2);
  await page.reload();await page.getByRole('tab',{name:'내 장소',exact:true}).click();await expect(page.getByTestId('place-card')).toHaveCount(2);
});

test('three named candidates with only one address can all be saved without inventing addresses',async({page})=>{
  await page.getByRole('tab',{name:'링크 · 본문',exact:true}).click();
  await page.getByLabel('게시물 링크 또는 본문',{exact:true}).fill('하이그라운드 제빵소\nHIGHGROUND BAKERY\n테라로사 국립현대미술관 서울점\nTERAROSA MMCA SEOUL\nofolZtojl=2]d 대역박점\nCAFE I GOT EVERYTHING\n서울 종로구 세종대로 193');
  await page.getByRole('button',{name:'장소 찾기',exact:true}).click();
  await expect(page.getByText('주소를 못 읽은 장소도 미확인 상태로 저장해요. 주소를 만들어 넣지 않습니다.',{exact:true})).toBeVisible();
  await page.getByRole('switch',{name:'일괄 저장할 이름과 주소 확인',exact:true}).click();
  await page.getByRole('button',{name:'한 번에 저장 (3곳)',exact:true}).click();
  await expect(page.getByText('3곳 저장했어요.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'내 장소에서 확인하기',exact:true}).click();
  await expect(page.getByTestId('place-card')).toHaveCount(3);
  await expect(page.getByText('주소 미확인 · 장소명으로 지도 검색 가능',{exact:true})).toHaveCount(2);
  await page.reload();await page.getByRole('tab',{name:'내 장소',exact:true}).click();await expect(page.getByTestId('place-card')).toHaveCount(3);
});

test('every selected photo gets a visible status, and an unreadable photo can be manually supplemented',async({page,context})=>{
  await context.route('http://localhost:18181/spotclip/ocr/worker.min.js',r=>r.fulfill({status:503,contentType:'application/javascript',body:'Service Unavailable'}));
  const image=await readFile('assets/icon.png');const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'사진 / 스크린샷 올리기',exact:true}).click();
  await(await chooser).setFiles([1,2,3].map(n=>({name:`capture-${n}.png`,mimeType:'image/png',buffer:image})));
  await expect(page.getByText('사진 3장 분석 결과',{exact:true})).toBeVisible({timeout:20000});
  for(let n=1;n<=3;n++)await expect(page.getByText(`사진 ${n}: 분석 실패 · 다른 사진의 결과는 유지했어요`,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'사진 2 장소 직접 보완',exact:true}).click();
  await page.getByLabel('후보 장소명',{exact:true}).fill('직접 확인한 카페');
  await page.getByRole('switch',{name:'일괄 저장할 이름과 주소 확인',exact:true}).click();
  await page.getByRole('button',{name:'한 번에 저장 (1곳)',exact:true}).click();
  await expect(page.getByText('1곳 저장했어요.',{exact:true})).toBeVisible();
});
