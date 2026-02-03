/**
 * Messages Module Tests
 *
 * Tests for game message display functions including:
 * - Game over messages
 * - Pause messages
 * - High score notifications
 * - Message visibility toggling
 */

// Mock requestAnimationFrame for CI environments
if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (callback) => {
        return setTimeout(callback, 0);
    };
}

const game = require('../app/script.js');

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: key => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        clear: () => {
            store = {};
        },
        removeItem: key => {
            delete store[key];
        }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMessageContainer() {
    const messageContainer = document.createElement('div');
    messageContainer.id = 'game-message';
    messageContainer.style.display = 'none';

    const messageParagraph = document.createElement('p');
    messageContainer.appendChild(messageParagraph);

    const lowerDiv = document.createElement('div');
    lowerDiv.className = 'lower';

    const tryAgainButton = document.createElement('a');
    tryAgainButton.id = 'retry-button';
    tryAgainButton.className = 'retry-button';
    tryAgainButton.textContent = 'Try Again';

    lowerDiv.appendChild(tryAgainButton);
    messageContainer.appendChild(lowerDiv);

    return messageContainer;
}

function setupTestDOM() {
    document.body.textContent = '';

    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-container';

    const gridContainer = document.createElement('div');
    gridContainer.id = 'grid-container';

    const scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'score';
    scoreDisplay.textContent = '0';

    const bestScoreDisplay = document.createElement('div');
    bestScoreDisplay.id = 'best-score';
    bestScoreDisplay.textContent = '0';

    const pauseButton = document.createElement('button');
    pauseButton.id = 'pause-button';
    const pauseImg = document.createElement('img');
    pauseImg.alt = 'Pause';
    pauseImg.className = 'button-icon';
    pauseButton.appendChild(pauseImg);
    pauseButton.appendChild(document.createTextNode('Pause'));

    const messageContainer = createMessageContainer();

    gameContainer.appendChild(gridContainer);
    gameContainer.appendChild(scoreDisplay);
    gameContainer.appendChild(bestScoreDisplay);
    gameContainer.appendChild(pauseButton);
    gameContainer.appendChild(messageContainer);

    document.body.appendChild(gameContainer);
}

// =============================================================================
// TESTS
// =============================================================================

