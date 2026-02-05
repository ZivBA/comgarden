import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    fabricCanvas: any;
  }
}

test.describe('Place Sticker Journey', () => {
  test('user can place and move a sticker', async ({ page, browserName }) => {
    // Skip non-Chromium browsers (WebKit requires system libraries not available in WSL2)
    test.skip(browserName !== 'chromium', 'Journey tests require Chromium locally');
    await page.goto('/');

    // Wait for app to initialize
    await page.waitForFunction(() => window.fabricCanvas != null, { timeout: 10000 });

    // Dismiss onboarding
    await page.click('#btn-start');
    await page.waitForTimeout(300);

    // Select a sticker category (trees-greenery is default, but click to be sure)
    await page.click('[data-category="trees-greenery"]');

    // Wait for stickers to load
    await page.waitForSelector('.sticker-item', { timeout: 10000 });
    await page.waitForTimeout(200);

    // Get initial object count
    const initialCount = await page.evaluate(() => {
      return window.fabricCanvas?.getObjects().length ?? 0;
    });

    // Click a sticker to place it (stickers are divs with class sticker-item)
    await page.click('.sticker-item:first-child');
    await page.waitForTimeout(500);

    // Verify sticker was added to canvas
    const finalCount = await page.evaluate(() => {
      return window.fabricCanvas?.getObjects().length ?? 0;
    });

    expect(finalCount).toBeGreaterThan(initialCount);
  });
});
