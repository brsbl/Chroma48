/**
 * Core Game Module for Chroma48
 *
 * Contains the main game loop, game setup, tile spawning,
 * and game state management functions.
 *
 * @module core
 */

import gameState, { getDOMElements } from '../state/gameState.js';
import { updateScore } from './scoring.js';

// =============================================================================
// FORWARD DECLARATIONS
// =============================================================================

// These functions will be set by the rendering module to avoid circular dependencies
let drawGridFn = null;
let createBackgroundGridFn = null;

/**
 * Set the draw grid function reference.
 * Called by the rendering module during initialization.
 *
 * @param {Function} fn - The drawGrid function
 */
export function setDrawGridFn(fn) {
  drawGridFn = fn;
}

/**
 * Set the create background grid function reference.
 * Called by the rendering module during initialization.
 *
 * @param {Function} fn - The createBackgroundGrid function
 */
export function setCreateBackgroundGridFn(fn) {
  createBackgroundGridFn = fn;
}

// =============================================================================
// BOARD STATE CHECKS
// =============================================================================

/**
 * Checks if the game board is completely full.
 *
 * @returns {boolean} True if all cells are occupied, false otherwise
 */
export function isBoardFull() {
  if (gameState.isGameOver()) {
    return false;
  }

  const grid = gameState.getGrid();
  const size = gameState.getGridSize();

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) {
        return false;
      }
    }
  }
  return true;
}

// =============================================================================
// GAME SETUP
// =============================================================================

/**
 * Initializes or resets the game to its starting state.
 * Clears the grid, resets score, and spawns the first falling tile.
 */
export function setupGame() {
  const { pauseButton, messageContainer, messageParagraph, gridContainer, bestScoreDisplay, scoreDisplay } = getDOMElements();

  // Reset pause state
  gameState.setPaused(false);
  if (pauseButton) {
    pauseButton.innerHTML = '<img src="icons/Pause.png" alt="Pause" class="button-icon">Pause';
  }

  // Hide message container
  if (messageContainer) {
    if (messageParagraph) {
      messageParagraph.textContent = '';
    }
    messageContainer.style.display = 'none';
  }

  // Clear the grid container
  if (gridContainer) {
    gridContainer.innerHTML = '';
  }

  // Reset game state
  gameState.setGameOver(false);
  gameState.setScore(0);
  updateScore(0);

  // Remove glow effects
  if (bestScoreDisplay) {
    bestScoreDisplay.classList.remove('best-score-glow');
  }
  if (scoreDisplay) {
    scoreDisplay.classList.remove('current-score-glow');
  }

  // Reset best score achieved flag
  gameState.setNewBestScoreAchievedThisGame(false);

  // Initialize grid arrays
  const size = gameState.getGridSize();
  const emptyGrid = Array(size).fill(null).map(() => Array(size).fill(null));
  gameState.setGrid(emptyGrid);
  gameState.setTileDOMElements(Array(size).fill(null).map(() => Array(size).fill(null)));

  // Create background grid
  if (gridContainer && createBackgroundGridFn) {
    createBackgroundGridFn();
  }

  // Reset falling tile and color index
  gameState.setActiveFallingTile(null);
  gameState.setCurrentColorIndex(0);

  // Spawn the first tile
  if (gridContainer) {
    spawnNewFallingTile();
  }
}

// =============================================================================
// TILE SPAWNING
// =============================================================================

/**
 * Spawns a new falling tile at the top of the grid.
 * Selects a random available column and creates a tile with
 * either value 2 (90% chance) or 4 (10% chance).
 */
export function spawnNewFallingTile() {
  if (gameState.isGameOver() || gameState.isPaused()) {
    return;
  }

  // Clear any existing game interval
  gameState.clearGameInterval();

  const grid = gameState.getGrid();
  const size = gameState.getGridSize();

  // Find available columns in the top row
  const availableCols = [];
  for (let c = 0; c < size; c++) {
    if (grid[0][c] === null) {
      availableCols.push(c);
    }
  }

  // No available columns means we cannot spawn
  if (availableCols.length === 0) {
    return;
  }

  // Create new tile with random value and next color
  const tileValue = Math.random() < 0.9 ? 2 : 4;
  const tileColors = gameState.getTileColors();
  const colorIndex = gameState.getCurrentColorIndex();
  const tileColor = tileColors[colorIndex];

  // Advance color index for next tile
  gameState.incrementColorIndex();

  // Create the tile object
  const newTileObject = { value: tileValue, color: tileColor };

  // Place tile in random available column
  const col = availableCols[Math.floor(Math.random() * availableCols.length)];
  gameState.setGridCell(0, col, newTileObject);

  // Set as active falling tile
  gameState.setActiveFallingTile({
    tileObject: newTileObject,
    row: 0,
    col: col
  });

  // Draw the grid immediately
  if (drawGridFn) {
    drawGridFn();
  }

  // Start the game loop
  const intervalId = setInterval(gameLoop, gameState.getFallSpeed());
  gameState.setGameInterval(intervalId);
}

