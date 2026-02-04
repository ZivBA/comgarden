# ComGarden Vision App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first Hebrew RTL web app where community members place stickers on an aerial photo to visualize their garden vision, then share via WhatsApp.

**Architecture:** Single-page app with modular vanilla JS. Fabric.js handles canvas manipulation. No backend — all state in localStorage. GitHub Pages hosting.

**Tech Stack:** HTML5, CSS3, Vanilla JS (ES6 modules), Fabric.js 5.x (CDN)

**Repository:** https://github.com/ZivBA/comgarden
**Local Path:** /home/zivben/repos/comgarden
**Live URL:** https://zivba.github.io/comgarden/

---

## Phase 1: Canvas Foundation

### Task 1.1: Create HTML Structure

**Files:**
- Create: `/home/zivben/repos/comgarden/index.html`

**Step 1: Create the HTML file**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <title>גן קהילתי — תכנון חזון</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <!-- Top Bar -->
    <header id="top-bar">
        <button id="btn-undo" class="top-btn" aria-label="בטל">↩️ בטל</button>
        <button id="btn-help" class="top-btn" aria-label="עזרה">?</button>
        <button id="btn-share" class="top-btn primary" aria-label="שיתוף">שיתוף 📤</button>
    </header>

    <!-- Main Canvas Area -->
    <main id="canvas-container">
        <canvas id="garden-canvas"></canvas>
    </main>

    <!-- Bottom Panel -->
    <footer id="bottom-panel">
        <!-- Category Tabs -->
        <nav id="category-tabs" role="tablist">
            <button class="tab active" data-category="trees-greenery" role="tab" aria-selected="true">🌿</button>
            <button class="tab" data-category="food-growing" role="tab">🥕</button>
            <button class="tab" data-category="structures-paths" role="tab">🏗️</button>
            <button class="tab" data-category="water-nature" role="tab">💧</button>
            <button class="tab" data-category="furniture-amenities" role="tab">🪑</button>
            <div class="tab-divider"></div>
            <button class="tab tool" data-tool="draw" role="tab">✏️</button>
            <button class="tab tool" data-tool="text" role="tab">T</button>
        </nav>

        <!-- Sticker Strip -->
        <div id="sticker-strip" role="listbox" aria-label="מדבקות">
            <!-- Stickers loaded dynamically -->
        </div>
    </footer>

    <!-- Onboarding Overlay (hidden by default) -->
    <div id="onboarding-overlay" class="overlay hidden">
        <div class="overlay-content">
            <h2>👋 ברוכים הבאים!</h2>
            <ol>
                <li>בחרו מדבקה מלמטה ⬇️</li>
                <li>גררו אותה לתמונה</li>
                <li>צבטו לזום, סובבו בשתי אצבעות</li>
            </ol>
            <button id="btn-start" class="btn-primary">יאללה, מתחילים!</button>
        </div>
    </div>

    <!-- Toast Container -->
    <div id="toast-container"></div>

    <!-- Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
    <script type="module" src="js/app.js"></script>
</body>
</html>
```

**Step 2: Verify file was created**

Open in browser or run: `cat /home/zivben/repos/comgarden/index.html | head -20`
Expected: HTML content starting with `<!DOCTYPE html>`

**Step 3: Commit**

```bash
git add /home/zivben/repos/comgarden/index.html
git commit -m "feat: add HTML structure with RTL layout

- Top bar with undo, help, share buttons
- Canvas container for Fabric.js
- Bottom panel with category tabs and sticker strip
- Onboarding overlay (hidden)
- Toast container for notifications

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: Create Base CSS Styles

**Files:**
- Create: `/home/zivben/repos/comgarden/css/styles.css`

**Step 1: Create directory and CSS file**

```bash
mkdir -p /home/zivben/repos/comgarden/css
```

**Step 2: Write the CSS**

```css
/* ComGarden Vision App - Base Styles */
/* Mobile-first, RTL Hebrew */

:root {
    --color-primary: #4CAF50;
    --color-primary-dark: #388E3C;
    --color-background: #f5f5f5;
    --color-surface: #ffffff;
    --color-text: #212121;
    --color-text-secondary: #757575;
    --color-border: #e0e0e0;
    --color-overlay: rgba(0, 0, 0, 0.7);

    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;

    --top-bar-height: 48px;
    --bottom-panel-height: 140px;
    --tab-height: 44px;

    --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-size-sm: 14px;
    --font-size-md: 16px;
    --font-size-lg: 18px;

    --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.15);
    --shadow-lg: 0 10px 20px rgba(0,0,0,0.2);

    --z-canvas: 1;
    --z-panel: 10;
    --z-top-bar: 20;
    --z-overlay: 100;
    --z-toast: 200;
}

/* Reset */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html, body {
    height: 100%;
    overflow: hidden;
    font-family: var(--font-family);
    font-size: var(--font-size-md);
    color: var(--color-text);
    background: var(--color-background);
    direction: rtl;
    -webkit-tap-highlight-color: transparent;
    touch-action: none;
}

/* Top Bar */
#top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--top-bar-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--spacing-md);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: var(--shadow-sm);
    z-index: var(--z-top-bar);
}

.top-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: 8px;
    background: transparent;
    font-size: var(--font-size-md);
    font-family: inherit;
    cursor: pointer;
    transition: background 0.2s;
}

.top-btn:active {
    background: var(--color-border);
}

.top-btn.primary {
    background: var(--color-primary);
    color: white;
}

.top-btn.primary:active {
    background: var(--color-primary-dark);
}

#btn-help {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 50%;
    font-weight: bold;
}

/* Canvas Container */
#canvas-container {
    position: fixed;
    top: var(--top-bar-height);
    left: 0;
    right: 0;
    bottom: var(--bottom-panel-height);
    background: #333;
    z-index: var(--z-canvas);
    overflow: hidden;
}

#garden-canvas {
    width: 100%;
    height: 100%;
}

/* Bottom Panel */
#bottom-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--bottom-panel-height);
    background: var(--color-surface);
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    z-index: var(--z-panel);
    display: flex;
    flex-direction: column;
    transition: transform 0.3s ease;
}

#bottom-panel.collapsed {
    transform: translateY(calc(var(--bottom-panel-height) - var(--tab-height)));
}

/* Category Tabs */
#category-tabs {
    display: flex;
    height: var(--tab-height);
    border-bottom: 1px solid var(--color-border);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

#category-tabs::-webkit-scrollbar {
    display: none;
}

.tab {
    flex-shrink: 0;
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    background: transparent;
    font-size: 20px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
}

.tab:active {
    background: var(--color-border);
}

.tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: var(--spacing-sm);
    right: var(--spacing-sm);
    height: 3px;
    background: var(--color-primary);
    border-radius: 3px 3px 0 0;
}

.tab.tool.active::after {
    background: #FF9800;
}

.tab-divider {
    width: 1px;
    margin: var(--spacing-sm) var(--spacing-xs);
    background: var(--color-border);
}

/* Sticker Strip */
#sticker-strip {
    flex: 1;
    display: flex;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    gap: var(--spacing-md);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

#sticker-strip::-webkit-scrollbar {
    display: none;
}

.sticker-item {
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-surface);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s, box-shadow 0.15s;
}

.sticker-item:active {
    transform: scale(0.95);
    box-shadow: none;
}

.sticker-item img,
.sticker-item svg {
    max-width: 80%;
    max-height: 80%;
}

/* Overlays */
.overlay {
    position: fixed;
    inset: 0;
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-overlay);
    padding: var(--spacing-lg);
}

.overlay.hidden {
    display: none;
}

.overlay-content {
    background: var(--color-surface);
    border-radius: 16px;
    padding: var(--spacing-lg);
    max-width: 320px;
    width: 100%;
    text-align: center;
}

.overlay-content h2 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--spacing-md);
}

.overlay-content ol {
    text-align: right;
    margin: var(--spacing-md) 0;
    padding-right: var(--spacing-lg);
}

.overlay-content li {
    margin-bottom: var(--spacing-sm);
    line-height: 1.5;
}

.btn-primary {
    width: 100%;
    padding: var(--spacing-md);
    border: none;
    border-radius: 12px;
    background: var(--color-primary);
    color: white;
    font-size: var(--font-size-md);
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-primary:active {
    background: var(--color-primary-dark);
}

/* Toast Notifications */
#toast-container {
    position: fixed;
    bottom: calc(var(--bottom-panel-height) + var(--spacing-md));
    left: var(--spacing-md);
    right: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    z-index: var(--z-toast);
    pointer-events: none;
}

.toast {
    background: var(--color-text);
    color: white;
    padding: var(--spacing-md);
    border-radius: 12px;
    text-align: center;
    font-size: var(--font-size-sm);
    animation: toast-in 0.3s ease, toast-out 0.3s ease 2.7s forwards;
    pointer-events: auto;
}

@keyframes toast-in {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes toast-out {
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(-20px);
    }
}

/* Color Picker (for draw mode) */
#color-picker {
    display: none;
    position: fixed;
    bottom: calc(var(--bottom-panel-height) + var(--spacing-sm));
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface);
    padding: var(--spacing-sm);
    border-radius: 24px;
    box-shadow: var(--shadow-md);
    z-index: var(--z-panel);
}

#color-picker.visible {
    display: flex;
    gap: var(--spacing-sm);
}

.color-option {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
}

.color-option.active {
    border-color: var(--color-text);
}

/* Loading State */
.loading {
    opacity: 0.5;
    pointer-events: none;
}

/* Safe area handling for notched phones */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
    #bottom-panel {
        padding-bottom: env(safe-area-inset-bottom);
        height: calc(var(--bottom-panel-height) + env(safe-area-inset-bottom));
    }

    #canvas-container {
        bottom: calc(var(--bottom-panel-height) + env(safe-area-inset-bottom));
    }
}
```

