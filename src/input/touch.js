/**
 * Touch Input Handler Module for Chroma48
 *
 * Handles touch/swipe input events for mobile game controls.
 *
 * BUG FIXES:
 * - Fixed (0,0) edge case: Uses hasTouchStarted flag instead of checking if x===0 && y===0
 *   This prevents false negatives when user genuinely swipes from top-left corner
 * - Uses centralized gameState for touch coordinates instead of implicit globals
 *
 * @module input/touch
 */

import gameState, { getDOMElements } from '../state/gameState.js';

// =============================================================================
// PLACEHOLDER IMPORTS - Movement functions to be created
// =============================================================================

// TODO: Import these from movement module when created
// import { moveTilesUp, moveTilesDown, moveTilesLeft, moveTilesRight } from '../movement/tiles.js';
// import { spawnNewFallingTile } from '../movement/spawn.js';
// import { isBoardFull } from '../grid/board.js';

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
// TOUCH HANDLERS
// =============================================================================

/**
 * Handles touch start event.
 *
 * Records the starting position of a touch gesture for swipe detection.
 * Uses gameState.setTouchStart() to properly track touch state,
 * fixing the implicit global variable bug.
 *
 * @param {TouchEvent} event - The touch start event
 * @returns {void}
 */
export function handleTouchStart(event) {
  // Ignore if game is over, paused, or multi-touch
  if (gameState.isGameOver() || gameState.isPaused() || event.touches.length > 1) {
    return;
  }

  const { gameContainer } = getDOMElements();

  // Only prevent default if touch is inside game container
  if (gameContainer && gameContainer.contains(event.target)) {
    event.preventDefault();
  }

  // Record touch start position using gameState (fixes implicit global bug)
  const x = event.touches[0].clientX;
  const y = event.touches[0].clientY;
  gameState.setTouchStart(x, y);
}

/**
 * Handles touch move event.
 *
 * Prevents default scrolling behavior when touch is inside the game container
 * to allow for swipe gestures without page scroll.
 *
 * @param {TouchEvent} event - The touch move event
 * @returns {void}
 */
export function handleTouchMove(event) {
  // Ignore if game is over, paused, or invalid touch
  if (gameState.isGameOver() || gameState.isPaused() || !event.touches || event.touches.length > 1) {
    return;
  }

  const { gameContainer } = getDOMElements();

  // Only prevent default if touch is inside game container
  if (gameContainer && gameContainer.contains(event.target)) {
    event.preventDefault();
  }
}

/**
 * Handles touch end event.
 *
 * Calculates swipe direction based on touch start and end positions,
 * then triggers the appropriate movement.
 *
 * BUG FIX: Uses hasTouchStarted flag instead of checking x===0 && y===0
 * This allows swipes that genuinely start from the (0,0) position to work correctly.
 *
 * @param {TouchEvent} event - The touch end event
 * @returns {void}
 */
export function handleTouchEnd(event) {
  // Ignore if game is over or paused
  if (gameState.isGameOver() || gameState.isPaused()) {
    return;
  }

  // Check if changedTouches exists and has data
  if (!event.changedTouches || event.changedTouches.length === 0) {
    // Reset touch state for next sequence
    gameState.setTouchStart(null, null);
    return;
  }

  const touchStart = gameState.getTouchStart();

  // BUG FIX: Use hasTouchStarted flag instead of checking if x===0 && y===0
  // This fixes the edge case where a genuine swipe starts from top-left corner
  if (!touchStart.hasStarted) {
    // No valid touch start recorded, reset and return
    gameState.setTouchStart(null, null);
    return;
  }

  const touchEndX = event.changedTouches[0].clientX;
  const touchEndY = event.changedTouches[0].clientY;
  const deltaX = touchEndX - touchStart.x;
  const deltaY = touchEndY - touchStart.y;

  const swipeThreshold = gameState.getSwipeThreshold();

  // Check if movement exceeds swipe threshold
  if (Math.abs(deltaX) < swipeThreshold && Math.abs(deltaY) < swipeThreshold) {
    // Just a tap, not a swipe - reset and return
    gameState.setTouchStart(null, null);
    return;
  }

  // Determine swipe direction
  let direction = null;
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal swipe
    direction = deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
  } else {
    // Vertical swipe
    direction = deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
  }

  // Process the swipe
  if (direction) {
    _handleSwipe(direction);
  }

  // Reset touch state for next sequence
  gameState.setTouchStart(null, null);
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Processes a swipe gesture and triggers tile movement.
 *
 * @private
 * @param {string} direction - The swipe direction ('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight')
 * @returns {void}
 */
function _handleSwipe(direction) {
  // Check game state - ignore if modal active, game over, or paused
  const state = gameState.getState();
  if (state.isGameOver || state.isPaused || state.isModalActive) {
    return;
  }

  // Check if a tile was falling when swipe occurred (for spawn logic)
  const wasTileFallingWhenSwiped = gameState.getActiveFallingTile() !== null;

  let moved = false;

  // Handle movement based on direction
  if (gameApi) {
    switch (direction) {
      case 'ArrowUp':
        if (typeof gameApi.moveTilesUp === 'function') {
          moved = gameApi.moveTilesUp();
        }
        break;
      case 'ArrowDown':
        if (typeof gameApi.moveTilesDown === 'function') {
          moved = gameApi.moveTilesDown();
        }
        break;
      case 'ArrowLeft':
        if (typeof gameApi.moveTilesLeft === 'function') {
          moved = gameApi.moveTilesLeft();
        }
        break;
      case 'ArrowRight':
        if (typeof gameApi.moveTilesRight === 'function') {
          moved = gameApi.moveTilesRight();
        }
        break;
    }
  }

  // Handle post-move logic
  if (moved && gameApi) {
    // Spawn new falling tile if none was falling when swipe occurred
    if (!wasTileFallingWhenSwiped && typeof gameApi.spawnNewFallingTile === 'function') {
      gameApi.spawnNewFallingTile();
    }

    // Redraw grid for immediate visual feedback
    if (typeof gameApi.drawGrid === 'function') {
      gameApi.drawGrid();
    }

    // Check for game over condition
    if (typeof gameApi.isBoardFull === 'function' && gameApi.isBoardFull()) {
      if (typeof gameApi.handleGameOver === 'function') {
        gameApi.handleGameOver();
      }
    }
  } else if (direction === 'ArrowDown' && wasTileFallingWhenSwiped) {
    // Optional: fast drop logic placeholder (e.g., accelerate drop or move to bottom)
    // console.log("Attempted fast drop on existing falling tile.");
  }
}

// Default export for convenience
export default {
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  setGameApi,
};
