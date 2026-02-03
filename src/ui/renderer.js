/**
 * Renderer Module for Chroma48
 *
 * Handles all rendering operations including tile positioning,
 * DOM element management, and grid drawing.
 *
 * @module renderer
 */

import { gameState, getDOMElements } from '../state/gameState.js';

// =============================================================================
// TILE POSITION CALCULATION
// =============================================================================

/**
 * Calculate tile position within CSS Grid container.
 * Uses the actual CSS Grid cell size and gap from computed styles
 * to determine absolute positioning coordinates.
 *
 * @param {number} row - The row index (0-based)
 * @param {number} col - The column index (0-based)
 * @returns {{x: number, y: number}} Position coordinates in pixels
 *
 * @example
 * const pos = calculateTilePosition(1, 2);
 * // Returns { x: 220, y: 110 } (values depend on grid cell size and gap)
 */
export function calculateTilePosition(row, col) {
  const { gridContainer } = getDOMElements();

  if (!gridContainer) {
    return { x: 0, y: 0 };
  }

  // Get the actual CSS Grid cell size and gap from computed styles
  const gridStyle = getComputedStyle(gridContainer);
  const gap = parseFloat(gridStyle.gap) || 10;

  // Get the actual size of a grid cell
  const firstCell = gridContainer.querySelector('.grid-cell');
  if (!firstCell) {
    return { x: 0, y: 0 };
  }

  const cellSize = firstCell.offsetWidth;

  return {
    x: col * (cellSize + gap),
    y: row * (cellSize + gap),
  };
}

// =============================================================================
// BACKGROUND GRID
// =============================================================================

/**
 * Create the background grid cells.
 * Clears existing cells and creates new grid-cell divs
 * based on the current GRID_SIZE.
 *
 * @returns {void}
 *
 * @example
 * createBackgroundGrid();
 * // Creates 16 grid-cell divs for a 4x4 grid
 */
export function createBackgroundGrid() {
  const { gridContainer } = getDOMElements();

  if (!gridContainer) {
    return;
  }

  // Clear only background cells, tiles are managed by drawGrid
  const existingCells = gridContainer.querySelectorAll('.grid-cell');
  existingCells.forEach((cell) => cell.remove());

  const gridSize = gameState.getGridSize();

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell');
      gridContainer.appendChild(cell);
    }
  }

  // Clear any stray tile DOM elements
  const existingTiles = gridContainer.querySelectorAll('.tile');
  existingTiles.forEach((tile) => tile.remove());

  // Reset DOM element cache
  const emptyElements = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));
  gameState.setTileDOMElements(emptyElements);
}

// =============================================================================
// TILE ELEMENT MANAGEMENT
// =============================================================================

/**
 * Ensure a tile DOM element exists for the given position.
 * Creates, updates, or removes tile elements as needed.
 * Uses absolute positioning within the CSS Grid container.
 *
 * @param {Object|null} tileData - The tile data object or null to remove
 * @param {number} tileData.value - The numeric value of the tile
 * @param {string} tileData.color - The hex color of the tile
 * @param {boolean} [tileData.isNewlyMerged] - Whether tile was just merged
 * @param {number} row - The row index (0-based)
 * @param {number} col - The column index (0-based)
 * @returns {HTMLElement|null} The tile DOM element or null if removed
 *
 * @example
 * // Create/update a tile
 * const tile = ensureTileElement({ value: 4, color: '#F7A161' }, 0, 1);
 *
 * // Remove a tile
 * ensureTileElement(null, 0, 1);
 */
export function ensureTileElement(tileData, row, col) {
  const { gridContainer } = getDOMElements();

  if (!gridContainer) {
    return null;
  }

  const tileDOMElements = gameState.getTileDOMElements();
  let tileDOM = tileDOMElements[row][col];

  // Handle tile removal
  if (!tileData) {
    if (tileDOM?.parentNode) {
      tileDOM.parentNode.removeChild(tileDOM);
    }
    gameState.setTileDOMElement(row, col, null);
    return null;
  }

  // Create tile if it doesn't exist
  if (!tileDOM) {
    tileDOM = document.createElement('div');
    tileDOM.classList.add('tile');
    gridContainer.appendChild(tileDOM);
    gameState.setTileDOMElement(row, col, tileDOM);
  }

  // Update value class
  const valueClass = `tile-${tileData.value > 2048 ? 'super' : tileData.value}`;
  tileDOM.className = `tile ${valueClass}`;

  const isColorMode = gameState.getIsColorMode();
  tileDOM.textContent = isColorMode ? '' : tileData.value;
  tileDOM.style.backgroundColor = tileData.color;

  // Position tile using absolute positioning
  const position = calculateTilePosition(row, col);
  tileDOM.style.left = position.x + 'px';
  tileDOM.style.top = position.y + 'px';

  // Set tile dimensions to match grid cells
  const firstCell = gridContainer.querySelector('.grid-cell');
  if (firstCell) {
    tileDOM.style.width = firstCell.offsetWidth + 'px';
    tileDOM.style.height = firstCell.offsetHeight + 'px';
  }


  return tileDOM;
}

// =============================================================================
// GRID DRAWING
// =============================================================================

/**
 * Draw the entire grid by updating all tile elements.
 * Iterates through the grid state and calls ensureTileElement
 * for each cell position.
 *
 * @returns {void}
 *
 * @example
 * drawGrid();
 * // Updates all tile DOM elements to match current grid state
 */
export function drawGrid() {
  const { gridContainer } = getDOMElements();

  if (!gridContainer) {
    return;
  }

  const gridSize = gameState.getGridSize();
  const grid = gameState.getGrid();

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const tileData = grid[r][c];
      ensureTileElement(tileData, r, c);
    }
  }
}