**Step 3: Verify file created**

Run: `ls -la /home/zivben/repos/comgarden/css/`
Expected: `styles.css` file present

**Step 4: Commit**

```bash
git add /home/zivben/repos/comgarden/css/styles.css
git commit -m "feat: add mobile-first RTL CSS styles

- CSS custom properties for theming
- Fixed top bar with blur backdrop
- Bottom panel with category tabs
- Sticker strip with horizontal scroll
- Onboarding overlay styles
- Toast notification animations
- Safe area handling for notched phones

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.3: Create Canvas Module

**Files:**
- Create: `/home/zivben/repos/comgarden/js/canvas.js`

**Step 1: Create directory**

```bash
mkdir -p /home/zivben/repos/comgarden/js
```

**Step 2: Write the canvas module**

```javascript
/**
 * canvas.js - Fabric.js canvas setup with zoom/pan and background image
 *
 * Exports:
 * - initCanvas(): Initialize the canvas with garden photo background
 * - getCanvas(): Get the Fabric.js canvas instance
 * - resetZoom(): Reset zoom to fit the image
 */

let canvas = null;
let gardenImage = null;

// Configuration
const CONFIG = {
    minZoom: 0.5,
    maxZoom: 3,
    gardenPhotoPath: 'assets/garden-photo.jpg',
    fallbackColor: '#8BC34A' // Green fallback if image fails
};

/**
 * Initialize the Fabric.js canvas
 * @returns {Promise<fabric.Canvas>} The initialized canvas
 */
export async function initCanvas() {
    const container = document.getElementById('canvas-container');
    const canvasEl = document.getElementById('garden-canvas');

    // Set canvas size to container
    canvasEl.width = container.clientWidth;
    canvasEl.height = container.clientHeight;

    // Initialize Fabric canvas
    canvas = new fabric.Canvas('garden-canvas', {
        selection: true,
        preserveObjectStacking: true,
        allowTouchScrolling: false,
        stopContextMenu: true,
        fireRightClick: false
    });

    // Load background image
    try {
        await loadBackgroundImage();
    } catch (error) {
        console.warn('Failed to load garden photo, using fallback color:', error);
        canvas.setBackgroundColor(CONFIG.fallbackColor, canvas.renderAll.bind(canvas));
    }

    // Set up touch gestures
    setupTouchGestures();

    // Handle window resize
    window.addEventListener('resize', handleResize);

    // Handle double-tap to reset zoom
    setupDoubleTapReset();

    return canvas;
}

/**
 * Get the canvas instance
 * @returns {fabric.Canvas|null}
 */
export function getCanvas() {
    return canvas;
}

/**
 * Load the garden aerial photo as background
 */
async function loadBackgroundImage() {
    return new Promise((resolve, reject) => {
        fabric.Image.fromURL(CONFIG.gardenPhotoPath, (img, isError) => {
            if (isError || !img) {
                reject(new Error('Failed to load image'));
                return;
            }

            gardenImage = img;

            // Scale image to fit canvas while maintaining aspect ratio
            const containerWidth = canvas.getWidth();
            const containerHeight = canvas.getHeight();
            const imgAspect = img.width / img.height;
            const containerAspect = containerWidth / containerHeight;

            let scale;
            if (imgAspect > containerAspect) {
                // Image is wider - fit to width
                scale = containerWidth / img.width;
            } else {
                // Image is taller - fit to height
                scale = containerHeight / img.height;
            }

            img.scale(scale);

            // Center the image
            img.set({
                left: (containerWidth - img.width * scale) / 2,
                top: (containerHeight - img.height * scale) / 2,
                selectable: false,
                evented: false
            });

            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            resolve(img);
        }, { crossOrigin: 'anonymous' });
    });
}

/**
 * Set up pinch-to-zoom and pan gestures
 */
function setupTouchGestures() {
    let lastPinchDistance = 0;
    let isPinching = false;
    let lastPanPoint = null;

    canvas.on('touch:gesture', (opt) => {
        const e = opt.e;

        if (e.touches && e.touches.length === 2) {
            // Pinch zoom
            isPinching = true;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            if (lastPinchDistance > 0) {
                const delta = distance / lastPinchDistance;
                const currentZoom = canvas.getZoom();
                let newZoom = currentZoom * delta;

                // Clamp zoom
                newZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, newZoom));

                // Zoom toward pinch center
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;

                canvas.zoomToPoint({ x: centerX, y: centerY }, newZoom);
            }

            lastPinchDistance = distance;
        }
    });

    canvas.on('touch:drag', (opt) => {
        if (isPinching) return;

        const e = opt.e;
        if (e.touches && e.touches.length === 1 && !canvas.getActiveObject()) {
            // Pan (only when no object selected)
            const touch = e.touches[0];
            const point = { x: touch.clientX, y: touch.clientY };

            if (lastPanPoint) {
                const vpt = canvas.viewportTransform;
                vpt[4] += point.x - lastPanPoint.x;
                vpt[5] += point.y - lastPanPoint.y;
                canvas.requestRenderAll();
            }

            lastPanPoint = point;
        }
    });

    canvas.on('mouse:up', () => {
        isPinching = false;
        lastPinchDistance = 0;
        lastPanPoint = null;
    });

    // Also handle mouse wheel for desktop
    canvas.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        zoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, zoom));

        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });
}

/**
 * Set up double-tap to reset zoom
 */
