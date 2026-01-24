/**
 * Centralized State Management Module for Chroma48
 *
 * This module encapsulates all game state into a single manager, fixing:
 * - Bug #1: touchStartX/touchStartY implicit globals (now properly initialized as null)
 * - Bug #2: Event listener memory leaks (event listener registry with cleanup)
 *
 * @module gameState
 */

// =============================================================================
// INITIAL STATE DEFINITION
// =============================================================================

/**
 * Default tile color palette
 * @constant {string[]}
 */
const TILE_COLORS_DEFAULT = ['#F7A161', '#F6CC5B', '#F3BE78', '#88B983'];

/**
 * Initial state object containing all game state with proper defaults.
 * Touch coordinates use null instead of 0 to fix the (0,0) edge case bug.
 *
 * @constant {Object}
 */
export const INITIAL_STATE = Object.freeze({
  // Grid state
  grid: null, // Will be initialized as 2D array
  tileDOMElements: null, // Will be initialized as 2D array
  GRID_SIZE: 4,

  // Game state
  activeFallingTile: null,
  score: 0,
  bestScore: 0,
  isGameOver: false,
  isPaused: false,
  gameInterval: null,
  newBestScoreAchievedThisGame: false,

  // Color state
  TILE_COLORS: [...TILE_COLORS_DEFAULT],
  TILE_COLORS_DEFAULT: [...TILE_COLORS_DEFAULT],
  currentColorIndex: 0,
  isColorMode: false,

  // UI state
  isModalActive: false,

  // Touch state - FIX for bug #1: properly initialized instead of implicit globals
  touchStartX: null,
  touchStartY: null,
  hasTouchStarted: false,

  // Settings temp state
  tempIsColorMode: false,
  tempTileColors: [...TILE_COLORS_DEFAULT],
  settingsCurrentEditingSwatchIndex: -1,

  // Constants
  FALL_SPEED: 500,
  SWIPE_THRESHOLD: 30,
});

// =============================================================================
// DOM ELEMENTS MANAGEMENT
// =============================================================================

/**
 * DOM element references storage
 * @type {Object}
 */
const domElements = {
  gameContainer: null,
  gridContainer: null,
  scoreDisplay: null,
  bestScoreDisplay: null,
  messageContainer: null,
  messageParagraph: null,
  restartButton: null,
  tryAgainButton: null,
  pauseButton: null,
  gameExplanation: null,
  viewportSettingsButton: null,
  settingsModal: null,
  closeSettingsModalButton: null,
  numberModeRadio: null,
  colorModeRadio: null,
  settingsColorPaletteGrid: null,
  saveSettingsButton: null,
  cancelSettingsButton: null,
  colorPickerInput: null,
  paletteSuccessMessage: null,
  toggleButton: null,
  instructionsContent: null,
  collapsibleDrawer: null,
  toggleButtonArrow: null,
  closeInstructionsButton_collapsible: null,
};

/**
 * Get all DOM element references
 * @returns {Object} Copy of DOM elements object
 */
export function getDOMElements() {
  return { ...domElements };
}

/**
 * Set a specific DOM element reference
 * @param {string} key - The element key
 * @param {Element|null} element - The DOM element
 * @throws {Error} If key is not a valid DOM element key
 */
export function setDOMElement(key, element) {
  if (!(key in domElements)) {
    throw new Error(`Invalid DOM element key: ${key}. Valid keys are: ${Object.keys(domElements).join(', ')}`);
  }
  if (element !== null && !(element instanceof Element)) {
    throw new Error(`DOM element for "${key}" must be an Element or null`);
  }
  domElements[key] = element;
}

/**
 * Initialize all DOM element references from the document
 * Should be called once after DOMContentLoaded
 */
