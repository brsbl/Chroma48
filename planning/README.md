# Chroma48 (A 2048 Tetris-like Game)

## Overview

Chroma48 is a web-based puzzle game that creatively combines the mechanics of the classic 2048 game with a Tetris-like tile-falling dynamic. Players aim to merge tiles of the same number (or color, depending on the selected mode) to achieve the highest possible score before the game board fills up. The game is designed to be responsive and playable across various screen sizes, offering customizable color palettes and game modes.

## Architecture

The application is built using standard web technologies: HTML, CSS, and JavaScript.

### 1. HTML (`index.html`)

The HTML file lays out the fundamental structure of the game interface. Key components include:

*   **Header:** Displays the game logo and title ("Chroma48").
*   **Main Game Area:**
    *   **Scores Display:** Shows the current score and the best score.
    *   **Game Controls:** Contains buttons for "New Game" and "Pause/Resume."
    *   **Game Board Area:**
        *   `.game-container`: The primary wrapper for the grid and game messages.
        *   `.grid-container`: The 4x4 grid where game tiles appear and are manipulated. This is dynamically populated by JavaScript.
        *   `.game-message`: An overlay displayed for game over or paused states.
*   **Instructions Drawer:** A collapsible/modal section at the bottom providing game instructions.
*   **Settings Button:** A viewport-fixed button (gear icon) to open the settings modal.
*   **Modals:**
    *   **Settings Modal (`#settings-modal`):** Allows users to configure:
        *   **Game Play Mode:** "Number Mode" (tiles show numbers) or "Color Mode" (tiles are blank, match by color).
        *   **Color Palette:** Customize the four base colors used for game tiles.
    *   **Notification Area:** Used to display transient messages (e.g., "Settings saved").

### 2. CSS (`style.css`)

The CSS file is responsible for all visual styling, layout, and responsiveness of the game. Key aspects include:

*   **Global Styles:** Resets, font imports (`Inter`), and CSS custom properties (variables) for consistent theming (colors, fonts, sizes, spacing).
*   **Responsive Design:** Uses `clamp()` for fluid typography and spacing, and media queries (implicitly through flexible layouts and clamps, though explicit queries could be added if needed for more drastic layout changes) to ensure good user experience on various devices.
*   **Layout:** Primarily uses Flexbox and CSS Grid for arranging elements.
    *   The main page layout, score boxes, button groups, and modal contents are managed with Flexbox.
    *   The core 4x4 game board (`.grid-container`) is implemented with CSS Grid, with responsive cell sizing.
*   **Visual Theming:** Defines colors for the background, text, buttons, tiles, and modal elements. Tile colors are dynamically applied via JavaScript but their base appearance (stroke, font) is styled here.
*   **Animations/Transitions:** Subtle transitions for button hovers, tile movements, and modal/drawer reveals.
*   **Modal Styling:** Generic styles for modal overlays, content boxes, headers, bodies, and footers, with specific overrides for the settings modal.

### 3. JavaScript (`script.js`)

This file contains all the game logic, DOM manipulation, event handling, and state management. It's organized into several key areas of functionality:

*   **Initialization (`DOMContentLoaded`):** Sets up constants (grid size, fall speed), fetches DOM elements, initializes game state variables (score, best score, game mode, tile colors), and calls `setupGame()` to begin.
*   **Color Manipulation Utilities:** A set of helper functions (`hexToRgb`, `rgbToHsl`, `hslToRgb`, `rgbToHex`, `mixColors`) for converting between color formats and mixing colors when tiles merge in Number Mode.
*   **Game State Management:** Variables like `grid` (a 2D array representing the board), `activeFallingTile`, `score`, `bestScore`, `isGameOver`, `isPaused`, `isColorMode`, and `TILE_COLORS` track the current state of the game. `bestScore` is persisted using `localStorage`.
*   **Core Game Loop (`gameLoop`, `spawnNewFallingTile`):**
    *   `spawnNewFallingTile()`: Creates a new tile (2 or 4) with a color from the current `TILE_COLORS` palette at a random available column in the top row. It initiates the falling process by setting an interval for `gameLoop`.
    *   `gameLoop()`: Called repeatedly by `setInterval`. If an `activeFallingTile` exists, it attempts to move it down one row. If the tile cannot move further (hits another tile or the bottom), it lands, a new tile is spawned (if the board isn't full/game isn't over), and the interval is cleared and restarted for the new tile.
