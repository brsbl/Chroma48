/**
 * Color Palette UI Module for Chroma48
 *
 * Handles the color palette UI in the settings modal, including
 * swatch creation, color picker interaction, and mobile optimization.
 *
 * @module colorPalette
 */

import { gameState, getDOMElements } from '../state/gameState.js';

// =============================================================================
// INTERNAL STATE
// =============================================================================

/**
 * Currently selected swatch index for editing (-1 if none)
 * @type {number}
 */
let currentEditingSwatchIndex = -1;

// =============================================================================
// MOBILE DETECTION
// =============================================================================

/**
 * Check if the current device is mobile.
 *
 * @returns {boolean} True if mobile device detected
 */
function isMobileDevice() {
  return window.innerWidth <= 600 || /Mobi|Android/i.test(navigator.userAgent);
}

// =============================================================================
// COLOR PICKER POSITIONING (MOBILE)
// =============================================================================

/**
 * Position the color picker input over a swatch for mobile devices.
 * This overlay technique improves the mobile color picker UX.
 *
 * @param {HTMLInputElement} colorPickerInput - The color picker input element
 * @param {HTMLElement} swatch - The swatch element to position over
 */
function positionColorPickerOverSwatch(colorPickerInput, swatch) {
  const swatchRect = swatch.getBoundingClientRect();
  const inputStyle = colorPickerInput.style;

  inputStyle.position = 'fixed';
  inputStyle.left = swatchRect.left + 'px';
  inputStyle.top = swatchRect.top + 'px';
  inputStyle.width = swatchRect.width + 'px';
  inputStyle.height = swatchRect.height + 'px';
  inputStyle.opacity = '0';
  inputStyle.pointerEvents = 'auto';
  inputStyle.zIndex = '3000';
  inputStyle.display = 'block';
}

/**
 * Reset the color picker input positioning after mobile interaction.
 *
 * @param {HTMLInputElement} colorPickerInput - The color picker input element
 */
function resetColorPickerPosition(colorPickerInput) {
  const inputStyle = colorPickerInput.style;
  inputStyle.position = '';
  inputStyle.left = '';
  inputStyle.top = '';
  inputStyle.width = '';
  inputStyle.height = '';
  inputStyle.opacity = '';
  inputStyle.pointerEvents = '';
  inputStyle.zIndex = '';
  inputStyle.display = '';
}

// =============================================================================
// SWATCH CREATION
// =============================================================================

/**
 * Create a color swatch element for the palette grid.
 *
 * @param {string} color - Hex color value
 * @param {number} index - Index in the color array
 * @param {HTMLInputElement} colorPickerInput - The color picker input element
 * @returns {HTMLElement} The created swatch element
 */
function createSwatch(color, index, colorPickerInput) {
  const swatch = document.createElement('div');
  swatch.classList.add('palette-swatch');
  swatch.style.backgroundColor = color;
  swatch.dataset.color = color;
  swatch.dataset.index = index.toString();

  // Add hex code display
  const hexCodeDisplay = document.createElement('span');
  hexCodeDisplay.classList.add('hex-code');
  hexCodeDisplay.textContent = color.toUpperCase();
  swatch.appendChild(hexCodeDisplay);

  // Add click handler
  swatch.addEventListener('click', () => {
    handleSwatchClick(index, swatch, colorPickerInput);
  });

  return swatch;
}

/**
 * Handle swatch click to open color picker.
 *
 * @param {number} index - Index of the clicked swatch
 * @param {HTMLElement} swatch - The clicked swatch element
 * @param {HTMLInputElement} colorPickerInput - The color picker input element
 */
function handleSwatchClick(index, swatch, colorPickerInput) {
  const tempTileColors = gameState.getTempTileColors();

  currentEditingSwatchIndex = index;
  gameState.setSettingsCurrentEditingSwatchIndex(index);
  colorPickerInput.value = tempTileColors[index];

  if (isMobileDevice()) {
    // Mobile: position picker over swatch for better UX
    positionColorPickerOverSwatch(colorPickerInput, swatch);

    // Focus and click to open native picker
    colorPickerInput.focus();
    setTimeout(() => colorPickerInput.click(), 0);

    // Reset positioning after interaction
    const hideInput = () => {
      resetColorPickerPosition(colorPickerInput);
      colorPickerInput.removeEventListener('input', hideInput);
      colorPickerInput.removeEventListener('blur', hideInput);
    };
    colorPickerInput.addEventListener('input', hideInput);
    colorPickerInput.addEventListener('blur', hideInput);
  } else {
    // Desktop: simply open the color picker
    colorPickerInput.click();
  }
}

/**
 * Clear all child elements from a container safely.
 *
 * @param {HTMLElement} container - The container to clear
 */
function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Populate the settings color palette grid with swatches.
 * Creates a swatch for each color in tempTileColors from gameState.
 *
 * Uses:
 * - gameState.getTempTileColors() for the current temp color palette
 * - getDOMElements() for settingsColorPaletteGrid and colorPickerInput
 *
 * @returns {void}
 */
export function populateSettingsColorPalette() {
  const { settingsColorPaletteGrid, colorPickerInput } = getDOMElements();

  if (!settingsColorPaletteGrid || !colorPickerInput) {
    return;
  }

  // Clear existing swatches using safe DOM method
  clearContainer(settingsColorPaletteGrid);

  // Get temp colors from state
  const tempTileColors = gameState.getTempTileColors();

  // Create swatches for each color
  tempTileColors.forEach((color, index) => {
    const swatch = createSwatch(color, index, colorPickerInput);
    settingsColorPaletteGrid.appendChild(swatch);
  });
}

/**
 * Handle color picker input change.
 * Updates the temp tile colors in state and refreshes the swatch display.
 *
 * @param {Event} event - The input event from the color picker
 * @returns {void}
 */
export function handleSettingsColorPickerInput(event) {
  const { settingsModal, settingsColorPaletteGrid } = getDOMElements();
  const editingIndex = gameState.getSettingsCurrentEditingSwatchIndex();

  // Only process if we're editing a swatch and the modal is visible
  if (editingIndex === -1 || !settingsModal || settingsModal.style.display !== 'flex') {
    return;
  }

  const newColor = event.target.value;

  // Update temp colors in state
  const tempTileColors = gameState.getTempTileColors();
  tempTileColors[editingIndex] = newColor;
  gameState.setTempTileColors(tempTileColors);

  // Update local tracking
  currentEditingSwatchIndex = editingIndex;

  // Update swatch display
  if (settingsColorPaletteGrid) {
    const swatchInModal = settingsColorPaletteGrid.querySelector(
      `.palette-swatch[data-index="${editingIndex}"]`
    );

    if (swatchInModal) {
      swatchInModal.style.backgroundColor = newColor;
      swatchInModal.dataset.color = newColor;

      const hexDisplay = swatchInModal.querySelector('.hex-code');
      if (hexDisplay) {
        hexDisplay.textContent = newColor.toUpperCase();
      }
    }
  }
}

/**
 * Get the currently editing swatch index.
 *
 * @returns {number} The current editing index (-1 if none)
 */
export function getCurrentEditingSwatchIndex() {
  return currentEditingSwatchIndex;
}

/**
 * Reset the current editing swatch index.
 *
 * @returns {void}
 */
export function resetCurrentEditingSwatchIndex() {
  currentEditingSwatchIndex = -1;
  gameState.setSettingsCurrentEditingSwatchIndex(-1);
}
