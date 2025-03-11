// Game constants
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
// Todo: remove this shit, pointless, also the UI representation in the right sidebar
const PLAYER_SYMBOLS = ['■', '●', '▲', '★', '◆', '✚']; // Square, Circle, Triangle, Star, Diamond, Plus 


const CONTINENTS = [
    { name: 'North America', color: '#8b6f5e', maxTiles: 12, placedTiles: 0 }, // Muted brown
    { name: 'South America', color: '#7d6b91', maxTiles: 9, placedTiles: 0 },  // Dusty purple
    { name: 'Europe', color: '#667c8a', maxTiles: 10, placedTiles: 0 },        // Slate blue
    { name: 'Africa', color: '#b08e55', maxTiles: 12, placedTiles: 0 },        // Amber gold
    { name: 'Asia', color: '#6a8c69', maxTiles: 12, placedTiles: 0 },          // Forest green
    { name: 'Australia', color: '#9c7a68', maxTiles: 7, placedTiles: 0 }       // Terra cotta
];

const CARD_TYPES = {
    SEA: { name: 'Sea', color: '#3498db' },
    CONTINENT: { name: 'Continent' },
    TSUNAMI: { name: 'Tsunami', color: '#1a5276', description: 'Create a large sea area that cannot be developed' },
    VOLCANO: { name: 'Volcano', color: '#e74c3c', description: 'Create a mountain that belongs to no continent' },
    BOMB: { name: 'Bomb', color: '#7f8c8d', description: 'Remove any tile from the map' },
    HURRICANE: { name: 'Hurricane', color: '#8e44ad', description: 'Create an ocean storm that can be placed anywhere' },
    SHIPPING_ROUTE: { name: 'Shipping Route', color: '#2980b9', description: 'Create a shipping route between continents ' },
    WILDFIRE: { name: 'Wildfire', color: '#e67e22', description: 'Create a fire that destroys tiles in the same continent, spreading up to 6 tiles' }
};

const DIRECTIONS = [
    { q: 1, r: 0 },    // right
    { q: 1, r: -1 },   // upper right
    { q: 0, r: -1 },   // upper left
    { q: -1, r: 0 },   // left
    { q: -1, r: 1 },   // lower left
    { q: 0, r: 1 }     // lower right
];