function setupDoubleTapReset() {
    let lastTap = 0;

    canvas.on('mouse:down', (opt) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTap < DOUBLE_TAP_DELAY) {
            // Double tap detected
            if (!canvas.getActiveObject()) {
                resetZoom();
            }
        }

        lastTap = now;
    });
}

/**
 * Reset zoom to fit the garden image
 */
export function resetZoom() {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
}

/**
 * Handle window resize
 */
function handleResize() {
    const container = document.getElementById('canvas-container');
    canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight
    });

    // Re-center background image
    if (gardenImage) {
        loadBackgroundImage().catch(() => {});
    }
}
```

**Step 3: Verify file created**

Run: `ls -la /home/zivben/repos/comgarden/js/`
Expected: `canvas.js` file present

**Step 4: Commit**

```bash
git add /home/zivben/repos/comgarden/js/canvas.js
git commit -m "feat: add canvas module with zoom/pan gestures

- Fabric.js canvas initialization
- Garden photo background loading with fallback
- Pinch-to-zoom with min/max limits
- Pan gesture when no object selected
- Double-tap to reset zoom
- Mouse wheel zoom for desktop
- Window resize handling

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.4: Create Main App Entry Point

**Files:**
- Create: `/home/zivben/repos/comgarden/js/app.js`

**Step 1: Write the app module**

```javascript
/**
 * app.js - Main application entry point
 *
 * Initializes all modules and wires up event handlers
 */

import { initCanvas, getCanvas, resetZoom } from './canvas.js';

// Application state
const state = {
    currentMode: 'place', // 'place' | 'draw' | 'text'
    selectedCategory: 'trees-greenery',
    hintsShown: {}
};

/**
 * Initialize the application
 */
async function init() {
    console.log('ComGarden: Initializing...');

    try {
        // Initialize canvas
        await initCanvas();
        console.log('ComGarden: Canvas initialized');

        // Check for first-time user
        checkFirstTimeUser();

        // Wire up UI events
        setupUIEvents();

        console.log('ComGarden: Ready!');
    } catch (error) {
        console.error('ComGarden: Initialization failed', error);
        showToast('שגיאה בטעינת האפליקציה. נסו לרענן את הדף.');
    }
}

/**
 * Check if first-time user and show onboarding
 */
function checkFirstTimeUser() {
    const hasSeenOnboarding = localStorage.getItem('comgarden-onboarding-seen');

    if (!hasSeenOnboarding) {
        showOnboarding();
    }
}

/**
 * Show the onboarding overlay
 */
function showOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    overlay.classList.remove('hidden');
}

/**
 * Hide the onboarding overlay
 */
function hideOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    overlay.classList.add('hidden');
    localStorage.setItem('comgarden-onboarding-seen', 'true');
}

/**
 * Set up UI event listeners
 */
function setupUIEvents() {
    // Onboarding start button
    document.getElementById('btn-start')?.addEventListener('click', hideOnboarding);

    // Help button - show onboarding again
    document.getElementById('btn-help')?.addEventListener('click', showOnboarding);

    // Undo button
    document.getElementById('btn-undo')?.addEventListener('click', handleUndo);

    // Share button
    document.getElementById('btn-share')?.addEventListener('click', handleShare);

    // Category tabs
    document.querySelectorAll('#category-tabs .tab:not(.tool)').forEach(tab => {
        tab.addEventListener('click', () => handleCategoryChange(tab));
    });

    // Tool tabs (draw, text)
    document.querySelectorAll('#category-tabs .tab.tool').forEach(tab => {
        tab.addEventListener('click', () => handleToolChange(tab));
    });
}

/**
 * Handle category tab change
 */
function handleCategoryChange(tab) {
    // Remove active from all tabs
    document.querySelectorAll('#category-tabs .tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });

    // Activate clicked tab
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    // Update state
    state.currentMode = 'place';
    state.selectedCategory = tab.dataset.category;

    // TODO: Load stickers for this category
    console.log('Category changed:', state.selectedCategory);
}

/**
 * Handle tool tab change (draw/text)
 */
function handleToolChange(tab) {
    const tool = tab.dataset.tool;

    // Toggle if same tool clicked
    if (state.currentMode === tool) {
        // Deactivate - return to place mode
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
        state.currentMode = 'place';
        console.log('Mode changed: place');
        return;
    }

    // Remove active from all tabs
    document.querySelectorAll('#category-tabs .tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });

    // Activate clicked tab
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    // Update state
    state.currentMode = tool;

    // TODO: Enable draw or text mode on canvas
    console.log('Mode changed:', state.currentMode);
}

/**
 * Handle undo button click
 */
function handleUndo() {
    // TODO: Implement undo from history
    console.log('Undo clicked');
    showToast('פעולת ביטול בקרוב...');
}

/**
 * Handle share button click
 */
function handleShare() {
    // TODO: Implement export and share
    console.log('Share clicked');
    showToast('שיתוף בקרוב...');
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {number} duration - Duration in ms (default 3000)
 */
export function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    // Remove after animation
    setTimeout(() => {
        toast.remove();
    }, duration);
}

/**
 * Get current application state
 */
export function getState() {
    return { ...state };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
```

**Step 2: Verify file created**

Run: `ls -la /home/zivben/repos/comgarden/js/`
Expected: Both `app.js` and `canvas.js` present

**Step 3: Commit**

```bash
git add /home/zivben/repos/comgarden/js/app.js
git commit -m "feat: add main app entry point with state management

- Application initialization sequence
- State management (mode, category, hints)
- First-time user detection and onboarding
- UI event wiring for buttons and tabs
- Toast notification system
- Mode switching (place/draw/text)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.5: Add Placeholder Garden Photo

**Files:**
- Create: `/home/zivben/repos/comgarden/assets/garden-photo.jpg` (placeholder)

**Step 1: Create assets directory structure**

```bash
mkdir -p /home/zivben/repos/comgarden/assets/stickers/{trees-greenery,food-growing,structures-paths,water-nature,furniture-amenities}
```

**Step 2: Create a simple placeholder image**

For now, create a placeholder using ImageMagick (or manually add the real photo):

```bash
# If ImageMagick is available:
convert -size 800x600 xc:'#8BC34A' -fill '#4CAF50' -draw "rectangle 100,100 300,200" -draw "rectangle 500,300 700,500" -fill '#795548' -draw "rectangle 350,250 450,350" /home/zivben/repos/comgarden/assets/garden-photo.jpg 2>/dev/null || echo "Add real garden-photo.jpg manually"
```

**Note:** Replace this placeholder with the actual aerial photograph.

**Step 3: Commit (if placeholder created)**

```bash
git add /home/zivben/repos/comgarden/assets/
git commit -m "feat: add assets directory structure

- Create sticker subdirectories by category
- Add placeholder for garden photo (replace with real image)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1.6: Test Phase 1 - Canvas Foundation

**Step 1: Start a local server**

```bash
cd /home/zivben/repos/comgarden && python3 -m http.server 8000
```

**Step 2: Open in browser**

Navigate to: `http://localhost:8000`

**Expected behavior:**
- ✅ Page loads with Hebrew RTL layout
- ✅ Top bar visible with בטל, ?, שיתוף buttons
- ✅ Canvas area shows (green fallback or photo if added)
- ✅ Bottom panel with category tabs visible
- ✅ Onboarding overlay appears on first visit
- ✅ Clicking "יאללה, מתחילים!" dismisses overlay
- ✅ Clicking ? button shows overlay again
- ✅ Pinch-to-zoom works (or mouse wheel on desktop)
- ✅ Double-tap resets zoom

**Step 3: Test on mobile**

- Connect phone to same network
- Navigate to `http://<your-ip>:8000`
- Test touch gestures