*   **Board and Tile Rendering (`createBackgroundGrid`, `createTileElement`, `drawGrid`):**
    *   `createBackgroundGrid()`: Creates the static background grid cells.
    *   `createTileElement()`: Creates a DOM element for a tile, styles it (value, color, position), and appends it to the grid container. Tile positions are calculated dynamically based on cell size and gap, ensuring responsiveness.
    *   `drawGrid()`: Clears existing tiles and re-renders all tiles currently in the `grid` data structure.
*   **2048-style Tile Movement and Merging (`moveTilesLeft`, `moveTilesRight`, `moveTilesUp`, `moveTilesDown`):**
    *   These functions handle the core 2048 logic when arrow keys (or touch swipes) are used.
    *   They compact tiles in the specified direction, merge adjacent tiles of the same value (Number Mode) or color (Color Mode), update the score, and mix colors if in Number Mode.
    *   They return a boolean indicating if any change occurred on the board.
*   **User Input Handling:**
    *   `handleUserKeyPress()`: Listens for arrow key presses to trigger tile movements. If a move results in a change, and no tile was actively falling, it spawns a new tile.
    *   **Touch Controls:** Event listeners (`touchstart`, `touchmove`, `touchend`) on the `gridContainer` detect swipe gestures (up, down, left, right) and translate them into corresponding tile movements, mirroring the keyboard control logic.
*   **Game Lifecycle Controls:**
    *   `setupGame()`: Resets the game to its initial state (clears grid, resets score, spawns first tile).
    *   `handleGameOver()`: Sets `isGameOver` flag, clears game interval, displays game over message.
    *   `togglePauseGame()`: Toggles the `isPaused` state, clears/restarts the game interval, and updates UI (button text, message).
*   **Settings Modal Logic (`openSettingsModal`, `closeSettingsModal`, `saveSettings`, `populateSettingsColorPalette`):**
    *   Manages the display and functionality of the settings modal.
    *   `openSettingsModal()`: Initializes temporary settings variables from the current game state and populates the modal (radio buttons for game mode, color swatches for palette).
    *   `populateSettingsColorPalette()`: Dynamically creates and renders the color swatches in the settings modal based on `tempTileColors`. Allows clicking a swatch to open the native color picker for that color.
    *   The native `<input type="color">` is reused. Its `input` event updates the `tempTileColors` array and the corresponding swatch's appearance in real-time while the settings modal is active.
    *   `saveSettings()`: Applies the temporary settings (game mode, tile colors) to the main game state variables and calls `setupGame()` to restart/refresh the game with the new settings.
    *   `closeSettingsModal()`: Hides the modal.
*   **Instructions Drawer/Modal Logic (`showInstructionsModal`):**
    *   Manages the toggleable instructions section.
    *   On smaller screens (<= 480px width), it behaves as a modal overlay.
    *   On larger screens, it expands/collapses as a drawer.
    *   Includes logic to scroll the drawer into view when opened on desktop.
*   **DOM Element References and Event Listeners:** Numerous variables hold references to DOM elements. Event listeners are attached for button clicks (Restart, Pause, Settings, Save/Cancel Settings, Close Modals, Instructions Toggle) and key presses.

## Functionality Details

### Game Setup & Board
*   A 4x4 grid is displayed.
*   The game starts with one falling tile.
*   Tile colors are drawn from a configurable palette of four base colors, cycling through them for new tiles.

