import { test, expect } from '@playwright/test';

test('verify Mermaid diagrams render without errors on /intro/theory', async ({ page }) => {
  // Listen for console errors or page errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`PAGE CONSOLE ERROR: ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.log(`PAGE ERROR: ${err.message}`);
  });

  // Navigate to the theory page on our dev server
  await page.goto('http://localhost:3001/intro/theory');

  // Wait for the page to render (the dev server is fast)
  await page.waitForTimeout(3000);

  // Check if "다이어그램을 렌더링하지 못했습니다." is visible anywhere on the page
  const failedDiagrams = page.locator('div:has-text("다이어그램을 렌더링하지 못했습니다.")');
  const count = await failedDiagrams.count();

  if (count > 0) {
    console.log(`Found ${count} failed diagrams!`);
    // Print the error messages (figcaption elements contain the error text)
    const figcaptions = page.locator('figcaption');
    const figCount = await figcaptions.count();
    for (let i = 0; i < figCount; i++) {
      console.log(`Diagram Error ${i + 1}: ${await figcaptions.nth(i).textContent()}`);
    }
  }

  expect(count).toBe(0);

  // Verify that style tags are present inside the SVGs (i.e. not stripped by the sanitizer)
  const svgs = page.locator('.rendered-mermaid__svg svg');
  const svgCount = await svgs.count();
  expect(svgCount).toBeGreaterThan(0);
  for (let i = 0; i < svgCount; i++) {
    const styleCount = await svgs.nth(i).locator('style').count();
    expect(styleCount).toBeGreaterThan(0);
  }
});
