# Chroma48 (A 2048 Tetris-like Game)

## Overview

Chroma48 is a web-based puzzle game that creatively combines the mechanics of the classic 2048 game with a Tetris-like tile-falling dynamic. Players aim to merge tiles of the same number (or color, depending on the selected mode) to achieve the highest possible score before the game board fills up. The game is designed to be responsive and playable across various screen sizes, offering customizable color palettes and game modes. A "BETA" pill is displayed next to the game title, indicating its current development stage.

## Architecture

The application is built using standard web technologies: HTML, CSS, and JavaScript.

### 1. HTML (`app/index.html`)

The HTML file lays out the fundamental structure of the game interface. Key components include:

*   **Header:** Displays the game logo (currently `app/icons/logo.png`) and title ("Chroma48"), along with a "BETA" status indicator.
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

### 2. CSS (`app/style.css`)

The CSS file is responsible for all visual styling, layout, and responsiveness of the game. Key aspects include:

*   **Global Styles:** Resets, font imports (`Inter`), and CSS custom properties (variables) for consistent theming (colors, fonts, sizes, spacing).
*   **Responsive Design:** Uses `clamp()` for fluid typography and spacing, and adapts layouts (e.g., instructions drawer/modal) to ensure good user experience on various devices.
*   **Layout:** Primarily uses Flexbox and CSS Grid for arranging elements.
*   **Visual Theming:** Defines colors for the background, text, buttons, tiles, and modal elements.
*   **Animations/Transitions:** Subtle transitions for button hovers, tile movements, modal/drawer reveals, and a confetti effect for new high scores (powered by `JSConfetti`).

### 3. JavaScript (`app/script.js`)

This file contains all the game logic, DOM manipulation, event handling, and state management, largely encapsulated within a `gameApi` object. Key functionalities of `gameApi` include:

*   **Initialization (`DOMContentLoaded`):** Sets up constants, fetches DOM elements, initializes game state variables (score, best score from `localStorage`, game mode, tile colors), and calls `setupGame()` to begin. Integrates with `JSConfetti` for visual effects.
*   **Color Manipulation Utilities:** Helper functions for color format conversions and mixing.
*   **Game State Management:** Module-scoped variables track the current game state. `bestScore`, `tileColors` (on save), and `isColorMode` (on save) are persisted using `localStorage`.
*   **Core Game Loop (`gameLoop`, `spawnNewFallingTile`):** Manages tile spawning and falling.
*   **Board and Tile Rendering (`createBackgroundGrid`, `createTileElement`, `drawGrid`):** Dynamically creates and updates the visual game board.
*   **2048-style Tile Movement and Merging (`moveTilesLeft`, `moveTilesRight`, `moveTilesUp`, `moveTilesDown`):** Handles core game mechanics.
*   **User Input Handling (`handleUserKeyPress`, touch handlers):** Processes keyboard and touch inputs.
*   **Game Lifecycle Controls (`setupGame`, `handleGameOver`, `togglePauseGame`):** Manages game start, end, and pause states.
*   **Settings Modal Logic (`openSettingsModal`, `closeSettingsModal`, `saveSettings`, `populateSettingsColorPalette`):** Manages settings configuration.
*   **Instructions Drawer/Modal Logic (`showInstructionsModal`):** Handles the display of game instructions.
*   **Visual Effects (`triggerConfettiEffect`):** Manages confetti display using `JSConfetti`.

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
*   A visual glow effect is applied to the best score and current score displays when a new high score is achieved or the Cmd/Ctrl+E debug command is used.
*   A "New High Score! 🎉" message is displayed on the game over screen if the `newBestScoreAchievedThisGame` flag is true (set either by achieving a new high score or by the Cmd/Ctrl+E command).

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

## Debugging

The following keyboard shortcuts are available for local debugging purposes:

*   **Cmd/Ctrl + E**: Triggers the new high score confetti animation, applies a visual glow to score displays, and sets a flag (`newBestScoreAchievedThisGame`) that can influence the game over message. This command does not modify the actual score.
*   **Cmd/Ctrl + G**: Triggers the Game Over screen immediately.

## Testing

The project includes a suite of automated tests using Jest to ensure code quality and prevent regressions.

### Test Suites:
*   **`tests/colorUtils.test.js`**: Focuses on unit testing the color conversion and mixing utility functions.
*   **`tests/coreGameLogic.test.js`**: Covers the core 2048-style tile movement, merging logic, tile spawning, and the main game loop. It tests different game scenarios, board states, and scoring.
*   **`tests/eventHandlers.test.js`**: Tests user input handling, including keyboard (arrow keys, debug commands) and touch swipe gestures. It ensures that events are correctly processed and trigger the appropriate game actions.
*   **`tests/uiInteractions.test.js`**: Dedicated to testing the interactions between the JavaScript logic and the DOM. This includes:
    *   Modal (settings, instructions) display and functionality.
    *   Button click handlers and their effects on game state and UI.
    *   Dynamic DOM updates (e.g., score display, game messages, pause state UI).
    *   `localStorage` interactions for saving and loading game settings and best score.
    *   ARIA attribute presence and correctness for accessibility.
    *   Third-party library integrations like `JSConfetti`.

### Running Tests:
Tests can be run from the project root using the command:
```bash
npm test
```
All tests must pass before changes are committed and pushed to the main repository branch.

