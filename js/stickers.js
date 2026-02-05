/**
 * stickers.js - Sticker loading, display, and placement
 *
 * Exports:
 * - loadManifest(): Load the sticker manifest
 * - displayCategory(categoryId): Show stickers for a category
 * - placeSticker(stickerId): Place a sticker on the canvas
 * - getStickersForCategory(categoryId): Get stickers filtered by category
 * - getManifest(): Get cached manifest
 */

import { getCanvas } from './canvas.js';
import { showToast, getState } from './app.js';

let manifest = null;
const svgCache = new Map();
let hintsVisible = true; // Show hints by default when switching categories

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

    // Reset hints visibility when switching categories
    hintsVisible = true;

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

        // Create name hint label
        const nameHint = document.createElement('span');
        nameHint.className = 'sticker-name-hint';
        nameHint.textContent = sticker.label;
        item.appendChild(nameHint);

        // Create SVG container
        const svgContainer = document.createElement('div');
        svgContainer.className = 'sticker-svg';

        // Load and display SVG
        try {
            const svgContent = await loadSVG(sticker.file);
            svgContainer.innerHTML = svgContent;
        } catch (error) {
            // Fallback to placeholder
            svgContainer.innerHTML = `<span style="font-size: 24px;">📍</span>`;
        }

        item.appendChild(svgContainer);

        // Click to place sticker and hide all hints
        item.addEventListener('click', () => {
            hideAllHints();
            placeSticker(sticker);
        });

        strip.appendChild(item);
    }
}

/**
 * Hide all sticker name hints
 */
function hideAllHints() {
    if (!hintsVisible) return;

    document.querySelectorAll('.sticker-name-hint').forEach(hint => {
        hint.classList.add('hidden');
    });
    hintsVisible = false;
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

            // Get current zoom level
            const zoom = canvas.getZoom();

            // Calculate size - divide by zoom so stickers appear same size regardless of zoom
            const scale = (CONFIG.defaultSize / Math.max(svgGroup.width, svgGroup.height)) * sticker.defaultScale / zoom;

            // Get viewport center in canvas coordinates
            const vpt = canvas.viewportTransform;
            const viewportCenterX = canvas.getWidth() / 2;
            const viewportCenterY = canvas.getHeight() / 2;
            // Convert viewport center to canvas coordinates (inverse transform)
            const centerX = (viewportCenterX - vpt[4]) / zoom;
            const centerY = (viewportCenterY - vpt[5]) / zoom;

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
 * @returns {Object|null} The cached manifest or null if not loaded
 */
export function getManifest() {
    return manifest;
}
