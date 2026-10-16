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
  await expect(page.getByText(/사진의 글자를 읽지 못했어요/)).toBeVisible({timeout:15000});
  await expect(page.getByTestId('analysis-results')).toHaveCount(0);
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
