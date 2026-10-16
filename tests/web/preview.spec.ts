import { test, expect } from '@playwright/test';
test('PC mobile preview: choose actual file, mock auto-save, reload, retain preview, map links', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.context().route('https://map.naver.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Map link test</title>' }));
  await page.goto('/');
  await expect(page.getByText('SpotClip · PC 테스트')).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '사진 / 스크린샷 올리기', exact: true }).click();
  await (await chooser).setFiles('assets/icon.png');
  await expect(page.getByText('3곳 저장했어요.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '내 장소에서 확인하기', exact: true }).click();
  await expect(page.getByTestId('place-card')).toHaveCount(3);
  await page.reload();
  await expect(page.getByTestId('place-card')).toHaveCount(3);
  await expect(page.getByRole('img', { name: /저장 사진/ }).first()).toBeVisible();
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: '네이버지도', exact: true }).first().click();
  const popup = await opened; await expect(popup).toHaveURL(/map.naver.com/); await popup.close();
  expect(errors).toEqual([]);
});
test('PC preview supports branch selection and prevents duplicates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '설정 및 사용 안내', exact: true }).click();
  await page.getByRole('radio', { name: '지점 선택', exact: true }).click();
  await page.goBack();
  for (let attempt = 0; attempt < 2; attempt++) {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: '사진 / 스크린샷 올리기', exact: true }).click();
    await (await chooser).setFiles('assets/icon.png');
    await page.getByRole('radio', { name: '카페 어니언 성수', exact: true }).click();
    await page.getByRole('button', { name: '모두 저장 (1곳)', exact: true }).click();
    await expect(page.getByText(attempt ? /이미 저장한 1곳은 제외/ : '1곳 저장했어요.', { exact: !attempt })).toBeVisible();
  }
  await page.getByRole('button', { name: '내 장소에서 확인하기', exact: true }).click();
  await expect(page.getByTestId('place-card')).toHaveCount(1);
  await expect(page.getByTestId('place-card').getByText('카페 어니언 성수', { exact: true })).toBeVisible();
});