**Step 4: Push to GitHub Pages**

```bash
git push origin main
```

**Step 5: Verify live site**

Navigate to: `https://zivba.github.io/comgarden/`
Wait ~60 seconds for deployment.

---

## Phase 2: Sticker System

### Task 2.1: Create Sticker Manifest

**Files:**
- Create: `/home/zivben/repos/comgarden/assets/stickers/manifest.json`

**Step 1: Write the manifest**

```json
{
  "categories": [
    { "id": "trees-greenery", "label": "עצים וצמחייה", "icon": "🌿" },
    { "id": "food-growing", "label": "גידולים", "icon": "🥕" },
    { "id": "structures-paths", "label": "מבנים ושבילים", "icon": "🏗️" },
    { "id": "water-nature", "label": "מים וטבע", "icon": "💧" },
    { "id": "furniture-amenities", "label": "ריהוט ואביזרים", "icon": "🪑" }
  ],
  "stickers": [
    {
      "id": "large-tree",
      "file": "trees-greenery/large-tree.svg",
      "label": "עץ גדול",
      "category": "trees-greenery",
      "defaultScale": 1.0
    },
    {
      "id": "sapling",
      "file": "trees-greenery/sapling.svg",
      "label": "שתיל",
      "category": "trees-greenery",
      "defaultScale": 0.7
    },
    {
      "id": "bush",
      "file": "trees-greenery/bush.svg",
      "label": "שיח",
      "category": "trees-greenery",
      "defaultScale": 0.8
    },
    {
      "id": "flower-bed-rect",
      "file": "trees-greenery/flower-bed-rect.svg",
      "label": "ערוגת פרחים מלבנית",
      "category": "trees-greenery",
      "defaultScale": 1.0
    },
    {
      "id": "flower-bed-circle",
      "file": "trees-greenery/flower-bed-circle.svg",
      "label": "ערוגת פרחים עגולה",
      "category": "trees-greenery",
      "defaultScale": 0.9
    },
    {
      "id": "grass-patch",
      "file": "trees-greenery/grass-patch.svg",
      "label": "משטח דשא",
      "category": "trees-greenery",
      "defaultScale": 1.2
    },
    {
      "id": "raised-bed",
      "file": "food-growing/raised-bed.svg",
      "label": "ערוגה מוגבהת",
      "category": "food-growing",
      "defaultScale": 1.0
    },
    {
      "id": "herb-planter",
      "file": "food-growing/herb-planter.svg",
      "label": "אדנית תבלינים",
      "category": "food-growing",
      "defaultScale": 0.8
    },
    {
      "id": "fruit-tree",
      "file": "food-growing/fruit-tree.svg",
      "label": "עץ פרי",
      "category": "food-growing",
      "defaultScale": 0.9
    },
    {
      "id": "greenhouse",
      "file": "food-growing/greenhouse.svg",
      "label": "חממה",
      "category": "food-growing",
      "defaultScale": 1.2
    },
    {
      "id": "compost-bin",
      "file": "food-growing/compost-bin.svg",
      "label": "פח קומפוסט",
      "category": "food-growing",
      "defaultScale": 0.6
    },
    {
      "id": "pergola",
      "file": "structures-paths/pergola.svg",
      "label": "פרגולה",
      "category": "structures-paths",
      "defaultScale": 1.1
    },
    {
      "id": "gazebo",
      "file": "structures-paths/gazebo.svg",
      "label": "גזיבו",
      "category": "structures-paths",
      "defaultScale": 1.0
    },
    {
      "id": "paved-walkway",
      "file": "structures-paths/paved-walkway.svg",
      "label": "שביל מרוצף",
      "category": "structures-paths",
      "defaultScale": 1.0
    },
    {
      "id": "wooden-deck",
      "file": "structures-paths/wooden-deck.svg",
      "label": "דק עץ",
      "category": "structures-paths",
      "defaultScale": 1.0
    },
    {
      "id": "fence",
      "file": "structures-paths/fence.svg",
      "label": "גדר",
      "category": "structures-paths",
      "defaultScale": 1.0
    },
    {
      "id": "shed",
      "file": "structures-paths/shed.svg",
      "label": "מחסן",
      "category": "structures-paths",
      "defaultScale": 0.9
    },
    {
      "id": "fountain",
      "file": "water-nature/fountain.svg",
      "label": "מזרקה",
      "category": "water-nature",
      "defaultScale": 0.8
    },
    {
      "id": "wading-pool",
      "file": "water-nature/wading-pool.svg",
      "label": "בריכת שכשוך",
      "category": "water-nature",
      "defaultScale": 1.0
    },
    {
      "id": "bird-bath",
      "file": "water-nature/bird-bath.svg",
      "label": "אמבט ציפורים",
      "category": "water-nature",
      "defaultScale": 0.5
    },
    {
      "id": "bird-feeder",
      "file": "water-nature/bird-feeder.svg",
      "label": "מאכיל ציפורים",
      "category": "water-nature",
      "defaultScale": 0.4
    },
    {
      "id": "fire-pit",
      "file": "water-nature/fire-pit.svg",
      "label": "מדורה",
      "category": "water-nature",
      "defaultScale": 0.7
    },
    {
      "id": "bench",
      "file": "furniture-amenities/bench.svg",
      "label": "ספסל",
      "category": "furniture-amenities",
      "defaultScale": 0.7
    },
    {
      "id": "picnic-table",
      "file": "furniture-amenities/picnic-table.svg",
      "label": "שולחן פיקניק",
      "category": "furniture-amenities",
      "defaultScale": 0.9
    },
    {
      "id": "outdoor-kitchen",
      "file": "furniture-amenities/outdoor-kitchen.svg",
      "label": "מטבח חוץ",
      "category": "furniture-amenities",
      "defaultScale": 1.0
    },
    {
      "id": "waste-bin",
      "file": "furniture-amenities/waste-bin.svg",
      "label": "פח אשפה",
      "category": "furniture-amenities",
      "defaultScale": 0.4
    },
    {
      "id": "garden-lamp",
      "file": "furniture-amenities/garden-lamp.svg",
      "label": "מנורת גן",
      "category": "furniture-amenities",
      "defaultScale": 0.5
    },
    {
      "id": "play-equipment",
      "file": "furniture-amenities/play-equipment.svg",
      "label": "מתקן משחק",
      "category": "furniture-amenities",
      "defaultScale": 1.1
    }
  ]
}
```

**Step 2: Commit**

```bash
git add /home/zivben/repos/comgarden/assets/stickers/manifest.json
git commit -m "feat: add sticker manifest with 28 items in 5 categories

- Trees & Greenery: 6 items
- Food & Growing: 5 items
- Structures & Paths: 6 items
- Water & Nature: 5 items
- Furniture & Amenities: 6 items

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.2: Create Sample SVG Stickers (5 items)

**Files:**
- Create: `/home/zivben/repos/comgarden/assets/stickers/trees-greenery/large-tree.svg`
- Create: `/home/zivben/repos/comgarden/assets/stickers/trees-greenery/bush.svg`
- Create: `/home/zivben/repos/comgarden/assets/stickers/food-growing/raised-bed.svg`
- Create: `/home/zivben/repos/comgarden/assets/stickers/furniture-amenities/bench.svg`
- Create: `/home/zivben/repos/comgarden/assets/stickers/water-nature/fountain.svg`

**Step 1: Create large-tree.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <title>עץ גדול</title>
  <!-- Tree canopy - top-down view -->
  <circle cx="30" cy="30" r="28" fill="#2E7D32"/>
  <circle cx="22" cy="22" r="12" fill="#388E3C"/>
  <circle cx="38" cy="24" r="10" fill="#43A047"/>
  <circle cx="26" cy="38" r="11" fill="#388E3C"/>
  <circle cx="38" cy="36" r="9" fill="#43A047"/>
  <!-- Trunk center -->
  <circle cx="30" cy="30" r="4" fill="#5D4037"/>
</svg>
```

