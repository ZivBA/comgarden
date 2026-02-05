/**
 * canvas.js - Fabric.js canvas setup with zoom/pan and background image
 *
 * Exports:
 * - initCanvas(): Initialize the canvas with garden photo background
 * - getCanvas(): Get the Fabric.js canvas instance
 * - resetZoom(): Reset zoom to fit the image
 * - restoreState(): Restore canvas state from localStorage
 * - clearSavedState(): Clear saved state from localStorage
 * - hasSavedState(): Check if there is a saved state
 * - setupAutoSave(): Enable auto-save on canvas changes
 */

let canvas = null;
let gardenImage = null;
let saveTimeout = null;

// Configuration
const CONFIG = {
    minZoom: 0.5,
    maxZoom: 3,
    gardenPhotoPath: 'assets/garden-photo.jpg',
    fallbackColor: '#8BC34A', // Green fallback if image fails
    storageKey: 'comgarden_canvas_state',
    autoSaveDelay: 1000 // ms debounce delay
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

    // Handle tap-to-toggle controls on objects
    setupTapToToggleControls();

    // Expose canvas for e2e tests
    if (typeof window !== 'undefined') {
        window.fabricCanvas = canvas;
    }

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
    let isTouchActive = false;  // Flag to prevent desktop handlers from running on touch

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

    // Desktop-only: Pan when clicking on empty space, shift+drag, or middle mouse
    canvas.on('mouse:down', (opt) => {
        // Skip if this is a touch event (handled by touch handlers below)
        if (isTouchActive) return;

        const e = opt.e;
        // Pan if: no target clicked, OR shift key held, OR middle mouse button
        if (!opt.target || e.shiftKey || e.button === 1) {
            isPanning = true;
            lastPanPoint = { x: e.clientX, y: e.clientY };
            canvas.setCursor('grabbing');
        }
    });

    canvas.on('mouse:move', (opt) => {
        // Skip if this is a touch event
        if (isTouchActive) return;

        if (isPanning && lastPanPoint) {
            const e = opt.e;
            const vpt = canvas.viewportTransform.slice();
            vpt[4] += e.clientX - lastPanPoint.x;
            vpt[5] += e.clientY - lastPanPoint.y;
            canvas.setViewportTransform(vpt);
            canvas.requestRenderAll();
            lastPanPoint = { x: e.clientX, y: e.clientY };
        }
    });

    canvas.on('mouse:up', () => {
        // Only reset desktop pan state if not touch
        if (!isTouchActive) {
            isPanning = false;
            lastPanPoint = null;
            canvas.setCursor('default');
        }
    });

    // Mobile touch handling
    let touchStartTarget = null;
    let mobilePanStartPoint = null;
    const upperCanvas = canvas.upperCanvasEl;

    upperCanvas.addEventListener('touchstart', (e) => {
        isTouchActive = true;  // Mark that we're handling touch

        // Skip gesture handling when in drawing mode - let Fabric handle it
        if (canvas.isDrawingMode) {
            return;
        }

        // Check if we're touching an object using Fabric's method
        const rect = upperCanvas.getBoundingClientRect();
        const touch = e.touches[0];
        const pointer = canvas.getPointer({
            clientX: touch.clientX,
            clientY: touch.clientY
        }, true);
        touchStartTarget = canvas.findTarget({
            clientX: touch.clientX,
            clientY: touch.clientY,
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top
        });

        if (e.touches.length === 2) {
            isPinching = true;
            lastPinchDistance = 0;
        } else if (e.touches.length === 1) {
            mobilePanStartPoint = { x: touch.clientX, y: touch.clientY };
            lastPanPoint = null;  // Reset for fresh pan
        }
    }, { passive: true });

    upperCanvas.addEventListener('touchmove', (e) => {
        // Skip gesture handling when in drawing mode - let Fabric handle it
        if (canvas.isDrawingMode) {
            return;
        }

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

            // Use mobilePanStartPoint for first move, then lastPanPoint
            const refPoint = lastPanPoint || mobilePanStartPoint;
            const deltaX = currentPoint.x - refPoint.x;
            const deltaY = currentPoint.y - refPoint.y;

            if (isFinite(deltaX) && isFinite(deltaY) && (Math.abs(deltaX) < 1000 && Math.abs(deltaY) < 1000)) {
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
            // All fingers lifted - reset everything
            isPinching = false;
            isPanning = false;
            lastPinchDistance = 0;
            lastPanPoint = null;
            touchStartTarget = null;
            mobilePanStartPoint = null;
            // Delay resetting isTouchActive to prevent mouse events from firing
            setTimeout(() => { isTouchActive = false; }, 100);
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
 * Set up tap-to-toggle controls on objects
 * Tap an object to select it and show controls
 * Tap again or tap elsewhere to deselect and hide controls
 */
function setupTapToToggleControls() {
    // When an object is selected, show its controls
    canvas.on('selection:created', (opt) => {
        const obj = opt.selected?.[0];
        if (obj) {
            obj.set({
                hasControls: true,
                hasBorders: true
            });
            canvas.renderAll();
        }
    });

    // When selection changes to a different object
    canvas.on('selection:updated', (opt) => {
        // Hide controls on deselected objects
        opt.deselected?.forEach(obj => {
            obj.set({
                hasControls: false,
                hasBorders: false
            });
        });
        // Show controls on newly selected object
        const obj = opt.selected?.[0];
        if (obj) {
            obj.set({
                hasControls: true,
                hasBorders: true
            });
        }
        canvas.renderAll();
    });

    // When selection is cleared, hide controls on all objects
    canvas.on('selection:cleared', (opt) => {
        opt.deselected?.forEach(obj => {
            obj.set({
                hasControls: false,
                hasBorders: false
            });
        });
        canvas.renderAll();
    });

    // Tap on empty space to deselect
    canvas.on('mouse:down', (opt) => {
        if (!opt.target) {
            canvas.discardActiveObject();
            canvas.renderAll();
        }
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

// ============================================
// localStorage Persistence
// ============================================

/**
 * Save current canvas state to localStorage (debounced)
 */
function saveState() {
    if (!canvas) return;

    // Clear any pending save
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    // Debounce the save
    saveTimeout = setTimeout(() => {
        try {
            const state = {
                objects: canvas.toJSON(['id', 'name', 'stickerType']).objects,
                viewportTransform: canvas.viewportTransform,
                timestamp: Date.now()
            };
            const stateString = JSON.stringify(state);

            // Try to save, handle quota exceeded
            try {
                localStorage.setItem(CONFIG.storageKey, stateString);
            } catch (quotaError) {
                // Storage quota exceeded - try to clear old data
                if (quotaError.name === 'QuotaExceededError' ||
                    quotaError.code === 22 || // Safari
                    quotaError.code === 1014) { // Firefox
                    console.warn('Storage quota exceeded, clearing old state');
                    localStorage.removeItem(CONFIG.storageKey);
                    // Try again with fresh storage
                    try {
                        localStorage.setItem(CONFIG.storageKey, stateString);
                    } catch (retryError) {
                        console.error('Storage still failed after clearing:', retryError);
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to save canvas state:', error);
        }
    }, CONFIG.autoSaveDelay);
}

/**
 * Restore canvas state from localStorage
 * @returns {Promise<boolean>} True if state was restored
 */
export async function restoreState() {
    if (!canvas) return false;

    try {
        const stored = localStorage.getItem(CONFIG.storageKey);
        if (!stored) return false;

        const state = JSON.parse(stored);
        if (!state.objects || !Array.isArray(state.objects)) return false;

        // Load objects onto canvas
        return new Promise((resolve) => {
            fabric.util.enlivenObjects(state.objects, (objects) => {
                objects.forEach(obj => {
                    canvas.add(obj);
                });

                // Restore viewport if saved
                if (state.viewportTransform) {
                    canvas.setViewportTransform(state.viewportTransform);
                }

                canvas.renderAll();
                resolve(true);
            });
        });
    } catch (error) {
        console.warn('Failed to restore canvas state:', error);
        return false;
    }
}

/**
 * Clear saved state from localStorage
 */
export function clearSavedState() {
    try {
        localStorage.removeItem(CONFIG.storageKey);
    } catch (error) {
        console.warn('Failed to clear saved state:', error);
    }
}

/**
 * Check if there is a saved state
 * @returns {boolean}
 */
export function hasSavedState() {
    try {
        return localStorage.getItem(CONFIG.storageKey) !== null;
    } catch {
        return false;
    }
}

/**
 * Set up auto-save on canvas changes
 */
export function setupAutoSave() {
    if (!canvas) return;

    // Save when objects are added, modified, or removed
    canvas.on('object:added', saveState);
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);

    // Also save on viewport changes (zoom/pan)
    canvas.on('after:render', () => {
        // Only save if there are objects (don't save empty state after zoom)
        if (canvas.getObjects().length > 0) {
            saveState();
        }
    });
}
