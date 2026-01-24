/**
 * Color utility functions for converting and mixing colors.
 * Pure functions with no external dependencies.
 */

/**
 * Convert a hex color string to an RGB object.
 * Handles both 3-digit (#RGB) and 6-digit (#RRGGBB) formats.
 *
 * @param {string} hex - The hex color string (e.g., "#FFF" or "#FFFFFF")
 * @returns {{ r: number, g: number, b: number }} RGB color object with values 0-255
 *
 * @example
 * hexToRgb("#FFF")     // { r: 255, g: 255, b: 255 }
 * hexToRgb("#FF5733")  // { r: 255, g: 87, b: 51 }
 */
export function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return { r, g, b };
}

/**
 * Convert RGB values to a hex color string.
 * Values are rounded and padded with 0 if needed.
 *
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hex color string in #RRGGBB format
 *
 * @example
 * rgbToHex(255, 87, 51)   // "#ff5733"
 * rgbToHex(0, 0, 0)       // "#000000"
 */
export function rgbToHex(r, g, b) {
    const toHex = (c) => {
        const hex = Math.round(c).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Mix two colors using RGB averaging.
 * Combines two hex colors by averaging their RGB components.
 *
 * @param {string} hex1 - First hex color string
 * @param {string} hex2 - Second hex color string
 * @returns {string} Mixed hex color string in #RRGGBB format
 *
 * @example
 * mixColors("#FF0000", "#0000FF")  // "#800080" (purple from red + blue)
 * mixColors("#FFFFFF", "#000000")  // "#808080" (gray from white + black)
 */
export function mixColors(hex1, hex2) {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);

    // Simple RGB averaging
    const mixedR = (rgb1.r + rgb2.r) / 2;
    const mixedG = (rgb1.g + rgb2.g) / 2;
    const mixedB = (rgb1.b + rgb2.b) / 2;

    return rgbToHex(mixedR, mixedG, mixedB);
}
