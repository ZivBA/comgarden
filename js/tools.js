/**
 * tools.js - Drawing, text, and undo functionality
 *
 * Provides freehand drawing mode, text placement with RTL Hebrew support,
 * and an undo system with canvas state history.
 *
 * Exports:
 * - initDrawMode(canvas, options): Enable freehand drawing
 * - initTextMode(canvas, options): Enable text placement mode
 * - saveToHistory(canvas): Save current canvas state to history
 * - undo(canvas): Restore previous canvas state
 * - setDrawColor(color): Set drawing brush color
 * - setDrawWidth(width): Set drawing brush width
 * - exitDrawMode(canvas): Disable drawing mode
 * - exitTextMode(canvas): Disable text placement mode
 * - getHistory(): Get current history state (for debugging)
 */

// History configuration
const HISTORY_CONFIG = {
    maxStates: 20
};

// Drawing configuration
const DRAW_CONFIG = {
    defaultColor: '#2d5016',
    defaultWidth: 3,
    minWidth: 1,
    maxWidth: 20
};

// Module state
let history = [];
let historyIndex = -1;
let currentDrawColor = DRAW_CONFIG.defaultColor;
let currentDrawWidth = DRAW_CONFIG.defaultWidth;
let isTextModeActive = false;
let textModeClickHandler = null;

/**
 * Save current canvas state to history
 * Truncates any forward history if we're not at the end
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 */
export function saveToHistory(canvas) {
    if (!canvas) return;

    // Get canvas state as JSON (excludes background image by default for performance)
    const state = canvas.toJSON(['stickerId', 'stickerLabel']);

    // If we're not at the end of history, truncate forward history
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }

    // Add new state
    history.push(state);

    // Enforce max history limit
    if (history.length > HISTORY_CONFIG.maxStates) {
        history.shift();
    } else {
        historyIndex++;
    }

    // Keep historyIndex valid after potential shift
    historyIndex = history.length - 1;
}

/**
 * Restore previous canvas state from history
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 * @returns {boolean} True if undo was successful, false if at start of history
 */
export function undo(canvas) {
    if (!canvas) return false;

    // Check if there's history to undo to
    if (historyIndex <= 0) {
        return false;
    }

    historyIndex--;
    const state = history[historyIndex];

    // Load the previous state
    canvas.loadFromJSON(state, () => {
        canvas.renderAll();
    });

    return true;
}

/**
 * Initialize canvas event hooks for automatic history saving
 * Call this once after canvas is initialized
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 */
export function initHistoryHooks(canvas) {
    if (!canvas) return;

    // Save initial state
    saveToHistory(canvas);

    // Save state after object modifications
    canvas.on('object:added', () => {
        saveToHistory(canvas);
    });

    canvas.on('object:modified', () => {
        saveToHistory(canvas);
    });

    canvas.on('object:removed', () => {
        saveToHistory(canvas);
    });

    // Save after path is created (freehand drawing)
    canvas.on('path:created', () => {
        saveToHistory(canvas);
    });
}

/**
 * Enable freehand drawing mode on the canvas
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 * @param {Object} options - Optional configuration
 * @param {string} options.color - Brush color (default: currentDrawColor)
 * @param {number} options.width - Brush width (default: currentDrawWidth)
 */
export function initDrawMode(canvas, options = {}) {
    if (!canvas) return;

    const color = options.color || currentDrawColor;
    const width = options.width || currentDrawWidth;

    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = width;

    // Update module state
    currentDrawColor = color;
    currentDrawWidth = width;
}

/**
 * Disable freehand drawing mode
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 */
export function exitDrawMode(canvas) {
    if (!canvas) return;
    canvas.isDrawingMode = false;
}

/**
 * Set the drawing brush color
 * @param {string} color - CSS color value
 * @param {fabric.Canvas} canvas - Optional canvas to apply immediately
 */
export function setDrawColor(color, canvas) {
    currentDrawColor = color;

    if (canvas && canvas.isDrawingMode) {
        canvas.freeDrawingBrush.color = color;
    }
}

/**
 * Set the drawing brush width
 * @param {number} width - Brush width in pixels
 * @param {fabric.Canvas} canvas - Optional canvas to apply immediately
 */
