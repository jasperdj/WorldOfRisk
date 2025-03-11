// Initialize players
function initPlayers(count) {
    players = _.times(count, i => ({
        id: i,
        name: `Player ${i + 1}`,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        symbol: PLAYER_SYMBOLS[i % PLAYER_SYMBOLS.length],
        cards: [],
        territories: 0,
        unitsRemaining: unitsPerPlayer,
        unitsToPlace: 0
    }));
    currentPlayerIndex = 0;
}

// End current player's turn
function endTurn() {
	selectedCard = null;
    selectedHex = null;
    selectedTerritory = null;
    selectedUnitPlacement = false;
    selectedUnitIndex = -1;
    
    if (gamePhase === 'creator') {
        if (lastPlacedTile) {
            const tile = grid[lastPlacedTile.q][lastPlacedTile.r];
            if (!tile.isShippingRoute) {
                lastPlacedTile = null;
            }
        } else {
            lastPlacedTile = null;
        }
        
        // Check if the next player has cards left
        let nextPlayer = (currentPlayerIndex + 1) % players.length;
        while (players[nextPlayer].cards.length === 0) {
            nextPlayer = (nextPlayer + 1) % players.length;
            
            if (nextPlayer === currentPlayerIndex) {
                break;
            }
        }
        
        if (players[nextPlayer].cards.length === 0) {
            endCreatorPhase();
            return;
        }
        
        currentPlayerIndex = nextPlayer;
        
        const discardedCards = discardUnplayableContinentCards();
        
        if (players[currentPlayerIndex].cards.length === 0) {
            endTurn();
            return;
        }
        
        if (discardedCards) {
            alert(`Some continent cards were discarded because those continents cannot be expanded.`);
        }
        
        // If unit placement is during creator phase, give the player units
        if (unitPlacementMode === 'during' && players[currentPlayerIndex].unitsRemaining > 0) {
            players[currentPlayerIndex].unitsToPlace = Math.min(unitsPerTurn, players[currentPlayerIndex].unitsRemaining);
        }
    }
    else if (gamePhase === 'unitPlacement') {
        // Reset units to place for the next turn
        players[currentPlayerIndex].unitsToPlace = 0;
        
        // Move to the next player
        let nextPlayer = (currentPlayerIndex + 1) % players.length;
        
        // If we've gone through all players, check if any have units left
        if (nextPlayer === 0) {
            // Check if all players have placed all their units
            let allUnitsPlaced = true;
            for (let i = 0; i < players.length; i++) {
                if (players[i].unitsRemaining > 0) {
                    allUnitsPlaced = false;
                    break;
                }
            }
            
            if (allUnitsPlaced) {
                endUnitPlacementPhase();
                return;
            }
            
            // Give each player with remaining units another allocation
            for (let i = 0; i < players.length; i++) {
                if (players[i].unitsRemaining > 0) {
                    players[i].unitsToPlace = Math.min(unitsPerTurn, players[i].unitsRemaining);
                }
            }
        }
        
        // Skip players who have placed all their units
        while (players[nextPlayer].unitsRemaining <= 0) {
            nextPlayer = (nextPlayer + 1) % players.length;
            if (nextPlayer === currentPlayerIndex) {
                // This should not happen if we properly check at turn start
                endUnitPlacementPhase();
                return;
            }
        }
        
        currentPlayerIndex = nextPlayer;
    }
    
    
    updateGameStatus();
    updatePlayerInfo();
    updatePlayerHand();
    updateContinentStatus();
    
    document.getElementById('endTurnBtn').disabled = (gamePhase === 'creator' || 
                                                     (gamePhase === 'unitPlacement' && players[currentPlayerIndex].unitsToPlace > 0));
}

// End creator phase
function endCreatorPhase() {
    // Convert all empty tiles to water
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].valid && grid[q][r].continent === null && !grid[q][r].isWater) {
                grid[q][r].isWater = true;
            }
        }
    }
    
    if (simulationInProgress) {
        stopSimulation();
        document.getElementById('simulateGameBtn').textContent = 'Simulate Placement';
    }
    
    // Begin the unit placement phase
    gamePhase = 'unitPlacement';
    
    // Set up initial unit placement
    for (let i = 0; i < players.length; i++) {
        players[i].unitsToPlace = unitsPerTurn;
    }
    
    currentPlayerIndex = 0;
    
    // Set up UI for unit placement phase
    document.getElementById('endTurnBtn').textContent = 'End Turn';
    document.getElementById('endTurnBtn').disabled = false;
    document.getElementById('endCreatorPhaseBtn').textContent = 'End Unit Placement Phase';
    document.getElementById('simulateGameBtn').disabled = true;
    document.getElementById('playerHand').style.display = 'none';
    
    updateGameStatus();
    drawGrid();
    updatePlayerInfo();
    
    alert('Creator Phase Complete! Now each player will place units on the map.');
}

