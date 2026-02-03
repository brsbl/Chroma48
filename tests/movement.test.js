/**
 * Movement Module Tests
 *
 * Additional tests for tile movement and merging logic including:
 * - Edge cases for all directions
 * - Complex merge scenarios
 * - Color mixing validation
 * - Grid state after movements
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

function setupTestDOM() {
    document.body.textContent = '';

    const score = document.createElement('div');
    score.id = 'score';
    score.textContent = '0';

    const bestScore = document.createElement('div');
    bestScore.id = 'best-score';
    bestScore.textContent = '0';

    const gridContainer = document.createElement('div');
    gridContainer.id = 'grid-container';

    document.body.appendChild(score);
    document.body.appendChild(bestScore);
    document.body.appendChild(gridContainer);
}

function createEmptyGrid(size = 4) {
    return Array(size).fill(null).map(() => Array(size).fill(null));
}

function createTile(value, color) {
    return { value, color };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Movement Module', () => {
    beforeEach(() => {
        setupTestDOM();
        game._initializeDOMElements();
        localStorageMock.clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // =========================================================================
    // Movement Without Merging
    // =========================================================================

    describe('Movement Without Merging', () => {
        test('moveTilesLeft should compact tiles to the left', () => {
            const grid = createEmptyGrid();
            grid[0][3] = createTile(2, '#FF0000');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            const moved = game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(moved).toBe(true);
            expect(result[0][0]).toEqual(createTile(2, '#FF0000'));
            expect(result[0][3]).toBeNull();
        });

        test('moveTilesRight should compact tiles to the right', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            const moved = game.moveTilesRight();
            const result = game.getGameState().grid;

            expect(moved).toBe(true);
            expect(result[0][3]).toEqual(createTile(2, '#FF0000'));
            expect(result[0][0]).toBeNull();
        });

        test('moveTilesUp should compact tiles upward', () => {
            const grid = createEmptyGrid();
            grid[3][0] = createTile(2, '#FF0000');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            const moved = game.moveTilesUp();
            const result = game.getGameState().grid;

            expect(moved).toBe(true);
            expect(result[0][0]).toEqual(createTile(2, '#FF0000'));
            expect(result[3][0]).toBeNull();
        });

        test('moveTilesDown should compact tiles downward', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            const moved = game.moveTilesDown();
            const result = game.getGameState().grid;

            expect(moved).toBe(true);
            expect(result[3][0]).toEqual(createTile(2, '#FF0000'));
            expect(result[0][0]).toBeNull();
        });

        test('should return false when no movement is possible', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            // Tile is already at the left edge
            const moved = game.moveTilesLeft();
            expect(moved).toBe(false);
        });

        test('should maintain relative order when compacting multiple tiles', () => {
            const grid = createEmptyGrid();
            grid[0][1] = createTile(2, '#FF0000');
            grid[0][3] = createTile(4, '#00FF00');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(result[0][0]).toEqual(createTile(2, '#FF0000'));
            expect(result[0][1]).toEqual(createTile(4, '#00FF00'));
            expect(result[0][2]).toBeNull();
            expect(result[0][3]).toBeNull();
        });
    });

    // =========================================================================
    // Merging in Number Mode
    // =========================================================================

    describe('Merging in Number Mode', () => {
        beforeEach(() => {
            game._resetModuleState({ isColorMode: false });
        });

        test('should merge tiles with same value', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            grid[0][1] = createTile(2, '#00FF00');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(result[0][0].value).toBe(4);
            expect(result[0][1]).toBeNull();
        });

        test('should mix colors when merging in number mode', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000'); // Red
            grid[0][1] = createTile(2, '#0000FF'); // Blue
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            // Mixed color should be purple-ish
            expect(result[0][0].color).toBe(game.mixColors('#FF0000', '#0000FF'));
        });

        test('should not merge tiles with different values', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            grid[0][1] = createTile(4, '#00FF00');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(result[0][0].value).toBe(2);
            expect(result[0][1].value).toBe(4);
        });

        test('should add merged value to score', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            grid[0][1] = createTile(2, '#00FF00');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();

            expect(game.getGameState().score).toBe(4);
        });

        test('should only merge once per tile per move', () => {
            // Three tiles of value 2: should merge first two, third moves beside
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            grid[0][1] = createTile(2, '#00FF00');
            grid[0][2] = createTile(2, '#0000FF');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(result[0][0].value).toBe(4); // Merged
            expect(result[0][1].value).toBe(2); // Did not merge
            expect(result[0][2]).toBeNull();
        });
    });

    // =========================================================================
    // Merging in Color Mode
    // =========================================================================

    describe('Merging in Color Mode', () => {
        beforeEach(() => {
            game._resetModuleState({ isColorMode: true });
        });

        test('should merge tiles with same color', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            grid[0][1] = createTile(4, '#FF0000'); // Same color, different value
            game._resetModuleState({ grid, score: 0, isColorMode: true });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            // In color mode, same color merges regardless of value
            expect(result[0][0].value).toBe(4); // 2 * 2 from first tile
            expect(result[0][1]).toBeNull();
        });

        test('should not merge tiles with different colors', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000'); // Red
            grid[0][1] = createTile(2, '#00FF00'); // Green - different color
            game._resetModuleState({ grid, score: 0, isColorMode: true });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            // Should not merge due to different colors
            expect(result[0][0].value).toBe(2);
            expect(result[0][1].value).toBe(2);
        });

        test('should preserve color when merging in color mode', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            grid[0][1] = createTile(2, '#FF0000');
            game._resetModuleState({ grid, score: 0, isColorMode: true });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(result[0][0].color).toBe('#FF0000'); // Color preserved
        });
    });

    // =========================================================================
    // Complex Scenarios
    // =========================================================================

    describe('Complex Scenarios', () => {
        test('should handle full row merge cascade', () => {
            // [2, 2, 4, 4] -> [4, 8, null, null]
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#F00');
            grid[0][1] = createTile(2, '#0F0');
            grid[0][2] = createTile(4, '#00F');
            grid[0][3] = createTile(4, '#FF0');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(result[0][0].value).toBe(4);
            expect(result[0][1].value).toBe(8);
            expect(result[0][2]).toBeNull();
            expect(result[0][3]).toBeNull();
            expect(game.getGameState().score).toBe(12); // 4 + 8
        });

        test('should handle multiple rows independently', () => {
            const grid = createEmptyGrid();
            // Row 0: merge
            grid[0][0] = createTile(2, '#F00');
            grid[0][1] = createTile(2, '#0F0');
            // Row 1: no merge
            grid[1][0] = createTile(2, '#F00');
            grid[1][1] = createTile(4, '#0F0');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(result[0][0].value).toBe(4); // Merged
            expect(result[1][0].value).toBe(2); // Not merged
            expect(result[1][1].value).toBe(4); // Not merged
        });

        test('should handle diagonal pattern', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#F00');
            grid[1][1] = createTile(2, '#0F0');
            grid[2][2] = createTile(2, '#00F');
            grid[3][3] = createTile(2, '#FF0');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            // Each tile moves to left edge of its row
            expect(result[0][0].value).toBe(2);
            expect(result[1][0].value).toBe(2);
            expect(result[2][0].value).toBe(2);
            expect(result[3][0].value).toBe(2);
        });

        test('should handle nearly full board', () => {
            const grid = createEmptyGrid();
            // Fill all except one
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    if (r !== 3 || c !== 3) {
                        grid[r][c] = createTile(2, '#' + r.toString(16) + c.toString(16) + '0000');
                    }
                }
            }
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            // Should not throw
            expect(() => game.moveTilesDown()).not.toThrow();
        });

        test('should correctly mark newly merged tiles', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#F00');
            grid[0][1] = createTile(2, '#0F0');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(result[0][0].isNewlyMerged).toBe(true);
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe('Edge Cases', () => {
        test('should handle empty grid', () => {
            const grid = createEmptyGrid();
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            const moved = game.moveTilesLeft();
            expect(moved).toBe(false);
        });

        test('should handle single tile at edge', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(2, '#FF0000');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            const moved = game.moveTilesLeft();
            expect(moved).toBe(false);

            const result = game.getGameState().grid;
            expect(result[0][0].value).toBe(2);
        });

        test('should handle single tile in center', () => {
            const grid = createEmptyGrid();
            grid[1][1] = createTile(2, '#FF0000');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            const moved = game.moveTilesLeft();
            expect(moved).toBe(true);

            const result = game.getGameState().grid;
            expect(result[1][0].value).toBe(2);
            expect(result[1][1]).toBeNull();
        });

        test('should handle large tile values', () => {
            const grid = createEmptyGrid();
            grid[0][0] = createTile(1024, '#FF0000');
            grid[0][1] = createTile(1024, '#00FF00');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            game.moveTilesLeft();
            const result = game.getGameState().grid;

            expect(result[0][0].value).toBe(2048);
            expect(game.getGameState().score).toBe(2048);
        });

        test('should handle moves in all four directions sequentially', () => {
            const grid = createEmptyGrid();
            grid[1][1] = createTile(2, '#FF0000');
            game._resetModuleState({ grid, score: 0, isColorMode: false });

            // Move through all directions
            game.moveTilesLeft();
            expect(game.getGameState().grid[1][0].value).toBe(2);

            game.moveTilesUp();
            expect(game.getGameState().grid[0][0].value).toBe(2);

            game.moveTilesRight();
            expect(game.getGameState().grid[0][3].value).toBe(2);

            game.moveTilesDown();
            expect(game.getGameState().grid[3][3].value).toBe(2);
        });
    });

    // =========================================================================
    // Color Mixing
    // =========================================================================

    describe('Color Mixing', () => {
        test('mixColors should average RGB values', () => {
            const red = '#FF0000';
            const blue = '#0000FF';
            const mixed = game.mixColors(red, blue);

            // Average: (255+0)/2, (0+0)/2, (0+255)/2 = 127.5, 0, 127.5
            expect(mixed).toBe('#800080'); // Purple
        });

        test('mixColors should handle white and black', () => {
            const white = '#FFFFFF';
            const black = '#000000';
            const mixed = game.mixColors(white, black);

            expect(mixed).toBe('#808080'); // Gray
        });

        test('mixColors should handle 3-digit hex', () => {
            const red = '#F00';
            const blue = '#00F';
            const mixed = game.mixColors(red, blue);

            expect(mixed).toBe('#800080');
        });

        test('mixColors should handle same colors', () => {
            const color = '#FF5500';
            const mixed = game.mixColors(color, color);

            expect(mixed).toBe('#ff5500'); // Same color (lowercase due to toHex)
        });
    });
});
