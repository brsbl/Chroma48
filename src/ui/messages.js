/**
 * Messages Module for Chroma48
 *
 * Handles game message display including game over,
 * pause, and high score notifications.
 *
 * @module messages
 */

import { getDOMElements } from '../state/gameState.js';

// =============================================================================
// MESSAGE VISIBILITY
// =============================================================================

/**
 * Update game message container visibility.
 * Shows the message container with flex display.
 *
 * @returns {void}
 *
 * @example
 * updateGameMessageVisibility();
 * // Sets messageContainer.style.display = 'flex'
 */
export function updateGameMessageVisibility() {
  const { messageContainer } = getDOMElements();

  if (messageContainer) {
    messageContainer.style.display = 'flex';
  }
}

/**
 * Hide the game message container.
 * Hides the container and clears the message text.
 *
 * @returns {void}
 *
 * @example
 * hideMessage();
 */
export function hideMessage() {
  const { messageContainer, messageParagraph } = getDOMElements();

  if (messageContainer) {
    messageContainer.style.display = 'none';
  }

  if (messageParagraph) {
    messageParagraph.textContent = '';
  }
}

// =============================================================================
// GAME OVER MESSAGE
// =============================================================================

/**
 * Show the game over message.
 * Displays "Game Over!" with optional high score celebration
 * if a new best score was achieved during the game.
 *
 * @param {boolean} isNewBest - Whether a new high score was achieved
 * @returns {void}
 *
 * @example
 * // Regular game over
 * showGameOverMessage(false);
 *
 * // Game over with new high score
 * showGameOverMessage(true);
 */
export function showGameOverMessage(isNewBest) {
  const { messageContainer, messageParagraph, bestScoreDisplay } = getDOMElements();

  // Show the message container
  updateGameMessageVisibility();

  if (messageContainer && messageParagraph) {
    // Clear existing content
    messageParagraph.textContent = '';

    // Create "Game Over!" text node
    messageParagraph.appendChild(document.createTextNode('Game Over!'));

    // Display the new high score message if the flag is set
    if (isNewBest) {
      // Ensure the best score glow is active
      if (bestScoreDisplay && !bestScoreDisplay.classList.contains('best-score-glow')) {
        bestScoreDisplay.classList.add('best-score-glow');
      }

      // Add line break
      messageParagraph.appendChild(document.createElement('br'));

      // Create span for high score emphasis
      const highScoreSpan = document.createElement('span');
      highScoreSpan.className = 'new-high-score-emphasis';
      highScoreSpan.textContent = 'New High Score! \uD83C\uDF89'; // Unicode for party popper emoji
      messageParagraph.appendChild(highScoreSpan);
    }
  }
}

// =============================================================================
// PAUSE MESSAGE
// =============================================================================

/**
 * Show the game paused message.
 * Displays "Game Paused" text and hides the try again button.
 *
 * @returns {void}
 *
 * @example
 * showPauseMessage();
 */
export function showPauseMessage() {
  const { messageContainer, messageParagraph, tryAgainButton } = getDOMElements();

  // Hide try again button when paused
  if (tryAgainButton) {
    tryAgainButton.style.display = 'none';
  }

  if (messageContainer && messageParagraph) {
    messageParagraph.textContent = 'Game Paused';
    messageContainer.style.display = 'flex';
  }
}

/**
 * Hide the pause message and restore try again button.
 * Used when resuming from pause state.
 *
 * @returns {void}
 *
 * @example
 * hidePauseMessage();
 */
export function hidePauseMessage() {
  const { messageContainer, messageParagraph, tryAgainButton } = getDOMElements();

  // Restore try again button
  if (tryAgainButton) {
    tryAgainButton.style.display = 'flex';
  }

  if (messageContainer) {
    messageContainer.style.display = 'none';
  }

  if (messageParagraph) {
    messageParagraph.textContent = '';
  }
}
