/**
 * Scoring Module for Chroma48
 *
 * Handles score updates, best score tracking, and celebration effects.
 *
 * @module scoring
 */

import gameState, { getConfettiInstance, getDOMElements } from '../state/gameState.js';
import { saveBestScore } from '../settings/persistence.js';

// =============================================================================
// CONFETTI EFFECT
// =============================================================================

/**
 * Triggers the confetti celebration effect.
 * Only plays if a JSConfetti instance is available.
 */
export function triggerConfettiEffect() {
  const confettiInstance = getConfettiInstance();
  if (confettiInstance) {
    confettiInstance.addConfetti({
      emojis: ['🎉'],
      confettiNumber: 150,
      emojiSize: 24,
      confettiRadius: 60,
    });
  }
}

// =============================================================================
// SCORE UPDATES
// =============================================================================

/**
 * Updates the current score and checks for a new best score.
 * Triggers confetti effect on first new high score of the game session.
 *
 * @param {number} newPoints - Points to add to the current score.
 *                             Pass 0 to reset score to zero.
 */
export function updateScore(newPoints) {
  const { scoreDisplay, bestScoreDisplay } = getDOMElements();
  let currentScore = gameState.getScore();

  // Handle score reset vs adding points
  if (newPoints === 0 && currentScore !== 0) {
    gameState.setScore(0);
  } else if (newPoints === 0 && currentScore === 0) {
    gameState.setScore(0);
  } else {
    gameState.addScore(newPoints);
  }

  currentScore = gameState.getScore();
  const bestScore = gameState.getBestScore();

  // Update score display
  if (scoreDisplay) {
    scoreDisplay.textContent = currentScore.toLocaleString();
  }

  // Check for new best score
  if (currentScore > bestScore) {
    // Only trigger confetti if it hasn't been shown this game
    if (!gameState.getNewBestScoreAchievedThisGame()) {
      triggerConfettiEffect();
    }
    // Set flag after checking, so it's true for subsequent checks
    gameState.setNewBestScoreAchievedThisGame(true);

    // Update and persist best score
    gameState.setBestScore(currentScore);
    saveBestScore(currentScore);

    // Add visual glow effect
    if (bestScoreDisplay) {
      bestScoreDisplay.classList.add('best-score-glow');
    }
  }

  // Ensure best score display is always up-to-date
  if (bestScoreDisplay) {
    updateBestScore();
  }
}

/**
 * Updates the best score display element with the current best score.
 */
export function updateBestScore() {
  const { bestScoreDisplay } = getDOMElements();
  if (bestScoreDisplay) {
    bestScoreDisplay.textContent = gameState.getBestScore().toLocaleString();
  }
}
