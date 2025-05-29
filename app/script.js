// 2048 Tetris Game Logic

// Module-scoped state variables
let GRID_SIZE = 4;
// let TILE_COLORS = ['#F67B7B', '#FAA770', '#FBCC67', '#64D18C']; // og
// const TILE_COLORS_DEFAULT = ['#F67B7B', '#FAA770', '#FBCC67', '#64D18C']; // og
let TILE_COLORS = ['#F7A161', '#F6CC5B', '#F3BE78', '#88B983']; // new 
let TILE_COLORS_DEFAULT = ['#F7A161', '#F6CC5B', '#F3BE78', '#88B983']; // new 


let grid = [];
let tileDOMElements = []; // To store references to tile DOM elements
let activeFallingTile = null;
let score = 0;
let bestScore = 0; 
let gameInterval;
const FALL_SPEED = 500;
const SWIPE_THRESHOLD = 30;
let isGameOver = false;
let isPaused = false;
let currentColorIndex = 0;
let isColorMode = false;
let isModalActive = false;
let newBestScoreAchievedThisGame = false; // This flag now gates confetti per game
let gridNeedsRedraw = false; // Dirty flag for grid rendering

// Cached DOM measurements
let currentCellSize = 0;
let currentCellGap = 0;

// DOM Element Variables - to be assigned in _initializeDOMElements
let gameContainer, gridContainer, scoreDisplay, bestScoreDisplay, messageContainer, messageParagraph,
    restartButton, tryAgainButton, pauseButton, gameExplanation, viewportSettingsButton,
    settingsModal, closeSettingsModalButton, numberModeRadio, colorModeRadio,
    settingsColorPaletteGrid, saveSettingsButton, cancelSettingsButton,
    colorPickerInput, paletteSuccessMessage,
    toggleButton, instructionsContent, collapsibleDrawer, toggleButtonArrow,
    closeInstructionsButton_collapsible; // Removed newBestScoreEmojiLeft, newBestScoreEmojiRight

let tempIsColorMode = false;
let tempTileColors = [...TILE_COLORS_DEFAULT];
let settingsCurrentEditingSwatchIndex = -1;

