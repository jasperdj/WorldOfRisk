// Global game variables
// Todo: important: remove all global game variables and instead persistent them into one state object along side settings
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
let hexSize, hexHeight, hexWidth;
let gridWidth, gridHeight;
let grid = [];
let players = [];
let currentPlayerIndex = 0;
let selectedHex = null;
let selectedCard = null;
let gamePhase = 'setup';
let cardsPerPlayer = 15;
let seaCardPercent = 20;
let unitsPerPlayer = 10;
let unitsPerTurn = 3;
let unitPlacementMode = 'after'; // 'during' or 'after'
let simulationInProgress = false;
let simulationInterval = null;
let lastPlacedTile = null;
let selectedTerritory = null;
let selectedUnitPlacement = false;
let selectedUnitIndex = -1;
let continentTileMultiplier = 1
let seaTiles = 3

// Initialize the application
function init() {
    document.getElementById('startGameBtn').addEventListener('click', startGame);
}

// Start the game
function startGame() {
    const gridSize = parseInt(document.getElementById('gridSize').value);
    const playerCount = parseInt(document.getElementById('playerCount').value);
    continentTileMultiplier  = parseInt(document.getElementById('continentTileMultiplier').value);
    seaTiles  = parseInt(document.getElementById('seaTiles').value); 
    unitsPerPlayer = parseInt(document.getElementById('unitsPerPlayer').value);
    unitsPerTurn = parseInt(document.getElementById('unitsPerTurn').value);
    unitPlacementMode = document.getElementById('unitPlacementMode').value;
    shippingRoutesPerPlayer = parseInt(document.getElementById('shippingRoutesPerPlayer').value);
    bombsPerPlayer = parseInt(document.getElementById('bombsPerPlayer').value);
    
    gridWidth = gridSize;
    gridHeight = gridSize;
    initGrid();
    initPlayers(playerCount);
    createAndDealCards();
    
    // Reset continent placement counters
    _.forEach(CONTINENTS, continent => { continent.placedTiles = 0; });
    
    setupEventListeners();
    
    document.getElementById('initialSettings').style.display = 'none';
    document.getElementById('gameInterface').style.display = 'block';
    
    gamePhase = 'creator';
    updateGameStatus();
    resizeCanvas();
    
    updatePlayerInfo();
    updatePlayerHand();
    updateContinentStatus();
    
    // If unit placement is during creator phase, set initial units to place
    if (unitPlacementMode === 'during') {
        for (let i = 0; i < players.length; i++) {
            players[i].unitsToPlace = Math.min(unitsPerTurn, unitsPerPlayer);
        }
    }
}

// Initialize on load
window.onload = init;