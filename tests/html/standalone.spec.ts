import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Managed Chromium blocks file://. Supply the exact HTML in memory at a local origin,
// with networking offline, to verify self-contained behavior without a running server.
test.beforeEach(async ({ context, page }) => {
  const html = await readFile('dist-html/SpotClip.html', 'utf8');
  await context.route('http://localhost:18181/', route => route.fulfill({ contentType: 'text/html', body: html }));
  await context.route('http://localhost:18181/ocr/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!;
    const body = await readFile('dist-html/ocr/' + name);
    await route.fulfill({ body, contentType: name.endsWith('.js') ? 'application/javascript' : name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' });
  });
  await context.setOffline(true);
  await page.goto('http://localhost:18181/');
});
test('single HTML works offline: image → mock auto-save → list → reload', async ({ page }) => {
  await page.getByRole('button', { name: '설정 및 사용 안내', exact: true }).click();
  await page.getByRole('button', { name: '예시 체험 모드', exact: true }).click();
  await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '사진 / 스크린샷 올리기', exact: true }).click();
  await (await chooser).setFiles('assets/icon.png');
  await expect(page.getByText('3곳 저장했어요.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '내 장소에서 확인하기', exact: true }).click();
  await expect(page.getByTestId('place-card')).toHaveCount(3);
  await page.reload();
  await page.getByRole('tab', { name: '내 장소', exact: true }).click();
  await expect(page.getByTestId('place-card')).toHaveCount(3);
  expect(errors).toEqual([]);
});
test('HTML navigation preserves ambiguous branch choice and prevents duplicates', async ({ page }) => {
  await page.getByRole('button', { name: '설정 및 사용 안내', exact: true }).click();
  await page.getByRole('button', { name: '예시 체험 모드', exact: true }).click();
  await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
  await page.getByRole('button', { name: '설정 및 사용 안내', exact: true }).click();
  await page.getByRole('radio', { name: '지점 선택', exact: true }).click();
  await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
  for (let attempt = 0; attempt < 2; attempt++) {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: '사진 / 스크린샷 올리기', exact: true }).click();
    await (await chooser).setFiles('assets/icon.png');
    await page.getByRole('radio', { name: '카페 어니언 안국', exact: true }).click();
    await page.getByRole('button', { name: '모두 저장 (1곳)', exact: true }).click();
    await expect(page.getByText(attempt ? /이미 저장한 1곳은 제외/ : '1곳 저장했어요.', { exact: !attempt })).toBeVisible();
  }
  await page.getByRole('button', { name: '내 장소에서 확인하기', exact: true }).click();
  await expect(page.getByTestId('place-card')).toHaveCount(1);
});

test('390px paid API is locked and browser OCR is available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '설정 및 사용 안내', exact: true }).click();
  await expect(page.getByRole('button', { name: '기기 OCR 테스트 켜기', exact: true })).toBeDisabled();
  await page.getByLabel('분석 서버 주소', { exact: true }).fill('https://analysis.example/api/analyze');
  await page.getByLabel('서버 접근 토큰', { exact: true }).fill('a'.repeat(40));
  await page.getByRole('switch', { name: '사진·본문 외부 전송 동의' }).click();
  await expect(page.getByRole('button', { name: '실제 분석 모드 켜기', exact: true })).toBeDisabled();
});


test('real Korean browser OCR reads three images without a paid API and saves only confirmed candidates', async ({ page }) => {
  test.setTimeout(150000);
  const names = ['하이그라운드 제빵소', '테라로사 국립현대미술관 서울점', '아이갓에브리씽 대역박점'];
  const addresses = ['서울 강북구 삼양로181길 161', '서울 종로구 삼청로 30', '서울 종로구 세종대로 193'];
  const files = [];
  for (let i = 0; i < names.length; i++) {
    const data = await page.evaluate(({ name, address }) => {
      const c = document.createElement('canvas'); c.width = 1400; c.height = 500;
      const x = c.getContext('2d')!; x.fillStyle = 'white'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = 'black'; x.font = 'bold 52px "Noto Sans CJK KR", sans-serif'; x.fillText(name, 60, 260);
      x.font = '42px "Noto Sans CJK KR", sans-serif'; x.fillText(address, 60, 360);
      return c.toDataURL('image/png').split(',')[1];
    }, { name: names[i], address: addresses[i] });
    files.push({ name: `capture-${i}.png`, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  }
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '사진 / 스크린샷 올리기', exact: true }).click();
  await (await chooser).setFiles(files);
  await expect(page.getByTestId('analysis-results')).toBeVisible({ timeout: 120000 });
  await page.getByRole('button', { name: '사진에서 읽은 원문 보기', exact: true }).click();
  const raw = await page.getByTestId('analysis-results').innerText();
  expect(raw).toContain('하이그라운드'); expect(raw).toContain('테라로사'); expect(raw).toContain('아이갓');
  expect(raw).not.toContain('도온정');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('하이그라운드'); // no automatic writes
  const save = page.getByRole('button', { name: '확인하고 저장', exact: true }).first();
  await save.click();
  await expect(page.getByText('1곳 저장했어요.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '내 장소에서 확인하기', exact: true }).click();
  await expect(page.getByTestId('place-card')).toHaveCount(1);
  await expect(page.getByText('미확인 · 직접 저장', { exact: true })).toBeVisible();
});