// --- Start gameApi Object Definition ---
const gameApi = {
    jsConfettiInstance: null, // Added as a property
    // --- Color Conversion and Mixing Helpers ---
    hexToRgb: function(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return { r, g, b };
    },

    rgbToHsl: function(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; 
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s, l };
    },

    hslToRgb: function(h, s, l) {
        let r, g, b;
        h /= 360; 

        if (s === 0) {
            r = g = b = l; 
        } else {
            const hueToRgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hueToRgb(p, q, h + 1 / 3);
            g = hueToRgb(p, q, h);
            b = hueToRgb(p, q, h - 1 / 3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    },

    rgbToHex: function(r, g, b) {
        const toHex = (c) => {
            const hex = c.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    },

    mixColors: function(hex1, hex2) {
        const hsl1 = this.rgbToHsl(this.hexToRgb(hex1).r, this.hexToRgb(hex1).g, this.hexToRgb(hex1).b);
        const hsl2 = this.rgbToHsl(this.hexToRgb(hex2).r, this.hexToRgb(hex2).g, this.hexToRgb(hex2).b);
        const h1Rad = hsl1.h * Math.PI / 180;
        const h2Rad = hsl2.h * Math.PI / 180;
        const avgX = (Math.cos(h1Rad) + Math.cos(h2Rad)) / 2;
        const avgY = (Math.sin(h1Rad) + Math.sin(h2Rad)) / 2;
        let mixedH = Math.atan2(avgY, avgX) * 180 / Math.PI;
        if (mixedH < 0) mixedH += 360;
        const mixedS = (hsl1.s + hsl2.s) / 2;
        const mixedL = (hsl1.l + hsl2.l) / 2;
        const mixedRgb = this.hslToRgb(mixedH, mixedS, mixedL);
        return this.rgbToHex(mixedRgb.r, mixedRgb.g, mixedRgb.b);
    },
    // --- End Color Helpers ---

    markGridDirty: function() {
        if (!gridNeedsRedraw) {
            gridNeedsRedraw = true;
            requestAnimationFrame(() => {
                if (gridNeedsRedraw) {
                    this.drawGrid();
                    gridNeedsRedraw = false;
                }
            });
        }
    },

    setupGame: function() {
        isPaused = false;
        if(pauseButton) pauseButton.innerHTML = '<img src="icons/Pause.png" alt="Pause" class="button-icon">Pause';
        if(messageContainer) {
            if (messageParagraph) messageParagraph.textContent = '';
            messageContainer.style.display = 'none';
        }

        if(gridContainer) gridContainer.innerHTML = ''; // Clear previous grid cells and tiles entirely
        isGameOver = false; 
        score = 0;
        this.updateScore(0); 
        if (bestScoreDisplay) bestScoreDisplay.classList.remove('best-score-glow');
        if (scoreDisplay) scoreDisplay.classList.remove('current-score-glow');
        newBestScoreAchievedThisGame = false; // Reset flag
        
        grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        tileDOMElements = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)); // Initialize DOM element cache
        
        if (gridContainer) {
            this.createBackgroundGrid(); // This will also calculate currentCellSize and currentCellGap
        }
        
        activeFallingTile = null; 
        currentColorIndex = 0; 
        if (gridContainer) {
            this.spawnNewFallingTile(); 
        }
    },

    createBackgroundGrid: function() {
        if (!gridContainer) return;
        // Clear only background cells, tiles are managed by drawGrid
        const existingCells = gridContainer.querySelectorAll('.grid-cell');
        existingCells.forEach(cell => cell.remove());

        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                gridContainer.appendChild(cell);
            }
        }
        // Cache cell size and gap after creating the background grid
        const computedStyles = getComputedStyle(document.documentElement);
        currentCellGap = parseFloat(computedStyles.getPropertyValue('--gap-grid'));
        const firstGridCell = gridContainer.querySelector('.grid-cell');
        if (firstGridCell) {
            currentCellSize = firstGridCell.offsetWidth;
        } else {
            currentCellSize = parseFloat(computedStyles.getPropertyValue('--size-grid-cell')); 
        }

        // Clear any stray tile DOM elements if this function is ever called mid-game (though it shouldn't be for this strategy)
        const existingTiles = gridContainer.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());
        tileDOMElements = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)); // Reset DOM element cache
    },

    triggerConfettiEffect: function() {
        // Simplified: just plays confetti if instance exists. Gating is done by callers.
        if (this.jsConfettiInstance) {
            this.jsConfettiInstance.addConfetti({
                emojis: ['🎉'],
                confettiNumber: 150,
                emojiSize: 24,
                confettiRadius: 60,
            });
        }
    },

    updateScore: function(newPoints) {
        if (newPoints === 0 && score !== 0) {
             score = 0;
        } else if (newPoints === 0 && score === 0 && Object.keys(arguments).length === 1 && arguments[0] === 0 ) {
            score = 0;
        }
        else {
            score += newPoints;
        }
        if (scoreDisplay) scoreDisplay.textContent = score.toLocaleString();
        
        if (score > bestScore) { // New overall best score
            if (!newBestScoreAchievedThisGame) { // Only trigger confetti if it hasn't been shown this game
                this.triggerConfettiEffect();
            }
            newBestScoreAchievedThisGame = true; // Set flag *after* checking, so it's true for subsequent checks
            bestScore = score;
            localStorage.setItem('bestScore', bestScore.toString());
            if (bestScoreDisplay) bestScoreDisplay.classList.add('best-score-glow');
        }
        if (bestScoreDisplay) this.updateBestScore(); // Ensure best score display is always up-to-date
    },

    updateBestScore: function() {
        if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore.toLocaleString();
    },

    handleGameOver: function() {
        isGameOver = true;
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
        this.updateGameMessageVisibility();

        if (messageContainer) {
            if (messageParagraph) {
                let gameOverHTML = "Game Over!";

                // Display the new high score message if the flag is set
                if (newBestScoreAchievedThisGame) {
                    // Ensure the best score glow is active if we are showing the new high score message
                    if (bestScoreDisplay && !bestScoreDisplay.classList.contains('best-score-glow')) {
                        bestScoreDisplay.classList.add('best-score-glow');
                    }
                    gameOverHTML += '<br><span class="new-high-score-emphasis">New High Score! 🎉</span>';
                }
                messageParagraph.innerHTML = gameOverHTML;
            }
        }

        activeFallingTile = null;
        if (tryAgainButton) tryAgainButton.textContent = 'Try Again';
    },

    createTileElement: function(tileObject, row, col) {
        // This function now assumes currentCellSize and currentCellGap are up-to-date module variables
        if (!gridContainer) return null;

        const tile = document.createElement('div');
        tile.classList.add('tile');
        // Value class is updated by updateTileElement
        
        // Text and color are updated by updateTileElement

        const translateX = col * (currentCellSize + currentCellGap);
        const translateY = row * (currentCellSize + currentCellGap);
        tile.style.width = `${currentCellSize}px`;
        tile.style.height = `${currentCellSize}px`;
        tile.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
        
        // isNewlyMerged animation handled by updateTileElement
        
        gridContainer.appendChild(tile);
        return tile;
    },

    // NEW HELPER FUNCTION to update an existing tile's DOM properties or a newly created one
    updateTileElement: function(tileDOM, tileData, isNew) {
        if (!tileData) { // Should remove tile if tileData is null
            if (tileDOM && tileDOM.parentNode) {
                tileDOM.parentNode.removeChild(tileDOM);
            }
            return null;
        }

        // Update value-specific class
        tileDOM.className = 'tile'; // Reset classes then add specific one
        tileDOM.classList.add(`tile-${tileData.value > 2048 ? 'super' : tileData.value}`);

        if (isColorMode) {
            tileDOM.textContent = '';
        } else {
            tileDOM.textContent = tileData.value;
        }
        tileDOM.style.backgroundColor = tileData.color;
        
        if (tileData.isNewlyMerged) {
            tileDOM.classList.add('tile-just-merged');
            const currentGridTileObject = tileData; // Capture tileData for the timeout
            setTimeout(() => {
                if (tileDOM.parentNode && tileDOM.classList.contains('tile-just-merged')) {
                     tileDOM.classList.remove('tile-just-merged');
                }
                // Check if the tile data object still exists and has the flag before deleting
                if (currentGridTileObject) delete currentGridTileObject.isNewlyMerged; 
            }, 150); 
        }
        return tileDOM;
    },

    drawGrid: function() {
        if (!gridContainer) return;
        // currentCellSize and currentCellGap should be up-to-date from createBackgroundGrid or a resize handler

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const tileData = grid[r][c];
                let tileDOM = tileDOMElements[r][c];

                if (tileData) {
                    // Calculate new position (might be the same if not moving)
                    const expectedTranslateX = c * (currentCellSize + currentCellGap);
                    const expectedTranslateY = r * (currentCellSize + currentCellGap);
                    const expectedTransform = `translate3d(${expectedTranslateX}px, ${expectedTranslateY}px, 0)`;

                    if (!tileDOM) { // Tile data exists, but no DOM element -> create it
                        tileDOM = this.createTileElement(tileData, r, c); // createTileElement sets initial position
                        tileDOMElements[r][c] = this.updateTileElement(tileDOM, tileData, true);
                    } else {
                        // Tile DOM exists, update its properties and position if necessary
                        tileDOMElements[r][c] = this.updateTileElement(tileDOM, tileData, false);
                        // Update position if it changed (e.g., for falling tile)
                        if (tileDOM.style.transform !== expectedTransform) {
                            tileDOM.style.transform = expectedTransform;
                        }
                    }
                } else {
                    // No tile data, ensure no DOM element exists
                    if (tileDOM) {
                        tileDOMElements[r][c] = this.updateTileElement(tileDOM, null, false); // Call updateTileElement for removal
                    }
                }
            }
        }
    },

    isBoardFull: function() {
        if (isGameOver) return false;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === null) {
                    return false;
                }
            }
        }
        return true;
    },

    spawnNewFallingTile: function() {
        if (isGameOver || isPaused) return;
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }

        const availableCols = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[0][c] === null) {
                availableCols.push(c);
            }
        }
        if (availableCols.length === 0) return; 

        const tileValue = Math.random() < 0.9 ? 2 : 4;
        const tileColor = TILE_COLORS[currentColorIndex];
        currentColorIndex = (currentColorIndex + 1) % TILE_COLORS.length;
        const newTileObject = { value: tileValue, color: tileColor };
        const col = availableCols[Math.floor(Math.random() * availableCols.length)];
        grid[0][col] = newTileObject;
        activeFallingTile = { tileObject: newTileObject, row: 0, col: col }; 
        this.markGridDirty(); 
        gameInterval = setInterval(this.gameLoop.bind(this), FALL_SPEED);
    },
        
    gameLoop: function() {
        if (isPaused || isGameOver || !activeFallingTile) {
            if (!activeFallingTile && gameInterval && !isPaused && !isGameOver) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
            return;
        }
        
        const { tileObject, row, col } = activeFallingTile;
        const nextRow = row + 1;
        let canFallFurther = false;
        if (nextRow < GRID_SIZE && grid[nextRow][col] === null) {
            canFallFurther = true;
        }

        if (canFallFurther) {
            grid[row][col] = null;
            activeFallingTile.row = nextRow;
            grid[nextRow][col] = tileObject;
        } else {
            activeFallingTile = null; 
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
            if (!isGameOver && this.isBoardFull()) {
                this.handleGameOver();
            }
        }
        this.markGridDirty(); 
    },

    moveTilesLeft: function() {
        let boardChanged = false;
        for (let r = 0; r < GRID_SIZE; r++) {
            const originalRowObjects = [...grid[r]];
            let compactRow = grid[r].filter(cell => cell !== null);
            for (let i = 0; i < compactRow.length - 1; i++) {
                let canMerge = false;
                if (isColorMode) {
                    canMerge = compactRow[i].color === compactRow[i+1].color;
                } else {
                    canMerge = compactRow[i].value === compactRow[i+1].value;
                }
                if (canMerge) {
                    const mergedValue = compactRow[i].value * 2;
                    let mergedColor = isColorMode ? compactRow[i].color : this.mixColors(compactRow[i].color, compactRow[i+1].color);
                    compactRow[i] = { value: mergedValue, color: mergedColor, isNewlyMerged: true };
                    this.updateScore(mergedValue);
                    compactRow.splice(i + 1, 1);
                }
            }
            const newRow = Array(GRID_SIZE).fill(null);
            for (let i = 0; i < compactRow.length; i++) newRow[i] = compactRow[i];
            for (let c = 0; c < GRID_SIZE; c++) {
                if ((originalRowObjects[c] === null && newRow[c] !== null) ||
                    (originalRowObjects[c] !== null && newRow[c] === null) ||
                    (originalRowObjects[c] !== null && newRow[c] !== null && 
                     (originalRowObjects[c].value !== newRow[c].value || originalRowObjects[c].color !== newRow[c].color))) {
                    boardChanged = true;
                }
                grid[r][c] = newRow[c];
            }
        }
        return boardChanged;
    },

    moveTilesRight: function() {
        let boardChanged = false;
        for (let r = 0; r < GRID_SIZE; r++) {
            const originalRowObjects = [...grid[r]];
            let currentRow = [...grid[r]].reverse();
            let compactRow = currentRow.filter(cell => cell !== null);
            for (let i = 0; i < compactRow.length - 1; i++) {
                let canMerge = false;
                if (isColorMode) {
                    canMerge = compactRow[i].color === compactRow[i+1].color;
                } else {
                    canMerge = compactRow[i].value === compactRow[i+1].value;
                }
                if (canMerge) {
                    const mergedValue = compactRow[i].value * 2;
                    let mergedColor = isColorMode ? compactRow[i].color : this.mixColors(compactRow[i].color, compactRow[i+1].color);
                    compactRow[i] = { value: mergedValue, color: mergedColor, isNewlyMerged: true };
                    this.updateScore(mergedValue);
                    compactRow.splice(i + 1, 1); 
                }
            }
            const processedRow = Array(GRID_SIZE).fill(null);
            for (let i = 0; i < compactRow.length; i++) processedRow[i] = compactRow[i];
            const newRow = processedRow.reverse();
            for (let c = 0; c < GRID_SIZE; c++) {
                 if ((originalRowObjects[c] === null && newRow[c] !== null) ||
                    (originalRowObjects[c] !== null && newRow[c] === null) ||
                    (originalRowObjects[c] !== null && newRow[c] !== null && 
                     (originalRowObjects[c].value !== newRow[c].value || originalRowObjects[c].color !== newRow[c].color))) {
                    boardChanged = true;
                }
                grid[r][c] = newRow[c];
            }
        }
        return boardChanged;
    },

    moveTilesUp: function() {
        let boardChanged = false;
        for (let c_idx = 0; c_idx < GRID_SIZE; c_idx++) { 
            const originalColumnObjects = [];
            for(let r_idx = 0; r_idx < GRID_SIZE; r_idx++) originalColumnObjects.push(grid[r_idx][c_idx]);
            let compactColumn = [];
            for (let r_idx = 0; r_idx < GRID_SIZE; r_idx++) if (grid[r_idx][c_idx] !== null) compactColumn.push(grid[r_idx][c_idx]);
            for (let i = 0; i < compactColumn.length - 1; i++) {
                let canMerge = false;
                if (isColorMode) {
                    canMerge = compactColumn[i].color === compactColumn[i+1].color;
                } else {
                    canMerge = compactColumn[i].value === compactColumn[i+1].value;
                }
                if (canMerge) {
                    const mergedValue = compactColumn[i].value * 2;
                    let mergedColor = isColorMode ? compactColumn[i].color : this.mixColors(compactColumn[i].color, compactColumn[i+1].color);
                    compactColumn[i] = { value: mergedValue, color: mergedColor, isNewlyMerged: true };
                    this.updateScore(mergedValue);
                    compactColumn.splice(i + 1, 1);
                }
            }
            const newColumn = Array(GRID_SIZE).fill(null);
            for (let i = 0; i < compactColumn.length; i++) newColumn[i] = compactColumn[i];
            for (let r_idx = 0; r_idx < GRID_SIZE; r_idx++) {
                if ((originalColumnObjects[r_idx] === null && newColumn[r_idx] !== null) ||
                    (originalColumnObjects[r_idx] !== null && newColumn[r_idx] === null) ||
                    (originalColumnObjects[r_idx] !== null && newColumn[r_idx] !== null && 
                     (originalColumnObjects[r_idx].value !== newColumn[r_idx].value || originalColumnObjects[r_idx].color !== newColumn[r_idx].color))) {
                    boardChanged = true;
                }
                grid[r_idx][c_idx] = newColumn[r_idx];
            }
        }
        return boardChanged;
    },

    moveTilesDown: function() {
        let boardChanged = false;
        for (let c_idx = 0; c_idx < GRID_SIZE; c_idx++) { 
            const originalColumnObjects = [];
            for(let r_idx = 0; r_idx < GRID_SIZE; r_idx++) originalColumnObjects.push(grid[r_idx][c_idx]);
            let currentCol = [];
            for (let r_idx = 0; r_idx < GRID_SIZE; r_idx++) currentCol.push(grid[r_idx][c_idx]);
            currentCol.reverse(); 
            let compactColumn = currentCol.filter(cell => cell !== null);
            for (let i = 0; i < compactColumn.length - 1; i++) {
                let canMerge = false;
                if (isColorMode) {
                    canMerge = compactColumn[i].color === compactColumn[i+1].color;
                } else {
                    canMerge = compactColumn[i].value === compactColumn[i+1].value;
                }
                if (canMerge) {
                    const mergedValue = compactColumn[i].value * 2;
                    let mergedColor = isColorMode ? compactColumn[i].color : this.mixColors(compactColumn[i].color, compactColumn[i+1].color);
                    compactColumn[i] = { value: mergedValue, color: mergedColor, isNewlyMerged: true };
                    this.updateScore(mergedValue);
                    compactColumn.splice(i + 1, 1);
                }
            }
            const processedReversedColumn = Array(GRID_SIZE).fill(null);
            for (let i = 0; i < compactColumn.length; i++) processedReversedColumn[i] = compactColumn[i];
            const newColumn = processedReversedColumn.reverse();
            for (let r_idx = 0; r_idx < GRID_SIZE; r_idx++) {
                 if ((originalColumnObjects[r_idx] === null && newColumn[r_idx] !== null) ||
                    (originalColumnObjects[r_idx] !== null && newColumn[r_idx] === null) ||
                    (originalColumnObjects[r_idx] !== null && newColumn[r_idx] !== null && 
                     (originalColumnObjects[r_idx].value !== newColumn[r_idx].value || originalColumnObjects[r_idx].color !== newColumn[r_idx].color))) {
                    boardChanged = true;
                }
                grid[r_idx][c_idx] = newColumn[r_idx];
            }
        }
        return boardChanged;
    },

    handleUserKeyPress: function(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
            event.preventDefault(); 
            
            if (!newBestScoreAchievedThisGame) { // Only trigger confetti if it hasn't been shown this game
                this.triggerConfettiEffect();
            }
            newBestScoreAchievedThisGame = true; // Set flag *after* checking
            
            if (bestScoreDisplay) bestScoreDisplay.classList.add('best-score-glow'); 
            if (scoreDisplay) scoreDisplay.classList.add('current-score-glow');
            return; 
        }

        if ((event.metaKey || event.ctrlKey) && event.key === 'g') {
            event.preventDefault(); 
            this.handleGameOver();
            return; 
        }

        if (isModalActive || isGameOver || isPaused) {
            return;
        }

        const wasTileFallingWhenKeyPressed = !!activeFallingTile;
        let moved = false;
        switch (event.key) {
            case "ArrowUp": 
                event.preventDefault();
                moved = this.moveTilesUp(); 
                break;
            case "ArrowDown": 
                event.preventDefault();
                moved = this.moveTilesDown(); 
                break;
            case "ArrowLeft": 
                event.preventDefault();
                moved = this.moveTilesLeft(); 
                break;
            case "ArrowRight": 
                event.preventDefault();
                moved = this.moveTilesRight(); 
                break;
            default: return;
        }
        if (moved) {
            if (!wasTileFallingWhenKeyPressed) this.spawnNewFallingTile();
            if (!isGameOver && this.isBoardFull()) this.handleGameOver();
            this.markGridDirty(); 
        }
    },

    togglePauseGame: function() {
        if (isGameOver) return; 
        isPaused = !isPaused;
        if (isPaused) {
            if (gameInterval) {
                clearInterval(gameInterval);
                gameInterval = null;
            }
            if (pauseButton) pauseButton.innerHTML = '<img src="icons/Play.png" alt="Play" class="button-icon">Resume';
            if (tryAgainButton) tryAgainButton.style.display = 'none';
            if (messageContainer && messageParagraph) {
                messageParagraph.textContent = 'Game Paused';
                messageContainer.style.display = 'flex';
            }
        } else {
            if (pauseButton) pauseButton.innerHTML = '<img src="icons/Pause.png" alt="Pause" class="button-icon">Pause';
            if (tryAgainButton) tryAgainButton.style.display = 'flex';
            if (messageContainer) {
                 messageContainer.style.display = 'none';
                 if(messageParagraph) messageParagraph.textContent = '';
            }
            if (activeFallingTile && !isGameOver) { 
                if(gameInterval) clearInterval(gameInterval);
                gameInterval = setInterval(this.gameLoop.bind(this), FALL_SPEED); 
            }
        }
    },

    showInstructionsModal: function(show) {
        if (!toggleButton || !instructionsContent) return;
        const isMobileView = window.innerWidth <= 480;
        if (isMobileView) {
            if (show) {
                instructionsContent.classList.remove('open'); 
                if (typeof instructionsContent.offsetWidth === 'number') void instructionsContent.offsetWidth;
                document.body.classList.add('instructions-modal-mode-active');
                toggleButton.setAttribute('aria-expanded', 'true');
            } else {
                document.body.classList.remove('instructions-modal-mode-active');
                instructionsContent.classList.remove('open'); 
                toggleButton.setAttribute('aria-expanded', 'false');
            }
        } else {
            if (show) {
                instructionsContent.classList.add('open');
                toggleButton.setAttribute('aria-expanded', 'true');
                if (toggleButton.querySelector('.arrow')) toggleButton.querySelector('.arrow').innerHTML = '-';
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
                if (toggleButton.querySelector('.arrow')) toggleButton.querySelector('.arrow').innerHTML = '+';
            }
        }
    },

    populateSettingsColorPalette: function() {
        if (!settingsColorPaletteGrid || !colorPickerInput) return;
        settingsColorPaletteGrid.innerHTML = ''; 
        tempTileColors.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.classList.add('palette-swatch');
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.dataset.index = index.toString();
            const hexCodeDisplay = document.createElement('span');
            hexCodeDisplay.classList.add('hex-code');
            hexCodeDisplay.textContent = color.toUpperCase();
            swatch.appendChild(hexCodeDisplay);
            swatch.addEventListener('click', (e) => {
                settingsCurrentEditingSwatchIndex = index;
                colorPickerInput.value = tempTileColors[index];
                // --- Overlay/focus trick for mobile ---
                const isMobile = window.innerWidth <= 600 || /Mobi|Android/i.test(navigator.userAgent);
                if (isMobile) {
                    // Position the input over the swatch
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
                    
                    // Focus and click
                    colorPickerInput.focus();
                    setTimeout(() => colorPickerInput.click(), 0);
                    
                    // After input, hide again
                    const hideInput = () => {
                        inputStyle.position = '';
                        inputStyle.left = '';
                        inputStyle.top = '';
                        inputStyle.width = '';
                        inputStyle.height = '';
                        inputStyle.opacity = '';
                        inputStyle.pointerEvents = '';
                        inputStyle.zIndex = '';
                        inputStyle.display = '';
                        colorPickerInput.removeEventListener('input', hideInput);
                        colorPickerInput.removeEventListener('blur', hideInput);
                    };
                    colorPickerInput.addEventListener('input', hideInput);
                    colorPickerInput.addEventListener('blur', hideInput);
                } else {
                    colorPickerInput.click();
                }
            });
            settingsColorPaletteGrid.appendChild(swatch);
        });
    },

    openSettingsModal: function() {
        document.removeEventListener('keydown', this.handleUserKeyPress);
        tempIsColorMode = isColorMode;
        tempTileColors = [...TILE_COLORS];
        settingsCurrentEditingSwatchIndex = -1;
        isModalActive = true;
        if (colorModeRadio) colorModeRadio.checked = tempIsColorMode;
        if (numberModeRadio) numberModeRadio.checked = !tempIsColorMode;
        this.populateSettingsColorPalette();
        if (settingsModal) settingsModal.style.display = 'flex';
        if (paletteSuccessMessage) {
            paletteSuccessMessage.classList.remove('visible');
            paletteSuccessMessage.style.display = 'none';
        }
    },

    closeSettingsModal: function() {
        if (settingsModal) settingsModal.style.display = 'none';
        document.addEventListener('keydown', this.handleUserKeyPress); 
        isModalActive = false; 
    },

    saveSettings: function() {
        if (colorModeRadio) { 
            isColorMode = colorModeRadio.checked; 
        }
        TILE_COLORS = [...tempTileColors];
        localStorage.setItem('tileColors', JSON.stringify(TILE_COLORS));
        localStorage.setItem('isColorMode', isColorMode.toString());
        this.closeSettingsModal();
        this.setupGame(); 
        if (paletteSuccessMessage) {
            paletteSuccessMessage.textContent = 'Settings saved successfully!';
            paletteSuccessMessage.style.display = 'block';
            setTimeout(() => {
                paletteSuccessMessage.style.display = 'none';
            }, 3000); 
        }
    },

    handleSettingsColorPickerInput: function(event) {
        if (settingsCurrentEditingSwatchIndex !== -1 && settingsModal && settingsModal.style.display === 'flex') {
            const newColor = event.target.value;
            tempTileColors[settingsCurrentEditingSwatchIndex] = newColor;
            if (settingsColorPaletteGrid) {
                const swatchInModal = settingsColorPaletteGrid.querySelector(`.palette-swatch[data-index="${settingsCurrentEditingSwatchIndex}"]`);
                if (swatchInModal) {
                    swatchInModal.style.backgroundColor = newColor;
                    swatchInModal.dataset.color = newColor;
                    const hexDisplay = swatchInModal.querySelector('.hex-code');
                    if (hexDisplay) hexDisplay.textContent = newColor.toUpperCase();
                }
            }
        }
    },

    // --- Touch Controls Logic ---
    // Module-scoped touchStartX, touchStartY are fine. SWIPE_THRESHOLD is also module-scoped.

    handleTouchStart: function(event) {
        if (isGameOver || isPaused || event.touches.length > 1) return; 
        // Only prevent default if we're actually going to handle this touch
        if (gameContainer && gameContainer.contains(event.target)) {
            event.preventDefault();
        }
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    },

    handleTouchMove: function(event) {
        if (isGameOver || isPaused || !event.touches || event.touches.length > 1) return;
        // Only prevent default if the touch is happening inside the game container
        if (gameContainer && gameContainer.contains(event.target)) {
            event.preventDefault(); 
        }
    },

    handleTouchEnd: function(event) { // Restored structure
        if (isGameOver || isPaused) return;
        // Check if changedTouches exists and has length
        if (!event.changedTouches || event.changedTouches.length === 0) {
            // Reset for next touch sequence if no useful touch data
            touchStartX = 0;
            touchStartY = 0;
            return;
        }
        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // If either start value was 0 (e.g., from a previous reset or no start event)
        if (touchStartX === 0 && touchStartY === 0 && (deltaX !== 0 || deltaY !== 0) ) {
            // This means we got an end without a proper start, or start was reset.
            // Avoid processing this swipe. Reset and return.
            touchStartX = 0;
            touchStartY = 0;
            return;
        }
        
        if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) {
             // Reset if it's just a tap
            touchStartX = 0;
            touchStartY = 0;
            return;
        }

        let direction = null;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? "ArrowRight" : "ArrowLeft";
        } else {
            direction = deltaY > 0 ? "ArrowDown" : "ArrowUp";
        }

        if (direction) {
            this._handleSwipe(direction, this); // Passing 'this' (gameApi) as gameContext
        }
        // Reset for next touch sequence
        touchStartX = 0;
        touchStartY = 0;
    },

    _handleSwipe: function(direction, gameContext) { // Restored structure, added gameContext
        if (isGameOver || isPaused || isModalActive) return;

        const wasTileFallingWhenSwiped = activeFallingTile !== null;

        let moved = false;
        switch (direction) {
            case "ArrowUp": moved = gameContext.moveTilesUp(); break;
            case "ArrowDown": moved = gameContext.moveTilesDown(); break;
            case "ArrowLeft": moved = gameContext.moveTilesLeft(); break;
            case "ArrowRight": moved = gameContext.moveTilesRight(); break;
        }

        if (moved) {
            if (!wasTileFallingWhenSwiped) gameContext.spawnNewFallingTile();
            gameContext.markGridDirty(); 
            if (gameContext.isBoardFull()) { 
                gameContext.handleGameOver();
            }
        } else if (direction === "ArrowDown" && wasTileFallingWhenSwiped) {
            // Optional: fast drop logic placeholder (e.g., accelerate drop or move to bottom)
            // console.log("Attempted fast drop on existing falling tile.");
        }
    },

    _initializeDOMElements: function() {
        gameContainer = document.querySelector('.game-container');
        gridContainer = document.getElementById('grid-container');
        scoreDisplay = document.getElementById('score');
        bestScoreDisplay = document.getElementById('best-score');
        messageContainer = document.getElementById('game-message');
        messageParagraph = messageContainer ? messageContainer.querySelector('p') : null;
        restartButton = document.getElementById('restart-button');
        tryAgainButton = document.getElementById('retry-button');
        pauseButton = document.getElementById('pause-button');
        gameExplanation = document.querySelector('.game-explanation');
        viewportSettingsButton = document.getElementById('viewport-settings-button');
        settingsModal = document.getElementById('settings-modal');
        closeSettingsModalButton = document.getElementById('close-settings-modal-btn');
        numberModeRadio = document.getElementById('number-mode-radio');
        colorModeRadio = document.getElementById('color-mode-radio');
        settingsColorPaletteGrid = document.getElementById('settings-color-palette-grid');
        saveSettingsButton = document.getElementById('save-settings-button');
        cancelSettingsButton = document.getElementById('cancel-settings-button');
        colorPickerInput = document.getElementById('color-picker-input'); 
        paletteSuccessMessage = document.getElementById('palette-success-message');
        toggleButton = document.getElementById('toggle-instructions-btn');
        instructionsContent = document.getElementById('instructions-content');
        collapsibleDrawer = document.querySelector('.collapsible-drawer');
        if (instructionsContent) {
             closeInstructionsButton_collapsible = instructionsContent.querySelector('.modal-close-button');
        }
        if (toggleButton) {
            toggleButtonArrow = toggleButton.querySelector('.arrow');
        }
    },

    _resetModuleState: function(initialTestState = {}) {
        GRID_SIZE = initialTestState.GRID_SIZE !== undefined ? initialTestState.GRID_SIZE : 4;
        TILE_COLORS = initialTestState.TILE_COLORS ? [...initialTestState.TILE_COLORS] : [...TILE_COLORS_DEFAULT];
        grid = initialTestState.grid ? JSON.parse(JSON.stringify(initialTestState.grid)) : Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        activeFallingTile = initialTestState.activeFallingTile ? JSON.parse(JSON.stringify(initialTestState.activeFallingTile)) : null;
        score = initialTestState.score !== undefined ? initialTestState.score : 0;
        let bs = localStorage.getItem('bestScore') ? parseInt(localStorage.getItem('bestScore')) : 0;
        bestScore = initialTestState.bestScore !== undefined ? initialTestState.bestScore : bs;
        if (gameInterval) clearInterval(gameInterval); 
        gameInterval = initialTestState.gameInterval !== undefined ? initialTestState.gameInterval : null;
        isGameOver = initialTestState.isGameOver !== undefined ? initialTestState.isGameOver : false;
        isPaused = initialTestState.isPaused !== undefined ? initialTestState.isPaused : false;
        currentColorIndex = initialTestState.currentColorIndex !== undefined ? initialTestState.currentColorIndex : 0;
        isColorMode = initialTestState.isColorMode !== undefined ? initialTestState.isColorMode : false;
        isModalActive = initialTestState.isModalActive !== undefined ? initialTestState.isModalActive : false;
        tempIsColorMode = initialTestState.tempIsColorMode !== undefined ? initialTestState.tempIsColorMode : isColorMode;
        tempTileColors = initialTestState.tempTileColors ? [...initialTestState.tempTileColors] : [...TILE_COLORS];
        settingsCurrentEditingSwatchIndex = initialTestState.settingsCurrentEditingSwatchIndex !== undefined ? initialTestState.settingsCurrentEditingSwatchIndex : -1;
        gridNeedsRedraw = false; // Reset dirty flag
        if (scoreDisplay) scoreDisplay.textContent = score.toLocaleString();
        if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore.toLocaleString();
        if (pauseButton) pauseButton.innerHTML = '<img src="icons/Pause.png" alt="Pause" class="button-icon">Pause';
        if (messageContainer) {
            if (messageParagraph) messageParagraph.textContent = '';
            messageContainer.style.display = 'none';
        }
        if(colorModeRadio) colorModeRadio.checked = isColorMode;
        if(numberModeRadio) numberModeRadio.checked = !isColorMode;
    },

    _resetBoardAndScore: function() {
        const initialGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        this._resetModuleState({
            grid: initialGrid, 
            score: 0, 
            isGameOver: false, 
            activeFallingTile: null,
            isColorMode: isColorMode,
            tempIsColorMode: tempIsColorMode,
            TILE_COLORS: TILE_COLORS,
            tempTileColors: tempTileColors,
            settingsCurrentEditingSwatchIndex: settingsCurrentEditingSwatchIndex,
            gameInterval: gameInterval
        });
    },

    // Getter for tests to inspect internal state (now part of gameApi)
    getGameState: function() { 
        return {
            grid, activeFallingTile, score, bestScore, isGameOver, isPaused, 
            currentColorIndex, isColorMode, TILE_COLORS,
            tempIsColorMode, tempTileColors, settingsCurrentEditingSwatchIndex,
            GRID_SIZE, // Expose GRID_SIZE via getter
            FALL_SPEED, // Expose FALL_SPEED via getter
            gameInterval, // Expose gameInterval via getter
            tileDOMElements // Expose tileDOMElements for testing and potential external use
        };
    },
    // Constants for tests (now part of gameApi)
    GRID_SIZE_DEFAULT: 4,
    TILE_COLORS_DEFAULT_GETTER: () => [...TILE_COLORS_DEFAULT],

    updateGameMessageVisibility: function() {
        if (messageContainer) {
            messageContainer.style.display = 'flex';
        }
    },

    // Expose setter for testability
    setNewBestScoreAchievedThisGame: function(flag) {
        newBestScoreAchievedThisGame = flag;
    }
};
// --- End gameApi Object Definition ---

