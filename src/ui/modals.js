/**
 * Modals Module for Chroma48
 *
 * Handles all modal and drawer UI operations including
 * settings modal and instructions drawer/modal.
 *
 * @module modals
 */

import { gameState, getDOMElements } from '../state/gameState.js';

// =============================================================================
// SETTINGS MODAL
// =============================================================================

/**
 * Open the settings modal.
 * Initializes temp settings state, populates UI controls,
 * and displays the modal.
 *
 * @param {Object} [options] - Options object
 * @param {Function} [options.onPopulatePalette] - Callback to populate color palette
 * @returns {void}
 *
 * @example
 * openSettingsModal({ onPopulatePalette: populateSettingsColorPalette });
 */
export function openSettingsModal(options = {}) {
  const {
    settingsModal,
    colorModeRadio,
    numberModeRadio,
    paletteSuccessMessage,
  } = getDOMElements();

  // Remove keydown listener to prevent game controls while modal is open
  // Note: The caller should handle keydown listener removal if needed

  // Initialize temp settings from current state
  gameState.setTempIsColorMode(gameState.getIsColorMode());
  gameState.setTempTileColors(gameState.getTileColors());
  gameState.setSettingsCurrentEditingSwatchIndex(-1);
  gameState.setIsModalActive(true);

  // Update radio buttons
  if (colorModeRadio) {
    colorModeRadio.checked = gameState.getTempIsColorMode();
  }
  if (numberModeRadio) {
    numberModeRadio.checked = !gameState.getTempIsColorMode();
  }

  // Call palette population callback if provided
  if (options.onPopulatePalette && typeof options.onPopulatePalette === 'function') {
    options.onPopulatePalette();
  }

  // Show modal
  if (settingsModal) {
    settingsModal.style.display = 'flex';
  }

  // Hide success message
  if (paletteSuccessMessage) {
    paletteSuccessMessage.classList.remove('visible');
    paletteSuccessMessage.style.display = 'none';
  }
}

/**
 * Close the settings modal.
 * Hides the modal and resets modal active state.
 *
 * @returns {void}
 *
 * @example
 * closeSettingsModal();
 */
export function closeSettingsModal() {
  const { settingsModal } = getDOMElements();

  if (settingsModal) {
    settingsModal.style.display = 'none';
  }

  // Re-add keydown listener
  // Note: The caller should handle keydown listener re-addition if needed

  gameState.setIsModalActive(false);
}

/**
 * Save settings and restart the game.
 * Applies temp settings to actual state, persists to localStorage,
 * closes modal, and triggers game restart.
 *
 * @param {Object} [options] - Options object
 * @param {Function} [options.onSetupGame] - Callback to setup/restart the game
 * @returns {void}
 *
 * @example
 * saveSettings({ onSetupGame: gameApi.setupGame.bind(gameApi) });
 */
export function saveSettings(options = {}) {
  const { colorModeRadio, paletteSuccessMessage } = getDOMElements();

  // Apply color mode setting
  if (colorModeRadio) {
    gameState.setIsColorMode(colorModeRadio.checked);
  }

  // Apply tile colors
  gameState.setTileColors(gameState.getTempTileColors());

  // Persist to localStorage
  localStorage.setItem('tileColors', JSON.stringify(gameState.getTileColors()));
  localStorage.setItem('isColorMode', gameState.getIsColorMode().toString());

  // Close modal
  closeSettingsModal();

  // Restart game
  if (options.onSetupGame && typeof options.onSetupGame === 'function') {
    options.onSetupGame();
  }

  // Show success message
  if (paletteSuccessMessage) {
    paletteSuccessMessage.textContent = 'Settings saved successfully!';
    paletteSuccessMessage.style.display = 'block';
    setTimeout(() => {
      paletteSuccessMessage.style.display = 'none';
    }, 3000);
  }
}

// =============================================================================
// INSTRUCTIONS MODAL/DRAWER
// =============================================================================

/**
 * Show or hide the instructions modal/drawer.
 * Handles both mobile modal mode and desktop drawer mode
 * with appropriate animations and scrolling behavior.
 *
 * @param {boolean} show - Whether to show (true) or hide (false) the instructions
 * @returns {void}
 *
 * @example
 * // Show instructions
 * showInstructionsModal(true);
 *
 * // Hide instructions
 * showInstructionsModal(false);
 */
export function showInstructionsModal(show) {
  const {
    toggleButton,
    instructionsContent,
    collapsibleDrawer,
  } = getDOMElements();

  if (!toggleButton || !instructionsContent) {
    return;
  }

  const isMobileView = window.innerWidth <= 480;

  if (isMobileView) {
    if (show) {
      // Mobile modal mode
      instructionsContent.classList.remove('open');

      // Force reflow for animation
      if (typeof instructionsContent.offsetWidth === 'number') {
        void instructionsContent.offsetWidth;
      }

      document.body.classList.add('instructions-modal-mode-active');
      toggleButton.setAttribute('aria-expanded', 'true');
    } else {
      document.body.classList.remove('instructions-modal-mode-active');
      instructionsContent.classList.remove('open');
      toggleButton.setAttribute('aria-expanded', 'false');
    }
  } else {
    // Desktop drawer mode
    if (show) {
      instructionsContent.classList.add('open');
      toggleButton.setAttribute('aria-expanded', 'true');

      // Update arrow indicator using textContent (safe DOM method)
      const arrow = toggleButton.querySelector('.arrow');
      if (arrow) {
        arrow.textContent = '-';
      }

      // Smooth scroll to center the drawer
      setTimeout(() => {
        if (collapsibleDrawer && instructionsContent.classList.contains('open')) {
          const drawerRect = collapsibleDrawer.getBoundingClientRect();
          const drawerHeight = collapsibleDrawer.offsetHeight;
          const drawerAbsoluteTop = drawerRect.top + window.scrollY;
          const drawerCenterY = drawerAbsoluteTop + drawerHeight / 2;
          const viewportHeight = window.innerHeight;

          let targetScrollY = drawerCenterY - viewportHeight / 2;
          targetScrollY = Math.max(0, targetScrollY);

          const maxScrollY = document.documentElement.scrollHeight - viewportHeight;
          targetScrollY = Math.min(targetScrollY, maxScrollY);

          window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
        }
      }, 250);
    } else {
      instructionsContent.classList.remove('open');
      toggleButton.setAttribute('aria-expanded', 'false');

      // Update arrow indicator using textContent (safe DOM method)
      const arrow = toggleButton.querySelector('.arrow');
      if (arrow) {
        arrow.textContent = '+';
      }
    }
  }
}
