/**
 * share.js - Export and share functionality
 *
 * Exports:
 * - exportAsImage(): Export canvas as JPEG image
 * - shareImage(): Share using Web Share API or download fallback
 * - downloadImage(): Download image directly
 */

import { getCanvas } from './canvas.js';

// Configuration
const CONFIG = {
    imageFormat: 'image/jpeg',
    imageQuality: 0.9,
    defaultFilename: 'הגינה_הקהילתית',
    fileExtension: '.jpg'
};

/**
 * Export the canvas as a JPEG image blob
 * @returns {Promise<Blob>} The image as a Blob
 */
export async function exportAsImage() {
    const canvas = getCanvas();
    if (!canvas) {
        throw new Error('Canvas not initialized');
    }

    return new Promise((resolve, reject) => {
        try {
            // Get the canvas element with all objects rendered
            const dataURL = canvas.toDataURL({
                format: 'jpeg',
                quality: CONFIG.imageQuality,
                multiplier: 2 // Higher resolution for sharing
            });

            // Convert data URL to Blob
            fetch(dataURL)
                .then(res => res.blob())
                .then(blob => resolve(blob))
                .catch(reject);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Generate a filename with current date
 * @returns {string} Filename with date
 */
function generateFilename() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return `${CONFIG.defaultFilename}_${dateStr}${CONFIG.fileExtension}`;
}

/**
 * Download image directly to device
 * @param {Blob} blob - The image blob
 * @param {string} filename - Optional custom filename
 */
export function downloadImage(blob, filename = generateFilename()) {
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Check if Web Share API is available
 * @returns {boolean}
 */
export function canShare() {
    return navigator.share !== undefined && navigator.canShare !== undefined;
}

/**
 * Share image using Web Share API with download fallback
 * @returns {Promise<{success: boolean, method: 'share' | 'download', error?: Error}>}
 */
export async function shareImage() {
    try {
        const blob = await exportAsImage();
        const filename = generateFilename();

        // Try Web Share API first (mobile-friendly)
        if (canShare()) {
            const file = new File([blob], filename, { type: CONFIG.imageFormat });

            // Check if we can share this file type
            if (navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'הגינה הקהילתית שלי',
                        text: 'הנה התוכנית לגינה הקהילתית שלי! 🌱'
                    });
                    return { success: true, method: 'share' };
                } catch (shareError) {
                    // User cancelled or share failed - fall back to download
                    if (shareError.name === 'AbortError') {
                        return { success: false, method: 'share', error: shareError };
                    }
                    // Other error - try download
                    console.warn('Web Share failed, falling back to download:', shareError);
                }
            }
        }

        // Fallback: direct download
        downloadImage(blob, filename);
        return { success: true, method: 'download' };

    } catch (error) {
        console.error('Share/export failed:', error);
        return { success: false, method: 'download', error };
    }
}

/**
 * Get image as data URL for preview
 * @returns {string} Data URL of the canvas
 */
export function getImagePreview() {
    const canvas = getCanvas();
    if (!canvas) return null;

    return canvas.toDataURL({
        format: 'jpeg',
        quality: 0.5 // Lower quality for preview
    });
}
