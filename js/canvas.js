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
        selection: false,  // Disable group selection rectangle
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
    let isPanning = false;
    let lastPanPoint = null;

    // Mouse wheel zoom for desktop
    canvas.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        zoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, zoom));

        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    // Desktop: Pan when clicking on empty space, shift+drag, or middle mouse
    canvas.on('mouse:down', (opt) => {
        const e = opt.e;
        // Pan if: no target clicked, OR shift key held, OR middle mouse button
        if (!opt.target || e.shiftKey || e.button === 1) {
            isPanning = true;
            lastPanPoint = { x: e.clientX, y: e.clientY };
            canvas.setCursor('grabbing');
        }
    });

    canvas.on('mouse:move', (opt) => {
        if (isPanning && lastPanPoint) {
            const e = opt.e;
            // Create a copy of the viewport transform to avoid issues
            const vpt = canvas.viewportTransform.slice();
            vpt[4] += e.clientX - lastPanPoint.x;
            vpt[5] += e.clientY - lastPanPoint.y;
            canvas.setViewportTransform(vpt);
            canvas.requestRenderAll();
            lastPanPoint = { x: e.clientX, y: e.clientY };
        }
    });

    canvas.on('mouse:up', () => {
        isPanning = false;
        lastPanPoint = null;
        canvas.setCursor('default');
    });

    // Mobile touch handling - use Fabric events to not interfere with object manipulation
    let touchStartTarget = null;
    let mobilePanStartPoint = null;

    canvas.on('mouse:down', (opt) => {
        // Track if we started on an object (for mobile)
        touchStartTarget = opt.target;
    });

    // For pinch zoom and mobile pan, we need direct touch events
    const upperCanvas = canvas.upperCanvasEl;

    upperCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            lastPinchDistance = 0;
        } else if (e.touches.length === 1) {
            // Store the starting point for potential pan
            const touch = e.touches[0];
            mobilePanStartPoint = { x: touch.clientX, y: touch.clientY };
        }
    }, { passive: true });

    upperCanvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            // Pinch zoom
            isPinching = true;
            isPanning = false;

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
                newZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, newZoom));

                const rect = upperCanvas.getBoundingClientRect();
                const centerX = ((touch1.clientX + touch2.clientX) / 2) - rect.left;
                const centerY = ((touch1.clientY + touch2.clientY) / 2) - rect.top;

                canvas.zoomToPoint({ x: centerX, y: centerY }, newZoom);
            }

            lastPinchDistance = distance;
            e.preventDefault();
        } else if (e.touches.length === 1 && !touchStartTarget && !isPinching && mobilePanStartPoint) {
            // Single finger pan - only if we didn't start on an object
            const touch = e.touches[0];
            const currentPoint = { x: touch.clientX, y: touch.clientY };

            // Calculate delta from the last known point (or start point)
            const refPoint = lastPanPoint || mobilePanStartPoint;
            const deltaX = currentPoint.x - refPoint.x;
            const deltaY = currentPoint.y - refPoint.y;

            // Only pan if we have valid deltas
            if (isFinite(deltaX) && isFinite(deltaY)) {
                // Create a copy of the viewport transform
                const vpt = canvas.viewportTransform.slice();
                vpt[4] += deltaX;
                vpt[5] += deltaY;
                canvas.setViewportTransform(vpt);
                canvas.requestRenderAll();
            }

            lastPanPoint = currentPoint;
            isPanning = true;
            e.preventDefault();
        }
    }, { passive: false });

    upperCanvas.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            isPinching = false;
            isPanning = false;
            lastPinchDistance = 0;
            lastPanPoint = null;
            touchStartTarget = null;
            mobilePanStartPoint = null;
        } else if (e.touches.length === 1) {
            isPinching = false;
            lastPinchDistance = 0;
        }
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
