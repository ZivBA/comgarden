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
