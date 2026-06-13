import { test, expect } from '@playwright/test'

test('@preview 페이지가 로드되고 환경(stage)이 표시된다', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Multi-Environment Demo' })).toBeVisible()

  const stage = page.getByTestId('stage')
  await expect(stage).toBeVisible()
  await expect(stage).not.toHaveText('loading...')

  await expect(page.getByTestId('error')).toHaveCount(0)
})