// End unit placement phase
function endUnitPlacementPhase() {
    startGamePhase();
    
    // Clear the world map created content
    document.querySelector('.info-panel').innerHTML = '';
    
    // Draw grid and update game stats
    drawGrid();
    
    alert('Unit Placement Phase Complete! Game phase begins.');
}

// Simulate one move in creator phase
// Todo: break this function up into logical pieces
function simulateOneMove() {
    // Check if simulation should end
    let allPlayersOutOfCards = true;
    for (const player of players) {
        if (player.cards.length > 0) {
            allPlayersOutOfCards = false;
            break;
        }
    }
    
    if (allPlayersOutOfCards) {
        return false;
    }
    
    // Skip players with no cards
    while (players[currentPlayerIndex].cards.length === 0) {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    }
    
    // Discard unplayable continent cards
    discardUnplayableContinentCards();
    
    // Check if player still has cards after discarding
    if (players[currentPlayerIndex].cards.length === 0) {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        return true; // Continue simulation with next player
    }
    
    const currentPlayer = players[currentPlayerIndex];
    
    // First, try to use a bomb card if available (with 30% probability)
    const bombCards = currentPlayer.cards.filter(card => card.type === 'BOMB');
    if (bombCards.length > 0 && Math.random() < 0.3) {
        // Find valid targets for bomb
        const bombTargets = [];
        for (let q = 0; q < gridWidth; q++) {
            for (let r = 0; r < gridHeight; r++) {
                if (grid[q][r].valid && 
                    (grid[q][r].continent !== null || 
                     grid[q][r].isWater || 
                     grid[q][r].isVolcano ||
                     grid[q][r].isHurricane ||
                     grid[q][r].isShippingRoute)) {
                    bombTargets.push({q, r});
                }
            }
        }
        
        if (bombTargets.length > 0) {
            // Choose random target
            const target = bombTargets[Math.floor(Math.random() * bombTargets.length)];
            const bombCardIndex = currentPlayer.cards.findIndex(card => card.type === 'BOMB');
            
            // Use bomb
            const previousContinent = grid[target.q][target.r].continent;
            grid[target.q][target.r].continent = null;
            grid[target.q][target.r].isWater = false;
            grid[target.q][target.r].isVolcano = false;
            grid[target.q][target.r].isHurricane = false;
            grid[target.q][target.r].isShippingRoute = false;
            grid[target.q][target.r].shippingRouteOrientation = 0;
            grid[target.q][target.r].isConnected = false;
            
            // If it was a continent tile, reduce the count
            if (previousContinent !== null && CONTINENTS[previousContinent]) {
                CONTINENTS[previousContinent].placedTiles--;
            }
            
            // Check and update connections for any shipping routes
            updateAllShippingRouteConnections();
            
            // Remove bomb card
            currentPlayer.cards.splice(bombCardIndex, 1);
            
            // Reset last placed tile
            lastPlacedTile = null;
            
            // Update UI
            updatePlayerHand();
            drawGrid();
            updateContinentStatus();
            
            // End turn
            endTurn();
            return true;
        }
    }
    
    // If we didn't use a bomb, proceed with normal cards
    // Find playable cards and their valid placements
    const playableCards = [];
    
    for (let cardIndex = 0; cardIndex < currentPlayer.cards.length; cardIndex++) {
        const card = currentPlayer.cards[cardIndex];
        
        // Skip bomb cards for now (handled separately above)
        if (card.type === 'BOMB') continue;
        
        const validPlacements = [];
        
        for (let q = 0; q < gridWidth; q++) {
            for (let r = 0; r < gridHeight; r++) {
                if (!grid[q][r].valid) continue; // Skip invalid tiles
                
                // Special case for Hurricane - can be placed on any empty tile
                if (card.type === 'HURRICANE') {
                    if (grid[q][r].continent === null && 
                        !grid[q][r].isWater && 
                        !grid[q][r].isVolcano && 
                        !grid[q][r].isHurricane &&
                        !grid[q][r].isShippingRoute) {
                        validPlacements.push({q, r});
                    }
                    continue;
                }
                
                // Shipping route can be placed on empty or water tiles
                if (card.type === 'SHIPPING_ROUTE') {
                    if ((grid[q][r].isWater && !grid[q][r].isShippingRoute && !grid[q][r].isHurricane) || 
                        (grid[q][r].continent === null && !grid[q][r].isWater && !grid[q][r].isVolcano && !grid[q][r].isHurricane && !grid[q][r].isShippingRoute)) {
                        validPlacements.push({q, r});
                    }
                    continue;
                }
                
                if (grid[q][r].continent === null && !grid[q][r].isWater && !grid[q][r].isVolcano && !grid[q][r].isHurricane && !grid[q][r].isShippingRoute) {
                    // For continent cards, check if next to same continent
                    if (card.type === 'CONTINENT') {
                        if (card.continentIndex === undefined || 
                            CONTINENTS[card.continentIndex].placedTiles >= CONTINENTS[card.continentIndex].maxTiles) {
                            // Skip if continent max reached
                            continue;
                        }
                        
                        // If this is not the first tile of the continent, check adjacency
                        if (CONTINENTS[card.continentIndex].placedTiles > 0) {
                            const neighbors = hexUtils.getNeighbors(q, r);
                            let adjacentToSameContinent = false;
                            
                            for (const neighbor of neighbors) {
                                if (isValidCoordinate(neighbor.q, neighbor.r) && 
                                    grid[neighbor.q][neighbor.r].continent === card.continentIndex) {
                                    adjacentToSameContinent = true;
                                    break;
                                }
                            }
                            
                            if (!adjacentToSameContinent) {
                                continue; // Skip if not adjacent to same continent
                            }
                        }
                    }
                    
                    validPlacements.push({q, r});
                }
            }
        }
        
        if (validPlacements.length > 0) {
            playableCards.push({
                cardIndex: cardIndex,
                card: card,
                placements: validPlacements
            });
        }
    }
    
    // If no playable cards, discard all continent cards and end turn
    if (playableCards.length === 0) {
        endTurn();
        return true;
    }
    
    // Select a random card and placement
    const randomCardOption = playableCards[Math.floor(Math.random() * playableCards.length)];
    const randomPlacement = randomCardOption.placements[Math.floor(Math.random() * randomCardOption.placements.length)];
    
    // For shipping routes, assign a random orientation
    if (randomCardOption.card.type === 'SHIPPING_ROUTE') {
        const randomOrientation = Math.floor(Math.random() * 6); // 0-5 for six directions
        grid[randomPlacement.q][randomPlacement.r].shippingRouteOrientation = randomOrientation;
    }
    
    // Place the card
    placeCard(randomCardOption.card, randomPlacement.q, randomPlacement.r);
    
    // For shipping routes, check for connections
    if (randomCardOption.card.type === 'SHIPPING_ROUTE') {
        // Store as last placed tile for potential rotation
        lastPlacedTile = { q: randomPlacement.q, r: randomPlacement.r };
        
        // Update shipping route connections for all routes
        updateAllShippingRouteConnections();
        
        // Rotate shipping route a few times to try to find a connection
        for (let tries = 0; tries < 3; tries++) {
            // If we already have a connection, stop rotating
            if (grid[randomPlacement.q][randomPlacement.r].isConnected) {
                break;
            }
            
            // Rotate and check for connections
            rotateShippingRoute(randomPlacement.q, randomPlacement.r);
            updateAllShippingRouteConnections();
        }
    } else {
        // Update shipping route connections for all routes
        updateAllShippingRouteConnections();
        
        // Reset last placed tile for non-shipping route cards
        lastPlacedTile = null;
    }
    
    // Remove card from hand
    currentPlayer.cards.splice(randomCardOption.cardIndex, 1);
    
    // Update UI
    updatePlayerHand();
    drawGrid();
    updateContinentStatus();
    
    // End turn
    endTurn();
    
    return true;
}

// Toggle simulation
// Todo: refactor to dynamic DOM updates
function toggleSimulation() {
    if (simulationInProgress) {
        stopSimulation();
        document.getElementById('simulateGameBtn').textContent = 'Simulate Placement';
    } else {
        startSimulation();
        document.getElementById('simulateGameBtn').textContent = 'Stop Simulation';
    }
}

// Start simulation
// Todo: refactor to dynamic DOM updates
// Todo: refactor to execute without interval as an option
function startSimulation() {
    simulationInProgress = true;
    const simulationSpeed = parseInt(document.getElementById('simulationSpeed').value);
    
    simulationInterval = setInterval(() => {
        if (!simulateOneMove()) {
            stopSimulation();
            document.getElementById('simulateGameBtn').textContent = 'Simulate Placement';
        }
    }, simulationSpeed);
}

// Stop simulation
function stopSimulation() {
    simulationInProgress = false;
    clearInterval(simulationInterval);
}