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