**Step 2: Create bush.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 40">
  <title>שיח</title>
  <!-- Bush - top-down oval shape -->
  <ellipse cx="25" cy="20" rx="23" ry="18" fill="#558B2F"/>
  <ellipse cx="18" cy="15" r="8" fill="#689F38"/>
  <ellipse cx="32" cy="16" r="7" fill="#7CB342"/>
  <ellipse cx="25" cy="26" r="9" fill="#689F38"/>
</svg>
```

**Step 3: Create raised-bed.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50">
  <title>ערוגה מוגבהת</title>
  <!-- Wooden frame -->
  <rect x="2" y="2" width="76" height="46" rx="4" fill="#8D6E63" stroke="#5D4037" stroke-width="2"/>
  <!-- Soil -->
  <rect x="6" y="6" width="68" height="38" rx="2" fill="#4E342E"/>
  <!-- Plant rows -->
  <circle cx="20" cy="16" r="4" fill="#81C784"/>
  <circle cx="40" cy="16" r="4" fill="#81C784"/>
  <circle cx="60" cy="16" r="4" fill="#81C784"/>
  <circle cx="20" cy="34" r="4" fill="#81C784"/>
  <circle cx="40" cy="34" r="4" fill="#81C784"/>
  <circle cx="60" cy="34" r="4" fill="#81C784"/>
</svg>
```

**Step 4: Create bench.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30">
  <title>ספסל</title>
  <!-- Bench seat - top-down view -->
  <rect x="2" y="8" width="56" height="14" rx="2" fill="#8D6E63" stroke="#5D4037" stroke-width="2"/>
  <!-- Slats -->
  <line x1="5" y1="10" x2="5" y2="20" stroke="#6D4C41" stroke-width="1"/>
  <line x1="15" y1="10" x2="15" y2="20" stroke="#6D4C41" stroke-width="1"/>
  <line x1="25" y1="10" x2="25" y2="20" stroke="#6D4C41" stroke-width="1"/>
  <line x1="35" y1="10" x2="35" y2="20" stroke="#6D4C41" stroke-width="1"/>
  <line x1="45" y1="10" x2="45" y2="20" stroke="#6D4C41" stroke-width="1"/>
  <line x1="55" y1="10" x2="55" y2="20" stroke="#6D4C41" stroke-width="1"/>
  <!-- Legs (small rectangles visible from top) -->
  <rect x="6" y="3" width="8" height="4" fill="#5D4037"/>
  <rect x="46" y="3" width="8" height="4" fill="#5D4037"/>
  <rect x="6" y="23" width="8" height="4" fill="#5D4037"/>
  <rect x="46" y="23" width="8" height="4" fill="#5D4037"/>
</svg>
```

**Step 5: Create fountain.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
  <title>מזרקה</title>
  <!-- Outer basin -->
  <circle cx="25" cy="25" r="23" fill="#90CAF9" stroke="#64B5F6" stroke-width="2"/>
  <!-- Inner basin -->
  <circle cx="25" cy="25" r="15" fill="#64B5F6" stroke="#42A5F5" stroke-width="2"/>
  <!-- Center spout -->
  <circle cx="25" cy="25" r="6" fill="#757575"/>
  <!-- Water ripples -->
  <circle cx="25" cy="25" r="10" fill="none" stroke="#BBDEFB" stroke-width="1" opacity="0.7"/>
  <circle cx="25" cy="25" r="18" fill="none" stroke="#BBDEFB" stroke-width="1" opacity="0.5"/>
</svg>
```

**Step 6: Commit SVGs**

```bash
git add /home/zivben/repos/comgarden/assets/stickers/
git commit -m "feat: add 5 sample SVG stickers

- large-tree.svg: Green circular tree canopy
- bush.svg: Smaller oval bush
- raised-bed.svg: Rectangular planter with plant rows
- bench.svg: Wooden bench top-down view
- fountain.svg: Circular water fountain

Simple geometric shapes for planning diagram aesthetic

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.3: Create Stickers Module

**Files:**
- Create: `/home/zivben/repos/comgarden/js/stickers.js`

**Step 1: Write the stickers module**

```javascript
/**
 * stickers.js - Sticker loading, display, and placement
 *
 * Exports:
 * - loadManifest(): Load the sticker manifest
 * - displayCategory(categoryId): Show stickers for a category
 * - placeSticker(stickerId): Place a sticker on the canvas
 */

import { getCanvas } from './canvas.js';
import { showToast, getState } from './app.js';

let manifest = null;
const svgCache = new Map();

// Configuration
const CONFIG = {
    manifestPath: 'assets/stickers/manifest.json',
    stickerBasePath: 'assets/stickers/',
    defaultSize: 60 // Base size in pixels
};

/**
 * Load the sticker manifest
 * @returns {Promise<Object>} The manifest data
 */
export async function loadManifest() {
    if (manifest) return manifest;

    try {
        const response = await fetch(CONFIG.manifestPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        manifest = await response.json();
        console.log(`Loaded manifest: ${manifest.stickers.length} stickers in ${manifest.categories.length} categories`);
        return manifest;
    } catch (error) {
        console.error('Failed to load sticker manifest:', error);
        showToast('שגיאה בטעינת המדבקות');
        throw error;
    }
}

/**
 * Get stickers for a specific category
 * @param {string} categoryId
 * @returns {Array} Stickers in the category
 */
export function getStickersForCategory(categoryId) {
    if (!manifest) return [];
    return manifest.stickers.filter(s => s.category === categoryId);
}

/**
 * Display stickers for a category in the sticker strip
 * @param {string} categoryId
 */
export async function displayCategory(categoryId) {
    const strip = document.getElementById('sticker-strip');
    if (!strip) return;

    // Clear current stickers
    strip.innerHTML = '';

    // Get stickers for this category
    const stickers = getStickersForCategory(categoryId);

    if (stickers.length === 0) {
        strip.innerHTML = '<div class="sticker-empty">אין מדבקות בקטגוריה זו</div>';
        return;
    }

    // Create sticker items
    for (const sticker of stickers) {
        const item = document.createElement('div');
        item.className = 'sticker-item';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-label', sticker.label);
        item.dataset.stickerId = sticker.id;

        // Load and display SVG
        try {
            const svgContent = await loadSVG(sticker.file);
            item.innerHTML = svgContent;
        } catch (error) {
            // Fallback to placeholder
            item.innerHTML = `<span style="font-size: 24px;">📍</span>`;
            item.setAttribute('title', `${sticker.label} (לא נטען)`);
        }

        // Click to place sticker
        item.addEventListener('click', () => placeSticker(sticker));

        // Long press for tooltip
        let pressTimer;
        item.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
                showToast(sticker.label, 1500);
            }, 500);
        });
        item.addEventListener('touchend', () => clearTimeout(pressTimer));
        item.addEventListener('touchmove', () => clearTimeout(pressTimer));

        strip.appendChild(item);
    }
}

/**
 * Load an SVG file (with caching)
 * @param {string} filePath - Relative path from stickers folder
 * @returns {Promise<string>} SVG content
 */
async function loadSVG(filePath) {
    const fullPath = CONFIG.stickerBasePath + filePath;

    // Check cache
    if (svgCache.has(fullPath)) {
        return svgCache.get(fullPath);
    }

    const response = await fetch(fullPath);
    if (!response.ok) throw new Error(`Failed to load ${fullPath}`);

    const svgContent = await response.text();
    svgCache.set(fullPath, svgContent);

    return svgContent;
}

