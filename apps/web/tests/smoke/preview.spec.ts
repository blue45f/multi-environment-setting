import { test, expect } from '@playwright/test';

// 배포 URL(BASE_URL) 기준 smoke. 실제 환경에 배포된 산출물이 살아있는지 확인한다.
test('@preview 페이지가 로드되고 환경(stage)이 표시된다', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Multi-Environment Demo' })).toBeVisible();

  const stage = page.getByTestId('stage');
  await expect(stage).toBeVisible();
  // 런타임 config가 로드되면 'loading…'이 아닌 실제 stage 값이 들어온다.
  await expect(stage).not.toHaveText('loading…');

  // env.json 로드 실패 시 에러 노드가 나타나면 안 된다.
  await expect(page.getByTestId('error')).toHaveCount(0);
});
