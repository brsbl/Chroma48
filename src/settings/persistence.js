/**
 * LocalStorage Persistence Module for Chroma48
 *
 * Provides wrapper functions for storing and retrieving game settings
 * from localStorage with proper error handling.
 *
 * @module persistence
 */

// =============================================================================
// LOCALSTORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  BEST_SCORE: 'bestScore',
  TILE_COLORS: 'tileColors',
  COLOR_MODE: 'isColorMode',
};

// =============================================================================
// BEST SCORE PERSISTENCE
// =============================================================================

/**
 * Load the best score from localStorage.
 *
 * @returns {number} The saved best score, or 0 if not found or on error
 */
export function loadBestScore() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.BEST_SCORE);
    if (stored === null) {
      return 0;
    }
    const parsed = parseInt(stored, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.error('Failed to load best score from localStorage:', error);
    return 0;
  }
}

/**
 * Save the best score to localStorage.
 *
 * @param {number} score - The score to save
 * @returns {boolean} True if save was successful, false otherwise
 */
export function saveBestScore(score) {
  try {
    localStorage.setItem(STORAGE_KEYS.BEST_SCORE, score.toString());
    return true;
  } catch (error) {
    console.error('Failed to save best score to localStorage:', error);
    return false;
  }
}

// =============================================================================
// TILE COLORS PERSISTENCE
// =============================================================================

/**
 * Load the tile colors array from localStorage.
 *
 * @returns {string[]|null} Array of hex color strings, or null if not found or on error
 */
export function loadTileColors() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TILE_COLORS);
    if (stored === null) {
      return null;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to load tile colors from localStorage:', error);
    return null;
  }
}

/**
 * Save the tile colors array to localStorage.
 *
 * @param {string[]} colors - Array of hex color strings to save
 * @returns {boolean} True if save was successful, false otherwise
 */
export function saveTileColors(colors) {
  try {
    localStorage.setItem(STORAGE_KEYS.TILE_COLORS, JSON.stringify(colors));
    return true;
  } catch (error) {
    console.error('Failed to save tile colors to localStorage:', error);
    return false;
  }
}

// =============================================================================
// COLOR MODE PERSISTENCE
// =============================================================================

/**
 * Load the color mode setting from localStorage.
 *
 * @returns {boolean} True if color mode is enabled, false otherwise (default)
 */
export function loadColorMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.COLOR_MODE);
    return stored === 'true';
  } catch (error) {
    console.error('Failed to load color mode from localStorage:', error);
    return false;
  }
}

/**
 * Save the color mode setting to localStorage.
 *
 * @param {boolean} mode - True to enable color mode, false for number mode
 * @returns {boolean} True if save was successful, false otherwise
 */
export function saveColorMode(mode) {
  try {
    localStorage.setItem(STORAGE_KEYS.COLOR_MODE, mode.toString());
    return true;
  } catch (error) {
    console.error('Failed to save color mode to localStorage:', error);
    return false;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clear all game settings from localStorage.
 * Useful for testing or resetting to defaults.
 *
 * @returns {boolean} True if clear was successful, false otherwise
 */
export function clearAllSettings() {
  try {
    localStorage.removeItem(STORAGE_KEYS.BEST_SCORE);
    localStorage.removeItem(STORAGE_KEYS.TILE_COLORS);
    localStorage.removeItem(STORAGE_KEYS.COLOR_MODE);
    return true;
  } catch (error) {
    console.error('Failed to clear settings from localStorage:', error);
    return false;
  }
}

/**
 * Check if localStorage is available.
 *
 * @returns {boolean} True if localStorage is available, false otherwise
 */
export function isStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