export function initializeDOMElements() {
  if (typeof document === 'undefined') {
    return;
  }

  domElements.gameContainer = document.querySelector('.game-container');
  domElements.gridContainer = document.getElementById('grid-container');
  domElements.scoreDisplay = document.getElementById('score');
  domElements.bestScoreDisplay = document.getElementById('best-score');
  domElements.messageContainer = document.getElementById('game-message');
  domElements.messageParagraph = domElements.messageContainer
    ? domElements.messageContainer.querySelector('p')
    : null;
  domElements.restartButton = document.getElementById('restart-button');
  domElements.tryAgainButton = document.getElementById('retry-button');
  domElements.pauseButton = document.getElementById('pause-button');
  domElements.gameExplanation = document.querySelector('.game-explanation');
  domElements.viewportSettingsButton = document.getElementById('viewport-settings-button');
  domElements.settingsModal = document.getElementById('settings-modal');
  domElements.closeSettingsModalButton = document.getElementById('close-settings-modal-btn');
  domElements.numberModeRadio = document.getElementById('number-mode-radio');
  domElements.colorModeRadio = document.getElementById('color-mode-radio');
  domElements.settingsColorPaletteGrid = document.getElementById('settings-color-palette-grid');
  domElements.saveSettingsButton = document.getElementById('save-settings-button');
  domElements.cancelSettingsButton = document.getElementById('cancel-settings-button');
  domElements.colorPickerInput = document.getElementById('color-picker-input');
  domElements.paletteSuccessMessage = document.getElementById('palette-success-message');
  domElements.toggleButton = document.getElementById('toggle-instructions-btn');
  domElements.instructionsContent = document.getElementById('instructions-content');
  domElements.collapsibleDrawer = document.querySelector('.collapsible-drawer');

  if (domElements.instructionsContent) {
    domElements.closeInstructionsButton_collapsible =
      domElements.instructionsContent.querySelector('.modal-close-button');
  }

  if (domElements.toggleButton) {
    domElements.toggleButtonArrow = domElements.toggleButton.querySelector('.arrow');
  }
}

// =============================================================================
// EVENT LISTENER REGISTRY - FIX for bug #2
// =============================================================================

/**
 * Event listener registry to track all registered listeners for cleanup
 * Structure: Map<Element, Map<eventType, {handler, options}>>
 * @type {Map}
 */
const eventListenerRegistry = new Map();

/**
 * Register an event listener with automatic tracking for cleanup.
 * Removes any existing listener of the same type on the element before adding.
 *
 * @param {EventTarget} element - The DOM element to attach the listener to
 * @param {string} type - The event type (e.g., 'click', 'keydown')
 * @param {Function} handler - The event handler function
 * @param {Object|boolean} [options] - Event listener options
 * @throws {Error} If element is not an EventTarget or handler is not a function
 */
export function registerEventListener(element, type, handler, options = false) {
  if (!element || typeof element.addEventListener !== 'function') {
    throw new Error('Element must be an EventTarget with addEventListener method');
  }
  if (typeof type !== 'string' || type.trim() === '') {
    throw new Error('Event type must be a non-empty string');
  }
  if (typeof handler !== 'function') {
    throw new Error('Handler must be a function');
  }

  // Get or create the element's listener map
  if (!eventListenerRegistry.has(element)) {
    eventListenerRegistry.set(element, new Map());
  }
  const elementListeners = eventListenerRegistry.get(element);

  // Remove existing listener of the same type if present
  if (elementListeners.has(type)) {
    const existing = elementListeners.get(type);
    element.removeEventListener(type, existing.handler, existing.options);
  }

  // Add the new listener
  element.addEventListener(type, handler, options);

  // Store in registry
  elementListeners.set(type, { handler, options });
}

/**
 * Remove all registered event listeners.
 * Cleans up all listeners tracked in the registry.
 */
export function cleanupEventListeners() {
  for (const [element, listeners] of eventListenerRegistry) {
    for (const [type, { handler, options }] of listeners) {
      element.removeEventListener(type, handler, options);
    }
    listeners.clear();
  }
  eventListenerRegistry.clear();
}

/**
 * Get the event listener registry (for testing purposes)
 * @returns {Map} The event listener registry
 */
export function getEventListenerRegistry() {
  return eventListenerRegistry;
}

// =============================================================================
// CONFETTI INSTANCE MANAGEMENT
// =============================================================================

/**
 * JSConfetti instance storage
 * @type {Object|null}
 */
let confettiInstance = null;

/**
 * Get the confetti instance
 * @returns {Object|null} The JSConfetti instance or null
 */
export function getConfettiInstance() {
  return confettiInstance;
}

/**
 * Set the confetti instance
 * @param {Object|null} instance - The JSConfetti instance
 */
export function setConfettiInstance(instance) {
  confettiInstance = instance;
}

// =============================================================================
// STATE MANAGER FACTORY
// =============================================================================

/**
 * Creates a new state manager instance with encapsulated game state.
 *
 * @returns {Object} State manager with getters, setters, and management functions
 */
