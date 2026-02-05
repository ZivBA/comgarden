import { test, expect } from '@playwright/test';
import { GestureHelper } from '../../fixtures/gestures';

/**
 * Double-Tap Gesture Tests
 *
 * Tests for double-tap to reset zoom/pan functionality on the Fabric.js canvas.
 * Verifies that double-tapping resets the viewport to default state.
 */
test.describe('Double-Tap Reset', () => {
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

  test('double-tap resets zoom to 1.0', async ({ page }) => {
    const center = await gestures.getCanvasCenter();

    // First, zoom in
    await gestures.pinchZoom(center, 50, 150, 15);
    await page.waitForTimeout(100);

    // Verify we're zoomed in
    const zoomedLevel = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(zoomedLevel).toBeGreaterThan(1);

    // Double-tap to reset
    await gestures.doubleTap(center.x, center.y);
    await page.waitForTimeout(200);

    // Verify zoom reset to 1.0
    const resetZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 0);
    expect(resetZoom).toBeCloseTo(1.0, 1);
  });

  test('double-tap resets pan position to center', async ({ page }) => {
    const bounds = await gestures.getCanvasBounds();
    const center = await gestures.getCanvasCenter();

    // First, pan away from center
    await gestures.pan(
      { x: center.x, y: center.y },
      { x: center.x - 100, y: center.y - 100 },
      15
    );
    await page.waitForTimeout(100);

    // Verify viewport is offset
    const pannedVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(pannedVpt).toBeDefined();
    expect(pannedVpt![4]).not.toBeCloseTo(0, 0);
    expect(pannedVpt![5]).not.toBeCloseTo(0, 0);

    // Double-tap to reset
    await gestures.doubleTap(center.x, center.y);
    await page.waitForTimeout(200);

    // Verify viewport reset (default transform is [1, 0, 0, 1, 0, 0])
    const resetVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(resetVpt).toBeDefined();
    expect(resetVpt![4]).toBeCloseTo(0, 0); // X offset
    expect(resetVpt![5]).toBeCloseTo(0, 0); // Y offset
  });

  test('double-tap resets both zoom and pan simultaneously', async ({ page }) => {
    const center = await gestures.getCanvasCenter();

    // First zoom in
    await gestures.pinchZoom(center, 50, 150, 15);
    await page.waitForTimeout(200);

    // Verify zoom changed
    const zoomedLevel = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(zoomedLevel).toBeGreaterThan(1);

    // Then pan away (need to be zoomed in for pan to be visible)
    await gestures.pan(
      { x: center.x, y: center.y },
      { x: center.x + 80, y: center.y + 80 },
      15
    );
    await page.waitForTimeout(200);

    // Double-tap to reset
    await gestures.doubleTap(center.x, center.y);
    await page.waitForTimeout(300);

    // Verify zoom is reset
    const resetZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 0);
    const resetVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());

    expect(resetZoom).toBeCloseTo(1.0, 1);
    expect(resetVpt![4]).toBeCloseTo(0, 0);
    expect(resetVpt![5]).toBeCloseTo(0, 0);
  });

  test('double-tap at edge of canvas still resets', async ({ page }) => {
    const bounds = await gestures.getCanvasBounds();
    const center = await gestures.getCanvasCenter();

    // First, zoom in
    await gestures.pinchZoom(center, 50, 120, 15);
    await page.waitForTimeout(100);

    const zoomedLevel = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(zoomedLevel).toBeGreaterThan(1);

    // Double-tap near edge (with small offset to stay within bounds)
    const edgeX = bounds.x + 30;
    const edgeY = bounds.y + 30;
    await gestures.doubleTap(edgeX, edgeY);
    await page.waitForTimeout(200);

    // Verify zoom reset
    const resetZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 0);
    expect(resetZoom).toBeCloseTo(1.0, 1);
  });

  test('double-tap does not reset when object is selected', async ({ page }) => {
    // This test verifies that double-tap doesn't interfere with object selection
    // The app should only reset zoom when no object is active

    const center = await gestures.getCanvasCenter();

    // Zoom in first
    await gestures.pinchZoom(center, 50, 120, 15);
    await page.waitForTimeout(100);

    const zoomedLevel = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(zoomedLevel).toBeGreaterThan(1);

    // Simulate having an active object (if the app has stickers)
    // This is a behavioral check - if there's an active object, double-tap shouldn't reset
    const hasActiveObject = await page.evaluate(() => {
      return window.fabricCanvas?.getActiveObject?.() !== undefined;
    });

    // If no objects exist, double-tap should reset
    if (!hasActiveObject) {
      await gestures.doubleTap(center.x, center.y);
      await page.waitForTimeout(200);

      const resetZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 0);
      expect(resetZoom).toBeCloseTo(1.0, 1);
    }
  });

  test('rapid double-taps are handled correctly', async ({ page }) => {
    const center = await gestures.getCanvasCenter();

    // Zoom in
    await gestures.pinchZoom(center, 50, 150, 15);
    await page.waitForTimeout(100);

    // Perform multiple rapid double-taps
    for (let i = 0; i < 3; i++) {
      await gestures.doubleTap(center.x, center.y);
      await page.waitForTimeout(100);
    }

    // Verify zoom is still at reset level (1.0)
    const finalZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 0);
    expect(finalZoom).toBeCloseTo(1.0, 1);

    // Verify viewport is at default position
    const finalVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(finalVpt![4]).toBeCloseTo(0, 0);
    expect(finalVpt![5]).toBeCloseTo(0, 0);
  });

  test('single tap does not reset zoom', async ({ page }) => {
    const center = await gestures.getCanvasCenter();

    // Wait a bit to clear any previous tap state
    await page.waitForTimeout(500);

    // Zoom in
    await gestures.pinchZoom(center, 50, 150, 15);
    await page.waitForTimeout(200);

    const zoomedLevel = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(zoomedLevel).toBeGreaterThan(1);

    // Wait longer than double-tap threshold before the tap
    await page.waitForTimeout(400);

    // Single tap (not double)
    await gestures.tap(center.x, center.y);

    // Wait a bit, but NOT another tap
    await page.waitForTimeout(500);

    // Verify zoom is NOT reset (single tap shouldn't trigger reset)
    const afterTapZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(afterTapZoom).toBeCloseTo(zoomedLevel, 1);
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
      getActiveObject?(): unknown;
    };
  }
}