export function setDrawWidth(width, canvas) {
    // Clamp width to valid range
    const clampedWidth = Math.max(
        DRAW_CONFIG.minWidth,
        Math.min(DRAW_CONFIG.maxWidth, width)
    );
    currentDrawWidth = clampedWidth;

    if (canvas && canvas.isDrawingMode) {
        canvas.freeDrawingBrush.width = clampedWidth;
    }
}

/**
 * Get current draw color
 * @returns {string} Current brush color
 */
export function getDrawColor() {
    return currentDrawColor;
}

/**
 * Set color for both drawing and text (unified color state)
 * @param {string} color - CSS color value
 * @param {fabric.Canvas} canvas - Canvas to apply to
 */
export function setToolColor(color, canvas) {
    currentDrawColor = color;

    if (canvas) {
        // Apply to drawing brush if in draw mode
        if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.color = color;
        }

        // Apply to selected text object if any
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type === 'i-text') {
            activeObj.set('fill', color);
            canvas.renderAll();
        }
    }
}

/**
 * Get current draw width
 * @returns {number} Current brush width
 */
export function getDrawWidth() {
    return currentDrawWidth;
}

/**
 * Enable text placement mode
 * Click on canvas will create an editable text object
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 * @param {Object} options - Optional configuration
 * @param {string} options.fill - Text color (default: currentDrawColor)
 * @param {number} options.fontSize - Font size (default: 24)
 * @param {string} options.fontFamily - Font family (default: system Hebrew fonts)
 */
export function initTextMode(canvas, options = {}) {
    if (!canvas) return;

    // Exit drawing mode if active
    canvas.isDrawingMode = false;

    const textOptions = {
        fill: options.fill || currentDrawColor,
        fontSize: options.fontSize || 24,
        fontFamily: options.fontFamily || '"Segoe UI", "Arial Hebrew", Arial, sans-serif',
        direction: 'rtl',
        textAlign: 'right'
    };

    // Remove existing handler if any
    if (textModeClickHandler) {
        canvas.off('mouse:down', textModeClickHandler);
    }

    // Create click handler for text placement
    textModeClickHandler = function(opt) {
        // Only create text if clicking on empty space
        if (opt.target) return;

        const pointer = canvas.getPointer(opt.e);

        const text = new fabric.IText('הקלד טקסט', {
            left: pointer.x,
            top: pointer.y,
            ...textOptions,
            originX: 'right',
            originY: 'top',
            editable: true,
            hasControls: true,
            hasBorders: true
        });

        canvas.add(text);
        canvas.setActiveObject(text);

        // Enter editing mode immediately
        text.enterEditing();
        text.selectAll();

        canvas.renderAll();
    };

    canvas.on('mouse:down', textModeClickHandler);
    isTextModeActive = true;
}

/**
 * Disable text placement mode
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 */
export function exitTextMode(canvas) {
    if (!canvas) return;

    if (textModeClickHandler) {
        canvas.off('mouse:down', textModeClickHandler);
        textModeClickHandler = null;
    }
    isTextModeActive = false;
}

/**
 * Check if text mode is currently active
 * @returns {boolean} True if text mode is active
 */
export function isTextMode() {
    return isTextModeActive;
}

/**
 * Add a text object directly at specified position
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} initialText - Initial text content
 * @param {Object} options - Text styling options
 * @returns {fabric.IText} The created text object
 */
export function addText(canvas, x, y, initialText, options = {}) {
    if (!canvas) return null;

    const text = new fabric.IText(initialText || 'טקסט חדש', {
        left: x,
        top: y,
        fill: options.fill || currentDrawColor,
        fontSize: options.fontSize || 24,
        fontFamily: options.fontFamily || '"Segoe UI", "Arial Hebrew", Arial, sans-serif',
        direction: 'rtl',
        textAlign: 'right',
        originX: 'right',
        originY: 'top',
        editable: true,
        hasControls: true,
        hasBorders: true
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();

    return text;
}

/**
 * Get history state for debugging
 * @returns {Object} Current history state
 */
export function getHistory() {
    return {
        length: history.length,
        currentIndex: historyIndex,
        maxStates: HISTORY_CONFIG.maxStates
    };
}

/**
 * Clear all history (use with caution)
 * @param {fabric.Canvas} canvas - Optional canvas to save initial state from
 */
export function clearHistory(canvas) {
    history = [];
    historyIndex = -1;

    if (canvas) {
        saveToHistory(canvas);
    }
}

/**
 * Check if undo is available
 * @returns {boolean} True if there's history to undo
 */
export function canUndo() {
    return historyIndex > 0;
}