/**
 * Place a sticker on the canvas
 * @param {Object} sticker - Sticker object from manifest
 */
export async function placeSticker(sticker) {
    const canvas = getCanvas();
    if (!canvas) {
        console.error('Canvas not initialized');
        return;
    }

    try {
        const svgContent = await loadSVG(sticker.file);

        fabric.loadSVGFromString(svgContent, (objects, options) => {
            const svgGroup = fabric.util.groupSVGElements(objects, options);

            // Calculate size
            const scale = (CONFIG.defaultSize / Math.max(svgGroup.width, svgGroup.height)) * sticker.defaultScale;

            // Position at canvas center
            const centerX = canvas.getWidth() / 2;
            const centerY = canvas.getHeight() / 2;

            svgGroup.set({
                left: centerX,
                top: centerY,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                // Enable controls
                hasControls: true,
                hasBorders: true,
                lockUniScaling: false,
                // Custom data
                stickerId: sticker.id,
                stickerLabel: sticker.label
            });

            canvas.add(svgGroup);
            canvas.setActiveObject(svgGroup);
            canvas.renderAll();

            // Show first-time hint
            showFirstPlaceHint();

            console.log(`Placed sticker: ${sticker.label}`);
        });
    } catch (error) {
        console.error('Failed to place sticker:', error);
        showToast('שגיאה בהנחת המדבקה');
    }
}

/**
 * Show hint after first sticker placement
 */
let firstPlaceHintShown = false;
function showFirstPlaceHint() {
    if (firstPlaceHintShown) return;

    const hintShown = localStorage.getItem('comgarden-hint-firstplace');
    if (hintShown) {
        firstPlaceHintShown = true;
        return;
    }

    showToast('גררו לשנות מיקום • צבטו לשנות גודל', 4000);
    localStorage.setItem('comgarden-hint-firstplace', 'true');
    firstPlaceHintShown = true;
}

/**
 * Get the manifest (for external access)
 */
export function getManifest() {
    return manifest;
}
```

**Step 2: Commit**

```bash
git add /home/zivben/repos/comgarden/js/stickers.js
git commit -m "feat: add stickers module with loading and placement

- Load sticker manifest from JSON
- SVG caching for performance
- Display stickers in category strip
- Place sticker on canvas center
- Long-press tooltip for sticker labels
- First-placement hint system

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.4: Wire Up Stickers in App.js

**Files:**
- Modify: `/home/zivben/repos/comgarden/js/app.js`

**Step 1: Update app.js with sticker integration**

Add imports at top:

```javascript
import { loadManifest, displayCategory } from './stickers.js';
```

Update `init()` function to load manifest:

```javascript
async function init() {
    console.log('ComGarden: Initializing...');

    try {
        // Initialize canvas
        await initCanvas();
        console.log('ComGarden: Canvas initialized');

        // Load sticker manifest
        await loadManifest();
        console.log('ComGarden: Stickers loaded');

        // Display initial category
        await displayCategory(state.selectedCategory);

        // Check for first-time user
        checkFirstTimeUser();

        // Wire up UI events
        setupUIEvents();

        console.log('ComGarden: Ready!');
    } catch (error) {
        console.error('ComGarden: Initialization failed', error);
        showToast('שגיאה בטעינת האפליקציה. נסו לרענן את הדף.');
    }
}
```

Update `handleCategoryChange()`:

```javascript
async function handleCategoryChange(tab) {
    // Remove active from all tabs
    document.querySelectorAll('#category-tabs .tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });

    // Activate clicked tab
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    // Update state
    state.currentMode = 'place';
    state.selectedCategory = tab.dataset.category;

    // Load stickers for this category
    await displayCategory(state.selectedCategory);
    console.log('Category changed:', state.selectedCategory);
}
```

**Step 2: Commit**

```bash
git add /home/zivben/repos/comgarden/js/app.js
git commit -m "feat: integrate stickers module with app initialization

- Load manifest on startup
- Display initial category stickers
- Update category display on tab change

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.5: Test Phase 2 - Sticker System

**Step 1: Start local server**

```bash
cd /home/zivben/repos/comgarden && python3 -m http.server 8000
```

**Step 2: Test in browser**

Navigate to: `http://localhost:8000`

**Expected behavior:**
- ✅ Stickers appear in the bottom strip
- ✅ Clicking a sticker places it on canvas center
- ✅ Placed sticker can be dragged
- ✅ Placed sticker can be rotated (two-finger or corner handle)
- ✅ Placed sticker can be scaled (corner handles)
- ✅ First placement shows hint toast
- ✅ Category tabs switch sticker display
- ✅ Long-press on sticker shows label toast

**Step 3: Push to GitHub Pages**

```bash
git push origin main
```

---

## Phase 3: Full Sticker Library

### Task 3.1: Create Remaining SVG Stickers

**Files:** Create all remaining 23 SVG files in their respective category folders.

