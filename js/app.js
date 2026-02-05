/**
 * app.js - Main application entry point
 *
 * Initializes all modules and wires up event handlers
 */

import { initCanvas, getCanvas, resetZoom, restoreState, clearSavedState, hasSavedState, setupAutoSave } from './canvas.js';
import { loadManifest, displayCategory } from './stickers.js';
import {
    initDrawMode,
    exitDrawMode,
    initTextMode,
    exitTextMode,
    initHistoryHooks,
    undo,
    setToolColor,
    getDrawColor
} from './tools.js';
import { shareImage, canShare } from './share.js';

// Hints configuration - contextual help messages
const HINTS = {
    firstSticker: {
        message: '🎉 יופי! עכשיו אפשר לגרור ולסובב את המדבקה',
        showOnce: true
    },
    drawMode: {
        message: '✏️ מצב ציור: ציירו באצבע על הקנבס',
        showOnce: true
    },
    textMode: {
        message: '✍️ הקישו על הקנבס להוספת טקסט',
        showOnce: true
    },
    zoom: {
        message: '🔍 צבטו בשתי אצבעות לזום, הקישו פעמיים לאיפוס',
        showOnce: true
    }
};

// Application state
const state = {
    currentMode: 'place', // 'place' | 'draw' | 'text'
    selectedCategory: 'trees-greenery',
    hintsShown: JSON.parse(localStorage.getItem('comgarden-hints-shown') || '{}'),
    helpMenuOpen: false
};

/**
 * Check browser compatibility
 * @returns {boolean} True if browser meets requirements
 */
function checkBrowserCompatibility() {
    const issues = [];

    // Check for required features
    if (!window.fabric) {
        issues.push('ספריית Fabric.js לא נטענה');
    }

    if (!('localStorage' in window)) {
        issues.push('אין תמיכה ב-localStorage');
    }

    if (!document.createElement('canvas').getContext) {
        issues.push('אין תמיכה ב-Canvas');
    }

    if (!('fetch' in window)) {
        issues.push('אין תמיכה ב-Fetch API');
    }

    // Show warnings but don't block
    if (issues.length > 0) {
        console.warn('Compatibility issues:', issues);
        showToast('הדפדפן שלכם עשוי שלא לתמוך בכל התכונות', 5000);
        return false;
    }

    return true;
}

/**
 * Initialize the application
 */
