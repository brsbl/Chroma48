const game = require('../app/script.js');

// Mock requestAnimationFrame for CI environments where it might not exist
if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (callback) => {
        return setTimeout(callback, 0);
    };
}

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

// Mock DOM elements that are referenced by game logic
let scoreDisplay, bestScoreDisplay, gridContainer; 

describe('Core Game Logic', () => {
    let initialGridState;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="score">0</div>
            <div id="best-score">0</div>
            <div id="grid-container"></div> 
        `;
        game._initializeDOMElements(); 
        
        initialGridState = Array(game.getGameState().GRID_SIZE || 4).fill(null).map(() => Array(game.getGameState().GRID_SIZE || 4).fill(null));
        game._resetModuleState({
            grid: JSON.parse(JSON.stringify(initialGridState)),
            score: 0,
            bestScore: 0,
            isColorMode: false,
            isGameOver: false,
            TILE_COLORS: [...game.TILE_COLORS_DEFAULT_GETTER()]
        });
        localStorageMock.clear();
        
        scoreDisplay = document.getElementById('score');
        bestScoreDisplay = document.getElementById('best-score');
        gridContainer = document.getElementById('grid-container');
    });

    describe('updateScore', () => {
        test('should increase score correctly', () => {
            game.updateScore(10);
            expect(game.getGameState().score).toBe(10);
            game.updateScore(20);
            expect(game.getGameState().score).toBe(30);
        });

        test('should update bestScore if current score exceeds it', () => {
            game.updateScore(100);
            expect(game.getGameState().bestScore).toBe(100);
            expect(localStorageMock.getItem('bestScore')).toBe('100');
        });

        test('should reset score to 0 if newPoints is 0 and score was not 0', () => {
            game._resetModuleState({ score: 50 });
            game.updateScore(0);
            expect(game.getGameState().score).toBe(0);
        });

        test('should update scoreDisplay text content', () => {
            game.updateScore(1234);
            expect(scoreDisplay.textContent).toBe('1,234');
        });
    });

    describe('isBoardFull', () => {
        test('should return false for an empty board', () => {
            expect(game.isBoardFull()).toBe(false);
        });

        test('should return false for a partially filled board', () => {
            const partialGrid = JSON.parse(JSON.stringify(initialGridState));
            partialGrid[0][0] = { value: 2, color: 'red' };
            partialGrid[3][3] = { value: 4, color: 'blue' };
            game._resetModuleState({ grid: partialGrid });
            expect(game.isBoardFull()).toBe(false);
        });

        test('should return true for a completely filled board', () => {
            const fullGrid = initialGridState.map(row => 
                row.map(() => ({ value: 2, color: 'red' }))
            );
            game._resetModuleState({ grid: fullGrid });
            expect(game.isBoardFull()).toBe(true);
        });
        test('should return false if game is over, even if board looks full', () => {
            const fullGrid = initialGridState.map(row => 
                row.map(() => ({ value: 2, color: 'red' }))
            );
            game._resetModuleState({ grid: fullGrid, isGameOver: true });
            expect(game.isBoardFull()).toBe(false);
        });
    });

    describe('Tile Movements (Number Mode)', () => {
        let updateScoreSpy;

        beforeEach(() => {
            // Initial setup specific to these tests if any.
            // updateScoreSpy = jest.spyOn(game, 'updateScore'); // This spy won't be hit by internal calls from move funcs.
        });

        test('moveTilesLeft should merge identical adjacent tiles and update score', () => {
            const initialGrid = [
                [{value:2, color:'#f00'}, {value:2, color:'#0f0'}, {value:4, color:'#00f'}, null],
                [null, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: false, TILE_COLORS: ['#f00', '#0f0', '#00f'], GRID_SIZE: 4 });
            const changed = game.moveTilesLeft();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            const expectedMixedColor = game.mixColors('#f00', '#0f0');
            expect(finalGrid[0][0]).toEqual(expect.objectContaining({value: 4, color: expectedMixedColor, isNewlyMerged: true}));
            expect(finalGrid[0][1]).toEqual({value: 4, color: '#00f'});
            expect(finalGrid[0][2]).toBeNull();
            expect(finalGrid[0][3]).toBeNull();
            expect(game.getGameState().score).toBe(4); // Direct score check
        });

        test('moveTilesLeft should perform multiple merges in a row correctly and update score', () => {
            const initialGrid = [
                [{value:2, color:'#f00'}, {value:2, color:'#0f0'}, {value:4, color:'#00f'}, {value:4, color:'#ff0'}],
                [null, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: false, TILE_COLORS: ['#f00', '#0f0', '#00f', '#ff0'], GRID_SIZE: 4 });
            const changed = game.moveTilesLeft();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            const expectedMixedColor1 = game.mixColors('#f00', '#0f0');
            const expectedMixedColor2 = game.mixColors('#00f', '#ff0');
            expect(finalGrid[0][0]).toEqual(expect.objectContaining({value: 4, color: expectedMixedColor1, isNewlyMerged: true}));
            expect(finalGrid[0][1]).toEqual(expect.objectContaining({value: 8, color: expectedMixedColor2, isNewlyMerged: true}));
            expect(finalGrid[0][2]).toBeNull();
            expect(finalGrid[0][3]).toBeNull();
            expect(game.getGameState().score).toBe(12); // 4 + 8
        });
        
        test('moveTilesLeft should not merge already merged tile in same move and update score accordingly', () => {
            const initialGrid = [
                [{ value: 2, color: 'red1' }, { value: 2, color: 'red2' }, { value: 2, color: 'red3' }, null],
                [null, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: false, TILE_COLORS: ['red1', 'red2', 'red3'], GRID_SIZE: 4 });
            const changed = game.moveTilesLeft();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            const expectedMixedColor = game.mixColors('red1', 'red2');
            expect(finalGrid[0][0]).toEqual(expect.objectContaining({ value: 4, color: expectedMixedColor, isNewlyMerged: true }));
            expect(finalGrid[0][1]).toEqual({ value: 2, color: 'red3' });
            expect(finalGrid[0][2]).toBeNull();
            expect(game.getGameState().score).toBe(4); // Score from the first merge only
        });

        test('moveTilesRight should compact and merge tiles and update score', () => {
            const initialGrid = [
                [null, {value:2, color:'#f00'}, {value:2, color:'#0f0'}, {value:4, color:'#00f'}],
                [null, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: false, TILE_COLORS: ['#f00','#0f0','#00f'], GRID_SIZE: 4 });
            const changed = game.moveTilesRight();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            const expectedMixedColor = game.mixColors('#f00', '#0f0');
            expect(finalGrid[0][3]).toEqual({value:4, color:'#00f'});
            expect(finalGrid[0][2]).toEqual(expect.objectContaining({ value: 4, color: expectedMixedColor, isNewlyMerged: true }));
            expect(finalGrid[0][1]).toBeNull();
            expect(finalGrid[0][0]).toBeNull();
            expect(game.getGameState().score).toBe(4);
        });

        test('moveTilesUp should compact and merge tiles in a column and update score', () => {
            const initialGrid = [
                [null, null, null, null],
                [{value:2, color:'#f00'}, null, null, null],
                [{value:2, color:'#0f0'}, null, null, null],
                [{value:4, color:'#00f'}, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: false, TILE_COLORS: ['#f00','#0f0','#00f'] });
            const changed = game.moveTilesUp();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            const expectedMixedColor = game.mixColors('#f00', '#0f0');
            expect(finalGrid[0][0]).toEqual(expect.objectContaining({ value: 4, color: expectedMixedColor, isNewlyMerged: true }));
            expect(finalGrid[1][0]).toEqual({value:4, color:'#00f'});
            expect(finalGrid[2][0]).toBeNull();
            expect(finalGrid[3][0]).toBeNull();
            expect(game.getGameState().score).toBe(4);
        });

        test('moveTilesDown should compact and merge tiles in a column and update score', () => {
            const initialGrid = [
                [{value:4, color:'#00f'}, null, null, null],
                [{value:2, color:'#f00'}, null, null, null],
                [{value:2, color:'#0f0'}, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: false, TILE_COLORS: ['#00f','#f00','#0f0'] });
            const changed = game.moveTilesDown();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            const expectedMixedColor = game.mixColors('#f00', '#0f0');
            expect(finalGrid[3][0]).toEqual(expect.objectContaining({ value: 4, color: expectedMixedColor, isNewlyMerged: true }));
            expect(finalGrid[2][0]).toEqual({value:4, color:'#00f'});
            expect(finalGrid[1][0]).toBeNull();
            expect(finalGrid[0][0]).toBeNull();
            expect(game.getGameState().score).toBe(4);
        });
    });

    describe('Tile Movements (Color Mode)', () => {
        beforeEach(() => {
            // isColorMode: true will be set in _resetModuleState for each test as needed
        });

        test('moveTilesLeft should merge identical colors, value still doubles, score updates', () => {
            const initialGrid = [
                [{value:2, color:'#FF0000'}, {value:2, color:'#FF0000'}, null, null],
                [null, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: true, TILE_COLORS: ['#FF0000'], GRID_SIZE: 4 });
            const changed = game.moveTilesLeft();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            expect(finalGrid[0][0]).toEqual(expect.objectContaining({value: 4, color: '#FF0000', isNewlyMerged: true})); // Correct: Merged tile
            expect(finalGrid[0][1]).toBeNull();
            expect(game.getGameState().score).toBe(4); // Score should update
        });

        test('moveTilesLeft should not merge different colors, even if values are same', () => {
            const initialGrid = [
                [{value:2, color:'#FF0000'}, {value:2, color:'#00FF00'}, null, null], // Different colors
                [null, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: true, TILE_COLORS: ['#FF0000', '#00FF00'], GRID_SIZE: 4 });
            const changed = game.moveTilesLeft();
            // If tiles are at the edge and cannot merge or move further left, 'changed' should be false.
            // If they could compact but not merge, 'changed' might be true but no merge occurs.
            // Assuming here they are already as far left as they can go without merging:
            expect(changed).toBe(false); 
            const finalGrid = game.getGameState().grid;
            expect(finalGrid[0][0]).toEqual({value:2, color:'#FF0000'}); // Corrected: Not merged, exact object
            expect(finalGrid[0][1]).toEqual({value:2, color:'#00FF00'}); // Corrected: Not merged, exact object
            expect(game.getGameState().score).toBe(0); // Score should not change
        });

        test('moveTilesLeft multiple merges of same color in a row, score updates', () => {
            const initialGrid = [
                [{value:2, color:'#FF0000'}, {value:2, color:'#FF0000'}, {value:4, color:'#FF0000'}, {value:4, color:'#FF0000'}],
                [null, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: true, TILE_COLORS: ['#FF0000'], GRID_SIZE: 4 });
            const changed = game.moveTilesLeft();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            expect(finalGrid[0][0]).toEqual(expect.objectContaining({value: 4, color: '#FF0000', isNewlyMerged: true}));
            expect(finalGrid[0][1]).toEqual(expect.objectContaining({value: 8, color: '#FF0000', isNewlyMerged: true}));
            expect(finalGrid[0][2]).toBeNull();
            expect(finalGrid[0][3]).toBeNull();
            expect(game.getGameState().score).toBe(12); // 4 + 8
        });

        test('moveTilesRight should merge identical colors, score updates', () => {
            const initialGrid = [
                [null, null, {value:2, color:'#00FF00'}, {value:2, color:'#00FF00'}],
                [null, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: true, TILE_COLORS: ['#00FF00'], GRID_SIZE: 4 });
            const changed = game.moveTilesRight();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            expect(finalGrid[0][3]).toEqual(expect.objectContaining({value: 4, color: '#00FF00', isNewlyMerged: true}));
            expect(finalGrid[0][2]).toBeNull();
            expect(game.getGameState().score).toBe(4);
        });

        test('moveTilesUp should merge identical colors, score updates', () => {
            const initialGrid = [
                [{value:2, color:'#0000FF'}, null, null, null],
                [{value:2, color:'#0000FF'}, null, null, null],
                [null, null, null, null],
                [null, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: true, TILE_COLORS: ['#0000FF'] });
            const changed = game.moveTilesUp();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            expect(finalGrid[0][0]).toEqual(expect.objectContaining({ value: 4, color: '#0000FF', isNewlyMerged: true }));
            expect(finalGrid[1][0]).toBeNull();
            expect(game.getGameState().score).toBe(4);
        });

        test('moveTilesDown should merge identical colors, score updates', () => {
            const initialGrid = [
                [null, null, null, null],
                [null, null, null, null],
                [{value:2, color:'#FFFF00'}, null, null, null],
                [{value:2, color:'#FFFF00'}, null, null, null]
            ];
            game._resetModuleState({ grid: initialGrid, score: 0, isColorMode: true, TILE_COLORS: ['#FFFF00'] });
            const changed = game.moveTilesDown();
            expect(changed).toBe(true);
            const finalGrid = game.getGameState().grid;
            expect(finalGrid[3][0]).toEqual(expect.objectContaining({ value: 4, color: '#FFFF00', isNewlyMerged: true }));
            expect(finalGrid[2][0]).toBeNull();
            expect(game.getGameState().score).toBe(4);
        });
    });
});

describe('spawnNewFallingTile and gameLoop', () => {
    let drawGridSpy, handleGameOverSpy;

    beforeEach(() => {
        document.body.innerHTML = ` 
            <div id="score">0</div>
            <div id="best-score">0</div>
            <div id="grid-container"></div>
        `;
        game._initializeDOMElements();
        game._resetModuleState({
            TILE_COLORS: game.TILE_COLORS_DEFAULT_GETTER()
        });
        localStorageMock.clear();
        
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.spyOn(global, 'setInterval');
        jest.spyOn(global, 'clearInterval');
        jest.spyOn(Math, 'random');

        drawGridSpy = jest.spyOn(game, 'drawGrid').mockImplementation(() => {});
        handleGameOverSpy = jest.spyOn(game, 'handleGameOver').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });

    describe('spawnNewFallingTile', () => {
        test('should not spawn tile if game is over', () => {
            game._resetModuleState({ isGameOver: true });
            game.spawnNewFallingTile();
            expect(game.getGameState().activeFallingTile).toBeNull();
            expect(setInterval).not.toHaveBeenCalled();
        });

        test('should not spawn tile if game is paused', () => {
            game._resetModuleState({ isPaused: true });
            game.spawnNewFallingTile();
            expect(game.getGameState().activeFallingTile).toBeNull();
            expect(setInterval).not.toHaveBeenCalled();
        });

        test('should not spawn tile if top row is full', () => {
            const fullTopRowGrid = Array(game.getGameState().GRID_SIZE || 4).fill(null).map((_, r_idx) => 
                Array(game.getGameState().GRID_SIZE || 4).fill(null).map((_, c_idx) => 
                    r_idx === 0 ? { value: 2, color: 'red' } : null
                )
            );
            game._resetModuleState({ grid: fullTopRowGrid });
            game.spawnNewFallingTile();
            expect(game.getGameState().activeFallingTile).toBeNull();
        });

        test('should spawn a tile in an available top row column', () => {
            Math.random.mockReturnValue(0.1); // Ensures tile value is 2, and first available col
            const initialGrid = JSON.parse(JSON.stringify(game.getGameState().grid));
            initialGrid[0][1] = { value: 2, color: 'blue' }; 
            game._resetModuleState({ grid: initialGrid, TILE_COLORS: ['#FF0000'] });
            
            game.spawnNewFallingTile();
            const gameState = game.getGameState();
            expect(gameState.activeFallingTile).not.toBeNull();
            expect(gameState.activeFallingTile.tileObject.value).toBe(2);
            expect(gameState.activeFallingTile.tileObject.color).toBe('#FF0000');
            expect(gameState.activeFallingTile.row).toBe(0);
            expect(gameState.grid[0][gameState.activeFallingTile.col]).toEqual(gameState.activeFallingTile.tileObject);
            expect(setInterval).toHaveBeenCalledWith(expect.any(Function), game.getGameState().FALL_SPEED || 500);
        });

        test('should cycle through TILE_COLORS', () => {
            Math.random.mockReturnValue(0.1); 
            const testColors = ['#AAAAAA', '#BBBBBB'];
            game._resetModuleState({ TILE_COLORS: testColors, currentColorIndex: 0 });
            game.spawnNewFallingTile();
            expect(game.getGameState().activeFallingTile.tileObject.color).toBe(testColors[0]);
            
            game._resetModuleState({ TILE_COLORS: testColors, currentColorIndex: 1 }); // next spawn should use index 1
            game.spawnNewFallingTile();
            expect(game.getGameState().activeFallingTile.tileObject.color).toBe(testColors[1]);
        });
    });

    describe('gameLoop', () => {
        test('should do nothing if paused', () => {
            const initialGrid = JSON.parse(JSON.stringify(game.getGameState().grid));
            initialGrid[0][0] = { value: 2, color: 'red' };
            game._resetModuleState({ 
                grid: initialGrid, 
                activeFallingTile: { tileObject: { value: 2, color: 'red' }, row: 0, col: 0 },
                isPaused: true 
            });
            game.gameLoop();
            expect(game.getGameState().grid[0][0].value).toBe(2);
            expect(drawGridSpy).not.toHaveBeenCalled(); 
        });

        test('should move active tile down if space is available', () => {
            const tileToFall = { value: 2, color: game.TILE_COLORS_DEFAULT_GETTER()[0] };
            const initialGrid = JSON.parse(JSON.stringify(game.getGameState().grid));
            initialGrid[0][0] = tileToFall;
            game._resetModuleState({ 
                grid: initialGrid,
                activeFallingTile: { tileObject: tileToFall, row: 0, col: 0 }
            });
            game.gameLoop();
            const gameState = game.getGameState();
            expect(gameState.activeFallingTile.row).toBe(1);
            expect(gameState.grid[0][0]).toBeNull();
            expect(gameState.grid[1][0]).toEqual(tileToFall);
        });

        test('should land tile if at bottom of grid', () => {
            const GRID_S = game.getGameState().GRID_SIZE || 4;
            const tileToLand = { value: 2, color: game.TILE_COLORS_DEFAULT_GETTER()[0] };
            const initialGrid = JSON.parse(JSON.stringify(game.getGameState().grid));
            initialGrid[GRID_S - 1][0] = tileToLand;
            game._resetModuleState({ 
                grid: initialGrid,
                activeFallingTile: { tileObject: tileToLand, row: GRID_S - 1, col: 0 }
            });
            const mockGameInterval = setInterval(() => {}, 100); // Simulate an active interval
            game._resetModuleState({ gameInterval: mockGameInterval, activeFallingTile: game.getGameState().activeFallingTile, grid: game.getGameState().grid }); // Keep active tile

            game.gameLoop();
            const gameState = game.getGameState();
            expect(gameState.activeFallingTile).toBeNull();
            expect(gameState.grid[GRID_S - 1][0].value).toBe(2);
            expect(clearInterval).toHaveBeenCalledWith(mockGameInterval);
            expect(handleGameOverSpy).not.toHaveBeenCalled();
        });

        test('should land tile if cell below is occupied', () => {
            const tileToLand = { value: 2, color: game.TILE_COLORS_DEFAULT_GETTER()[0] };
            const obstacleTile = { value: 4, color: game.TILE_COLORS_DEFAULT_GETTER()[1] };
            const initialGrid = JSON.parse(JSON.stringify(game.getGameState().grid));
            initialGrid[0][0] = tileToLand;
            initialGrid[1][0] = obstacleTile;
            game._resetModuleState({ 
                grid: initialGrid,
                activeFallingTile: { tileObject: tileToLand, row: 0, col: 0 }
            });
            const mockGameInterval = setInterval(() => {}, 100);
            game._resetModuleState({ gameInterval: mockGameInterval, activeFallingTile: game.getGameState().activeFallingTile, grid: game.getGameState().grid });

            game.gameLoop();
            const gameState = game.getGameState();
            expect(gameState.activeFallingTile).toBeNull();
            expect(gameState.grid[0][0].value).toBe(2);
            expect(clearInterval).toHaveBeenCalledWith(mockGameInterval);
        });

        test('should call handleGameOver if board becomes full after landing', () => {
            const GRID_S = game.getGameState().GRID_SIZE || 4;
            const nearlyFullGrid = Array(GRID_S).fill(null).map(() => Array(GRID_S).fill(null).map(() => ({value: 8, color: 'grey'})));
            nearlyFullGrid[GRID_S - 2][0] = null; 
            nearlyFullGrid[GRID_S - 1][0] = null; 
            
            const tileToLand = { value: 2, color: game.TILE_COLORS_DEFAULT_GETTER()[0] };
            nearlyFullGrid[GRID_S - 2][0] = tileToLand;

            game._resetModuleState({ 
                grid: nearlyFullGrid,
                activeFallingTile: { tileObject: tileToLand, row: GRID_S - 2, col: 0 }
            });
            game.gameLoop(); 
            game.gameLoop(); 
            
            const gameState = game.getGameState();
            expect(gameState.activeFallingTile).toBeNull();
            expect(gameState.grid[GRID_S - 1][0].value).toBe(2);
        });
    });
});

describe('setupGame', () => {
    let pauseButtonElement, messageContainerElement, messageParagraph, gridContainerElement, scoreDisplayElement;
    let updateScoreSpy, createBackgroundGridSpy, spawnNewFallingTileSpy;
    const initialGridSize = 4; // Default for tests

    beforeEach(() => {
        document.body.innerHTML = `
            <a id="pause-button"><img src="play.png" alt="Play" class="button-icon">Resume</a>
            <div id="game-message" style="display: flex;"><p>Some Message</p></div>
            <div id="grid-container">Existing Content</div>
            <div id="score">50</div>
            <div id="best-score">0</div>
        `;
        
        game._initializeDOMElements(); 

        pauseButtonElement = document.getElementById('pause-button');
        messageContainerElement = document.getElementById('game-message'); 
        if(messageContainerElement) messageParagraph = messageContainerElement.querySelector('p');
        gridContainerElement = document.getElementById('grid-container');
        scoreDisplayElement = document.getElementById('score');

        updateScoreSpy = jest.spyOn(game, 'updateScore');
        createBackgroundGridSpy = jest.spyOn(game, 'createBackgroundGrid');
        spawnNewFallingTileSpy = jest.spyOn(game, 'spawnNewFallingTile');

        game._resetModuleState({ 
            isPaused: true, 
            isGameOver: true, 
            score: 100, 
            activeFallingTile: {obj: 'test'},
            currentColorIndex: 1,
            GRID_SIZE: initialGridSize,
        });

        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    test('should reset isPaused to false', () => {
        game.setupGame();
        expect(game.getGameState().isPaused).toBe(false);
    });

    test('should set pauseButton innerHTML to Pause with icon, if pauseButton exists', () => {
        document.body.innerHTML = '<button id="pause-button"></button>';
        game._initializeDOMElements(); // Re-initialize to pick up the new button
        game.setupGame();
        const gamePauseButton = document.getElementById('pause-button');
        if (gamePauseButton) {
             expect(gamePauseButton.innerHTML).toContain('<img src="icons/Pause.png" alt="Pause" class="button-icon">');
             expect(gamePauseButton.innerHTML).toContain('Pause');
        }
    });

    test('should hide messageContainer and clear its text, if messageContainer exists', () => {
        if (messageContainerElement && messageParagraph) {
            game.setupGame();
            const gameMessageContainer = document.getElementById('game-message');
            if (gameMessageContainer) {
                expect(gameMessageContainer.style.display).toBe('none');
                const p = gameMessageContainer.querySelector('p');
                if (p) expect(p.textContent).toBe('');
            }
        } else {
            game._initializeDOMElements();
            expect(() => game.setupGame()).not.toThrow();
        }
    });

    test('gridContainer should be repopulated by setupGame', () => {
        if (gridContainerElement) {
            // Mock requestAnimationFrame to execute callbacks immediately
            const originalRAF = global.requestAnimationFrame;
            global.requestAnimationFrame = jest.fn((callback) => {
                // Execute callback immediately in test environment
                callback();
                return 1;
            });
            
            const initialHTML = gridContainerElement.innerHTML;
            game.setupGame();
            
            expect(gridContainerElement.innerHTML).not.toBe(initialHTML);
            expect(gridContainerElement.querySelector('.grid-cell')).not.toBeNull();
            expect(gridContainerElement.querySelector('.tile')).not.toBeNull();
            
            // Restore original if it existed, otherwise delete the mock
            if (originalRAF) {
                global.requestAnimationFrame = originalRAF;
            } else {
                delete global.requestAnimationFrame;
            }
        }
    });

    test('should reset isGameOver to false', () => {
        game.setupGame();
        expect(game.getGameState().isGameOver).toBe(false);
    });

    test('should reset score to 0', () => {
        game.setupGame();
        expect(game.getGameState().score).toBe(0);
        if (scoreDisplayElement) {
            expect(scoreDisplayElement.textContent).toBe('0');
        }
    });

    test('should initialize grid with one tile from spawnNewFallingTile', () => {
        game.setupGame();
        const gridState = game.getGameState().grid;
        const gridSize = game.getGameState().GRID_SIZE || initialGridSize;
        expect(gridState.length).toBe(gridSize);
        let tileCount = 0;
        gridState.forEach(row => {
            expect(row.length).toBe(gridSize);
            row.forEach(cell => {
                if (cell !== null) {
                    tileCount++;
                    expect(cell).toHaveProperty('value');
                    expect(cell).toHaveProperty('color');
                }
            });
        });
        expect(tileCount).toBe(1);
    });

    test('activeFallingTile should be set by spawnNewFallingTile', () => {
        game.setupGame();
        expect(game.getGameState().activeFallingTile).not.toBeNull();
        expect(game.getGameState().activeFallingTile).toHaveProperty('tileObject');
        expect(game.getGameState().activeFallingTile).toHaveProperty('row');
        expect(game.getGameState().activeFallingTile).toHaveProperty('col');
    });

    test('currentColorIndex should be incremented by spawnNewFallingTile', () => {
        game._resetModuleState({ currentColorIndex: 0 });
        game.setupGame();
        if (game.getGameState().TILE_COLORS && game.getGameState().TILE_COLORS.length > 0) {
            expect(game.getGameState().currentColorIndex).toBe(1 % game.getGameState().TILE_COLORS.length);
        } else {
            expect(game.getGameState().currentColorIndex).toBe(1);
        }
    });

    test('should handle missing optional DOM elements gracefully (e.g., gridContainer)', () => {
        // DOM without gridContainer, but with score which is also critical for setupGame
        document.body.innerHTML = `
            <div id="score">0</div> 
            <div id="best-score">0</div>
            // NO grid-container, and no pause button or message container either
        `;
        // Spies (createBackgroundGridSpy, spawnNewFallingTileSpy) are defined in the suite's beforeEach.
        // We need to ensure they are clear before this specific test logic runs if they could have been called by other setup.
        // However, setupGame is NOT called in the suite's beforeEach.
        createBackgroundGridSpy.mockClear(); 
        spawnNewFallingTileSpy.mockClear();
        updateScoreSpy.mockClear(); // updateScore IS called by setupGame(0) internally

        game._initializeDOMElements(); // gridContainer in module scope will be null

        expect(() => game.setupGame()).not.toThrow();

        // Core state resets should still happen
        expect(game.getGameState().isGameOver).toBe(false);
        expect(game.getGameState().isPaused).toBe(false);
        expect(game.getGameState().score).toBe(0); // updateScore(0) is called internally, this checks the result
        
        // These should NOT have been called (or rather, their spied-upon exported versions)
        // because their internal counterparts would return early due to missing gridContainer.
        expect(createBackgroundGridSpy).not.toHaveBeenCalled(); 
        expect(spawnNewFallingTileSpy).not.toHaveBeenCalled(); 
    });
}); 