*[This task involves creating 23 more SVG files following the same geometric style. For brevity, I'll provide a few examples and note that the rest follow the same pattern.]*

**Example: sapling.svg**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <title>שתיל</title>
  <circle cx="20" cy="20" r="16" fill="#66BB6A"/>
  <circle cx="15" cy="16" r="6" fill="#81C784"/>
  <circle cx="25" cy="18" r="5" fill="#A5D6A7"/>
  <circle cx="20" cy="20" r="3" fill="#5D4037"/>
</svg>
```

**Example: gazebo.svg**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70">
  <title>גזיבו</title>
  <!-- Hexagonal roof -->
  <polygon points="35,5 60,20 60,50 35,65 10,50 10,20" fill="#8D6E63" stroke="#5D4037" stroke-width="2"/>
  <!-- Inner floor -->
  <polygon points="35,15 50,25 50,45 35,55 20,45 20,25" fill="#D7CCC8"/>
  <!-- Support posts -->
  <circle cx="20" cy="25" r="3" fill="#5D4037"/>
  <circle cx="50" cy="25" r="3" fill="#5D4037"/>
  <circle cx="20" cy="45" r="3" fill="#5D4037"/>
  <circle cx="50" cy="45" r="3" fill="#5D4037"/>
</svg>
```

**Step: Commit all SVGs**

```bash
git add /home/zivben/repos/comgarden/assets/stickers/
git commit -m "feat: add complete sticker library (28 items)

Trees & Greenery: large-tree, sapling, bush, flower-bed-rect,
  flower-bed-circle, grass-patch
Food & Growing: raised-bed, herb-planter, fruit-tree, greenhouse, compost-bin
Structures & Paths: pergola, gazebo, paved-walkway, wooden-deck, fence, shed
Water & Nature: fountain, wading-pool, bird-bath, bird-feeder, fire-pit
Furniture & Amenities: bench, picnic-table, outdoor-kitchen, waste-bin,
  garden-lamp, play-equipment

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Drawing & Text

### Task 4.1: Create Tools Module

**Files:**
- Create: `/home/zivben/repos/comgarden/js/tools.js`

**Step 1: Write the tools module**

```javascript
/**
 * tools.js - Drawing mode, text mode, and undo system
 *
 * Exports:
 * - enableDrawMode(): Enable freehand drawing
 * - disableDrawMode(): Disable drawing mode
 * - enableTextMode(): Enable text placement
 * - disableTextMode(): Disable text mode
 * - saveToHistory(): Save current canvas state
 * - undo(): Restore previous state
 */

import { getCanvas } from './canvas.js';
import { showToast } from './app.js';

// History for undo
const history = [];
const MAX_HISTORY = 20;

// Drawing colors
const DRAW_COLORS = ['#000000', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#FFFFFF'];
let currentDrawColor = DRAW_COLORS[0];

/**
 * Enable freehand drawing mode
 */
export function enableDrawMode() {
    const canvas = getCanvas();
    if (!canvas) return;

    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.width = 3;
    canvas.freeDrawingBrush.color = currentDrawColor;

    // Deselect any object
    canvas.discardActiveObject();
    canvas.renderAll();

    // Show color picker
    showColorPicker();

    console.log('Draw mode enabled');
}

/**
 * Disable freehand drawing mode
 */
export function disableDrawMode() {
    const canvas = getCanvas();
    if (!canvas) return;

    canvas.isDrawingMode = false;
    hideColorPicker();

    console.log('Draw mode disabled');
}

/**
 * Enable text placement mode
 */
export function enableTextMode() {
    const canvas = getCanvas();
    if (!canvas) return;

    // Add click listener for text placement
    canvas.on('mouse:down', handleTextPlacement);

    // Change cursor
    canvas.defaultCursor = 'text';

    // Deselect any object
    canvas.discardActiveObject();
    canvas.renderAll();

    showToast('הקש על הקנבס להוספת טקסט');
    console.log('Text mode enabled');
}

/**
 * Disable text placement mode
 */
export function disableTextMode() {
    const canvas = getCanvas();
    if (!canvas) return;

    canvas.off('mouse:down', handleTextPlacement);
    canvas.defaultCursor = 'default';

    console.log('Text mode disabled');
}

/**
 * Handle text placement on canvas click
 */
function handleTextPlacement(opt) {
    const canvas = getCanvas();

    // Only place if clicking on empty space
    if (opt.target) return;

    const pointer = canvas.getPointer(opt.e);

    const text = new fabric.IText('הקלידו כאן...', {
        left: pointer.x,
        top: pointer.y,
        fontFamily: 'Arial, sans-serif',
        fontSize: 20,
        fill: '#000000',
        textAlign: 'right',
        direction: 'rtl',
        originX: 'center',
        originY: 'center'
    });

    canvas.add(text);
    canvas.setActiveObject(text);

    // Enter editing mode
    text.enterEditing();
    text.selectAll();

    // Save to history when editing ends
    text.on('editing:exited', () => {
        if (text.text === 'הקלידו כאן...' || text.text.trim() === '') {
            canvas.remove(text);
        } else {
            saveToHistory();
        }
    });

    canvas.renderAll();

    // Disable text mode after placing
    disableTextMode();
}

/**
 * Show color picker for drawing
 */
function showColorPicker() {
    let picker = document.getElementById('color-picker');

    if (!picker) {
        // Create color picker
        picker = document.createElement('div');
        picker.id = 'color-picker';
        picker.className = 'visible';

        DRAW_COLORS.forEach((color, index) => {
            const option = document.createElement('button');
            option.className = 'color-option' + (index === 0 ? ' active' : '');
            option.style.backgroundColor = color;
            option.style.border = color === '#FFFFFF' ? '1px solid #ccc' : 'none';
            option.addEventListener('click', () => selectDrawColor(color, option));
            picker.appendChild(option);
        });

        document.body.appendChild(picker);
    } else {
        picker.classList.add('visible');
    }
}

/**
 * Hide color picker
 */
function hideColorPicker() {
    const picker = document.getElementById('color-picker');
    if (picker) {
        picker.classList.remove('visible');
    }
}

/**
 * Select a drawing color
 */
function selectDrawColor(color, button) {
    const canvas = getCanvas();
    currentDrawColor = color;

    if (canvas && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = color;
    }

    // Update active state
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('active');
    });
    button.classList.add('active');
}

/**
 * Save current canvas state to history
 */
export function saveToHistory() {
    const canvas = getCanvas();
    if (!canvas) return;

    const state = JSON.stringify(canvas.toJSON(['stickerId', 'stickerLabel']));

    history.push(state);

    // Limit history size
    if (history.length > MAX_HISTORY) {
        history.shift();
    }

    console.log(`History saved (${history.length}/${MAX_HISTORY})`);
}

/**
 * Undo the last action
 */
export function undo() {
    const canvas = getCanvas();
    if (!canvas) return;

    if (history.length === 0) {
        showToast('אין פעולות לביטול');
        return;
    }

    const previousState = history.pop();

    canvas.loadFromJSON(previousState, () => {
        canvas.renderAll();
        console.log(`Undo applied (${history.length} remaining)`);
    });
}

/**
 * Set up history saving on canvas events
 */
export function setupHistorySaving() {
    const canvas = getCanvas();
    if (!canvas) return;

    // Save after object modifications
    canvas.on('object:added', saveToHistory);
    canvas.on('object:modified', saveToHistory);
    canvas.on('object:removed', saveToHistory);
    canvas.on('path:created', saveToHistory); // For drawing
}

/**
 * Get current history length (for UI feedback)
 */
export function getHistoryLength() {
    return history.length;
}
```

**Step 2: Commit**

```bash
git add /home/zivben/repos/comgarden/js/tools.js
git commit -m "feat: add tools module with drawing, text, and undo

- Freehand drawing mode with color picker
- Text placement mode with RTL Hebrew support
- Undo system with max 20 history states
- Canvas event hooks for auto-history

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4.2: Integrate Tools in App.js

**Files:**
- Modify: `/home/zivben/repos/comgarden/js/app.js`

**Step 1: Add imports**

```javascript
import { enableDrawMode, disableDrawMode, enableTextMode, disableTextMode, undo, setupHistorySaving } from './tools.js';
```

**Step 2: Update init() to setup history**

After canvas init, add:
```javascript
// Set up history saving
setupHistorySaving();
```

**Step 3: Update handleToolChange()**

```javascript
function handleToolChange(tab) {
    const tool = tab.dataset.tool;

    // Disable current mode
    if (state.currentMode === 'draw') {
        disableDrawMode();
    } else if (state.currentMode === 'text') {
        disableTextMode();
    }

    // Toggle if same tool clicked
    if (state.currentMode === tool) {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
        state.currentMode = 'place';
        return;
    }

    // Remove active from all tabs
    document.querySelectorAll('#category-tabs .tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
    });

    // Activate clicked tab
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    // Enable new mode
    state.currentMode = tool;

    if (tool === 'draw') {
        enableDrawMode();
    } else if (tool === 'text') {
        enableTextMode();
    }
}
```

**Step 4: Update handleUndo()**

```javascript
function handleUndo() {
    undo();
}
```

**Step 5: Commit**

```bash
git add /home/zivben/repos/comgarden/js/app.js
git commit -m "feat: integrate drawing, text, and undo tools

- Wire up draw/text mode toggle
- Implement undo button functionality
- Set up auto-history on canvas changes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Persistence

### Task 5.1: Add LocalStorage Persistence

**Files:**
- Modify: `/home/zivben/repos/comgarden/js/canvas.js`

**Step 1: Add persistence functions**

Add at the end of canvas.js:

```javascript
// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Save canvas state to localStorage
 */
const saveState = debounce(() => {
    if (!canvas) return;

    try {
        const state = JSON.stringify(canvas.toJSON(['stickerId', 'stickerLabel']));
        localStorage.setItem('comgarden-canvas-state', state);
        console.log('Canvas state saved');
    } catch (error) {
        console.warn('Failed to save canvas state:', error);
    }
}, 500);

/**
 * Restore canvas state from localStorage
 */
