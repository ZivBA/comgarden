import { Page, Locator } from '@playwright/test';

/**
 * Point coordinates interface
 */
interface Point {
  x: number;
  y: number;
}

/**
 * GestureHelper provides reusable touch gesture simulations for Playwright tests.
 *
 * IMPORTANT: This implementation uses JavaScript-dispatched TouchEvents rather than
 * CDP Input.dispatchTouchEvent, because CDP events are not properly translated to
 * DOM TouchEvents that Fabric.js can handle.
 *
 * Supports single-touch (tap, pan, drag) and multi-touch (pinch zoom) gestures.
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
   * Perform a single tap at the specified position using JavaScript TouchEvent.
   * @param x - X coordinate in viewport
   * @param y - Y coordinate in viewport
   */
  async tap(x: number, y: number): Promise<void> {
    await this.page.evaluate(({ x, y }) => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) throw new Error('fabricCanvas not found');
      const upperCanvas = canvas.upperCanvasEl;

      const createTouch = (id: number, clientX: number, clientY: number) => {
        return new Touch({
          identifier: id,
          target: upperCanvas,
          clientX,
          clientY,
          pageX: clientX,
          pageY: clientY,
          screenX: clientX,
          screenY: clientY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        });
      };

      const touch = createTouch(0, x, y);

      upperCanvas.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch]
      }));

      upperCanvas.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [touch]
      }));
    }, { x, y });
  }

  /**
   * Perform a double tap at the specified position.
   * In the ComGarden app, this triggers zoom reset.
   * @param x - X coordinate in viewport
   * @param y - Y coordinate in viewport
   */
  async doubleTap(x: number, y: number): Promise<void> {
    await this.tap(x, y);
    await this.page.waitForTimeout(50);
    await this.tap(x, y);
  }

  /**
   * Simulate a pinch zoom gesture using JavaScript TouchEvents.
   * Uses two touch points that move apart (zoom in) or together (zoom out).
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
    await this.page.evaluate(({ center, startDistance, endDistance, steps }) => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) throw new Error('fabricCanvas not found');
      const upperCanvas = canvas.upperCanvasEl;

      const createTouch = (id: number, clientX: number, clientY: number) => {
        return new Touch({
          identifier: id,
          target: upperCanvas,
          clientX,
          clientY,
          pageX: clientX,
          pageY: clientY,
          screenX: clientX,
          screenY: clientY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        });
      };

      const halfStartDist = startDistance / 2;
      const halfEndDist = endDistance / 2;

      // Start with two fingers
      const touch1Start = createTouch(0, center.x - halfStartDist, center.y);
      const touch2Start = createTouch(1, center.x + halfStartDist, center.y);

      upperCanvas.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch1Start, touch2Start],
        targetTouches: [touch1Start, touch2Start],
        changedTouches: [touch1Start, touch2Start]
      }));

      // Move fingers gradually
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const currentHalfDist = halfStartDist + (halfEndDist - halfStartDist) * progress;

        const t1 = createTouch(0, center.x - currentHalfDist, center.y);
        const t2 = createTouch(1, center.x + currentHalfDist, center.y);

        upperCanvas.dispatchEvent(new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [t1, t2],
          targetTouches: [t1, t2],
          changedTouches: [t1, t2]
        }));
      }

      // End touch
      const touch1End = createTouch(0, center.x - halfEndDist, center.y);
      const touch2End = createTouch(1, center.x + halfEndDist, center.y);

      upperCanvas.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [touch1End, touch2End]
      }));
    }, { center, startDistance, endDistance, steps });
  }

  /**
   * Perform a pan (single finger drag) gesture using JavaScript TouchEvents.
   * @param start - Starting position
   * @param end - Ending position
   * @param steps - Number of animation steps for smooth pan (default: 10)
   */
  async pan(
    start: Point,
    end: Point,
    steps: number = this.defaultSteps
  ): Promise<void> {
    await this.page.evaluate(({ start, end, steps }) => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) throw new Error('fabricCanvas not found');
      const upperCanvas = canvas.upperCanvasEl;

      const createTouch = (id: number, clientX: number, clientY: number) => {
        return new Touch({
          identifier: id,
          target: upperCanvas,
          clientX,
          clientY,
          pageX: clientX,
          pageY: clientY,
          screenX: clientX,
          screenY: clientY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        });
      };

      // Start touch
      const touchStart = createTouch(0, start.x, start.y);
      upperCanvas.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touchStart],
        targetTouches: [touchStart],
        changedTouches: [touchStart]
      }));

      // Move through intermediate points
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const currentX = start.x + (end.x - start.x) * progress;
        const currentY = start.y + (end.y - start.y) * progress;

        const touch = createTouch(0, currentX, currentY);
        upperCanvas.dispatchEvent(new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch]
        }));
      }

      // End touch
      const touchEnd = createTouch(0, end.x, end.y);
      upperCanvas.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [touchEnd]
      }));
    }, { start, end, steps });
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
    await this.page.evaluate(({ x, y }) => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) throw new Error('fabricCanvas not found');
      const upperCanvas = canvas.upperCanvasEl;

      const createTouch = (id: number, clientX: number, clientY: number) => {
        return new Touch({
          identifier: id,
          target: upperCanvas,
          clientX,
          clientY,
          pageX: clientX,
          pageY: clientY,
          screenX: clientX,
          screenY: clientY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        });
      };

      const touch = createTouch(0, x, y);
      upperCanvas.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch]
      }));
    }, { x, y });

    // Hold for duration
    await this.page.waitForTimeout(duration);

    await this.page.evaluate(({ x, y }) => {
      const canvas = (window as any).fabricCanvas;
      const upperCanvas = canvas.upperCanvasEl;

      const touch = new Touch({
        identifier: 0,
        target: upperCanvas,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        screenX: x,
        screenY: y,
        radiusX: 10,
        radiusY: 10,
        rotationAngle: 0,
        force: 1
      });

      upperCanvas.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [touch]
      }));
    }, { x, y });
  }

  /**
   * Drag from one point to another (for moving stickers or objects).
   * Similar to pan but with a small delay at start for object selection.
   * @param from - Starting position (where to pick up)
   * @param to - Ending position (where to drop)
   * @param steps - Number of animation steps for smooth drag (default: 10)
   */
  async drag(
    from: Point,
    to: Point,
    steps: number = this.defaultSteps
  ): Promise<void> {
    await this.page.evaluate(({ from, to, steps }) => {
      const canvas = (window as any).fabricCanvas;
      if (!canvas) throw new Error('fabricCanvas not found');
      const upperCanvas = canvas.upperCanvasEl;

      const createTouch = (id: number, clientX: number, clientY: number) => {
        return new Touch({
          identifier: id,
          target: upperCanvas,
          clientX,
          clientY,
          pageX: clientX,
          pageY: clientY,
          screenX: clientX,
          screenY: clientY,
          radiusX: 10,
          radiusY: 10,
          rotationAngle: 0,
          force: 1
        });
      };

      // Easing function for natural feel
      const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Start touch
      const touchStart = createTouch(0, from.x, from.y);
      upperCanvas.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touchStart],
        targetTouches: [touchStart],
        changedTouches: [touchStart]
      }));

      // Move through intermediate points with easing
      for (let i = 1; i <= steps; i++) {
        const progress = easeInOut(i / steps);
        const currentX = from.x + (to.x - from.x) * progress;
        const currentY = from.y + (to.y - from.y) * progress;

        const touch = createTouch(0, currentX, currentY);
        upperCanvas.dispatchEvent(new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch]
        }));
      }

      // End touch
      const touchEnd = createTouch(0, to.x, to.y);
      upperCanvas.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [touchEnd]
      }));
    }, { from, to, steps });
  }

  /**
   * Perform a swipe gesture (fast pan with momentum).
   * @param start - Starting position
   * @param end - Ending position
   * @param durationMs - Total duration of the swipe in milliseconds (default: 200ms)
   */
  async swipe(
    start: Point,
    end: Point,
    durationMs: number = 200
  ): Promise<void> {
    const steps = Math.max(3, Math.floor(durationMs / 16));
    await this.pan(start, end, steps);
  }

  /**
   * Check if the current browser supports CDP (Chrome DevTools Protocol).
   * Note: This implementation uses JavaScript TouchEvents which work everywhere,
   * but some features might only work on touch-enabled devices/emulation.
   * @returns true (always, since we use JS events now)
   */
  async supportsCDP(): Promise<boolean> {
    return true;
  }
}

/**
 * Factory function to create a GestureHelper instance.
 * @param page - Playwright Page object
 * @param canvasSelector - CSS selector for the canvas element (default: '#garden-canvas')
 * @returns GestureHelper instance
 */
export function createGestureHelper(
  page: Page,
  canvasSelector: string = '#garden-canvas'
): GestureHelper {
  const canvas = page.locator(canvasSelector);
  return new GestureHelper(page, canvas);
}
