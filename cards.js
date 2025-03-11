// Create deck and deal cards to players
function createAndDealCards() {
    let deck = [];
    
    // Add fixed number of sea cards
    _.times(seaTiles, () => deck.push({
        type: 'SEA',
        color: CARD_TYPES.SEA.color,
        name: CARD_TYPES.SEA.name
    }));
    
    // Add special cards
    deck.push({
        type: 'TSUNAMI',
        color: CARD_TYPES.TSUNAMI.color,
        name: CARD_TYPES.TSUNAMI.name,
        description: CARD_TYPES.TSUNAMI.description
    });
    
    deck.push({
        type: 'HURRICANE',
        color: CARD_TYPES.HURRICANE.color,
        name: CARD_TYPES.HURRICANE.name,
        description: CARD_TYPES.HURRICANE.description
    });
    
    deck.push({
        type: 'VOLCANO',
        color: CARD_TYPES.VOLCANO.color,
        name: CARD_TYPES.VOLCANO.name,
        description: CARD_TYPES.VOLCANO.description
    });
    
    deck.push({
        type: 'WILDFIRE',
        color: CARD_TYPES.WILDFIRE.color,
        name: CARD_TYPES.WILDFIRE.name,
        description: CARD_TYPES.WILDFIRE.description
    });
    
    // Calculate continent cards based on multiplier
    let continentCards = [];
    
    CONTINENTS.forEach((continent, index) => {
        // Apply the multiplier to determine how many cards to create
        const cardsForThisContinent = Math.round(continent.maxTiles * continentTileMultiplier);
        
        _.times(cardsForThisContinent, () => continentCards.push({
            type: 'CONTINENT',
            continentIndex: index,
            color: continent.color,
            name: continent.name
        }));
    });
    
    // Shuffle the continent cards
    continentCards = shuffleArray(continentCards);
    
    // Add continent cards to the deck
    deck = deck.concat(continentCards);
    
    // Shuffle the entire deck
    deck = shuffleArray(deck);
    
    // Calculate cards per player (divide deck evenly among players)
    const cardsPerPlayer = Math.floor(deck.length / players.length);
    
    // Deal cards to players - ensure even distribution
    for (let i = 0; i < players.length; i++) {
        // Give each player the same number of cards
        for (let j = 0; j < cardsPerPlayer; j++) {
            if (deck.length > 0) {
                players[i].cards.push(deck.pop());
            }
        }
        
        // Add bomb cards using bombsPerPlayer setting
        _.times(bombsPerPlayer, () => players[i].cards.push({
            type: 'BOMB',
            color: CARD_TYPES.BOMB.color,
            name: CARD_TYPES.BOMB.name,
            description: CARD_TYPES.BOMB.description
        }));
        
        // Add shipping route cards using shippingRoutesPerPlayer setting
        _.times(shippingRoutesPerPlayer, () => players[i].cards.push({
            type: 'SHIPPING_ROUTE',
            color: CARD_TYPES.SHIPPING_ROUTE.color,
            name: CARD_TYPES.SHIPPING_ROUTE.name,
            description: CARD_TYPES.SHIPPING_ROUTE.description
        }));
    }
    
    // If there are any remaining cards, distribute them evenly
    let playerIndex = 0;
    while (deck.length > 0) {
        players[playerIndex].cards.push(deck.pop());
        playerIndex = (playerIndex + 1) % players.length;
    }
}

