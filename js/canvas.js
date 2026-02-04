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
    let isDraggingObject = false;

    // Track when we're dragging an object vs panning
    canvas.on('mouse:down', (opt) => {
        isDraggingObject = !!opt.target;
    });

    canvas.on('mouse:up', () => {
        isPinching = false;
        lastPinchDistance = 0;
        lastPanPoint = null;
        isDraggingObject = false;
    });

    // Handle touch events directly on the canvas upper element for better mobile support
    const upperCanvas = canvas.upperCanvasEl;

    upperCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            e.preventDefault();
        }
    }, { passive: false });

    upperCanvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
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

                // Get canvas bounding rect for proper coordinate calculation
                const rect = upperCanvas.getBoundingClientRect();
                const centerX = ((touch1.clientX + touch2.clientX) / 2) - rect.left;
                const centerY = ((touch1.clientY + touch2.clientY) / 2) - rect.top;

                canvas.zoomToPoint({ x: centerX, y: centerY }, newZoom);
            }

            lastPinchDistance = distance;
            e.preventDefault();
        } else if (e.touches.length === 1 && !isDraggingObject && !isPinching) {
            // Single finger pan (only when not dragging an object)
            const touch = e.touches[0];
            const rect = upperCanvas.getBoundingClientRect();
            const point = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

            if (lastPanPoint) {
                const vpt = canvas.viewportTransform;
                vpt[4] += point.x - lastPanPoint.x;
                vpt[5] += point.y - lastPanPoint.y;
                canvas.setViewportTransform(vpt);
                canvas.requestRenderAll();
            }

            lastPanPoint = point;
            e.preventDefault();
        }
    }, { passive: false });

    upperCanvas.addEventListener('touchend', () => {
        isPinching = false;
        lastPinchDistance = 0;
        lastPanPoint = null;
    });

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

    // Desktop panning with middle mouse or shift+drag
    let isDesktopPanning = false;
    let desktopPanStart = null;

    canvas.on('mouse:down', (opt) => {
        // Middle mouse button (button 1) or shift+click for panning
        if (opt.e.button === 1 || (opt.e.shiftKey && !opt.target)) {
            isDesktopPanning = true;
            desktopPanStart = { x: opt.e.clientX, y: opt.e.clientY };
            canvas.selection = false;
            opt.e.preventDefault();
        }
    });

    canvas.on('mouse:move', (opt) => {
        if (isDesktopPanning && desktopPanStart) {
            const vpt = canvas.viewportTransform;
            vpt[4] += opt.e.clientX - desktopPanStart.x;
            vpt[5] += opt.e.clientY - desktopPanStart.y;
            canvas.setViewportTransform(vpt);
            desktopPanStart = { x: opt.e.clientX, y: opt.e.clientY };
        }
    });

    canvas.on('mouse:up', () => {
        isDesktopPanning = false;
        desktopPanStart = null;
        canvas.selection = true;
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
