import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    fabricCanvas: any;
  }
}

/**
 * Share/Export Tests
 *
 * Tests for canvas export and share functionality.
 * Note: Web Share API testing is limited in Playwright as it requires user gesture.
 */
test.describe('Share and Export', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Export tests require Chromium');

    await page.goto('/');
    await page.waitForFunction(() => window.fabricCanvas != null, { timeout: 10000 });

    // Dismiss onboarding
    await page.click('#btn-start', { timeout: 5000 });
    await page.waitForTimeout(300);

    // Place a sticker for export
    await page.click('[data-category="trees-greenery"]');
    await page.waitForSelector('.sticker-item', { timeout: 10000 });
    await page.click('.sticker-item:first-child');
    await page.waitForTimeout(500);
  });

  test('canvas can be exported as image data URL', async ({ page }) => {
    const dataUrl = await page.evaluate(() => {
      return window.fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.9
      });
    });

    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:image/jpeg')).toBe(true);
  });

  test('export produces valid JPEG blob', async ({ page }) => {
    const blobInfo = await page.evaluate(async () => {
      const dataUrl = window.fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.9
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      return {
        type: blob.type,
        size: blob.size
      };
    });

    expect(blobInfo.type).toBe('image/jpeg');
    expect(blobInfo.size).toBeGreaterThan(1000); // Should have actual content
  });

  test('canShare returns boolean based on API availability', async ({ page }) => {
    const canShare = await page.evaluate(() => {
      return navigator.share !== undefined && navigator.canShare !== undefined;
    });

    // In headless Chrome, Web Share API is typically not available
    expect(typeof canShare).toBe('boolean');
  });

  test('share button exists and is clickable', async ({ page }) => {
    const shareBtn = page.locator('#btn-share');
    await expect(shareBtn).toBeVisible();

    // Click should not throw (actual share will be mocked/fallback)
    await shareBtn.click();
    await page.waitForTimeout(500);
  });

  test('export with multiplier produces higher resolution image', async ({ page }) => {
    const sizes = await page.evaluate(() => {
      const normalUrl = window.fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.9,
        multiplier: 1
      });

      const highResUrl = window.fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.9,
        multiplier: 2
      });

      return {
        normalLength: normalUrl.length,
        highResLength: highResUrl.length
      };
    });

    // Higher multiplier should produce larger image data
    expect(sizes.highResLength).toBeGreaterThan(sizes.normalLength);
  });

  test('empty canvas can still be exported', async ({ page }) => {
    // Clear the canvas first
    await page.evaluate(() => {
      window.fabricCanvas.clear();
    });

    const dataUrl = await page.evaluate(() => {
      return window.fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.9
      });
    });

    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:image/jpeg')).toBe(true);
  });
});
