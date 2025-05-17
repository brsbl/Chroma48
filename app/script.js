// 2048 Tetris Game Logic

// Module-scoped state variables
let GRID_SIZE = 4;
// let TILE_COLORS = ['#F67B7B', '#FAA770', '#FBCC67', '#64D18C']; // og
// const TILE_COLORS_DEFAULT = ['#F67B7B', '#FAA770', '#FBCC67', '#64D18C']; // og
let TILE_COLORS = ['#F7A161', '#F6CC5B', '#F3BE78', '#88B983']; // new 
let TILE_COLORS_DEFAULT = ['#F7A161', '#F6CC5B', '#F3BE78', '#88B983']; // new 


let grid = [];
let activeFallingTile = null;
let score = 0;
let bestScore = 0; 
let gameInterval;
const FALL_SPEED = 500;
let isGameOver = false;
let isPaused = false;
let currentColorIndex = 0;
let isColorMode = false;
let isModalActive = false;

// DOM Element Variables - to be assigned in _initializeDOMElements
let gameContainer, gridContainer, scoreDisplay, bestScoreDisplay, messageContainer,
    restartButton, tryAgainButton, pauseButton, gameExplanation, viewportSettingsButton,
    settingsModal, closeSettingsModalButton, numberModeRadio, colorModeRadio,
    settingsColorPaletteGrid, saveSettingsButton, cancelSettingsButton,
    colorPickerInput, paletteSuccessMessage,
    toggleButton, instructionsContent, collapsibleDrawer, 
    closeInstructionsButton_collapsible, newBestScoreEmoji;

let tempIsColorMode = false;
let tempTileColors = [...TILE_COLORS_DEFAULT];
let settingsCurrentEditingSwatchIndex = -1;


// --- Color Conversion and Mixing Helpers ---
function hexToRgb(hex) {
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
}

function rgbToHsl(r, g, b) {
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
}

function hslToRgb(h, s, l) {
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
}

function rgbToHex(r, g, b) {
    const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixColors(hex1, hex2) {
    const hsl1 = rgbToHsl(hexToRgb(hex1).r, hexToRgb(hex1).g, hexToRgb(hex1).b);
    const hsl2 = rgbToHsl(hexToRgb(hex2).r, hexToRgb(hex2).g, hexToRgb(hex2).b);
    const h1Rad = hsl1.h * Math.PI / 180;
    const h2Rad = hsl2.h * Math.PI / 180;
    const avgX = (Math.cos(h1Rad) + Math.cos(h2Rad)) / 2;
    const avgY = (Math.sin(h1Rad) + Math.sin(h2Rad)) / 2;
    let mixedH = Math.atan2(avgY, avgX) * 180 / Math.PI;
    if (mixedH < 0) mixedH += 360;
    const mixedS = (hsl1.s + hsl2.s) / 2;
    const mixedL = (hsl1.l + hsl2.l) / 2;
    const mixedRgb = hslToRgb(mixedH, mixedS, mixedL);
    return rgbToHex(mixedRgb.r, mixedRgb.g, mixedRgb.b);
}
// --- End Color Helpers ---

function setupGame() {
    isPaused = false;
    if(pauseButton) pauseButton.innerHTML = '<img src="icons/pause.png" alt="Pause" class="button-icon">Pause';
    if(messageContainer) {
        if (messageContainer.querySelector('p')) messageContainer.querySelector('p').textContent = '';
        messageContainer.style.display = 'none';
    }

    if(gridContainer) gridContainer.innerHTML = ''; 
    isGameOver = false; 
    score = 0;
    updateScore(0); 
    grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    createBackgroundGrid();
    
    activeFallingTile = null; 
    currentColorIndex = 0; 
    spawnNewFallingTile(); 
}

function createBackgroundGrid() {
    if (!gridContainer) return;
    const existingCells = gridContainer.querySelectorAll('.grid-cell');
    existingCells.forEach(cell => cell.remove());
    const existingTiles = gridContainer.querySelectorAll('.tile');
    existingTiles.forEach(tile => tile.remove());

    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            gridContainer.appendChild(cell);
        }
    }
}

function updateScore(newPoints) {
    if (newPoints === 0 && score !== 0) {
         score = 0;
    } else if (newPoints === 0 && score === 0 && Object.keys(arguments).length === 1 && arguments[0] === 0 ) {
        score = 0;
    }
    else {
        score += newPoints;
    }
    if (scoreDisplay) scoreDisplay.textContent = score.toLocaleString();
    if (score > bestScore) {
        bestScore = score;
        updateBestScore();
        localStorage.setItem('bestScore', bestScore.toString());
        if (newBestScoreEmoji) {
            newBestScoreEmoji.classList.add('animate');
            // Remove the class after the animation completes so it can be re-triggered
            setTimeout(() => {
                newBestScoreEmoji.classList.remove('animate');
            }, 800); // Duration of the animation in ms
        }
    }
}

