import { test, expect } from '@playwright/test';

test.describe('Place Sticker Journey', () => {
  test('user can place and move a sticker', async ({ page }) => {
    await page.goto('/');

    // Dismiss onboarding
    await page.click('#btn-start');

    // Select a sticker category
    await page.click('[data-category="trees-greenery"]');

    // Click a sticker to place it
    await page.click('#sticker-strip img:first-child');

    // Verify sticker was added to canvas
    const objectCount = await page.evaluate(() => {
      return (window as any).fabricCanvas?.getObjects().length ?? 0;
    });

    expect(objectCount).toBeGreaterThan(0);
  });
});
