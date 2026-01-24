/**
 * Keyboard Input Handler Module for Chroma48
 *
 * Handles keyboard input events for game controls including:
 * - Arrow key movement (up, down, left, right)
 * - Debug shortcuts (Ctrl+E for confetti, Ctrl+G for game over)
 *
 * @module input/keyboard
 */

import gameState, { getDOMElements } from '../state/gameState.js';

/**
 * Placeholder for movement functions - will be injected or imported
 * @type {Object|null}
 */
let gameApi = null;

/**
 * Set the game API reference for movement functions
 * @param {Object} api - The game API object with movement methods
 */
export function setGameApi(api) {
  gameApi = api;
}

// =============================================================================
// KEYBOARD HANDLER
// =============================================================================

/**
 * Handles keyboard input for game controls.
 *
 * Supported keys:
 * - ArrowUp: Move tiles up
 * - ArrowDown: Move tiles down
 * - ArrowLeft: Move tiles left
 * - ArrowRight: Move tiles right
 * - Ctrl+E / Cmd+E: Trigger confetti effect (debug)
 * - Ctrl+G / Cmd+G: Trigger game over (debug)
 *
 * Ignores input when:
 * - Focus is on an input/textarea element
 * - Modal is active
 * - Game is over
 * - Game is paused
 *
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {void}
 */
export function handleUserKeyPress(event) {
  // Ignore input when focused on form elements
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }

  const { scoreDisplay, bestScoreDisplay } = getDOMElements();

  // Debug shortcut: Ctrl+E / Cmd+E - Trigger confetti effect
  if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
    event.preventDefault();

    if (!gameState.getNewBestScoreAchievedThisGame()) {
      // Only trigger confetti if it hasn't been shown this game
      if (gameApi && typeof gameApi.triggerConfettiEffect === 'function') {
        gameApi.triggerConfettiEffect();
      }
    }
    gameState.setNewBestScoreAchievedThisGame(true); // Set flag *after* checking

    if (bestScoreDisplay) bestScoreDisplay.classList.add('best-score-glow');
    if (scoreDisplay) scoreDisplay.classList.add('current-score-glow');
    return;
  }

  // Debug shortcut: Ctrl+G / Cmd+G - Trigger game over
  if ((event.metaKey || event.ctrlKey) && event.key === 'g') {
    event.preventDefault();
    if (gameApi && typeof gameApi.handleGameOver === 'function') {
      gameApi.handleGameOver();
    }
    return;
  }

  // Check game state - ignore input if modal active, game over, or paused
  const state = gameState.getState();
  if (state.isModalActive || state.isGameOver || state.isPaused) {
    return;
  }

  // Check if a tile was falling when key was pressed (for spawn logic)
  const wasTileFallingWhenKeyPressed = gameState.getActiveFallingTile() !== null;

  let moved = false;

  // Handle arrow key movement
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      if (gameApi && typeof gameApi.moveTilesUp === 'function') {
        moved = gameApi.moveTilesUp();
      }
      break;
    case 'ArrowDown':
      event.preventDefault();
      if (gameApi && typeof gameApi.moveTilesDown === 'function') {
        moved = gameApi.moveTilesDown();
      }
      break;
    case 'ArrowLeft':
      event.preventDefault();
      if (gameApi && typeof gameApi.moveTilesLeft === 'function') {
        moved = gameApi.moveTilesLeft();
      }
      break;
    case 'ArrowRight':
      event.preventDefault();
      if (gameApi && typeof gameApi.moveTilesRight === 'function') {
        moved = gameApi.moveTilesRight();
      }
      break;
    default:
      return;
  }

  // Handle post-move logic
  if (moved && gameApi) {
    // Spawn new falling tile if none was falling when key was pressed
    if (!wasTileFallingWhenKeyPressed && typeof gameApi.spawnNewFallingTile === 'function') {
      gameApi.spawnNewFallingTile();
    }

    // Check for game over condition
    if (!gameState.isGameOver() && typeof gameApi.isBoardFull === 'function' && gameApi.isBoardFull()) {
      if (typeof gameApi.handleGameOver === 'function') {
        gameApi.handleGameOver();
      }
    }

    // Redraw grid for immediate visual feedback
    if (typeof gameApi.drawGrid === 'function') {
      gameApi.drawGrid();
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default handleUserKeyPress;
