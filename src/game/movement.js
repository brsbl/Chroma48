/**
 * Movement Module for Chroma48
 *
 * Handles tile movement and merging logic for all four directions.
 * Uses a unified movement algorithm that works for left, right, up, and down.
 *
 * @module movement
 */

import gameState from '../state/gameState.js';
import { updateScore } from './scoring.js';

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Converts a hex color string to RGB components.
 *
 * @param {string} hex - Hex color string (e.g., '#FF0000' or '#F00')
 * @returns {{r: number, g: number, b: number}} RGB components
 */
function hexToRgb(hex) {
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
 * Converts RGB components to a hex color string.
 *
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string} Hex color string (e.g., '#ff0000')
 */
function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Mixes two hex colors by averaging their RGB components.
 *
 * @param {string} hex1 - First hex color
 * @param {string} hex2 - Second hex color
 * @returns {string} Mixed hex color
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

// =============================================================================
// UNIFIED MOVEMENT LOGIC
// =============================================================================

/**
 * Unified tile movement and merging logic.
 * Moves and merges tiles in the specified direction.
 *
 * @param {string} direction - Movement direction: 'left', 'right', 'up', or 'down'
 * @returns {boolean} True if any tiles moved or merged, false otherwise
 */
export function moveAndMergeTiles(direction) {
  let boardChanged = false;
  const isHorizontal = direction === 'left' || direction === 'right';
  const isReverse = direction === 'right' || direction === 'down';
  const size = gameState.getGridSize();
  const isColorMode = gameState.getIsColorMode();

  // Get a mutable copy of the grid
  const grid = gameState.getGrid();

  for (let primaryIdx = 0; primaryIdx < size; primaryIdx++) {
    // Extract row or column based on direction
    const originalLine = [];
    for (let secondaryIdx = 0; secondaryIdx < size; secondaryIdx++) {
      const [r, c] = isHorizontal ? [primaryIdx, secondaryIdx] : [secondaryIdx, primaryIdx];
      originalLine.push(grid[r][c]);
    }

    // Compact and merge
    const workingLine = originalLine.filter(cell => cell !== null);
    if (isReverse) workingLine.reverse();

    // Merge adjacent tiles
    for (let i = 0; i < workingLine.length - 1; i++) {
      const canMerge = isColorMode
        ? workingLine[i].color === workingLine[i + 1].color
        : workingLine[i].value === workingLine[i + 1].value;

      if (canMerge) {
        const mergedValue = workingLine[i].value * 2;
        const mergedColor = isColorMode
          ? workingLine[i].color
          : mixColors(workingLine[i].color, workingLine[i + 1].color);

        workingLine[i] = { value: mergedValue, color: mergedColor, isNewlyMerged: true };
        updateScore(mergedValue);
        workingLine.splice(i + 1, 1);
      }
    }

    // Restore direction and pad with nulls
    if (isReverse) workingLine.reverse();
    const newLine = Array(size).fill(null);

    if (isReverse) {
      // For right/down: tiles should be at the end
      for (let i = 0; i < workingLine.length; i++) {
        newLine[size - workingLine.length + i] = workingLine[i];
      }
    } else {
      // For left/up: tiles should be at the beginning
      for (let i = 0; i < workingLine.length; i++) {
        newLine[i] = workingLine[i];
      }
    }

    // Update grid and check for changes
    for (let secondaryIdx = 0; secondaryIdx < size; secondaryIdx++) {
      const [r, c] = isHorizontal ? [primaryIdx, secondaryIdx] : [secondaryIdx, primaryIdx];
      const oldTile = originalLine[secondaryIdx];
      const newTile = newLine[secondaryIdx];

      if ((oldTile === null && newTile !== null) ||
          (oldTile !== null && newTile === null) ||
          (oldTile !== null && newTile !== null &&
           (oldTile.value !== newTile.value || oldTile.color !== newTile.color))) {
        boardChanged = true;
      }
      grid[r][c] = newTile;
    }
  }

  // Persist the updated grid back to state
  gameState.setGrid(grid);

  return boardChanged;
}

// =============================================================================
// DIRECTIONAL MOVEMENT FUNCTIONS
// =============================================================================

/**
 * Move and merge tiles to the left.
 *
 * @returns {boolean} True if any tiles moved or merged
 */
export function moveTilesLeft() {
  return moveAndMergeTiles('left');
}

/**
 * Move and merge tiles to the right.
 *
 * @returns {boolean} True if any tiles moved or merged
 */
export function moveTilesRight() {
  return moveAndMergeTiles('right');
}

/**
 * Move and merge tiles upward.
 *
 * @returns {boolean} True if any tiles moved or merged
 */
export function moveTilesUp() {
  return moveAndMergeTiles('up');
}

/**
 * Move and merge tiles downward.
 *
 * @returns {boolean} True if any tiles moved or merged
 */
export function moveTilesDown() {
  return moveAndMergeTiles('down');
}