// =============================================================================
// GAME LOOP
// =============================================================================

/**
 * Main game loop that handles tile falling.
 * Called at regular intervals to move the active falling tile down.
 */
export function gameLoop() {
  if (gameState.isPaused() || gameState.isGameOver()) {
    return;
  }

  const activeFallingTile = gameState.getActiveFallingTile();

  if (!activeFallingTile) {
    // No active tile but interval is running - clean up
    if (gameState.getGameInterval() && !gameState.isPaused() && !gameState.isGameOver()) {
      gameState.clearGameInterval();
    }
    return;
  }

  const { tileObject, row, col } = activeFallingTile;
  const nextRow = row + 1;
  const size = gameState.getGridSize();
  const grid = gameState.getGrid();

  // Check if tile can fall further
  let canFallFurther = false;
  if (nextRow < size && grid[nextRow][col] === null) {
    canFallFurther = true;
  }

  if (canFallFurther) {
    // Move tile down one row
    gameState.setGridCell(row, col, null);
    gameState.setGridCell(nextRow, col, tileObject);
    gameState.setActiveFallingTile({
      tileObject: tileObject,
      row: nextRow,
      col: col
    });
  } else {
    // Tile has landed
    gameState.setActiveFallingTile(null);
    gameState.clearGameInterval();

    // Check for game over
    if (!gameState.isGameOver() && isBoardFull()) {
      handleGameOver();
    }
  }

  // Update display
  if (drawGridFn) {
    drawGridFn();
  }
}

// =============================================================================
// GAME OVER HANDLING
// =============================================================================

/**
 * Handles the game over state.
 * Stops the game loop, displays game over message,
 * and shows high score notification if applicable.
 */
export function handleGameOver() {
  const { messageContainer, messageParagraph, bestScoreDisplay, tryAgainButton } = getDOMElements();

  gameState.setGameOver(true);
  gameState.clearGameInterval();

  // Show the message container
  if (messageContainer) {
    messageContainer.style.display = 'flex';
  }

  // Build game over message
  // Note: innerHTML is safe here as content is hardcoded, not user-provided
  if (messageContainer && messageParagraph) {
    let gameOverHTML = 'Game Over!';

    // Display the new high score message if the flag is set
    if (gameState.getNewBestScoreAchievedThisGame()) {
      // Ensure the best score glow is active
      if (bestScoreDisplay && !bestScoreDisplay.classList.contains('best-score-glow')) {
        bestScoreDisplay.classList.add('best-score-glow');
      }
      gameOverHTML += '<br><span class="new-high-score-emphasis">New High Score!</span>';
    }
    messageParagraph.innerHTML = gameOverHTML;
  }

  // Clear active falling tile
  gameState.setActiveFallingTile(null);

  // Update try again button text
  if (tryAgainButton) {
    tryAgainButton.textContent = 'Try Again';
  }
}

// =============================================================================
// PAUSE/RESUME
// =============================================================================

/**
 * Toggles the game between paused and running states.
 * Updates UI elements and manages the game interval accordingly.
 */
export function togglePauseGame() {
  const { pauseButton, tryAgainButton, messageContainer, messageParagraph } = getDOMElements();

  // Cannot pause if game is over
  if (gameState.isGameOver()) {
    return;
  }

  const currentlyPaused = gameState.isPaused();
  gameState.setPaused(!currentlyPaused);

  if (gameState.isPaused()) {
    // Pausing the game
    gameState.clearGameInterval();

    if (pauseButton) {
      pauseButton.innerHTML = '<img src="icons/Play.png" alt="Play" class="button-icon">Resume';
    }
    if (tryAgainButton) {
      tryAgainButton.style.display = 'none';
    }
    if (messageContainer && messageParagraph) {
      messageParagraph.textContent = 'Game Paused';
      messageContainer.style.display = 'flex';
    }
  } else {
    // Resuming the game
    if (pauseButton) {
      pauseButton.innerHTML = '<img src="icons/Pause.png" alt="Pause" class="button-icon">Pause';
    }
    if (tryAgainButton) {
      tryAgainButton.style.display = 'flex';
    }
    if (messageContainer) {
      messageContainer.style.display = 'none';
      if (messageParagraph) {
        messageParagraph.textContent = '';
      }
    }

    // Restart the game loop if there's an active falling tile
    if (gameState.getActiveFallingTile() && !gameState.isGameOver()) {
      gameState.clearGameInterval(); // Ensure no duplicate intervals
      const intervalId = setInterval(gameLoop, gameState.getFallSpeed());
      gameState.setGameInterval(intervalId);
    }
  }
}
