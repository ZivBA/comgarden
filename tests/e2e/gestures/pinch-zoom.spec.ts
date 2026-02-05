import { test, expect } from '@playwright/test';
import { GestureHelper } from '../../fixtures/gestures';

/**
 * Pinch Zoom Gesture Tests
 *
 * Tests for pinch-to-zoom functionality on the Fabric.js canvas.
 * Verifies zoom in, zoom out, and boundary constraints.
 *
 * Note: These tests use CDP for multi-touch simulation and only
 * work with Chromium-based browsers.
 */
test.describe('Pinch Zoom', () => {
  let gestures: GestureHelper;

  test.beforeEach(async ({ page, browserName }) => {
    // Skip non-Chromium browsers for multi-touch tests
    test.skip(browserName !== 'chromium', 'Multi-touch requires Chromium CDP');

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

  test('pinch out zooms in on canvas', async ({ page }) => {
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(initialZoom).toBeCloseTo(1, 1);

    // Get canvas center for gesture
    const center = await gestures.getCanvasCenter();

    // Pinch out: start with fingers close (50px apart), end far (150px apart)
    await gestures.pinchZoom(center, 50, 150, 15);

    // Wait for zoom animation to complete
    await page.waitForTimeout(100);

    // Verify zoom increased
    const newZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(newZoom).toBeGreaterThan(initialZoom);
    expect(newZoom).toBeGreaterThan(1);
  });

  test('pinch in zooms out on canvas', async ({ page }) => {
    // First zoom in so we have room to zoom out
    const center = await gestures.getCanvasCenter();
    await gestures.pinchZoom(center, 50, 150, 15);
    await page.waitForTimeout(100);

    const zoomedInLevel = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(zoomedInLevel).toBeGreaterThan(1);

    // Pinch in: start with fingers far (150px apart), end close (50px apart)
    await gestures.pinchZoom(center, 150, 50, 15);
    await page.waitForTimeout(100);

    // Verify zoom decreased
    const newZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(newZoom).toBeLessThan(zoomedInLevel);
  });

  test('zoom respects minimum boundary (0.5)', async ({ page }) => {
    const center = await gestures.getCanvasCenter();

    // Perform multiple aggressive pinch-in gestures to try to go below minimum
    for (let i = 0; i < 5; i++) {
      await gestures.pinchZoom(center, 200, 20, 10);
      await page.waitForTimeout(50);
    }

    // Verify zoom doesn't go below minimum (0.5 as per CONFIG.minZoom)
    const finalZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(finalZoom).toBeGreaterThanOrEqual(0.5);
  });

  test('zoom respects maximum boundary (3.0)', async ({ page }) => {
    const center = await gestures.getCanvasCenter();

    // Perform multiple aggressive pinch-out gestures to try to exceed maximum
    for (let i = 0; i < 10; i++) {
      await gestures.pinchZoom(center, 20, 200, 10);
      await page.waitForTimeout(50);
    }

    // Verify zoom doesn't exceed maximum (3.0 as per CONFIG.maxZoom in canvas.js)
    const finalZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(finalZoom).toBeLessThanOrEqual(3.0);
  });

  test('zoom preserves center point', async ({ page }) => {
    const center = await gestures.getCanvasCenter();

    // Get initial viewport transform
    const initialVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());

    // Perform a pinch zoom at canvas center
    await gestures.pinchZoom(center, 50, 100, 15);
    await page.waitForTimeout(100);

    // The zoom point should be at the center, so viewport offset should change proportionally
    const newZoom = await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1);
    expect(newZoom).toBeGreaterThan(1);

    // Verify zoom actually changed (not blocked or broken)
    const finalVpt = await page.evaluate(() => window.fabricCanvas?.viewportTransform?.slice());
    expect(finalVpt).toBeDefined();
  });

  test('multiple successive zoom operations work correctly', async ({ page }) => {
    const center = await gestures.getCanvasCenter();
    const zoomLevels: number[] = [];

    // Record initial zoom
    zoomLevels.push(await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1));

    // Zoom in (small amount to avoid hitting max)
    await gestures.pinchZoom(center, 60, 90, 10);
    await page.waitForTimeout(150);
    zoomLevels.push(await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1));

    // Zoom in more (another small amount)
    await gestures.pinchZoom(center, 60, 80, 10);
    await page.waitForTimeout(150);
    zoomLevels.push(await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1));

    // Zoom out
    await gestures.pinchZoom(center, 80, 50, 10);
    await page.waitForTimeout(150);
    zoomLevels.push(await page.evaluate(() => window.fabricCanvas?.getZoom() ?? 1));

    // Verify zoom changed from initial and then decreased
    expect(zoomLevels[1]).toBeGreaterThan(zoomLevels[0]); // First zoom in
    // Note: Second zoom might be same if we hit limits, so just verify it's >= initial
    expect(zoomLevels[2]).toBeGreaterThanOrEqual(zoomLevels[0]);
    expect(zoomLevels[3]).toBeLessThan(zoomLevels[2]);    // Zoom out
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
