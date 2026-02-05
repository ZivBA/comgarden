import { test, expect } from '@playwright/test';
import { GestureHelper } from '../fixtures/gestures';

declare global {
  interface Window {
    fabricCanvas: any;
  }
}

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Skip non-Chromium browsers (WebKit requires system libraries not available in WSL2)
    test.skip(browserName !== 'chromium', 'Visual tests require Chromium');

    await page.goto('/');

    // Wait for canvas to initialize
    await page.waitForFunction(() => window.fabricCanvas != null, { timeout: 10000 });

    // Dismiss onboarding - properly wait for button and click
    await page.click('#btn-start', { timeout: 5000 });
    await page.waitForTimeout(300);

    // Wait for garden photo to load
    await page.waitForFunction(() => {
      return window.fabricCanvas?.backgroundImage != null;
    }, { timeout: 10000 });

    // Click default category to ensure stickers are loaded
    await page.click('[data-category="trees-greenery"]');
    await page.waitForSelector('.sticker-item', { timeout: 10000 });
  });

  test('initial canvas state', async ({ page }) => {
    await expect(page).toHaveScreenshot('canvas-initial.png', {
      maxDiffPixels: 100,
    });
  });

  test('canvas with sticker placed', async ({ page }) => {
    // Click first sticker in strip to place it (stickers are divs with class sticker-item)
    await page.click('.sticker-item:first-child');
    await page.waitForTimeout(500); // Wait for animation

    await expect(page).toHaveScreenshot('canvas-with-sticker.png', {
      maxDiffPixels: 200,
    });
  });

  test('zoomed in state', async ({ page }) => {
    const canvas = page.locator('#garden-canvas');
    const gestures = new GestureHelper(page, canvas);
    const center = await gestures.getCanvasCenter();

    await gestures.pinchZoom(center, 50, 150);
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('canvas-zoomed.png', {
      maxDiffPixels: 150,
    });
  });

  test('draw mode active', async ({ page }) => {
    await page.click('[data-tool="draw"]');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('draw-mode-active.png', {
      maxDiffPixels: 100,
    });
  });

  test('category tab switched', async ({ page }) => {
    await page.click('[data-category="structures-paths"]');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('structures-category.png', {
      maxDiffPixels: 150,
    });
  });
});
