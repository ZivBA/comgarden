import { Page, Locator } from '@playwright/test';

/**
 * Point coordinates interface
 */
interface Point {
  x: number;
  y: number;
}

/**
 * Touch point for CDP touch events
 */
interface TouchPoint {
  x: number;
  y: number;
  id?: number;
}

/**
 * GestureHelper provides reusable touch gesture simulations for Playwright tests.
 * Supports single-touch (tap, pan, drag) and multi-touch (pinch zoom) gestures.
 *
 * Note: Multi-touch gestures use Chrome DevTools Protocol (CDP) and only work
 * with Chromium-based browsers. For WebKit, these tests should be skipped.
 */
export class GestureHelper {
  private readonly defaultSteps = 10;
  private readonly defaultLongPressDuration = 500;

  constructor(
    private page: Page,
    private canvas: Locator
  ) {}

  /**
   * Get the center coordinates of the canvas element.
   * @returns Center point {x, y} in viewport coordinates
   */
  async getCanvasCenter(): Promise<Point> {
    const box = await this.canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas element not found or not visible');
    }
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  }

  /**
   * Get the bounding box of the canvas element.
   * @returns Bounding box with x, y, width, height
   */
  async getCanvasBounds(): Promise<{ x: number; y: number; width: number; height: number }> {
    const box = await this.canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas element not found or not visible');
    }
    return box;
  }

  /**
   * Perform a single tap at the specified position.
   * @param x - X coordinate in viewport
   * @param y - Y coordinate in viewport
   */
  async tap(x: number, y: number): Promise<void> {
    await this.page.touchscreen.tap(x, y);
  }

  /**
   * Perform a double tap at the specified position.
   * In the ComGarden app, this triggers zoom reset.
   * @param x - X coordinate in viewport
   * @param y - Y coordinate in viewport
   */
  async doubleTap(x: number, y: number): Promise<void> {
    await this.page.touchscreen.tap(x, y);
    await this.page.waitForTimeout(50);
    await this.page.touchscreen.tap(x, y);
  }

  /**
   * Simulate a pinch zoom gesture using Chrome DevTools Protocol.
   * Uses two touch points that move apart (zoom in) or together (zoom out).
   *
   * Note: Only works with Chromium-based browsers. For WebKit, skip these tests.
   *
   * @param center - Center point of the pinch gesture
   * @param startDistance - Initial distance between the two fingers (pixels)
   * @param endDistance - Final distance between fingers (larger = zoom in, smaller = zoom out)
   * @param steps - Number of animation steps for smooth gesture (default: 10)
   */
  async pinchZoom(
    center: Point,
    startDistance: number,
    endDistance: number,
    steps: number = this.defaultSteps
  ): Promise<void> {
    const client = await this.page.context().newCDPSession(this.page);

    try {
      // Calculate initial touch points (horizontal pinch)
      const halfStartDist = startDistance / 2;
      const halfEndDist = endDistance / 2;

      // Start touch with two fingers
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { x: center.x - halfStartDist, y: center.y, id: 0 },
          { x: center.x + halfStartDist, y: center.y, id: 1 }
        ]
      });

      // Gradually move fingers apart or together
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const currentHalfDist = halfStartDist + (halfEndDist - halfStartDist) * progress;

        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [
            { x: center.x - currentHalfDist, y: center.y, id: 0 },
            { x: center.x + currentHalfDist, y: center.y, id: 1 }
          ]
        });

        // Small delay for smooth animation
        await this.page.waitForTimeout(16); // ~60fps
      }

      // End touch
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: []
      });
    } finally {
      await client.detach();
    }
  }

  /**
   * Perform a pan (single finger drag) gesture.
   * @param start - Starting position
   * @param end - Ending position
   * @param steps - Number of animation steps for smooth pan (default: 10)
   */
  async pan(
    start: Point,
    end: Point,
    steps: number = this.defaultSteps
  ): Promise<void> {
    const client = await this.page.context().newCDPSession(this.page);

    try {
      // Start touch
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: start.x, y: start.y, id: 0 }]
      });

      // Move through intermediate points
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const currentX = start.x + (end.x - start.x) * progress;
        const currentY = start.y + (end.y - start.y) * progress;

        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: currentX, y: currentY, id: 0 }]
        });

        await this.page.waitForTimeout(16);
      }

      // End touch
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: []
      });
    } finally {
      await client.detach();
    }
  }

  /**
   * Perform a long press at the specified position.
   * @param x - X coordinate in viewport
   * @param y - Y coordinate in viewport
   * @param duration - Duration of the press in milliseconds (default: 500ms)
   */
  async longPress(
    x: number,
    y: number,
    duration: number = this.defaultLongPressDuration
  ): Promise<void> {
    const client = await this.page.context().newCDPSession(this.page);

    try {
      // Start touch
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y, id: 0 }]
      });

      // Hold for duration
      await this.page.waitForTimeout(duration);

      // End touch
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: []
      });
    } finally {
      await client.detach();
    }
  }

  /**
   * Drag from one point to another (for moving stickers or objects).
   * Similar to pan but semantically represents dragging an object.
   * @param from - Starting position (where to pick up)
   * @param to - Ending position (where to drop)
   * @param steps - Number of animation steps for smooth drag (default: 10)
   */
  async drag(
    from: Point,
    to: Point,
    steps: number = this.defaultSteps
  ): Promise<void> {
    // Drag is functionally the same as pan, but we keep it separate
    // for semantic clarity and potential future differentiation
    // (e.g., adding a small delay at start for object selection)
    const client = await this.page.context().newCDPSession(this.page);

    try {
      // Start touch at the "from" position
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: from.x, y: from.y, id: 0 }]
      });

      // Small delay to allow object selection/pickup
      await this.page.waitForTimeout(50);

      // Move through intermediate points
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        // Use easeInOut for more natural drag feel
        const easedProgress = this.easeInOut(progress);
        const currentX = from.x + (to.x - from.x) * easedProgress;
        const currentY = from.y + (to.y - from.y) * easedProgress;

        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: currentX, y: currentY, id: 0 }]
        });

        await this.page.waitForTimeout(16);
      }

      // End touch at the "to" position
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: []
      });
    } finally {
      await client.detach();
    }
  }

  /**
   * Perform a swipe gesture (fast pan with momentum).
   * @param start - Starting position
   * @param end - Ending position
   * @param duration - Total duration of the swipe in milliseconds (default: 200ms)
   */
  async swipe(
    start: Point,
    end: Point,
    duration: number = 200
  ): Promise<void> {
    const steps = Math.max(3, Math.floor(duration / 16));
    const client = await this.page.context().newCDPSession(this.page);

    try {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: start.x, y: start.y, id: 0 }]
      });

      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        // Use easeOut for swipe (fast start, slow end gives momentum feel)
        const easedProgress = this.easeOut(progress);
        const currentX = start.x + (end.x - start.x) * easedProgress;
        const currentY = start.y + (end.y - start.y) * easedProgress;

        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: currentX, y: currentY, id: 0 }]
        });

        await this.page.waitForTimeout(duration / steps);
      }

      await client.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: []
      });
    } finally {
      await client.detach();
    }
  }

  /**
   * Check if the current browser supports CDP (Chrome DevTools Protocol).
   * Multi-touch gestures require CDP and only work with Chromium.
   * @returns true if CDP is supported
   */
  async supportsCDP(): Promise<boolean> {
    try {
      const client = await this.page.context().newCDPSession(this.page);
      await client.detach();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Easing function for smooth ease-in-out animation.
   * @param t - Progress value between 0 and 1
   * @returns Eased value between 0 and 1
   */
  private easeInOut(t: number): number {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Easing function for ease-out animation (fast start, slow end).
   * @param t - Progress value between 0 and 1
   * @returns Eased value between 0 and 1
   */
  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 2);
  }
}

/**
 * Factory function to create a GestureHelper instance.
 * @param page - Playwright Page object
 * @param canvasSelector - CSS selector for the canvas element (default: 'canvas')
 * @returns GestureHelper instance
 */
export function createGestureHelper(
  page: Page,
  canvasSelector: string = 'canvas'
): GestureHelper {
  const canvas = page.locator(canvasSelector);
  return new GestureHelper(page, canvas);
}
