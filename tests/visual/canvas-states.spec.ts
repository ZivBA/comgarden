import { test, expect } from '@playwright/test';
import { GestureHelper } from '../fixtures/gestures';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dismiss onboarding
    const startBtn = page.locator('#btn-start');
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }
    // Wait for garden photo to load
    await page.waitForFunction(() => {
      const canvas = (window as any).fabricCanvas;
      return canvas?.backgroundImage != null;
    }, { timeout: 10000 });
  });

  test('initial canvas state', async ({ page }) => {
    await expect(page).toHaveScreenshot('canvas-initial.png', {
      maxDiffPixels: 100,
    });
  });

  test('canvas with sticker placed', async ({ page }) => {
    // Click first sticker in strip to place it
    await page.click('#sticker-strip img:first-child');
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
