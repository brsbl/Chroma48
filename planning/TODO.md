### GA
- Add ablility to share final score after game over
- Add more animations (eg multiple merges at once triggers bigger pop; multiple in a row triggers fire emoji constantly; number of unique colors generated)
- Consider implementing a custom JavaScript color picker library to have full control over appearance and behavior, and to bypass potential browser bugs with native picker + input field interactions.
- Add a game play setting where the arrow keys/swipe only moves the actively falling tile (not all tiles)
- Add a gif that demonstrates basic game play to the instructions modal
- Add a feedback form to the bottom of the page

### DONE
- [2025-01-23] Split up script.js into multiple files and make sure all references are updated accordingly
  - Refactored monolithic script.js into modular ES modules architecture
  - Created src/ directory with state/, game/, ui/, input/, settings/, and utils/ subdirectories
  - Implemented centralized state management pattern
  - Added esbuild bundler with build, build:dev, and watch scripts
  - All 154+ tests passing after refactoring
