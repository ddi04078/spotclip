import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Managed Chromium blocks file://. Supply the exact HTML in memory at a local origin,
// with networking offline, to verify self-contained behavior without a running server.
test.beforeEach(async ({ context, page }) => {
  const html = await readFile('dist-html/SpotClip.html', 'utf8');
  await context.route('http://localhost:18181/', route => route.fulfill({ contentType: 'text/html', body: html }));
  await context.setOffline(true);
  await page.goto('http://localhost:18181/');
});
test('single HTML works offline: image → mock auto-save → list → reload', async ({ page }) => {
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

test('390px paid API is locked and Expo Go/web OCR availability is explained', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '설정 및 사용 안내', exact: true }).click();
  await expect(page.getByRole('button', { name: '기기 OCR 테스트 켜기', exact: true })).toBeDisabled();
  await page.getByLabel('분석 서버 주소', { exact: true }).fill('https://analysis.example/api/analyze');
  await page.getByLabel('서버 접근 토큰', { exact: true }).fill('a'.repeat(40));
  await page.getByRole('switch', { name: '사진·본문 외부 전송 동의' }).click();
  await expect(page.getByRole('button', { name: '실제 분석 모드 켜기', exact: true })).toBeDisabled();
});
