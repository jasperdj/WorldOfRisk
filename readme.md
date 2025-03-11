# Risk Territory Creator

A web-based game that allows players to collaboratively create a map for Risk-style gameplay, then play a strategic conquest game on the custom map they built.

## Project Structure

The codebase is organized into modular components, each with a specific responsibility:

### Core Files

- `index.html` - Main HTML structure for the application
- `styles.css` - CSS styles for the user interface

### JavaScript Modules

- `utils.js` - Utility functions and helper methods
- `constants.js` - Game constants like player colors, continent data, card types
- `hexgrid.js` - Hexagonal grid system for the game board
- `cards.js` - Card system for territory creation
- `ui.js` - UI components and display functions
- `phases.js` - Game phase management (creator, unit placement, game)
- `interaction.js` - User interaction handlers
- `main.js` - Main game initialization

## Game Phases

1. **Creator Phase**
   - Players take turns placing territory cards to build the map
   - Special cards create unique terrain features
   - Goal is to create a balanced, strategic map

2. **Unit Placement Phase**
   - Players claim territories by placing units
   - Each player has a limited number of units to deploy

3. **Game Phase** (Future Implementation)
   - Strategic conquest gameplay
   - Territory control and army management

## Technical Details

### Hexagonal Grid System

The game uses an axial coordinate system for the hexagonal grid. This provides:
- Efficient storage and calculation
- Straightforward neighbor relationships
- Clean visual rendering

### Special Features

- **Shipping Routes**: Connect continents across water
- **Terrain Elements**: Volcanoes, hurricanes, and wildfires add strategic variety
- **Auto-simulation**: Option to simulate the map creation phase

## Future Development

This modular architecture makes it easy to extend the game with:

1. **Combat System**: Implementation of dice-based combat mechanics
2. **Card Bonuses**: Territory cards providing in-game bonuses
3. **Victory Conditions**: Multiple ways to win based on objectives
4. **AI Players**: Computer opponents with different strategies

## Getting Started

1. Clone the repository
2. Open `index.html` in a web browser
3. Configure game settings and click "Start Game"
4. Follow the on-screen instructions for each phase

## Architectural fallbacks that prevent scalability
- Configuration and state into one object, which can be loaded and json fied, no other global variables 
	- Settings
	- Global game state
	- Local game state
- Split CLI based engine and frontend, for simulation point of view or client/server (logic and frontend representation is tightly interwoven)
- No manual DOM manipulations (hard to keep track of and not state reactive frontend)
- POC the most important engine aspects (Grid and adjacent connection search) 
- Simplified grid data model with flexible additions of new tiles and no hard coded booleans (isFire etc.)
- Use external libraries where it makes sense (Grid, form) 
- Use proper UI mobile scaling template (on phone the sidebars would cover the screen, therefore not truly responsive)

## Next steps: 
Optimization of creator phase
- Remove continent borders or fix it  
- Simulate unit placement 

Fight phase
- Bug: unit reinforcement incorrectly calculated
- Technologies: 
  - Shipping: x ports -> one shipping tile per turn 
  - Portal: have x units in all continents -> create one portal
  - Terraform: have the least territories -> pick up a random tile and place it on adjacent territory (except bomb)
- Random events: 
  - Vulano
  - Hurricane
 - Place new units
 - Attack
 
 
 