export async function restoreState() {
    if (!canvas) return false;

    try {
        const saved = localStorage.getItem('comgarden-canvas-state');
        if (!saved) return false;

        const state = JSON.parse(saved);

        return new Promise((resolve) => {
            canvas.loadFromJSON(state, () => {
                canvas.renderAll();
                console.log('Canvas state restored');
                resolve(true);
            });
        });
    } catch (error) {
        console.warn('Failed to restore canvas state:', error);
        localStorage.removeItem('comgarden-canvas-state');
        return false;
    }
}

/**
 * Clear saved state
 */
export function clearSavedState() {
    localStorage.removeItem('comgarden-canvas-state');
    console.log('Saved state cleared');
}

/**
 * Set up auto-save on canvas changes
 */
export function setupAutoSave() {
    if (!canvas) return;

    canvas.on('object:added', saveState);
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);
    canvas.on('path:created', saveState);
}
```

**Step 2: Update initCanvas() to call setupAutoSave**

At end of initCanvas(), before return:
```javascript
// Set up auto-save
setupAutoSave();
```

**Step 3: Commit**

```bash
git add /home/zivben/repos/comgarden/js/canvas.js
git commit -m "feat: add localStorage persistence for canvas state

- Auto-save on canvas changes (debounced 500ms)
- Restore state on app load
- Clear state function for reset
- Error handling with fallback

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5.2: Integrate Persistence in App.js

**Files:**
- Modify: `/home/zivben/repos/comgarden/js/app.js`

**Step 1: Add import**

```javascript
import { initCanvas, getCanvas, resetZoom, restoreState, clearSavedState } from './canvas.js';
```

**Step 2: Update init() to restore state**

After canvas init:
```javascript
// Try to restore previous session
const restored = await restoreState();
if (restored) {
    showToast('משחזר את העבודה הקודמת...', 2000);
}
```

**Step 3: Add reset functionality in help menu**

*This will be implemented in the onboarding/help system later.*

**Step 4: Commit**

```bash
git add /home/zivben/repos/comgarden/js/app.js
git commit -m "feat: integrate canvas state restoration on load

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: Export & Share

### Task 6.1: Create Share Module

**Files:**
- Create: `/home/zivben/repos/comgarden/js/share.js`

**Step 1: Write the share module**

```javascript
/**
 * share.js - Export canvas to JPEG and share via Web Share API
 *
 * Exports:
 * - exportAndShare(): Export canvas and open share sheet
 */

import { getCanvas } from './canvas.js';
import { showToast } from './app.js';

const CONFIG = {
    exportQuality: 0.9,
    exportFilename: 'גן-קהילתי-החזון-שלי.jpg',
    exportMimeType: 'image/jpeg'
};

/**
 * Export the canvas to JPEG and trigger share/download
 */
export async function exportAndShare() {
    const canvas = getCanvas();
    if (!canvas) {
        showToast('שגיאה: הקנבס לא זמין');
        return;
    }

    showToast('מכין את התמונה לשיתוף...');

    try {
        // Export canvas to data URL
        const dataURL = canvas.toDataURL({
            format: 'jpeg',
            quality: CONFIG.exportQuality,
            multiplier: 2 // Higher resolution for sharing
        });

        // Convert to blob
        const blob = await dataURLToBlob(dataURL);

        // Try Web Share API first (mobile)
        if (navigator.share && navigator.canShare) {
            await shareWithWebAPI(blob);
        } else {
            // Fallback to download
            downloadImage(dataURL);
        }
    } catch (error) {
        console.error('Export failed:', error);
        showToast('שגיאה בייצוא התמונה. נסו שוב.');
    }
}

/**
 * Share using Web Share API
 */
async function shareWithWebAPI(blob) {
    const file = new File([blob], CONFIG.exportFilename, { type: CONFIG.exportMimeType });

    const shareData = {
        files: [file],
        title: 'החזון שלי לגן הקהילתי',
        text: 'הנה החזון שלי לגן הקהילתי שלנו! 🌱'
    };

    if (!navigator.canShare(shareData)) {
        // Fallback if files not supported
        downloadImage(URL.createObjectURL(blob));
        return;
    }

    try {
        await navigator.share(shareData);
        showToast('שותף בהצלחה! 🎉');
    } catch (error) {
        if (error.name === 'AbortError') {
            // User cancelled - do nothing
            console.log('Share cancelled by user');
        } else {
            throw error;
        }
    }
}

/**
 * Download image as fallback
 */
function downloadImage(dataURL) {
    const link = document.createElement('a');
    link.download = CONFIG.exportFilename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('התמונה הורדה למכשיר');
}

/**
 * Convert data URL to Blob
 */
async function dataURLToBlob(dataURL) {
    const response = await fetch(dataURL);
    return response.blob();
}

/**
 * Check if sharing is supported
 */
export function isSharingSupported() {
    return !!(navigator.share && navigator.canShare);
}
```

**Step 2: Commit**

```bash
git add /home/zivben/repos/comgarden/js/share.js
git commit -m "feat: add share module with Web Share API and download fallback

- Export canvas to high-res JPEG
- Native share sheet on mobile (Web Share API)
- Download fallback for desktop
- Hebrew filename support

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6.2: Integrate Share in App.js

**Files:**
- Modify: `/home/zivben/repos/comgarden/js/app.js`

**Step 1: Add import**

```javascript
import { exportAndShare } from './share.js';
```

**Step 2: Update handleShare()**

```javascript
async function handleShare() {
    await exportAndShare();
}
```

**Step 3: Add beforeunload warning**

Add at end of setupUIEvents():

```javascript
// Warn before leaving if canvas has objects
window.addEventListener('beforeunload', (e) => {
    const canvas = getCanvas();
    if (canvas && canvas.getObjects().length > 0) {
        e.preventDefault();
        e.returnValue = 'יש לכם עבודה שלא שותפה. לצאת בכל זאת?';
        return e.returnValue;
    }
});
```

**Step 4: Commit**

```bash
git add /home/zivben/repos/comgarden/js/app.js
git commit -m "feat: integrate share functionality and exit warning

- Wire up share button to export and share
- Add beforeunload warning for unsaved work

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 7: Onboarding & Hints

### Task 7.1: Enhance Onboarding System

**Files:**
- Modify: `/home/zivben/repos/comgarden/js/app.js`
- Modify: `/home/zivben/repos/comgarden/index.html`

*[Add help menu with reset option, enhance onboarding overlay, add contextual hints system]*

---

## Phase 8: Polish

### Task 8.1: Add Error Boundaries

### Task 8.2: Performance Optimization

### Task 8.3: Final Testing Checklist

**Manual test checklist:**

- [ ] First load shows onboarding
- [ ] Dismissing onboarding saves preference
- [ ] Help button shows onboarding again
- [ ] All 5 category tabs work
- [ ] All stickers load and display
- [ ] Tapping sticker places it on canvas
- [ ] Placed stickers can be dragged
- [ ] Placed stickers can be rotated
- [ ] Placed stickers can be scaled
- [ ] Draw mode enables freehand drawing
- [ ] Color picker works
- [ ] Text mode allows text placement
- [ ] Hebrew text displays correctly (RTL)
- [ ] Undo removes last action
- [ ] Canvas state persists across refresh
- [ ] Share exports JPEG correctly
- [ ] Share sheet opens on mobile
- [ ] Download works on desktop
- [ ] Pinch-to-zoom works smoothly
- [ ] Double-tap resets zoom
- [ ] Exit warning appears with unsaved work
- [ ] Reset clears everything

---

## Final Push

```bash
git push origin main
```

**Live URL:** https://zivba.github.io/comgarden/

---

**Plan complete and saved to `docs/plans/2025-02-04-comgarden-implementation-plan.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session in worktree with executing-plans, batch execution with checkpoints

**Which approach?**
