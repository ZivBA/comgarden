# Mobile Gesture Testing Design

## Overview

Automated testing framework for ComGarden mobile app, focusing on gesture simulation (pinch-zoom, pan, double-tap) and visual regression testing.

**Goals:**
- CI/CD gate: Run on every push/PR to catch regressions
- Local development aid: Fast feedback during development
- Visual regression: Screenshot comparison to catch UI breakage

**Scope:**
1. Gesture mechanics (pinch-zoom, pan, double-tap, touch events)
2. Full user journeys (place sticker, move, zoom, share)
3. Visual regression with baseline screenshots

**Browsers:** Chrome mobile (Pixel 5) + Safari mobile (iPhone 12 via WebKit)

---

## Architecture

### Tool Choice: Playwright

**Why Playwright?**
- Native touch gestures via `touchscreen` API
- WebKit support for Safari testing
- Built-in visual comparison (`toHaveScreenshot`)
- Fast parallel execution
- No cloud dependencies

### Project Structure

```
/home/zivben/repos/comgarden/
├── tests/
│   ├── package.json           # Test dependencies only
│   ├── playwright.config.ts   # Playwright configuration
│   ├── tsconfig.json          # TypeScript for tests
│   │
│   ├── fixtures/
│   │   └── gestures.ts        # Reusable gesture helpers
│   │
│   ├── e2e/
│   │   ├── gestures/
│   │   │   ├── pinch-zoom.spec.ts
│   │   │   ├── pan.spec.ts
│   │   │   └── double-tap.spec.ts
│   │   │
│   │   └── journeys/
│   │       ├── place-sticker.spec.ts
│   │       └── complete-flow.spec.ts
│   │
│   ├── visual/
│   │   ├── snapshots/         # Baseline screenshots (committed)
│   │   └── canvas-states.spec.ts
│   │
│   └── results/               # Test output (gitignored)
│       ├── reports/
│       └── screenshots/
│
├── index.html                 # App unchanged
├── js/                        # App unchanged
└── css/                       # App unchanged
```

**Key decisions:**
- Isolated test folder - `npm install` only in `tests/`, app stays vanilla JS
- TypeScript for tests - Better autocomplete for Playwright APIs
- Fixtures pattern - Reusable gesture simulation helpers
- Separate e2e vs visual - Different concerns, different update frequency

---

## Gesture Simulation Fixtures

### GestureHelper Class

```typescript
// tests/fixtures/gestures.ts

import { Page, Locator } from '@playwright/test';

export class GestureHelper {
  constructor(private page: Page, private canvas: Locator) {}

  /** Get canvas center coordinates */
  async getCanvasCenter(): Promise<{ x: number; y: number }>;

  /** Single tap at position */
  async tap(x: number, y: number): Promise<void>;

  /** Double tap (zoom reset trigger) */
  async doubleTap(x: number, y: number): Promise<void>;

  /** Pinch zoom - simulates two fingers moving apart/together */
  async pinchZoom(
    center: { x: number; y: number },
    startDistance: number,
    endDistance: number,
    steps?: number
  ): Promise<void>;

  /** Pan gesture - single finger drag */
  async pan(
    start: { x: number; y: number },
    end: { x: number; y: number },
    steps?: number
  ): Promise<void>;

  /** Long press (for sticker tooltip) */
  async longPress(x: number, y: number, duration?: number): Promise<void>;

  /** Drag object from point A to B */
  async dragObject(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): Promise<void>;
}
```

**Implementation details:**
- Multi-touch via CDP (Chrome DevTools Protocol) for pinch gestures
- WebKit fallback with different touch simulation approach
- Step-based animation (10 steps) triggers proper Fabric.js event handlers

---

## Test Specifications

### Gesture Tests

```typescript
// tests/e2e/gestures/pinch-zoom.spec.ts

test.describe('Pinch Zoom', () => {
  test('pinch out zooms in on canvas', async ({ page }) => {
    const initialZoom = await page.evaluate(() =>
      window.fabricCanvas?.getZoom() ?? 1
    );

    await gestures.pinchZoom(center, 50, 150);

    const newZoom = await page.evaluate(() =>
      window.fabricCanvas?.getZoom() ?? 1
    );

    expect(newZoom).toBeGreaterThan(initialZoom);
  });

  test('pinch in zooms out on canvas');
  test('zoom respects min/max boundaries');
});

// tests/e2e/gestures/double-tap.spec.ts
test('double tap resets zoom to 1.0');

// tests/e2e/gestures/pan.spec.ts
test('single finger drag pans canvas');
test('pan respects boundaries');
```

### Visual Regression Tests

```typescript
// tests/visual/canvas-states.spec.ts

test('initial canvas state', async ({ page }) => {
  await expect(page).toHaveScreenshot('canvas-initial.png', {
    maxDiffPixels: 100,
  });
});

test('canvas with sticker placed');
test('zoomed in state');
test('draw mode with freehand line');
```

**Snapshot management:**
- Per-browser snapshots (Chromium/WebKit render differently)
- maxDiffPixels tolerance prevents flaky tests
- Committed baselines in git for CI comparison
- Update workflow: `npx playwright test --update-snapshots`

---

## Configuration

### Playwright Config

```typescript
// tests/playwright.config.ts

export default defineConfig({
  testDir: './',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['html', { outputFolder: './results/reports' }],
    ['json', { outputFile: './results/reports/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'], hasTouch: true },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'], hasTouch: true },
    },
  ],

  webServer: {
    command: 'npx serve .. -l 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Package.json

```json
{
  "name": "comgarden-tests",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "test:gestures": "playwright test e2e/gestures/",
    "test:visual": "playwright test visual/",
    "test:update-snapshots": "playwright test --update-snapshots",
    "report": "playwright show-report results/reports"
  },
  "devDependencies": {
    "@playwright/test": "^1.41.0",
    "serve": "^14.2.0",
    "typescript": "^5.3.0"
  }
}
```

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml

name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install test dependencies
        working-directory: ./tests
        run: npm ci

      - name: Install Playwright browsers
        working-directory: ./tests
        run: npx playwright install --with-deps chromium webkit

      - name: Run tests
        working-directory: ./tests
        run: npm test

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: tests/results/
```

---

## App Modification

One small change needed for testability:

```javascript
// In /home/zivben/repos/comgarden/js/canvas.js
// At the end of initCanvas():

if (typeof window !== 'undefined') {
  window.fabricCanvas = canvas;  // Expose for e2e tests
}
```

---

## Test Commands

```bash
cd tests
npm install
npx playwright install chromium webkit

npm test                       # Run all tests
npm run test:headed            # Watch tests run in browser
npm run test:ui                # Interactive test explorer
npm run test:gestures          # Gestures only
npm run test:visual            # Visual regression only
npm run test:update-snapshots  # Update baselines
npm run report                 # View HTML report
```

---

## Implementation Tasks

1. Create tests directory structure
2. Create package.json with dependencies
3. Create playwright.config.ts
4. Create tsconfig.json
5. Create fixtures/gestures.ts with GestureHelper class
6. Create e2e/gestures/pinch-zoom.spec.ts
7. Create e2e/gestures/pan.spec.ts
8. Create e2e/gestures/double-tap.spec.ts
9. Create visual/canvas-states.spec.ts
10. Add window.fabricCanvas exposure in canvas.js
11. Create .github/workflows/test.yml
12. Generate initial visual baselines
13. Test locally and verify CI works