### Tile Spawning & Falling
*   New tiles (value 2 or 4) appear in a random available column in the top row.
*   Tiles fall one step at a time at a speed defined by `FALL_SPEED`.
*   If a column is blocked in the top row, no new tile spawns in that column until it's clear.

### Player Controls
*   **Keyboard:** Use Arrow Keys (Up, Down, Left, Right) to move all landed tiles on the board in the chosen direction. This is the 2048-style movement.
*   **Touch:** Swipe Up, Down, Left, or Right on the game grid to perform the same 2048-style movements.

### Tile Merging
*   **Number Mode (Default):**
    *   Tiles display their numerical value.
    *   When two tiles with the same number collide during a move, they merge into a single tile with double the value.
    *   The color of the new tile is a mix of the colors of the two merged tiles (using HSL-based color mixing).
    *   The player's score increases by the value of the newly merged tile.
*   **Color Mode:**
    *   Tiles do not display numbers.
    *   When two tiles with the same color collide during a move, they merge into a single tile. The value still doubles internally (for scoring consistency and potential future features), but the tile remains blank and retains the merged color.
    *   The player's score increases by the value of the newly merged tile.

### Scoring & Best Score
*   The current score is displayed and updated after each successful merge.
*   The best score achieved is also displayed and saved to the browser's `localStorage`, persisting across sessions.

### Pause/Resume
*   The "Pause" button halts the falling of the active tile and any game interactions.
*   The button text changes to "Resume".
*   A "Game Paused" message is displayed.
*   Clicking "Resume" continues the game.

### New Game/Restart
*   The "New Game" button (or "Try Again" after a game over) resets the entire game board, score, and spawns a new first tile.

### Game Over
*   The game ends when the board is full, and no more moves or merges are possible, or when a newly spawned tile has no space to appear.
*   A "Game Over!" message is displayed.

### Settings Modal
Accessed via the gear icon at the top right of the viewport.
*   **Game Play Mode:**
    *   **Number Mode:** Tiles show numbers; merging is based on matching numbers.
    *   **Color Mode:** Tiles are blank; merging is based on matching colors.
*   **Color Palette:**
    *   Displays four color swatches representing the base `TILE_COLORS`.
    *   Clicking any swatch opens a native color picker, allowing the user to change that specific color. Changes are reflected live on the swatches in the modal.
*   **Save Settings:** Applies the selected game mode and any color palette changes to the game and restarts it.
*   **Cancel:** Closes the modal without applying changes.

### Instructions Drawer/Modal
*   Provides "How to Play" and mode explanations.
*   Toggles open/closed.
*   Behaves as an expanding drawer on larger screens and a centered modal on smaller screens for better readability.

### Responsive Design
*   The game interface adapts to different screen sizes. Font sizes, padding, and some element dimensions are fluid using CSS `clamp()`.
*   The game grid and tiles resize proportionally.
*   Touch controls are provided for mobile devices.

---
This README provides a good overview for Chroma48.

Next, **Step 3: Write Unit Tests using Jest**.
This is the most complex part. I'll start by creating the test file and focusing on the pure utility functions (color manipulation) first, as they don't require DOM mocking. Then I'll move to functions with more dependencies.

**Note for User regarding Jest Setup:**
To run these tests, you would typically need to:
1.  Install Jest: `npm install --save-dev jest` (or `yarn add --dev jest`).
2.  Potentially install `jest-environment-jsdom` if not default: `npm install --save-dev jest-environment-jsdom`.
3.  Add a test script to your `package.json`: `"scripts": { "test": "jest" }`.
4.  Run tests with `npm test` or `yarn test`.
The JavaScript code would also need to be structured to allow Jest to import functions (e.g., using `module.exports` if running in a Node.js-like environment orchestrated by Jest, or ensuring functions are global if Jest is configured to pick them up that way for simpler scripts, though `module.exports` is standard for testability). For simplicity in generating the test code here, I'll assume functions can be accessed/imported.

Let's start creating `script.test.js` with tests for color utilities. 