async function init() {
    console.log('ComGarden: Initializing...');

    // Check browser compatibility (non-blocking)
    checkBrowserCompatibility();

    try {
        // Initialize canvas
        await initCanvas();
        console.log('ComGarden: Canvas initialized');

        // Initialize history hooks for undo functionality
        const canvas = getCanvas();
        initHistoryHooks(canvas);
        console.log('ComGarden: History hooks initialized');

        // Set up auto-save for persistence
        setupAutoSave();
        console.log('ComGarden: Auto-save enabled');

        // Restore any previously saved state
        const restored = await restoreState();
        if (restored) {
            console.log('ComGarden: Previous state restored');
        }

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

    // Help button - toggle help menu
    document.getElementById('btn-help')?.addEventListener('click', toggleHelpMenu);

    // Help menu items
    document.querySelectorAll('#help-menu .menu-item').forEach(item => {
        item.addEventListener('click', () => handleHelpMenuAction(item.dataset.action));
    });

    // Close help menu when clicking outside
    document.addEventListener('click', (e) => {
        const helpContainer = document.getElementById('help-menu-container');
        if (state.helpMenuOpen && !helpContainer?.contains(e.target)) {
            closeHelpMenu();
        }
    });

    // Hint dismiss button
    document.getElementById('hint-dismiss')?.addEventListener('click', hideHint);

    // Undo button
    document.getElementById('btn-undo')?.addEventListener('click', handleUndo);

    // Clear button
    document.getElementById('btn-clear')?.addEventListener('click', handleClear);

    // Share button
    document.getElementById('btn-share')?.addEventListener('click', handleShare);

    // Color picker buttons
    document.querySelectorAll('#color-picker .color-btn').forEach(btn => {
        btn.addEventListener('click', () => handleColorChange(btn));
    });

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
async function handleCategoryChange(tab) {
    const canvas = getCanvas();

    // Exit any active tool mode before switching to category
    exitCurrentMode(canvas);
    hideColorPicker();

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

/**
 * Handle tool tab change (draw/text)
 */
function handleToolChange(tab) {
    const tool = tab.dataset.tool;
    const canvas = getCanvas();

    // Exit current mode before switching
    exitCurrentMode(canvas);

    // Toggle if same tool clicked
    if (state.currentMode === tool) {
        // Deactivate - return to place mode
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
        state.currentMode = 'place';
        hideColorPicker();
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

    // Enable the selected tool mode
    if (tool === 'draw') {
        initDrawMode(canvas, { color: getDrawColor() });
        showColorPicker();
        showHint('drawMode');
    } else if (tool === 'text') {
        initTextMode(canvas, { fill: getDrawColor() });
        showColorPicker();
        showHint('textMode');
    }

    console.log('Mode changed:', state.currentMode);
}

/**
 * Show the color picker
 */
function showColorPicker() {
    const picker = document.getElementById('color-picker');
    picker?.classList.remove('hidden');
}

/**
 * Hide the color picker
 */
function hideColorPicker() {
    const picker = document.getElementById('color-picker');
    picker?.classList.add('hidden');
}

/**
 * Exit current drawing or text mode
 * @param {fabric.Canvas} canvas
 */
function exitCurrentMode(canvas) {
    if (state.currentMode === 'draw') {
        exitDrawMode(canvas);
    } else if (state.currentMode === 'text') {
        exitTextMode(canvas);
    }
}

/**
 * Handle undo button click
 */
function handleUndo() {
    const canvas = getCanvas();
    const success = undo(canvas);
    if (!success) {
        showToast('אין פעולות לביטול');
    }
}

/**
 * Handle clear button click
 */
function handleClear() {
    const canvas = getCanvas();
    const objectCount = canvas?.getObjects().length || 0;

    if (objectCount === 0) {
        showToast('הגינה כבר ריקה');
        return;
    }

    if (confirm('האם למחוק את כל המדבקות והציורים?')) {
        // Remove all objects but keep background image
        canvas.getObjects().forEach(obj => canvas.remove(obj));
        canvas.renderAll();
        clearSavedState();
        showToast('הגינה נוקתה! 🌱');
    }
}

/**
 * Handle color picker button click
 * @param {HTMLElement} btn - The clicked color button
 */
function handleColorChange(btn) {
    const color = btn.dataset.color;
    const canvas = getCanvas();

    // Update active state
    document.querySelectorAll('#color-picker .color-btn').forEach(b => {
        b.classList.remove('active');
    });
    btn.classList.add('active');

    // Apply color
    setToolColor(color, canvas);
}

/**
 * Handle share button click
 */
async function handleShare() {
    showToast('מייצא תמונה...');

    const result = await shareImage();

    if (result.success) {
        if (result.method === 'share') {
            showToast('התמונה שותפה בהצלחה! 🎉');
        } else {
            showToast('התמונה הורדה בהצלחה! 📥');
        }
    } else {
        if (result.error?.name === 'AbortError') {
            // User cancelled - no message needed
            return;
        }
        showToast('שגיאה בייצוא התמונה. נסו שוב.');
        console.error('Share failed:', result.error);
    }
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

// ============================================
// Help Menu Functions
// ============================================

/**
 * Toggle the help menu dropdown
 */
function toggleHelpMenu() {
    if (state.helpMenuOpen) {
        closeHelpMenu();
    } else {
        openHelpMenu();
    }
}

/**
 * Open the help menu
 */
function openHelpMenu() {
    const menu = document.getElementById('help-menu');
    const btn = document.getElementById('btn-help');
    menu?.classList.remove('hidden');
    btn?.setAttribute('aria-expanded', 'true');
    state.helpMenuOpen = true;
}

/**
 * Close the help menu
 */
function closeHelpMenu() {
    const menu = document.getElementById('help-menu');
    const btn = document.getElementById('btn-help');
    menu?.classList.add('hidden');
    btn?.setAttribute('aria-expanded', 'false');
    state.helpMenuOpen = false;
}

/**
 * Handle help menu action
 * @param {string} action
 */
function handleHelpMenuAction(action) {
    closeHelpMenu();

    switch (action) {
        case 'show-tutorial':
            showOnboarding();
            break;
        case 'reset-garden':
            confirmResetGarden();
            break;
        case 'about':
            showAbout();
            break;
    }
}

/**
 * Confirm and reset the garden
 */
function confirmResetGarden() {
    if (confirm('האם למחוק את כל המדבקות? לא ניתן לבטל פעולה זו.')) {
        const canvas = getCanvas();
        if (canvas) {
            // Remove all objects but keep background image
            canvas.getObjects().forEach(obj => canvas.remove(obj));
            canvas.renderAll();
        }
        clearSavedState();
        showToast('הגינה נוקתה! 🌱');
    }
}

/**
 * Show about information
 */
function showAbout() {
    showToast('גינה קהילתית v1.0 — נבנה עם ❤️');
}

// ============================================
// Contextual Hints System
// ============================================

/**
 * Show a contextual hint
 * @param {string} hintKey - Key from HINTS object
 */
export function showHint(hintKey) {
    const hint = HINTS[hintKey];
    if (!hint) return;

    // Check if already shown (for showOnce hints)
    if (hint.showOnce && state.hintsShown[hintKey]) {
        return;
    }

    const container = document.getElementById('hint-container');
    const content = document.getElementById('hint-content');

    if (container && content) {
        content.textContent = hint.message;
        container.classList.remove('hidden');

        // Mark as shown
        if (hint.showOnce) {
            state.hintsShown[hintKey] = true;
            localStorage.setItem('comgarden-hints-shown', JSON.stringify(state.hintsShown));
        }

        // Auto-hide after 5 seconds
        setTimeout(() => hideHint(), 5000);
    }
}

/**
 * Hide the current hint
 */
function hideHint() {
    const container = document.getElementById('hint-container');
    container?.classList.add('hidden');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