describe('Game Messages', () => {
    let messageContainer;
    let messageParagraph;
    let tryAgainButton;
    let bestScoreDisplay;

    beforeEach(() => {
        setupTestDOM();
        game._initializeDOMElements();
        localStorageMock.clear();

        messageContainer = document.getElementById('game-message');
        messageParagraph = messageContainer.querySelector('p');
        tryAgainButton = document.getElementById('retry-button');
        bestScoreDisplay = document.getElementById('best-score');

        game._resetModuleState({
            isGameOver: false,
            isPaused: false,
            score: 0,
            bestScore: 0,
            newBestScoreAchievedThisGame: false
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // =========================================================================
    // Game Over Message
    // =========================================================================

    describe('Game Over Message', () => {
        test('should display "Game Over!" text', () => {
            game.handleGameOver();
            expect(messageParagraph.textContent).toContain('Game Over!');
        });

        test('should show message container when game over', () => {
            messageContainer.style.display = 'none';
            game.handleGameOver();
            expect(messageContainer.style.display).toBe('flex');
        });

        test('should set try again button text', () => {
            tryAgainButton.textContent = 'Something Else';
            game.handleGameOver();
            expect(tryAgainButton.textContent).toBe('Try Again');
        });

        test('should show new high score message when best score was achieved during game', () => {
            // First achieve a new best score to set the flag
            game._resetModuleState({
                isGameOver: false,
                score: 0,
                bestScore: 0
            });
            game.setNewBestScoreAchievedThisGame(true);
            game.handleGameOver();
            // The innerHTML contains "New High Score!" span
            expect(messageParagraph.innerHTML).toContain('New High Score!');
        });

        test('should add best-score-glow class when new best achieved', () => {
            bestScoreDisplay.classList.remove('best-score-glow');
            game._resetModuleState({
                isGameOver: false,
                score: 0,
                bestScore: 0
            });
            game.setNewBestScoreAchievedThisGame(true);
            game.handleGameOver();
            expect(bestScoreDisplay.classList.contains('best-score-glow')).toBe(true);
        });

        test('should not show new high score message when no best score achieved', () => {
            game._resetModuleState({
                isGameOver: false,
                score: 0,
                bestScore: 100 // Higher than current score
            });
            game.setNewBestScoreAchievedThisGame(false);
            game.handleGameOver();
            expect(messageParagraph.innerHTML).not.toContain('New High Score!');
        });
    });

    // =========================================================================
    // Pause Message
    // =========================================================================

    describe('Pause Message', () => {
        test('should display "Game Paused" text when pausing', () => {
            game._resetModuleState({
                isGameOver: false,
                isPaused: false,
                activeFallingTile: { tileObject: {}, row: 0, col: 0 }
            });
            game.togglePauseGame();
            expect(messageParagraph.textContent).toBe('Game Paused');
        });

        test('should show message container when pausing', () => {
            messageContainer.style.display = 'none';
            game._resetModuleState({
                isGameOver: false,
                isPaused: false,
                activeFallingTile: { tileObject: {}, row: 0, col: 0 }
            });
            game.togglePauseGame();
            expect(messageContainer.style.display).toBe('flex');
        });

        test('should hide try again button when pausing', () => {
            tryAgainButton.style.display = 'flex';
            game._resetModuleState({
                isGameOver: false,
                isPaused: false,
                activeFallingTile: { tileObject: {}, row: 0, col: 0 }
            });
            game.togglePauseGame();
            expect(tryAgainButton.style.display).toBe('none');
        });

        test('should clear message and hide container when resuming', () => {
            // First pause
            game._resetModuleState({
                isGameOver: false,
                isPaused: false,
                activeFallingTile: { tileObject: {}, row: 0, col: 0 }
            });
            game.togglePauseGame();

            // Then resume
            game.togglePauseGame();
            expect(messageContainer.style.display).toBe('none');
            expect(messageParagraph.textContent).toBe('');
        });

        test('should show try again button when resuming', () => {
            // First pause
            game._resetModuleState({
                isGameOver: false,
                isPaused: false,
                activeFallingTile: { tileObject: {}, row: 0, col: 0 }
            });
            game.togglePauseGame();

            // Then resume
            game.togglePauseGame();
            expect(tryAgainButton.style.display).toBe('flex');
        });
    });

    // =========================================================================
    // Message Visibility
    // =========================================================================

    describe('Message Visibility', () => {
        test('should hide message container initially', () => {
            // After reset, message should be hidden
            expect(messageContainer.style.display).toBe('none');
        });

        test('message container should use flex display when shown', () => {
            game.handleGameOver();
            expect(messageContainer.style.display).toBe('flex');
        });
    });

    // =========================================================================
    // Pause Button State
    // =========================================================================

    describe('Pause Button State', () => {
        let pauseButton;

        beforeEach(() => {
            pauseButton = document.getElementById('pause-button');
        });

        test('should update pause button to show Resume when paused', () => {
            game._resetModuleState({
                isGameOver: false,
                isPaused: false,
                activeFallingTile: { tileObject: {}, row: 0, col: 0 }
            });
            game.togglePauseGame();

            expect(pauseButton.textContent).toContain('Resume');
            expect(pauseButton.querySelector('img').alt).toBe('Play');
        });

        test('should update pause button to show Pause when resumed', () => {
            // First pause
            game._resetModuleState({
                isGameOver: false,
                isPaused: false,
                activeFallingTile: { tileObject: {}, row: 0, col: 0 }
            });
            game.togglePauseGame();

            // Then resume
            game.togglePauseGame();

            expect(pauseButton.textContent).toContain('Pause');
            expect(pauseButton.querySelector('img').alt).toBe('Pause');
        });

        test('should not toggle pause when game is over', () => {
            game._resetModuleState({
                isGameOver: true,
                isPaused: false
            });

            const initialDisplay = messageContainer.style.display;
            game.togglePauseGame();

            // State should not change
            expect(game.getGameState().isPaused).toBe(false);
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe('Edge Cases', () => {
        test('should handle missing message container gracefully', () => {
            // Remove message container
            messageContainer.remove();
            game._initializeDOMElements();

            // Should not throw
            expect(() => game.handleGameOver()).not.toThrow();
        });

        test('should handle missing paragraph element gracefully', () => {
            // Remove paragraph
            messageParagraph.remove();
            game._initializeDOMElements();

            // Should not throw
            expect(() => game.handleGameOver()).not.toThrow();
        });

        test('should handle missing try again button gracefully', () => {
            // Remove try again button
            tryAgainButton.remove();
            game._initializeDOMElements();

            // Should not throw
            expect(() => game.handleGameOver()).not.toThrow();
        });

        test('should handle missing pause button gracefully', () => {
            // Remove pause button
            const pauseButton = document.getElementById('pause-button');
            pauseButton.remove();
            game._initializeDOMElements();

            game._resetModuleState({
                isGameOver: false,
                isPaused: false,
                activeFallingTile: { tileObject: {}, row: 0, col: 0 }
            });

            // Should not throw
            expect(() => game.togglePauseGame()).not.toThrow();
        });

        test('should handle missing best score display gracefully', () => {
            // Remove best score display
            bestScoreDisplay.remove();
            game._initializeDOMElements();

            game._resetModuleState({
                isGameOver: false,
                newBestScoreAchievedThisGame: true
            });

            // Should not throw
            expect(() => game.handleGameOver()).not.toThrow();
        });
    });
});