if (typeof document !== 'undefined') { 
    document.addEventListener('DOMContentLoaded', () => {
        gameApi._initializeDOMElements();
        gameApi.jsConfettiInstance = new JSConfetti(); 
        
        bestScore = localStorage.getItem('bestScore') ? parseInt(localStorage.getItem('bestScore')) : 0;
                                                  
        gameApi.setupGame(); 

        if (restartButton) restartButton.addEventListener('click', gameApi.setupGame.bind(gameApi));
        if (tryAgainButton) {
            tryAgainButton.addEventListener('click', () => {
                if (isPaused) {
                    gameApi.togglePauseGame();
                } else {
                    gameApi.setupGame();
                }
            });
        }
        if (pauseButton) pauseButton.addEventListener('click', gameApi.togglePauseGame.bind(gameApi));
        document.addEventListener('keydown', gameApi.handleUserKeyPress.bind(gameApi));

        if (toggleButton && instructionsContent && closeInstructionsButton_collapsible) { 
            toggleButton.addEventListener('click', () => {
                const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
                gameApi.showInstructionsModal(!isExpanded);
            });
            closeInstructionsButton_collapsible.addEventListener('click', () => {
                 gameApi.showInstructionsModal(false); 
            });
        }

        if (viewportSettingsButton) viewportSettingsButton.addEventListener('click', gameApi.openSettingsModal.bind(gameApi));
        if (closeSettingsModalButton) closeSettingsModalButton.addEventListener('click', gameApi.closeSettingsModal.bind(gameApi));
        if (saveSettingsButton) saveSettingsButton.addEventListener('click', gameApi.saveSettings.bind(gameApi));
        if (cancelSettingsButton) cancelSettingsButton.addEventListener('click', gameApi.closeSettingsModal.bind(gameApi));
        if (colorPickerInput) colorPickerInput.addEventListener('input', gameApi.handleSettingsColorPickerInput.bind(gameApi));

        if (gridContainer) {
            gridContainer.addEventListener('touchstart', gameApi.handleTouchStart.bind(gameApi), { passive: false });
            gridContainer.addEventListener('touchmove', gameApi.handleTouchMove.bind(gameApi), { passive: false });
            gridContainer.addEventListener('touchend', gameApi.handleTouchEnd.bind(gameApi), { passive: true });
        }

        // Add resize listener
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (gridContainer) {
                    // Recalculate cell size and gap
                    const computedStyles = getComputedStyle(document.documentElement);
                    currentCellGap = parseFloat(computedStyles.getPropertyValue('--gap-grid'));
                    const firstGridCell = gridContainer.querySelector('.grid-cell');
                    if (firstGridCell) {
                        currentCellSize = firstGridCell.offsetWidth;
                    } else {
                        // Fallback if no grid cells (e.g. before setupGame completes or if grid is hidden)
                        currentCellSize = parseFloat(computedStyles.getPropertyValue('--size-grid-cell')); 
                    }
                    // Redraw the grid with new dimensions for existing tiles
                    gameApi.markGridDirty(); 
                }
            }, 250); // Debounce resize handling
        });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = gameApi; 
} 