export function createStateManager() {
  // Internal state - deep copy of initial state
  const state = {
    // Grid
    grid: Array(INITIAL_STATE.GRID_SIZE).fill(null).map(() => Array(INITIAL_STATE.GRID_SIZE).fill(null)),
    tileDOMElements: Array(INITIAL_STATE.GRID_SIZE).fill(null).map(() => Array(INITIAL_STATE.GRID_SIZE).fill(null)),
    GRID_SIZE: INITIAL_STATE.GRID_SIZE,

    // Game
    activeFallingTile: null,
    score: INITIAL_STATE.score,
    bestScore: INITIAL_STATE.bestScore,
    isGameOver: INITIAL_STATE.isGameOver,
    isPaused: INITIAL_STATE.isPaused,
    gameInterval: null,
    newBestScoreAchievedThisGame: INITIAL_STATE.newBestScoreAchievedThisGame,

    // Color
    TILE_COLORS: [...INITIAL_STATE.TILE_COLORS],
    TILE_COLORS_DEFAULT: [...INITIAL_STATE.TILE_COLORS_DEFAULT],
    currentColorIndex: INITIAL_STATE.currentColorIndex,
    isColorMode: INITIAL_STATE.isColorMode,

    // UI
    isModalActive: INITIAL_STATE.isModalActive,

    // Touch - properly initialized to null (FIX for bug #1)
    touchStartX: null,
    touchStartY: null,
    hasTouchStarted: false,

    // Settings temp
    tempIsColorMode: INITIAL_STATE.tempIsColorMode,
    tempTileColors: [...INITIAL_STATE.tempTileColors],
    settingsCurrentEditingSwatchIndex: INITIAL_STATE.settingsCurrentEditingSwatchIndex,

    // Constants
    FALL_SPEED: INITIAL_STATE.FALL_SPEED,
    SWIPE_THRESHOLD: INITIAL_STATE.SWIPE_THRESHOLD,
  };

  // =============================================================================
  // VALIDATION HELPERS
  // =============================================================================

  function validateBoolean(value, name) {
    if (typeof value !== 'boolean') {
      throw new Error(`${name} must be a boolean, received: ${typeof value}`);
    }
  }

  function validateNumber(value, name, { min, max, integer = false } = {}) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new Error(`${name} must be a number, received: ${typeof value}`);
    }
    if (integer && !Number.isInteger(value)) {
      throw new Error(`${name} must be an integer`);
    }
    if (min !== undefined && value < min) {
      throw new Error(`${name} must be >= ${min}, received: ${value}`);
    }
    if (max !== undefined && value > max) {
      throw new Error(`${name} must be <= ${max}, received: ${value}`);
    }
  }

  function validateGrid(grid) {
    if (!Array.isArray(grid)) {
      throw new Error('Grid must be an array');
    }
    if (grid.length !== state.GRID_SIZE) {
      throw new Error(`Grid must have ${state.GRID_SIZE} rows, received: ${grid.length}`);
    }
    for (let i = 0; i < grid.length; i++) {
      if (!Array.isArray(grid[i]) || grid[i].length !== state.GRID_SIZE) {
        throw new Error(`Grid row ${i} must be an array of length ${state.GRID_SIZE}`);
      }
    }
  }

  function validateColorArray(colors, name) {
    if (!Array.isArray(colors)) {
      throw new Error(`${name} must be an array`);
    }
    for (let i = 0; i < colors.length; i++) {
      if (typeof colors[i] !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(colors[i])) {
        throw new Error(`${name}[${i}] must be a valid hex color (e.g., #FF0000), received: ${colors[i]}`);
      }
    }
  }

  function validateTileObject(tile, allowNull = true) {
    if (tile === null) {
      if (!allowNull) {
        throw new Error('Tile object cannot be null');
      }
      return;
    }
    if (typeof tile !== 'object') {
      throw new Error('Tile must be an object or null');
    }
    if (typeof tile.value !== 'number' || tile.value < 2) {
      throw new Error('Tile value must be a number >= 2');
    }
    if (typeof tile.color !== 'string') {
      throw new Error('Tile color must be a string');
    }
  }

  function validateActiveFallingTile(tile) {
    if (tile === null) return;
    if (typeof tile !== 'object') {
      throw new Error('Active falling tile must be an object or null');
    }
    if (!tile.tileObject || typeof tile.row !== 'number' || typeof tile.col !== 'number') {
      throw new Error('Active falling tile must have tileObject, row, and col properties');
    }
    validateTileObject(tile.tileObject, false);
  }

  // =============================================================================
  // DEEP COPY HELPERS
  // =============================================================================

  function deepCopyGrid(grid) {
    return grid.map(row =>
      row.map(cell =>
        cell === null ? null : { ...cell }
      )
    );
  }

  function deepCopyActiveFallingTile(tile) {
    if (tile === null) return null;
    return {
      tileObject: { ...tile.tileObject },
      row: tile.row,
      col: tile.col,
    };
  }

  // =============================================================================
  // STATE MANAGER API
  // =============================================================================

  return {
    // -------------------------------------------------------------------------
    // Full State Getters (returns immutable copies)
    // -------------------------------------------------------------------------

    /**
     * Get complete state snapshot (immutable copy)
     * @returns {Object} Complete state object
     */
    getState() {
      return {
        grid: deepCopyGrid(state.grid),
        tileDOMElements: state.tileDOMElements.map(row => [...row]),
        GRID_SIZE: state.GRID_SIZE,
        activeFallingTile: deepCopyActiveFallingTile(state.activeFallingTile),
        score: state.score,
        bestScore: state.bestScore,
        isGameOver: state.isGameOver,
        isPaused: state.isPaused,
        gameInterval: state.gameInterval,
        newBestScoreAchievedThisGame: state.newBestScoreAchievedThisGame,
        TILE_COLORS: [...state.TILE_COLORS],
        TILE_COLORS_DEFAULT: [...state.TILE_COLORS_DEFAULT],
        currentColorIndex: state.currentColorIndex,
        isColorMode: state.isColorMode,
        isModalActive: state.isModalActive,
        touchStartX: state.touchStartX,
        touchStartY: state.touchStartY,
        hasTouchStarted: state.hasTouchStarted,
        tempIsColorMode: state.tempIsColorMode,
        tempTileColors: [...state.tempTileColors],
        settingsCurrentEditingSwatchIndex: state.settingsCurrentEditingSwatchIndex,
        FALL_SPEED: state.FALL_SPEED,
        SWIPE_THRESHOLD: state.SWIPE_THRESHOLD,
      };
    },

    // -------------------------------------------------------------------------
    // Grid Getters/Setters
    // -------------------------------------------------------------------------

    /**
     * Get grid state (immutable copy)
     * @returns {Array[]} 2D grid array
     */
    getGrid() {
      return deepCopyGrid(state.grid);
    },

    /**
     * Set grid state
     * @param {Array[]} newGrid - New 2D grid array
     */
    setGrid(newGrid) {
      validateGrid(newGrid);
      state.grid = deepCopyGrid(newGrid);
    },

    /**
     * Get a specific grid cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {Object|null} Tile object or null
     */
    getGridCell(row, col) {
      validateNumber(row, 'row', { min: 0, max: state.GRID_SIZE - 1, integer: true });
      validateNumber(col, 'col', { min: 0, max: state.GRID_SIZE - 1, integer: true });
      const cell = state.grid[row][col];
      return cell === null ? null : { ...cell };
    },

    /**
     * Set a specific grid cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {Object|null} tile - Tile object or null
     */
    setGridCell(row, col, tile) {
      validateNumber(row, 'row', { min: 0, max: state.GRID_SIZE - 1, integer: true });
      validateNumber(col, 'col', { min: 0, max: state.GRID_SIZE - 1, integer: true });
      validateTileObject(tile, true);
      state.grid[row][col] = tile === null ? null : { ...tile };
    },

    /**
     * Get grid size constant
     * @returns {number} Grid size
     */
    getGridSize() {
      return state.GRID_SIZE;
    },

    /**
     * Get tile DOM elements array (mutable - for direct DOM manipulation)
     * @returns {Array[]} 2D array of DOM elements
     */
    getTileDOMElements() {
      return state.tileDOMElements;
    },

    /**
     * Set tile DOM elements array
     * @param {Array[]} elements - 2D array of DOM elements
     */
    setTileDOMElements(elements) {
      if (!Array.isArray(elements)) {
        throw new Error('Tile DOM elements must be an array');
      }
      state.tileDOMElements = elements;
    },

    /**
     * Get a specific tile DOM element
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {Element|null} DOM element or null
     */
    getTileDOMElement(row, col) {
      validateNumber(row, 'row', { min: 0, max: state.GRID_SIZE - 1, integer: true });
      validateNumber(col, 'col', { min: 0, max: state.GRID_SIZE - 1, integer: true });
      return state.tileDOMElements[row][col];
    },

    /**
     * Set a specific tile DOM element
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {Element|null} element - DOM element or null
     */
    setTileDOMElement(row, col, element) {
      validateNumber(row, 'row', { min: 0, max: state.GRID_SIZE - 1, integer: true });
      validateNumber(col, 'col', { min: 0, max: state.GRID_SIZE - 1, integer: true });
      state.tileDOMElements[row][col] = element;
    },

    // -------------------------------------------------------------------------
    // Game State Getters/Setters
    // -------------------------------------------------------------------------

    /**
     * Get score
     * @returns {number} Current score
     */
    getScore() {
      return state.score;
    },

    /**
     * Set score
     * @param {number} score - New score value
     */
    setScore(score) {
      validateNumber(score, 'score', { min: 0, integer: true });
      state.score = score;
    },

    /**
     * Add points to score
     * @param {number} points - Points to add
     */
    addScore(points) {
      validateNumber(points, 'points', { min: 0, integer: true });
      state.score += points;
    },

    /**
     * Get best score
     * @returns {number} Best score
     */
    getBestScore() {
      return state.bestScore;
    },

    /**
     * Set best score
     * @param {number} score - New best score value
     */
    setBestScore(score) {
      validateNumber(score, 'score', { min: 0, integer: true });
      state.bestScore = score;
    },

    /**
     * Check if game is over
     * @returns {boolean} Game over state
     */
    isGameOver() {
      return state.isGameOver;
    },

    /**
     * Set game over state
     * @param {boolean} value - Game over state
     */
    setGameOver(value) {
      validateBoolean(value, 'isGameOver');
      state.isGameOver = value;
    },

    /**
     * Check if game is paused
     * @returns {boolean} Paused state
     */
    isPaused() {
      return state.isPaused;
    },

    /**
     * Set paused state
     * @param {boolean} value - Paused state
     */
    setPaused(value) {
      validateBoolean(value, 'isPaused');
      state.isPaused = value;
    },

    /**
     * Get active falling tile
     * @returns {Object|null} Active falling tile or null
     */
    getActiveFallingTile() {
      return deepCopyActiveFallingTile(state.activeFallingTile);
    },

    /**
     * Set active falling tile
     * @param {Object|null} tile - Active falling tile object or null
     */
    setActiveFallingTile(tile) {
      validateActiveFallingTile(tile);
      state.activeFallingTile = deepCopyActiveFallingTile(tile);
    },

    /**
     * Check if new best score was achieved this game
     * @returns {boolean} Achievement flag
     */
    getNewBestScoreAchievedThisGame() {
      return state.newBestScoreAchievedThisGame;
    },

    /**
     * Set new best score achieved flag
     * @param {boolean} value - Achievement flag
     */
    setNewBestScoreAchievedThisGame(value) {
      validateBoolean(value, 'newBestScoreAchievedThisGame');
      state.newBestScoreAchievedThisGame = value;
    },

    // -------------------------------------------------------------------------
    // Game Interval Management
    // -------------------------------------------------------------------------

    /**
     * Get game interval ID
     * @returns {number|null} Interval ID or null
     */
    getGameInterval() {
      return state.gameInterval;
    },

    /**
     * Set game interval ID
     * @param {number|null} id - Interval ID
     */
    setGameInterval(id) {
      if (id !== null && typeof id !== 'number') {
        throw new Error('Game interval must be a number or null');
      }
      state.gameInterval = id;
    },

    /**
     * Clear game interval and reset to null
     */
    clearGameInterval() {
      if (state.gameInterval !== null) {
        clearInterval(state.gameInterval);
        state.gameInterval = null;
      }
    },

    // -------------------------------------------------------------------------
    // Color State Getters/Setters
    // -------------------------------------------------------------------------

    /**
     * Get tile colors array
     * @returns {string[]} Array of hex color strings
     */
    getTileColors() {
      return [...state.TILE_COLORS];
    },

    /**
     * Set tile colors array
     * @param {string[]} colors - Array of hex color strings
     */
    setTileColors(colors) {
      validateColorArray(colors, 'TILE_COLORS');
      state.TILE_COLORS = [...colors];
    },

    /**
     * Get default tile colors
     * @returns {string[]} Array of default hex colors
     */
    getTileColorsDefault() {
      return [...state.TILE_COLORS_DEFAULT];
    },

    /**
     * Get current color index
     * @returns {number} Current color index
     */
    getCurrentColorIndex() {
      return state.currentColorIndex;
    },

    /**
     * Set current color index
     * @param {number} index - Color index
     */
    setCurrentColorIndex(index) {
      validateNumber(index, 'currentColorIndex', { min: 0, integer: true });
      state.currentColorIndex = index;
    },

    /**
     * Increment color index (with wraparound)
     */
    incrementColorIndex() {
      state.currentColorIndex = (state.currentColorIndex + 1) % state.TILE_COLORS.length;
    },

    /**
     * Check if color mode is active
     * @returns {boolean} Color mode state
     */
    getIsColorMode() {
      return state.isColorMode;
    },

    /**
     * Set color mode
     * @param {boolean} value - Color mode state
     */
    setIsColorMode(value) {
      validateBoolean(value, 'isColorMode');
      state.isColorMode = value;
    },

    // -------------------------------------------------------------------------
    // UI State Getters/Setters
    // -------------------------------------------------------------------------

    /**
     * Check if modal is active
     * @returns {boolean} Modal active state
     */
    getIsModalActive() {
      return state.isModalActive;
    },

    /**
     * Set modal active state
     * @param {boolean} value - Modal active state
     */
    setIsModalActive(value) {
      validateBoolean(value, 'isModalActive');
      state.isModalActive = value;
    },

    // -------------------------------------------------------------------------
    // Touch State Getters/Setters - FIX for bug #1
    // -------------------------------------------------------------------------

    /**
     * Get touch start coordinates
     * Returns null values when no touch has started (fixes 0,0 edge case)
     * @returns {{x: number|null, y: number|null, hasStarted: boolean}} Touch start state
     */
    getTouchStart() {
      return {
        x: state.touchStartX,
        y: state.touchStartY,
        hasStarted: state.hasTouchStarted,
      };
    },

    /**
     * Set touch start coordinates
     * @param {number|null} x - X coordinate or null to reset
     * @param {number|null} y - Y coordinate or null to reset
     */
    setTouchStart(x, y) {
      if (x === null && y === null) {
        state.touchStartX = null;
        state.touchStartY = null;
        state.hasTouchStarted = false;
        return;
      }
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('Touch coordinates must be numbers or both null');
      }
      state.touchStartX = x;
      state.touchStartY = y;
      state.hasTouchStarted = true;
    },

    /**
     * Reset touch state to initial values
     */
    resetTouchStart() {
      state.touchStartX = null;
      state.touchStartY = null;
      state.hasTouchStarted = false;
    },

    // -------------------------------------------------------------------------
    // Settings Temp State Getters/Setters
    // -------------------------------------------------------------------------

    /**
     * Get temp color mode setting
     * @returns {boolean} Temp color mode
     */
    getTempIsColorMode() {
      return state.tempIsColorMode;
    },

    /**
     * Set temp color mode setting
     * @param {boolean} value - Temp color mode
     */
    setTempIsColorMode(value) {
      validateBoolean(value, 'tempIsColorMode');
      state.tempIsColorMode = value;
    },

    /**
     * Get temp tile colors
     * @returns {string[]} Array of hex colors
     */
    getTempTileColors() {
      return [...state.tempTileColors];
    },

    /**
     * Set temp tile colors
     * @param {string[]} colors - Array of hex colors
     */
    setTempTileColors(colors) {
      validateColorArray(colors, 'tempTileColors');
      state.tempTileColors = [...colors];
    },

    /**
     * Get settings current editing swatch index
     * @returns {number} Swatch index (-1 if none)
     */
    getSettingsCurrentEditingSwatchIndex() {
      return state.settingsCurrentEditingSwatchIndex;
    },

    /**
     * Set settings current editing swatch index
     * @param {number} index - Swatch index (-1 for none)
     */
    setSettingsCurrentEditingSwatchIndex(index) {
      validateNumber(index, 'settingsCurrentEditingSwatchIndex', { min: -1, integer: true });
      state.settingsCurrentEditingSwatchIndex = index;
    },

    // -------------------------------------------------------------------------
    // Constants Getters
    // -------------------------------------------------------------------------

    /**
     * Get fall speed constant
     * @returns {number} Fall speed in milliseconds
     */
    getFallSpeed() {
      return state.FALL_SPEED;
    },

    /**
     * Get swipe threshold constant
     * @returns {number} Swipe threshold in pixels
     */
    getSwipeThreshold() {
      return state.SWIPE_THRESHOLD;
    },

    // -------------------------------------------------------------------------
    // Reset Functions
    // -------------------------------------------------------------------------

    /**
     * Reset game state for a new game
     * Preserves best score and settings
     */
    resetGame() {
      // Clear interval if running
      if (state.gameInterval !== null) {
        clearInterval(state.gameInterval);
        state.gameInterval = null;
      }

      // Reset grid
      state.grid = Array(state.GRID_SIZE).fill(null).map(() => Array(state.GRID_SIZE).fill(null));
      state.tileDOMElements = Array(state.GRID_SIZE).fill(null).map(() => Array(state.GRID_SIZE).fill(null));

      // Reset game state
      state.activeFallingTile = null;
      state.score = 0;
      state.isGameOver = false;
      state.isPaused = false;
      state.newBestScoreAchievedThisGame = false;

      // Reset color index
      state.currentColorIndex = 0;

      // Reset UI
      state.isModalActive = false;

      // Reset touch
      state.touchStartX = null;
      state.touchStartY = null;
      state.hasTouchStarted = false;
    },

    /**
     * Reset to initial state with optional overrides
     * Used primarily for testing
     * @param {Object} [overrides={}] - State values to override
     */
    _resetToInitial(overrides = {}) {
      // Clear interval if running
      if (state.gameInterval !== null) {
        clearInterval(state.gameInterval);
      }

      // Reset all state to initial values
      state.GRID_SIZE = overrides.GRID_SIZE ?? INITIAL_STATE.GRID_SIZE;
      state.grid = overrides.grid
        ? deepCopyGrid(overrides.grid)
        : Array(state.GRID_SIZE).fill(null).map(() => Array(state.GRID_SIZE).fill(null));
      state.tileDOMElements = overrides.tileDOMElements
        ?? Array(state.GRID_SIZE).fill(null).map(() => Array(state.GRID_SIZE).fill(null));

      state.activeFallingTile = overrides.activeFallingTile !== undefined
        ? deepCopyActiveFallingTile(overrides.activeFallingTile)
        : null;
      state.score = overrides.score ?? INITIAL_STATE.score;
      state.bestScore = overrides.bestScore ?? INITIAL_STATE.bestScore;
      state.isGameOver = overrides.isGameOver ?? INITIAL_STATE.isGameOver;
      state.isPaused = overrides.isPaused ?? INITIAL_STATE.isPaused;
      state.gameInterval = overrides.gameInterval ?? null;
      state.newBestScoreAchievedThisGame = overrides.newBestScoreAchievedThisGame ?? INITIAL_STATE.newBestScoreAchievedThisGame;

      state.TILE_COLORS = overrides.TILE_COLORS
        ? [...overrides.TILE_COLORS]
        : [...INITIAL_STATE.TILE_COLORS];
      state.TILE_COLORS_DEFAULT = [...INITIAL_STATE.TILE_COLORS_DEFAULT];
      state.currentColorIndex = overrides.currentColorIndex ?? INITIAL_STATE.currentColorIndex;
      state.isColorMode = overrides.isColorMode ?? INITIAL_STATE.isColorMode;

      state.isModalActive = overrides.isModalActive ?? INITIAL_STATE.isModalActive;

      state.touchStartX = overrides.touchStartX ?? null;
      state.touchStartY = overrides.touchStartY ?? null;
      state.hasTouchStarted = overrides.hasTouchStarted ?? false;

      state.tempIsColorMode = overrides.tempIsColorMode ?? INITIAL_STATE.tempIsColorMode;
      state.tempTileColors = overrides.tempTileColors
        ? [...overrides.tempTileColors]
        : [...INITIAL_STATE.tempTileColors];
      state.settingsCurrentEditingSwatchIndex = overrides.settingsCurrentEditingSwatchIndex
        ?? INITIAL_STATE.settingsCurrentEditingSwatchIndex;
    },
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton state manager instance
 * @type {Object}
 */
export const gameState = createStateManager();

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default gameState;
