/**
 * Main entry point for Chroma48 game
 * Initializes all modules and sets up event listeners
 */

// State management imports
import {
  gameState,
  getDOMElements,
  initializeDOMElements,
  registerEventListener,
  setConfettiInstance
} from './state/gameState.js';

// Core game logic imports
import {
  setupGame,
  gameLoop,
  spawnNewFallingTile,
  handleGameOver,
  togglePauseGame,
  setDrawGridFn,
  setCreateBackgroundGridFn
} from './game/core.js';

// Movement logic imports
import {
  moveTilesLeft,
  moveTilesRight,
  moveTilesUp,
  moveTilesDown,
  moveAndMergeTiles
} from './game/movement.js';

// Scoring imports
import {
  updateScore,
  updateBestScore,
  triggerConfettiEffect
} from './game/scoring.js';

// UI renderer imports
import {
  drawGrid,
  createBackgroundGrid,
  calculateTilePosition,
  ensureTileElement
} from './ui/renderer.js';

// Modal UI imports
import {
  openSettingsModal,
  closeSettingsModal,
  saveSettings,
  showInstructionsModal
} from './ui/modals.js';

// Message UI imports
import {
  showGameOverMessage,
  showPauseMessage,
  hideMessage
} from './ui/messages.js';

// Input handling imports
import {
  handleUserKeyPress,
  setGameApi as setKeyboardGameApi
} from './input/keyboard.js';

import {
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  setGameApi as setTouchGameApi
} from './input/touch.js';

// Settings imports
import {
  populateSettingsColorPalette,
  handleSettingsColorPickerInput
} from './settings/colorPalette.js';

import {
  loadBestScore,
  saveBestScore
} from './settings/persistence.js';

/**
 * Game API object wrapping all imported functions for backwards compatibility
 */
const gameApi = {
  // State
  gameState,
  getDOMElements,
  initializeDOMElements,
  registerEventListener,
  setConfettiInstance,

  // Core game
  setupGame,
  gameLoop,
  spawnNewFallingTile,
  handleGameOver,
  togglePauseGame,
  setDrawGridFn,
  setCreateBackgroundGridFn,

  // Movement
  moveTilesLeft,
  moveTilesRight,
  moveTilesUp,
  moveTilesDown,
  moveAndMergeTiles,

  // Scoring
  updateScore,
  updateBestScore,
  triggerConfettiEffect,

  // Renderer
  drawGrid,
  createBackgroundGrid,
  calculateTilePosition,
  ensureTileElement,

  // Modals
  openSettingsModal,
  closeSettingsModal,
  saveSettings,
  showInstructionsModal,

  // Messages
  showGameOverMessage,
  showPauseMessage,
  hideMessage,

  // Input
  handleUserKeyPress,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,

  // Settings
  populateSettingsColorPalette,
  handleSettingsColorPickerInput,
  loadBestScore,
  saveBestScore
};

// Set up gameApi references for input modules
setKeyboardGameApi(gameApi);
setTouchGameApi(gameApi);

// Set up renderer function references for core module
setDrawGridFn(drawGrid);
setCreateBackgroundGridFn(createBackgroundGrid);

/**
 * Initialize the game when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM element references
  initializeDOMElements();

  // Create confetti instance for celebration effects
  setConfettiInstance(new JSConfetti());

  // Load best score from localStorage
  gameState.setBestScore(loadBestScore());

  // Start the game
  setupGame();

  // Get DOM elements for event listener registration
  const elements = getDOMElements();

  // Register restart button click handler
  registerEventListener(elements.restartButton, 'click', setupGame);

  // Register try again button click handler
  registerEventListener(elements.tryAgainButton, 'click', () => {
    if (gameState.isGameOver()) {
      setupGame();
    } else {
      togglePauseGame();
    }
  });

  // Register pause button click handler
  registerEventListener(elements.pauseButton, 'click', togglePauseGame);

  // Register keyboard input handler
  registerEventListener(document, 'keydown', handleUserKeyPress);

  // Register instructions toggle button click handler
  registerEventListener(elements.toggleButton, 'click', () => {
    const isCurrentlyVisible = elements.instructionsContent.classList.contains('visible');
    showInstructionsModal(!isCurrentlyVisible);
  });

  // Register close instructions button click handler
  registerEventListener(elements.closeInstructionsButton, 'click', () => {
    showInstructionsModal(false);
  });

  // Register settings modal controls
  registerEventListener(elements.viewportSettingsButton, 'click', openSettingsModal);
  registerEventListener(elements.closeSettingsModalButton, 'click', closeSettingsModal);
  registerEventListener(elements.saveSettingsButton, 'click', saveSettings);
  registerEventListener(elements.cancelSettingsButton, 'click', closeSettingsModal);

  // Register color picker input handler
  registerEventListener(elements.colorPickerInput, 'input', handleSettingsColorPickerInput);

  // Register touch event handlers for mobile gameplay
  registerEventListener(elements.gridContainer, 'touchstart', handleTouchStart, { passive: false });
  registerEventListener(elements.gridContainer, 'touchmove', handleTouchMove, { passive: false });
  registerEventListener(elements.gridContainer, 'touchend', handleTouchEnd, { passive: true });
});

// Export gameApi for external use
export { gameApi };

// Also expose on window for browser compatibility
if (typeof window !== 'undefined') {
  window.Chroma48 = gameApi;
}