function updateBestScore() {
    if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore.toLocaleString();
}

function handleGameOver() {
    isGameOver = true;
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
    activeFallingTile = null; 
    if (messageContainer) {
        if (messageContainer.querySelector('p')) messageContainer.querySelector('p').textContent = 'Game Over!';
        messageContainer.style.display = 'flex';
    }
    if (tryAgainButton) tryAgainButton.textContent = 'Try Again';
}

function createTileElement(tileObject, row, col) {
    if (!gridContainer) return null;
    const tile = document.createElement('div');
    tile.classList.add('tile');
    tile.classList.add(`tile-${tileObject.value > 2048 ? 'super' : tileObject.value}`);
    
    if (isColorMode) {
        tile.textContent = '';
    } else {
        tile.textContent = tileObject.value;
    }
    tile.style.backgroundColor = tileObject.color;

    const computedStyles = getComputedStyle(document.documentElement);
    const currentCellGap = parseFloat(computedStyles.getPropertyValue('--gap-grid'));
    const firstGridCell = gridContainer.querySelector('.grid-cell');
    let currentCellSize = 0;
    if (firstGridCell) {
        currentCellSize = firstGridCell.offsetWidth;
    } else {
        currentCellSize = parseFloat(computedStyles.getPropertyValue('--size-grid-cell')); 
    }

    const top = row * (currentCellSize + currentCellGap);
    const left = col * (currentCellSize + currentCellGap);
    tile.style.width = `${currentCellSize}px`;
    tile.style.height = `${currentCellSize}px`;
    tile.style.top = `${top}px`;
    tile.style.left = `${left}px`;
    
    // Diagnostic log
    console.log('Creating tile:', JSON.stringify(tileObject), 'at row:', row, 'col:', col, 'Has merge flag?', !!tileObject.isNewlyMerged);

    if (tileObject.isNewlyMerged) {
        tile.classList.add('tile-just-merged');
        // Capture the specific tileObject from the grid for this iteration
        const currentGridTileObject = tileObject;
        setTimeout(() => {
            // 'tile' here is the DOM element created in this specific call.
            // If it's still in the DOM and has the class, remove it.
            // We also check if the tile element still has this class,
            // as another process or rapid click might have already removed it
            // or the element itself might be stale.
            if (tile.parentNode && tile.classList.contains('tile-just-merged')) {
                 tile.classList.remove('tile-just-merged');
            }
            // Now, delete the flag from the object in the grid data structure.
            delete currentGridTileObject.isNewlyMerged;
        }, 150); // Duration of the animation
    }
    
    gridContainer.appendChild(tile);
    return tile;
}

function drawGrid() {
    if (!gridContainer) return;
    const existingTiles = gridContainer.querySelectorAll('.tile');
    existingTiles.forEach(tile => tile.remove());
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] !== null) {
                createTileElement(grid[r][c], r, c);
            }
        }
    }
}

function isBoardFull() {
    if (isGameOver) return false;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === null) {
                return false;
            }
        }
    }
    return true;
}

function spawnNewFallingTile() {
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
    drawGrid(); 
    gameInterval = setInterval(gameLoop, FALL_SPEED);
}
    
function gameLoop() {
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
        if (!isGameOver && isBoardFull()) {
            handleGameOver();
        }
    }
    drawGrid(); 
}

function moveTilesLeft() {
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
                let mergedColor = isColorMode ? compactRow[i].color : mixColors(compactRow[i].color, compactRow[i+1].color);
                compactRow[i] = { value: mergedValue, color: mergedColor, isNewlyMerged: true };
                updateScore(mergedValue);
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
}

function moveTilesRight() {
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
                let mergedColor = isColorMode ? compactRow[i].color : mixColors(compactRow[i].color, compactRow[i+1].color);
                compactRow[i] = { value: mergedValue, color: mergedColor, isNewlyMerged: true };
                updateScore(mergedValue);
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
}

function moveTilesUp() {
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
                let mergedColor = isColorMode ? compactColumn[i].color : mixColors(compactColumn[i].color, compactColumn[i+1].color);
                compactColumn[i] = { value: mergedValue, color: mergedColor, isNewlyMerged: true };
                updateScore(mergedValue);
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
}

