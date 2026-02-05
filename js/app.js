/**
 * app.js - Main application entry point
 *
 * Initializes all modules and wires up event handlers
 */

import { initCanvas, getCanvas, resetZoom } from './canvas.js';
import { loadManifest, displayCategory } from './stickers.js';
import {
    initDrawMode,
    exitDrawMode,
    initTextMode,
    exitTextMode,
    initHistoryHooks,
    undo
} from './tools.js';

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

        // Initialize history hooks for undo functionality
        const canvas = getCanvas();
        initHistoryHooks(canvas);
        console.log('ComGarden: History hooks initialized');

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
async function handleCategoryChange(tab) {
    const canvas = getCanvas();

    // Exit any active tool mode before switching to category
    exitCurrentMode(canvas);

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
        initDrawMode(canvas);
    } else if (tool === 'text') {
        initTextMode(canvas);
    }

    console.log('Mode changed:', state.currentMode);
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
