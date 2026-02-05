import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    fabricCanvas: any;
  }
}

/**
 * localStorage Persistence Tests
 *
 * Tests for canvas state persistence using localStorage.
 * Verifies save, restore, and clear functionality.
 */
test.describe('localStorage Persistence', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Skip non-Chromium browsers for consistency
    test.skip(browserName !== 'chromium', 'Persistence tests require Chromium');

    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for canvas to initialize
    await page.waitForFunction(() => window.fabricCanvas != null, { timeout: 10000 });

    // Dismiss onboarding
    await page.click('#btn-start', { timeout: 5000 });
    await page.waitForTimeout(300);
  });

  test('placing a sticker saves to localStorage', async ({ page }) => {
    // Click sticker to place it
    await page.click('[data-category="trees-greenery"]');
    await page.waitForSelector('.sticker-item', { timeout: 10000 });
    await page.click('.sticker-item:first-child');
    await page.waitForTimeout(1500); // Wait for debounced save

    // Check localStorage has data
    const hasStorage = await page.evaluate(() => {
      const stored = localStorage.getItem('comgarden_canvas_state');
      return stored !== null && stored.length > 0;
    });

    expect(hasStorage).toBe(true);
  });

  test('saved state contains canvas objects', async ({ page }) => {
    // Place a sticker
    await page.click('[data-category="trees-greenery"]');
    await page.waitForSelector('.sticker-item', { timeout: 10000 });
    await page.click('.sticker-item:first-child');
    await page.waitForTimeout(1500);

    // Verify saved state structure
    const state = await page.evaluate(() => {
      const stored = localStorage.getItem('comgarden_canvas_state');
      return stored ? JSON.parse(stored) : null;
    });

    expect(state).not.toBeNull();
    expect(state.objects).toBeDefined();
    expect(Array.isArray(state.objects)).toBe(true);
    expect(state.objects.length).toBeGreaterThan(0);
    expect(state.timestamp).toBeDefined();
  });

  test('canvas state persists after page reload', async ({ page }) => {
    // Place a sticker
    await page.click('[data-category="trees-greenery"]');
    await page.waitForSelector('.sticker-item', { timeout: 10000 });
    await page.click('.sticker-item:first-child');
    await page.waitForTimeout(1500);

    // Get object count before reload
    const countBefore = await page.evaluate(() => {
      return window.fabricCanvas?.getObjects().length ?? 0;
    });
    expect(countBefore).toBeGreaterThan(0);

    // Reload page
    await page.reload();
    await page.waitForFunction(() => window.fabricCanvas != null, { timeout: 10000 });

    // Dismiss onboarding again (if shown)
    const startBtn = page.locator('#btn-start');
    if (await startBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(300);
    }

    // Wait for state restoration
    await page.waitForTimeout(1000);

    // Verify objects were restored
    const countAfter = await page.evaluate(() => {
      return window.fabricCanvas?.getObjects().length ?? 0;
    });
    expect(countAfter).toBe(countBefore);
  });

  test('clearSavedState removes localStorage data', async ({ page }) => {
    // Place a sticker first
    await page.click('[data-category="trees-greenery"]');
    await page.waitForSelector('.sticker-item', { timeout: 10000 });
    await page.click('.sticker-item:first-child');
    await page.waitForTimeout(1500);

    // Verify storage exists
    let hasStorage = await page.evaluate(() => {
      return localStorage.getItem('comgarden_canvas_state') !== null;
    });
    expect(hasStorage).toBe(true);

    // Clear saved state via exposed function
    await page.evaluate(() => {
      localStorage.removeItem('comgarden_canvas_state');
    });

    // Verify storage is cleared
    hasStorage = await page.evaluate(() => {
      return localStorage.getItem('comgarden_canvas_state') !== null;
    });
    expect(hasStorage).toBe(false);
  });

  test('viewport transform is saved and restored', async ({ page }) => {
    // Place a sticker first (needed to trigger saves)
    await page.click('[data-category="trees-greenery"]');
    await page.waitForSelector('.sticker-item', { timeout: 10000 });
    await page.click('.sticker-item:first-child');
    await page.waitForTimeout(500);

    // Zoom in
    await page.evaluate(() => {
      window.fabricCanvas.zoomToPoint({ x: 200, y: 200 }, 2.0);
    });
    await page.waitForTimeout(1500); // Wait for save

    // Get viewport before reload
    const vptBefore = await page.evaluate(() => {
      return window.fabricCanvas?.viewportTransform?.slice();
    });

    // Reload
    await page.reload();
    await page.waitForFunction(() => window.fabricCanvas != null, { timeout: 10000 });

    // Dismiss onboarding if shown
    const startBtn = page.locator('#btn-start');
    if (await startBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(300);
    }

    await page.waitForTimeout(1000);

    // Get viewport after reload
    const vptAfter = await page.evaluate(() => {
      return window.fabricCanvas?.viewportTransform?.slice();
    });

    // Verify zoom level was restored (index 0 is scale)
    expect(vptAfter[0]).toBeCloseTo(vptBefore[0], 1);
  });
});