function moveTilesDown() {
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
                let mergedColor = isColorMode ? compactColumn[i].color : mixColors(compactColumn[i].color, compactColumn[i+1].color);
                compactColumn[i] = { value: mergedValue, color: mergedColor, isNewlyMerged: true };
                updateScore(mergedValue);
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
}

function handleUserKeyPress(event) {
    // If the event target is an input or textarea, do not process game key events
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    // Local debug: Command/Ctrl + E to trigger new best score animation
    if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
        event.preventDefault(); // Prevent any default browser action for Ctrl/Cmd+E
        if (newBestScoreEmoji) {
            newBestScoreEmoji.classList.remove('animate'); // Remove first to reset if already animating
            void newBestScoreEmoji.offsetWidth; // Trigger reflow to restart animation if already applied
            newBestScoreEmoji.classList.add('animate');
            setTimeout(() => {
                newBestScoreEmoji.classList.remove('animate');
            }, 800); // Duration of the animation in ms
        }
        return; // Stop further processing for this debug command
    }

    // If a modal is active, or game is over/paused, ignore game key presses
    if (isModalActive || isGameOver || isPaused) {
        return;
    }

    const wasTileFallingWhenKeyPressed = !!activeFallingTile;
    let moved = false;
    switch (event.key) {
        case "ArrowUp": 
            event.preventDefault();
            moved = moveTilesUp(); 
            break;
        case "ArrowDown": 
            event.preventDefault();
            moved = moveTilesDown(); 
            break;
        case "ArrowLeft": 
            event.preventDefault();
            moved = moveTilesLeft(); 
            break;
        case "ArrowRight": 
            event.preventDefault();
            moved = moveTilesRight(); 
            break;
        default: return;
    }
    if (moved) {
        if (!wasTileFallingWhenKeyPressed) spawnNewFallingTile();
        if (!isGameOver && isBoardFull()) handleGameOver();
        drawGrid(); 
    }
}

function togglePauseGame() {
    isPaused = !isPaused;
    if (isPaused) {
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
        if (pauseButton) pauseButton.innerHTML = '<img src="icons/play.png" alt="Play" class="button-icon">Resume';
        if (tryAgainButton) tryAgainButton.style.display = 'none';
        if (messageContainer && messageContainer.querySelector('p')) {
            messageContainer.querySelector('p').textContent = 'Game Paused';
            messageContainer.style.display = 'flex';
        }
    } else {
        if (pauseButton) pauseButton.innerHTML = '<img src="icons/pause.png" alt="Pause" class="button-icon">Pause';
        if (tryAgainButton) tryAgainButton.style.display = 'flex';
        if (messageContainer) {
             messageContainer.style.display = 'none';
             if(messageContainer.querySelector('p')) messageContainer.querySelector('p').textContent = '';
        }
        if (activeFallingTile && !isGameOver) { 
            if(gameInterval) clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, FALL_SPEED); 
        }
    }
}

// Collapsible instructions drawer logic
function showInstructionsModal(show) {
    if (!toggleButton || !instructionsContent) return; // Guard against missing elements
    const isMobileView = window.innerWidth <= 480;
    if (isMobileView) {
        if (show) {
            instructionsContent.classList.remove('open'); 
            if (typeof instructionsContent.offsetWidth === 'number') void instructionsContent.offsetWidth; // Reflow
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
}

// --- Settings Modal Logic ---
function populateSettingsColorPalette() {
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
        swatch.addEventListener('click', () => {
            settingsCurrentEditingSwatchIndex = index;
            colorPickerInput.value = tempTileColors[index];
            colorPickerInput.click();
        });
        settingsColorPaletteGrid.appendChild(swatch);
    });
}

function openSettingsModal() {
    document.removeEventListener('keydown', handleUserKeyPress); // Remove listener
    tempIsColorMode = isColorMode;
    tempTileColors = [...TILE_COLORS];
    settingsCurrentEditingSwatchIndex = -1;
    isModalActive = true;
    if (colorModeRadio) colorModeRadio.checked = tempIsColorMode;
    if (numberModeRadio) numberModeRadio.checked = !tempIsColorMode;
    populateSettingsColorPalette();
    if (settingsModal) settingsModal.style.display = 'flex';
    if (paletteSuccessMessage) {
        paletteSuccessMessage.classList.remove('visible');
        paletteSuccessMessage.style.display = 'none';
    }
}

function closeSettingsModal() {
    if (settingsModal) settingsModal.style.display = 'none';
    document.addEventListener('keydown', handleUserKeyPress); // Re-add listener
    isModalActive = false; // Clear flag when modal closes
}

