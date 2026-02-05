import { test, expect } from '@playwright/test';
import { GestureHelper } from '../../fixtures/gestures';

/**
 * Pan Gesture Tests
 *
 * Tests for single-finger pan (drag) functionality on the Fabric.js canvas.
 * Verifies viewport movement in all directions.
 *
 * Note: These tests use CDP for touch simulation and only
 * work with Chromium-based browsers.
 */
test.describe('Pan Gesture', () => {
  let gestures: GestureHelper;

  test.beforeEach(async ({ page, browserName }) => {
    // Skip non-Chromium browsers for touch simulation tests
    test.skip(browserName !== 'chromium', 'Touch simulation requires Chromium CDP');

    await page.goto('/');

    // Dismiss onboarding if visible
    const startBtn = page.locator('#btn-start');
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(300);
    }

    // Wait for canvas to be ready
    const canvas = page.locator('#garden-canvas');
    await canvas.waitFor({ state: 'visible' });

    // Wait for Fabric.js to initialize
    await page.waitForFunction(() => window.fabricCanvas !== undefined, { timeout: 5000 });

    gestures = new GestureHelper(page, canvas);
  });

  test('single-finger pan moves viewport right', async ({ page }) => {
    // Get initial viewport transform
    const initialVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(initialVpt).toBeDefined();
    const initialX = initialVpt![4]; // X offset is at index 4

    // Get canvas bounds for pan gesture
    const bounds = await gestures.getCanvasBounds();
    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height / 2;

    // Pan left (drag finger left) which moves viewport right relative to content
    await gestures.pan(
      { x: startX, y: startY },
      { x: startX - 100, y: startY },
      15
    );
    await page.waitForTimeout(100);

    // Verify viewport X offset changed (moved left = negative delta)
    const newVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(newVpt).toBeDefined();
    expect(newVpt![4]).toBeLessThan(initialX);
  });

  test('single-finger pan moves viewport down', async ({ page }) => {
    // Get initial viewport transform
    const initialVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(initialVpt).toBeDefined();
    const initialY = initialVpt![5]; // Y offset is at index 5

    const bounds = await gestures.getCanvasBounds();
    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height / 2;

    // Pan up (drag finger up) which moves viewport down relative to content
    await gestures.pan(
      { x: startX, y: startY },
      { x: startX, y: startY - 100 },
      15
    );
    await page.waitForTimeout(100);

    // Verify viewport Y offset changed
    const newVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(newVpt).toBeDefined();
    expect(newVpt![5]).toBeLessThan(initialY);
  });

  test('diagonal pan moves viewport in both axes', async ({ page }) => {
    // Get initial viewport transform
    const initialVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(initialVpt).toBeDefined();
    const initialX = initialVpt![4];
    const initialY = initialVpt![5];

    const bounds = await gestures.getCanvasBounds();
    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height / 2;

    // Diagonal pan (top-left direction)
    await gestures.pan(
      { x: startX, y: startY },
      { x: startX - 80, y: startY - 80 },
      15
    );
    await page.waitForTimeout(100);

    // Verify both X and Y offsets changed
    const newVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(newVpt).toBeDefined();
    expect(newVpt![4]).toBeLessThan(initialX);
    expect(newVpt![5]).toBeLessThan(initialY);
  });

  test('pan works when zoomed in', async ({ page }) => {
    const center = await gestures.getCanvasCenter();

    // First zoom in
    await gestures.pinchZoom(center, 50, 150, 15);
    await page.waitForTimeout(100);

    const zoomLevel = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(zoomLevel).toBeGreaterThan(1);

    // Get viewport after zoom
    const afterZoomVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(afterZoomVpt).toBeDefined();

    // Now pan
    const bounds = await gestures.getCanvasBounds();
    await gestures.pan(
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      { x: bounds.x + bounds.width / 2 - 50, y: bounds.y + bounds.height / 2 },
      15
    );
    await page.waitForTimeout(100);

    // Verify pan worked while zoomed
    const afterPanVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(afterPanVpt).toBeDefined();
    expect(afterPanVpt![4]).not.toBeCloseTo(afterZoomVpt![4], 0);
  });

  test('pan in opposite directions cancels out', async ({ page }) => {
    const bounds = await gestures.getCanvasBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    // Get initial viewport transform
    const initialVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(initialVpt).toBeDefined();

    // Pan right
    await gestures.pan(
      { x: centerX, y: centerY },
      { x: centerX + 100, y: centerY },
      15
    );
    await page.waitForTimeout(100);

    // Pan left by the same amount
    await gestures.pan(
      { x: centerX, y: centerY },
      { x: centerX - 100, y: centerY },
      15
    );
    await page.waitForTimeout(100);

    // Viewport should be back near the original position
    const finalVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(finalVpt).toBeDefined();

    // Allow some tolerance for floating point differences
    expect(finalVpt![4]).toBeCloseTo(initialVpt![4], 0);
  });

  test('rapid successive pans accumulate correctly', async ({ page }) => {
    const bounds = await gestures.getCanvasBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    // Get initial viewport
    const initialVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(initialVpt).toBeDefined();
    const initialX = initialVpt![4];

    // Perform multiple small pans in the same direction
    const panDistance = 30;
    const numPans = 3;

    for (let i = 0; i < numPans; i++) {
      await gestures.pan(
        { x: centerX, y: centerY },
        { x: centerX + panDistance, y: centerY },
        5
      );
      await page.waitForTimeout(50);
    }

    // Verify total pan distance is approximately sum of individual pans
    const finalVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(finalVpt).toBeDefined();

    const totalDelta = finalVpt![4] - initialX;
    expect(totalDelta).toBeGreaterThan(panDistance * (numPans - 1)); // At least 2x the single distance
  });

  test('swipe gesture performs fast pan', async ({ page }) => {
    const bounds = await gestures.getCanvasBounds();
    const startX = bounds.x + bounds.width / 2;
    const startY = bounds.y + bounds.height / 2;

    // Get initial viewport
    const initialVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(initialVpt).toBeDefined();

    // Perform a swipe (fast pan)
    await gestures.swipe(
      { x: startX, y: startY },
      { x: startX + 150, y: startY },
      200
    );
    await page.waitForTimeout(100);

    // Verify viewport moved
    const finalVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(finalVpt).toBeDefined();
    expect(finalVpt![4]).toBeGreaterThan(initialVpt![4]);
  });
});

// Declare fabricCanvas on window for TypeScript
declare global {
  interface Window {
    fabricCanvas?: {
      getZoom(): number;
      viewportTransform: number[] | null;
      setViewportTransform(vpt: number[]): void;
      renderAll(): void;
    };
  }
}