// Check if continent can be expanded
// Todo: remove this, dead scenario, dead code, this code will never trigger
function canContinentBeExpanded(continentIndex) {
    if (continentIndex === undefined || continentIndex < 0 || continentIndex >= CONTINENTS.length) {
        return false;
    }
    
    if (CONTINENTS[continentIndex].placedTiles >= CONTINENTS[continentIndex].maxTiles) {
        return false;
    }
    
    if (CONTINENTS[continentIndex].placedTiles === 0) {
        return true;
    }
    
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (!grid[q][r].valid || grid[q][r].continent !== null || grid[q][r].isWater) {
                continue;
            }
            
            const neighbors = hexUtils.getNeighbors(q, r);
            for (const neighbor of neighbors) {
                if (isValidCoordinate(neighbor.q, neighbor.r) && 
                    grid[neighbor.q][neighbor.r].continent === continentIndex) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Discard unplayable continent cards
function discardUnplayableContinentCards() {
    let cardsDiscarded = false;
    const currentPlayer = players[currentPlayerIndex];
    
    for (let i = currentPlayer.cards.length - 1; i >= 0; i--) {
        const card = currentPlayer.cards[i];
        
        if (card.type === 'CONTINENT') {
            if (!canContinentBeExpanded(card.continentIndex)) {
                currentPlayer.cards.splice(i, 1);
                cardsDiscarded = true;
            }
        }
    }
    
    if (selectedCard !== null && selectedCard >= currentPlayer.cards.length) {
        selectedCard = null;
    }
    
    return cardsDiscarded;
}

// Place a card on the board
function placeCard(card, q, r) {
    if (!card) return; // Safety check
    
    if (card.type === 'SEA') {
        grid[q][r].isWater = true;
    } 
    else if (card.type === 'CONTINENT' && card.continentIndex !== undefined) {
        grid[q][r].continent = card.continentIndex;
        
        // Increment continent placement counter
        CONTINENTS[card.continentIndex].placedTiles++;
    }
    else if (card.type === 'TSUNAMI') {
        // Use the createTsunamiEffect function to create a cone of sea tiles
        const tilesAffected = createTsunamiEffect(q, r);
        console.log(`Tsunami affected ${tilesAffected} tiles in addition to the origin tile.`);
    }
    else if (card.type === 'HURRICANE') {
        // Hurricane is a special water tile
        grid[q][r].isWater = true;
        grid[q][r].isHurricane = true;
    }
    else if (card.type === 'VOLCANO') {
        // Volcano is a special tile that belongs to no continent
        grid[q][r].isVolcano = true;
        grid[q][r].continent = null;
    }
    else if (card.type === 'WILDFIRE') {
        // Wildfire can only be placed on continent tiles and is handled separately
        return;
    }
    else if (card.type === 'SHIPPING_ROUTE') {
        // Shipping route is a special water tile with a route
        grid[q][r].isWater = true; // Always becomes a water tile
        grid[q][r].isShippingRoute = true;
        // Orientation is set elsewhere
    }
}

// Create a wildfire effect that spreads through a continent
function createWildfireEffect(originQ, originR, continentIndex) {
    if (continentIndex === null) return 0; // Safety check
    
    // Affected tiles will be stored here
    const affectedTiles = [];
    
    // Keep track of visited tiles to avoid cycles
    const visited = new Set();
    visited.add(`${originQ},${originR}`);
    
    // Start with origin tile
    affectedTiles.push({q: originQ, r: originR});
    
    // Roll a dice (1-6) to determine the spread distance
	// Todo: implement configuration parameters
    const spreadDistance = 1 + Math.floor(Math.random() * 6);
    console.log(`Wildfire dice roll: ${spreadDistance} (spread distance)`);
    
    // Queue for BFS
    const queue = [{q: originQ, r: originR, depth: 0}];
    
    // Process queue
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Don't spread beyond the rolled distance
        if (current.depth >= spreadDistance) continue;
        
        // Get neighbors
        const neighbors = hexUtils.getNeighbors(current.q, current.r);
        
        // Shuffle neighbors for random spread direction
        const shuffledNeighbors = shuffleArray([...neighbors]);
        
        // Process each neighbor
        for (const neighbor of shuffledNeighbors) {
            const key = `${neighbor.q},${neighbor.r}`;
            
            // Skip if already visited
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Check if valid and part of the same continent
            if (isValidCoordinate(neighbor.q, neighbor.r) && 
                grid[neighbor.q][neighbor.r].continent === continentIndex) {
                
                // Add to affected tiles
                affectedTiles.push({q: neighbor.q, r: neighbor.r});
                
                // Add to queue for further spreading
                queue.push({q: neighbor.q, r: neighbor.r, depth: current.depth + 1});
            }
        }
    }
    
    // Apply wildfire effect to all affected tiles
	// Todo: troops/units are not removed, unsure how to deal with this (how they all die, should they die off slowly, should they stay all alive
    for (const tile of affectedTiles) {
        if (isValidCoordinate(tile.q, tile.r)) {
            // Store the previous continent for counting
            const previousContinent = grid[tile.q][tile.r].continent;
            
            // Convert to burned land
            grid[tile.q][tile.r].continent = null;
            grid[tile.q][tile.r].isWater = false;
            grid[tile.q][tile.r].isVolcano = false;
            grid[tile.q][tile.r].isHurricane = false;
            grid[tile.q][tile.r].isShippingRoute = false;
            grid[tile.q][tile.r].shippingRouteOrientation = 0;
            grid[tile.q][tile.r].isConnected = false;
            grid[tile.q][tile.r].isWildfire = true;
            
            // If it was a continent tile, reduce the count
            if (previousContinent !== null && CONTINENTS[previousContinent]) {
                CONTINENTS[previousContinent].placedTiles--;
            }
        }
    }
    
    // Update shipping route connections
    updateAllShippingRouteConnections();
    
    return affectedTiles.length;
}

// Create a tsunami effect with random direction, width and depth
// Todo: implement configuration parameters
function createTsunamiEffect(originQ, originR) {
    // Choose a random direction (0-5)
    const randomDirection = Math.floor(Math.random() * 6);
    
    // Random width (2-3)
    const tsunamiWidth = 2 + Math.floor(Math.random() * 2);
    
    // Random depth (2-3)
    const tsunamiDepth = 2 + Math.floor(Math.random() * 2);
    
    // Calculate the tiles in a cone shape
    const affectedTiles = [];
    
    // Main direction vector
    const mainVector = DIRECTIONS[randomDirection];
    
    // Get the two side directions (left and right of main direction)
    const leftDirection = (randomDirection + 5) % 6;  // -1 wrapped around
    const rightDirection = (randomDirection + 1) % 6; // +1 wrapped around
    
    const leftVector = DIRECTIONS[leftDirection];
    const rightVector = DIRECTIONS[rightDirection];
    
    // Start with the origin tile
    affectedTiles.push({q: originQ, r: originR});
    
    // For each depth level
    for (let depth = 1; depth <= tsunamiDepth; depth++) {
        // Calculate the base position at this depth
        const baseQ = originQ + mainVector.q * depth;
        const baseR = originR + mainVector.r * depth;
        
        // Width increases with depth, but max is tsunamiWidth
        const width = Math.min(depth + 1, tsunamiWidth);
        
        // Add the center tile at this depth
        affectedTiles.push({q: baseQ, r: baseR});
        
        // Add tiles to the left and right
        for (let w = 1; w < width; w++) {
            // Left side
            const leftQ = baseQ + leftVector.q * w;
            const leftR = baseR + leftVector.r * w;
            affectedTiles.push({q: leftQ, r: leftR});
            
            // Right side
            const rightQ = baseQ + rightVector.q * w;
            const rightR = baseR + rightVector.r * w;
            affectedTiles.push({q: rightQ, r: rightR});
        }
    }
    
    // Apply the tsunami effect on all affected tiles
	// Todo: troops/units will still be in the sea, unsure how to deal with this
    for (const tile of affectedTiles) {
        if (isValidCoordinate(tile.q, tile.r)) {
            // Store the previous continent for counting
            const previousContinent = grid[tile.q][tile.r].continent;
            
            // Convert to water
            grid[tile.q][tile.r].isWater = true;
            
            // Clear other properties
            grid[tile.q][tile.r].continent = null;
            grid[tile.q][tile.r].isVolcano = false;
            grid[tile.q][tile.r].isHurricane = false;
            grid[tile.q][tile.r].isShippingRoute = false;
            grid[tile.q][tile.r].shippingRouteOrientation = 0;
            grid[tile.q][tile.r].isConnected = false;
            
            // If it was a continent tile, reduce the count
            if (previousContinent !== null && CONTINENTS[previousContinent]) {
                CONTINENTS[previousContinent].placedTiles--;
            }
        }
    }
    
    // Update shipping route connections
    updateAllShippingRouteConnections();
    
    return affectedTiles.length - 1; // Exclude original tile from count
}

// Shipping Route related functions
// Rotate a shipping route
// Todo: remove this, dead code
function rotateShippingRoute(q, r) {
    if (!grid[q][r].isShippingRoute) return;
    
    // Rotate to next orientation (0-5)
    grid[q][r].shippingRouteOrientation = (grid[q][r].shippingRouteOrientation + 1) % 6;
    
    // Clear existing connection flag
    grid[q][r].isConnected = false;
}

// Check if the orientation from tile1 to tile2 is valid
// Todo: remove this, dead code
function isValidOrientation(tile1, tile2) {
    // Get the direction from tile1 to tile2
    const dx = tile2.q - tile1.q;
    const dy = tile2.r - tile1.r;
    
    // Determine the direction index
    let directionIndex = -1;
    for (let i = 0; i < DIRECTIONS.length; i++) {
        if (DIRECTIONS[i].q === dx && DIRECTIONS[i].r === dy) {
            directionIndex = i;
            break;
        }
    }
    
    if (directionIndex === -1) return false;
    
    // Check if tile1's orientation matches this direction or the opposite
    const orientation1 = grid[tile1.q][tile1.r].shippingRouteOrientation;
    const orientation2 = grid[tile2.q][tile2.r].shippingRouteOrientation;
    
    // The opposite direction
    const oppositeDirection = (directionIndex + 3) % 6;
    
    // For a valid connection, either:
    // 1. tile1 points to tile2 (orientation1 matches directionIndex)
    // 2. tile2 points to tile1 (orientation2 matches oppositeDirection)
    // 3. Either tile points in the correct direction for a valid path
    return (orientation1 === directionIndex) || (orientation2 === oppositeDirection);
}

// Calculate the effective directions a shipping route can go
// Todo: remove this, dead code
function getEffectiveDirections(q, r) {
    if (!grid[q][r].isShippingRoute) return [];
    
    const orientation = grid[q][r].shippingRouteOrientation;
    const oppositeOrientation = (orientation + 3) % 6;
    return [orientation, oppositeOrientation];
}

// Complete rewrite of shipping route connection detection
// Todo: remove this, dead code
function findShippingRoutePaths() {
    // Reset all connection flags
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].isShippingRoute) {
                grid[q][r].isConnected = false;
            }
        }
    }
    
    // Step 1: Find all shipping routes
    const allShippingRoutes = [];
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].isShippingRoute) {
                allShippingRoutes.push({q, r});
            }
        }
    }
    
    // Step 2: Build networks of connected shipping routes
    const visited = new Set();
    const networks = [];
    
    for (const route of allShippingRoutes) {
        const key = `${route.q},${route.r}`;
        if (visited.has(key)) continue;
        
        // Start a new network using BFS
        const network = [];
        const queue = [route];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const currentKey = `${current.q},${current.r}`;
            
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);
            network.push(current);
            
            // Check all 6 directions for connecting shipping routes
            for (let i = 0; i < 6; i++) {
                const neighborQ = current.q + DIRECTIONS[i].q;
                const neighborR = current.r + DIRECTIONS[i].r;
                
                if (!isValidCoordinate(neighborQ, neighborR)) continue;
                
                // If neighbor is a shipping route and not visited yet
                if (grid[neighborQ][neighborR].isShippingRoute && !visited.has(`${neighborQ},${neighborR}`)) {
                    // consider two shipping routes connected if they're adjacent
                    // This is a fundamental change to make chains of shipping routes work
                    queue.push({q: neighborQ, r: neighborR});
                }
            }
        }
        
        if (network.length > 0) {
            networks.push(network);
        }
    }

    // Step 3: For each network, identify all adjacent continent tiles
    for (const network of networks) {
        const continentTypes = new Set();
        const continentTiles = [];
        
        // For each shipping route in the network
        for (const route of network) {
            // Check all 6 directions from this shipping route
            for (let i = 0; i < 6; i++) {
                const direction = DIRECTIONS[i];
                let currentQ = route.q + direction.q;
                let currentR = route.r + direction.r;
                
                // Only check one step out (direct adjacency)
                if (!isValidCoordinate(currentQ, currentR)) continue;
                
                // If we found a continent tile
                if (grid[currentQ][currentR].continent !== null) {
                    continentTypes.add(grid[currentQ][currentR].continent);
                    continentTiles.push({q: currentQ, r: currentR, continent: grid[currentQ][currentR].continent});
                }
            }
        }
        
        // If this network connects multiple continent types, mark all shipping routes in it as connected
        if (continentTypes.size >= 2) {
            for (const route of network) {
                grid[route.q][route.r].isConnected = true;
            }
        }
    }
}

// Find only land tiles directly adjacent to shipping routes
// Todo: remove this, dead code
function findConnectedLandTiles(connectedLandTiles) {
    // First, identify all connected shipping route networks
    findShippingRoutePaths();
    
    // Only add land tiles that are directly adjacent to shipping routes
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (!grid[q][r].isShippingRoute || !grid[q][r].isConnected) continue;
            
            // Check all 6 directions around this shipping route
            for (let i = 0; i < 6; i++) {
                const nextQ = q + DIRECTIONS[i].q;
                const nextR = r + DIRECTIONS[i].r;
                
                if (!isValidCoordinate(nextQ, nextR)) continue;
                
                // If adjacent tile is a continent, add it to the set
                if (grid[nextQ][nextR].continent !== null) {
                    connectedLandTiles.add(`${nextQ},${nextR}`);
                }
            }
        }
    }
}

// Update shipping route connections for all routes
// Todo: remove this, dead code
function updateAllShippingRouteConnections() {
    findShippingRoutePaths();
}