function saveSettings() {
    if (!colorModeRadio || !numberModeRadio) {
    }

    isColorMode = colorModeRadio ? colorModeRadio.checked : tempIsColorMode;
    TILE_COLORS = [...tempTileColors];
    currentColorIndex = 0; 
    closeSettingsModal(); // This will also hide the hex input container
    setupGame(); 
    if (paletteSuccessMessage) {
        paletteSuccessMessage.textContent = 'Settings saved!';
        paletteSuccessMessage.classList.add('visible');
        paletteSuccessMessage.style.display = 'block';
        setTimeout(() => { // Start hiding process after 3 seconds
            if (paletteSuccessMessage) {
                paletteSuccessMessage.classList.remove('visible'); // This will trigger fade out
                // Set display to none after the transition
                setTimeout(() => {
                    if (paletteSuccessMessage) { // Check again in case it was re-shown quickly
                        paletteSuccessMessage.style.display = 'none';
                    }
                }, 500); // Match the CSS opacity transition (0.5s)
            }
        }, 3000); // Total visible time before fade starts
    }
}

function handleSettingsColorPickerInput(event) {
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
}

// --- Touch Controls Logic ---
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 30;

function handleTouchStart(event) {
    if (event.target.closest('.grid-container')) event.preventDefault();
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}

function handleTouchMove(event) {
    if (event.target.closest('.grid-container')) event.preventDefault();
}

function handleTouchEnd(event) {
    if (isGameOver || isPaused) return;
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) return;

    let direction = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
    } else {
        direction = deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
    }
    if (direction) {
        const wasTileFallingWhenSwiped = !!activeFallingTile;
        let moved = false;
        switch (direction) {
            case "ArrowUp": moved = moveTilesUp(); break;
            case "ArrowDown": moved = moveTilesDown(); break;
            case "ArrowLeft": moved = moveTilesLeft(); break;
            case "ArrowRight": moved = moveTilesRight(); break;
        }
        if (moved) {
            if (!wasTileFallingWhenSwiped) spawnNewFallingTile();
            if (!isGameOver && isBoardFull()) handleGameOver();
            drawGrid();
        }
    }
}
// --- End Touch Controls Logic ---

// Function to initialize DOM element variables
function _initializeDOMElements() {
    gameContainer = document.querySelector('.game-container');
    gridContainer = document.getElementById('grid-container');
    scoreDisplay = document.getElementById('score');
    bestScoreDisplay = document.getElementById('best-score');
    newBestScoreEmoji = document.getElementById('new-best-score-emoji');
    messageContainer = document.getElementById('game-message');
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
    if (instructionsContent) { // Check if instructionsContent (footer) exists
         closeInstructionsButton_collapsible = instructionsContent.querySelector('.modal-close-button');
    }
}

// Function for tests to reset module state
function _resetModuleState(initialTestState = {}) {
    GRID_SIZE = initialTestState.GRID_SIZE !== undefined ? initialTestState.GRID_SIZE : 4;
    TILE_COLORS = initialTestState.TILE_COLORS ? [...initialTestState.TILE_COLORS] : [...TILE_COLORS_DEFAULT];
    
    grid = initialTestState.grid ? JSON.parse(JSON.stringify(initialTestState.grid)) : Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    
    activeFallingTile = initialTestState.activeFallingTile ? JSON.parse(JSON.stringify(initialTestState.activeFallingTile)) : null;
    score = initialTestState.score !== undefined ? initialTestState.score : 0;
    
    // Load bestScore from localStorage primarily, allow override from test if explicitly provided
    let bs = localStorage.getItem('bestScore') ? parseInt(localStorage.getItem('bestScore')) : 0;
    bestScore = initialTestState.bestScore !== undefined ? initialTestState.bestScore : bs;

    if (gameInterval) clearInterval(gameInterval); // Clear any existing module interval
    gameInterval = initialTestState.gameInterval !== undefined ? initialTestState.gameInterval : null;
    
    isGameOver = initialTestState.isGameOver !== undefined ? initialTestState.isGameOver : false;
    isPaused = initialTestState.isPaused !== undefined ? initialTestState.isPaused : false;
    currentColorIndex = initialTestState.currentColorIndex !== undefined ? initialTestState.currentColorIndex : 0;
    isColorMode = initialTestState.isColorMode !== undefined ? initialTestState.isColorMode : false;

    tempIsColorMode = initialTestState.tempIsColorMode !== undefined ? initialTestState.tempIsColorMode : isColorMode;
    tempTileColors = initialTestState.tempTileColors ? [...initialTestState.tempTileColors] : [...TILE_COLORS];
    settingsCurrentEditingSwatchIndex = initialTestState.settingsCurrentEditingSwatchIndex !== undefined ? initialTestState.settingsCurrentEditingSwatchIndex : -1;

    // Reset relevant UI text content controlled by these state variables
    if (scoreDisplay) scoreDisplay.textContent = score.toLocaleString();
    if (bestScoreDisplay) bestScoreDisplay.textContent = bestScore.toLocaleString();
    if (pauseButton) pauseButton.innerHTML = '<img src="icons/pause.png" alt="Pause" class="button-icon">Pause';
    if (messageContainer) {
        if (messageContainer.querySelector('p')) messageContainer.querySelector('p').textContent = '';
        messageContainer.style.display = 'none';
    }
    if(colorModeRadio) colorModeRadio.checked = isColorMode;
    if(numberModeRadio) numberModeRadio.checked = !isColorMode;
}

function _resetBoardAndScore() {
    const initialGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    _resetModuleState({
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
}

// Main script execution starts here, but DOM related parts are in DOMContentLoaded
if (typeof document !== 'undefined') { // Ensure this only runs in a browser-like environment
    document.addEventListener('DOMContentLoaded', () => {
        _initializeDOMElements();
        
        bestScore = localStorage.getItem('bestScore') ? parseInt(localStorage.getItem('bestScore')) : 0;
        _resetModuleState({ bestScore: bestScore }); // Initialize module state, including UI based on it.
                                                  // This ensures score displays etc. are set up.
        
        setupGame(); // Start the game

        // Event Listeners
        if (restartButton) restartButton.addEventListener('click', setupGame);
        if (tryAgainButton) {
            tryAgainButton.addEventListener('click', () => {
                if (isPaused) {
                    togglePauseGame();
                } else {
                    setupGame();
                }
            });
        }
        if (pauseButton) pauseButton.addEventListener('click', togglePauseGame);
        document.addEventListener('keydown', handleUserKeyPress);

        if (toggleButton && instructionsContent && closeInstructionsButton_collapsible) { 
            toggleButton.addEventListener('click', () => {
                const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
                showInstructionsModal(!isExpanded);
            });
            closeInstructionsButton_collapsible.addEventListener('click', () => {
                 showInstructionsModal(false); 
            });
        }

        if (viewportSettingsButton) viewportSettingsButton.addEventListener('click', openSettingsModal);
        if (closeSettingsModalButton) closeSettingsModalButton.addEventListener('click', closeSettingsModal); // For settings modal 'X'
        if (saveSettingsButton) saveSettingsButton.addEventListener('click', saveSettings);
        if (cancelSettingsButton) cancelSettingsButton.addEventListener('click', closeSettingsModal);
        if (colorPickerInput) colorPickerInput.addEventListener('input', handleSettingsColorPickerInput);

        if (gridContainer) {
            gridContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
            gridContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
            gridContainer.addEventListener('touchend', handleTouchEnd);
        }
    });
}

// Export functions and state for testing or other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // State (for testing inspection or providing defaults)
        GRID_SIZE_DEFAULT: 4, // Example if GRID_SIZE could change
        TILE_COLORS_DEFAULT,
        getGameState: () => ({ // Getter for tests to inspect internal state
            grid, activeFallingTile, score, bestScore, isGameOver, isPaused, 
            currentColorIndex, isColorMode, TILE_COLORS,
            tempIsColorMode, tempTileColors, settingsCurrentEditingSwatchIndex,
            gameInterval
        }),
        
        // State Mutator for Testing
        _resetModuleState,
        _initializeDOMElements, // Allow tests to set up DOM element vars if needed after mocking document.body

        // Utilities
        hexToRgb, rgbToHsl, hslToRgb, rgbToHex, mixColors,

        // Core Logic
        setupGame, createBackgroundGrid, updateScore, updateBestScore, handleGameOver,
        createTileElement, drawGrid, isBoardFull, spawnNewFallingTile, gameLoop,
        moveTilesLeft, moveTilesRight, moveTilesUp, moveTilesDown,

        // UI Handlers/Interaction Logic
        handleUserKeyPress,
        togglePauseGame,
        showInstructionsModal,
        populateSettingsColorPalette, openSettingsModal, closeSettingsModal, saveSettings,
        handleSettingsColorPickerInput,
        handleTouchStart, handleTouchMove, handleTouchEnd
    };
} 