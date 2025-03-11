// Game phase variables
// Todo: centralize all state and settings in one object
let reinforcementsToPlace = 0;
let selectedAttacker = null;
let selectedDefender = null;
let attackMode = false;
let moveMode = false;
let troopsToMove = 0;
let maxTroopsToMove = 0;
let movingFromTerritory = null;
let movingToTerritory = null;
let attackResult = null;
let gamePhaseStep = 'reinforcement'; // 'reinforcement', 'attack', 'fortify'

// Initialize the game phase
function startGamePhase() {
    gamePhase = 'game';
    gamePhaseStep = 'reinforcement';
    calculateReinforcements();
    
    // Clear the info panel content first
    document.querySelector('.info-panel').innerHTML = '';
    
    updateGameControls();
    drawGrid();
    updateGameStatus();
}

// Calculate reinforcements for current player
function calculateReinforcements() {
    const player = players[currentPlayerIndex];
    
    // Count territories
    const territoryCount = countPlayerTerritories(currentPlayerIndex);
    
    // Base reinforcements (minimum 3, or 1 per 3 territories)
    reinforcementsToPlace = Math.max(3, Math.floor(territoryCount / 3));
    
    // Add continent bonuses
    const continentBonuses = calculateContinentBonuses(currentPlayerIndex);
    reinforcementsToPlace += continentBonuses;
    
    // Update player's data
    player.unitsToPlace = reinforcementsToPlace;
    
    updateGameStatus();
    updatePlayerInfo();
}

// Calculate continent bonuses
function calculateContinentBonuses(playerIndex) {
    let totalBonus = 0;
    
    // For each continent, check if player controls all territories
    for (let continentIndex = 0; continentIndex < CONTINENTS.length; continentIndex++) {
        if (doesPlayerControlContinent(playerIndex, continentIndex)) {
            // Calculate bonus based on continent size
            const continentSize = CONTINENTS[continentIndex].placedTiles;
            const bonus = Math.max(
                currentSettings.minContinentBonus, 
                Math.floor(continentSize / currentSettings.continentBonusDivisor) + currentSettings.continentBonusModifier
            );
            totalBonus += bonus;
        }
    }
    
    return totalBonus;
}

// Check if player controls an entire continent
function doesPlayerControlContinent(playerIndex, continentIndex) {
    // Get all territories in this continent
    const continentTerritories = [];
    
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].continent === continentIndex) {
                continentTerritories.push({q, r});
            }
        }
    }
    
    // If continent has no territories, it's not controlled
    if (continentTerritories.length === 0) {
        return false;
    }
    
    // Check if all territories are owned by the player
    return continentTerritories.every(territory => 
        grid[territory.q][territory.r].owner === playerIndex
    );
}

// Handle reinforcement placement
function placeReinforcement(q, r) {
    const player = players[currentPlayerIndex];
    
    if (player.unitsToPlace <= 0) {
        return false;
    }
    
    if (grid[q][r].owner !== currentPlayerIndex) {
        return false;
    }
    
    // Add reinforcement
    grid[q][r].units++;
    player.unitsToPlace--;
    
    // Check if reinforcement phase is complete
    if (player.unitsToPlace <= 0) {
        document.getElementById('endReinforcementBtn').disabled = false;
    }
    
    updateGameStatus();
    updatePlayerInfo();
    drawGrid();
    
    return true;
}

// End reinforcement phase
function endReinforcementPhase() {
    gamePhaseStep = 'attack';
    attackMode = false;
    selectedAttacker = null;
    selectedDefender = null;
    updateGameControls();
    updateGameStatus();
}

// Start attack selection
function startAttack(q, r) {
    // If same territory is selected again, toggle attack mode off
    if (attackMode && selectedAttacker && selectedAttacker.q === q && selectedAttacker.r === r) {
        attackMode = false;
        selectedAttacker = null;
        drawGrid();
        updateGameStatus();
        return true;
    }
    
    if (grid[q][r].owner !== currentPlayerIndex || grid[q][r].units < 2) {
        return false;
    }
    
    attackMode = true;
    selectedAttacker = {q, r};
    selectedDefender = null;
    
    // Highlight territories that can be attacked
    highlightAttackableTerrritories(q, r);
    
    updateGameStatus();
    drawGrid();
    
    return true;
}

function highlightAttackableTerrritories(q, r) {
    // Clear previously selectable territories
    for (let i = 0; i < gridWidth; i++) {
        for (let j = 0; j < gridHeight; j++) {
            grid[i][j].selectable = false;
        }
    }
    
    // BFS approach to find all attackable territories
    const queue = [{q, r}]; // Start with the selected territory
    const visited = new Set([`${q},${r}`]); // Track visited territories
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Get neighbors of current territory
        const neighbors = hexUtils.getNeighbors(current.q, current.r);
        
        for (const neighbor of neighbors) {
            if (!isValidCoordinate(neighbor.q, neighbor.r)) continue;
            
            const neighborKey = `${neighbor.q},${neighbor.r}`;
            if (visited.has(neighborKey)) continue;
            
            visited.add(neighborKey);
            
            const neighborTile = grid[neighbor.q][neighbor.r];
            
            // Check if neighbor is an attackable territory
            if (!neighborTile.isWater && 
                !neighborTile.isVolcano && 
                !neighborTile.isHurricane &&
                neighborTile.continent !== null &&
                neighborTile.owner !== currentPlayerIndex) {
                // Mark as selectable for attack
                neighborTile.selectable = true;
            }
            
            // If neighbor is a shipping route, add to queue to continue search
            if (neighborTile.isShippingRoute) {
                queue.push(neighbor);
            }
        }
    }
}

// Check if two territories are adjacent (including shipping routes)
// todo: refactor, dead code, logic has been unified in BFS implementations
function areTerritoriesAdjacent(t1, t2) {
    // Direct adjacency check
    const neighbors = hexUtils.getNeighbors(t1.q, t1.r);
    if (neighbors.some(n => n.q === t2.q && n.r === t2.r) || areConnectedByShippingRoutes(t1, t2)) {
        return true;
    }
    
    // If not directly adjacent, check for connected shipping routes
    return areConnectedByShippingRoutes(t1, t2);
}

// Check if two territories are connected by shipping routes
// todo: refactor, dead code, logic has been unified in BFS implementations
function areConnectedByShippingRoutes(t1, t2) {
    // Skip if either territory is water/invalid
    if (grid[t1.q][t1.r].continent === null || grid[t1.q][t1.r].isWater ||
        grid[t2.q][t2.r].continent === null || grid[t2.q][t2.r].isWater) {
        return false;
    }
    
    // Find all shipping routes connected to t1
    const connectedShippingRoutes = findConnectedShippingRoutes(t1);
    
    // Check if any of these routes are adjacent to t2
    for (const route of connectedShippingRoutes) {
        const routeNeighbors = hexUtils.getNeighbors(route.q, route.r);
        if (routeNeighbors.some(n => n.q === t2.q && n.r === t2.r)) {
            return true;
        }
    }
    
    return false;
}

// Find all shipping routes connected to a territory
function findConnectedShippingRoutes(territory) {
    const routes = [];
    const visited = new Set();
    
    // Find adjacent shipping routes
    const neighbors = hexUtils.getNeighbors(territory.q, territory.r);
    const adjacentRoutes = neighbors.filter(n => 
        isValidCoordinate(n.q, n.r) && 
        grid[n.q][n.r].isShippingRoute && 
        grid[n.q][n.r].isConnected
    );
    
    // No adjacent routes
    if (adjacentRoutes.length === 0) {
        return routes;
    }
    
    // BFS to find all connected routes
    const queue = [...adjacentRoutes];
    
    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.q},${current.r}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        routes.push(current);
        
        // Find adjacent shipping routes
        const routeNeighbors = hexUtils.getNeighbors(current.q, current.r);
        for (const neighbor of routeNeighbors) {
            if (!isValidCoordinate(neighbor.q, neighbor.r)) continue;
            
            if (grid[neighbor.q][neighbor.r].isShippingRoute && grid[neighbor.q][neighbor.r].isConnected) {
                queue.push(neighbor);
            }
        }
    }
    
    return routes;
}

// Select defender for attack
function selectDefender(q, r) {
    if (!selectedAttacker) {
        return false;
    }
    
    // Must be marked as selectable, else reset attack mode
    if (!grid[q][r].selectable) {
		attackMode = false;
		selectedAttacker = null;
		selectedDefender = null;
		updateGameControls();
        return false;
    }
    
    selectedDefender = {q, r};
    showAttackDialog();
    
    return true;
}

// Calculate maximum number of attack dice
function getMaxAttackDice() {
    if (!selectedAttacker) return 0;
    
	const unitsThatStayBehind = 1;
    const attackingUnits = grid[selectedAttacker.q][selectedAttacker.r].units - unitsThatStayBehind;
    
    if (attackingUnits >= currentSettings.attackerThreeDiceMin) {
        return 3;
    } else if (attackingUnits >= currentSettings.attackerTwoDiceMin) {
        return 2;
    } else if (attackingUnits >= currentSettings.attackerOneDiceMin) {
        return 1;
    }
    
    return 0;
}

// Calculate maximum number of defense dice
function getMaxDefenseDice() {
    if (!selectedDefender) return 0;
    
    const defendingUnits = grid[selectedDefender.q][selectedDefender.r].units;
    
    if (defendingUnits >= currentSettings.defenderTwoDiceMin) {
        return 2;
    } else if (defendingUnits >= currentSettings.defenderOneDiceMin) {
        return 1;
    }
    
    return 0;
}

// Show attack dialog
// Todo: refactor to dynamic DOM updates

function showAttackDialog() {
    const attackDlg = document.getElementById('attackDialog');
    const maxAttackDice = getMaxAttackDice();
    const maxDefenseDice = getMaxDefenseDice();
    
    // Update attack dice options
    const attackDiceSelect = document.getElementById('attackDice');
    attackDiceSelect.innerHTML = '';
    
    for (let i = 1; i <= maxAttackDice; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} ${i === 1 ? 'die' : 'dice'}`;
        attackDiceSelect.appendChild(option);
    }
    
    // Set to maximum by default
    attackDiceSelect.value = maxAttackDice;
    
    // Update defender info
    document.getElementById('defenderInfo').textContent = 
        `Defender: ${grid[selectedDefender.q][selectedDefender.r].owner !== null ? 
                    players[grid[selectedDefender.q][selectedDefender.r].owner].name : 'Neutral'} 
         (${grid[selectedDefender.q][selectedDefender.r].units} units)`;
    
    document.getElementById('defenseDiceCount').textContent = 
        `Will roll ${maxDefenseDice} ${maxDefenseDice === 1 ? 'die' : 'dice'}`;
    
    // Show the dialog
    attackDlg.style.display = 'block';
}

// Execute attack
// Todo: refactor to dynamic DOM updates

function executeAttack() {
    if (!selectedAttacker || !selectedDefender) {
        return false;
    }
    
    const attackDice = parseInt(document.getElementById('attackDice').value);
    const defenseDice = getMaxDefenseDice();
    
    if (attackDice <= 0) {
        return false;
    }
    
    // Roll dice
    const attackRolls = [];
    const defenseRolls = [];
    
    for (let i = 0; i < attackDice; i++) {
        attackRolls.push(Math.floor(Math.random() * currentSettings.attackerDice) + 1);
    }
    
    for (let i = 0; i < defenseDice; i++) {
        defenseRolls.push(Math.floor(Math.random() * currentSettings.defenderDice) + 1);
    }
    
    // Sort rolls in descending order
    attackRolls.sort((a, b) => b - a);
    defenseRolls.sort((a, b) => b - a);
    
    // Compare rolls and determine casualties
    let attackerLosses = 0;
    let defenderLosses = 0;
    
    for (let i = 0; i < Math.min(attackRolls.length, defenseRolls.length); i++) {
        if (attackRolls[i] > defenseRolls[i]) {
            defenderLosses++;
        } else {
            attackerLosses++;
        }
    }
    
    // Apply casualties
    grid[selectedAttacker.q][selectedAttacker.r].units -= attackerLosses;
    grid[selectedDefender.q][selectedDefender.r].units -= defenderLosses;
    
    // Check if defender is defeated
    let defenderDefeated = false;
    if (grid[selectedDefender.q][selectedDefender.r].units <= 0) {
        defenderDefeated = true;
        
        // Show dialog for moving troops after capture
        showMoveAfterCaptureDialog(attackDice);
    }
    
    // Create attack result message
    attackResult = {
        attackRolls: attackRolls,
        defenseRolls: defenseRolls,
        attackerLosses: attackerLosses,
        defenderLosses: defenderLosses,
        defenderDefeated: defenderDefeated
    };
    
    // Update UI
    document.getElementById('attackDialog').style.display = 'none';
    showAttackResult();
    
    // Only reset attack mode if defender not defeated (otherwise wait for troop movement)
    if (!defenderDefeated) {
        // Reset attack mode if attacker has insufficient troops
        if (grid[selectedAttacker.q][selectedAttacker.r].units < 2) {
            attackMode = false;
            selectedAttacker = null;
            selectedDefender = null;
        } else {
            // Keep attacker selected but clear defender
            selectedDefender = null;
        }
    }
    
    updateGameStatus();
	updateGameControls();
    drawGrid();
    
    return true;
}

// Show move after capture dialog
// Todo: refactor to dynamic DOM updates
function showMoveAfterCaptureDialog(attackDice) {
    const moveDialog = document.getElementById('moveAfterCaptureDialog');
    
    // Set information about source and destination
    document.getElementById('captureSourceInfo').textContent = 
        `From: (${selectedAttacker.q},${selectedAttacker.r}) - ${grid[selectedAttacker.q][selectedAttacker.r].units} units`;
    
    document.getElementById('captureDestInfo').textContent = 
        `To: (${selectedDefender.q},${selectedDefender.r}) - 0 units`;
    
    // Set up troops slider with minimum 1 and maximum (attacker units - 1)
    const maxToMove = grid[selectedAttacker.q][selectedAttacker.r].units - 1;
    const slider = document.getElementById('troopsToMoveAfterCapture');
    slider.min = 1;
    slider.max = maxToMove;
    slider.value = maxToMove;
    
    document.getElementById('troopMoveAfterCaptureCount').textContent = slider.value;
    
    // Show the dialog
    moveDialog.style.display = 'block';
}

// Update troop count in move after capture dialog
function updateTroopMoveAfterCaptureCount() {
    const count = parseInt(document.getElementById('troopsToMoveAfterCapture').value);
    document.getElementById('troopMoveAfterCaptureCount').textContent = count;
}

// Execute move after capture
function executeMoveAfterCapture() {
    if (!selectedAttacker || !selectedDefender) {
        return;
    }
    
    // Get number of troops to move
    const troopsToMove = parseInt(document.getElementById('troopsToMoveAfterCapture').value);
    
    // Must leave at least 1 unit behind
    if (troopsToMove >= grid[selectedAttacker.q][selectedAttacker.r].units) {
        alert("You must leave at least 1 unit in your territory.");
        return;
    }
    
    // Capture territory with specified number of troops
    const defenderOwner = grid[selectedDefender.q][selectedDefender.r].owner;
    grid[selectedDefender.q][selectedDefender.r].owner = currentPlayerIndex;
    grid[selectedDefender.q][selectedDefender.r].units = troopsToMove;
    grid[selectedAttacker.q][selectedAttacker.r].units -= troopsToMove;
    
    // Hide dialog
    document.getElementById('moveAfterCaptureDialog').style.display = 'none';
    
    attackMode = false;
	selectedAttacker = null;
	selectedDefender = null;
    
    updateGameStatus();
	updateGameControls();
    drawGrid();
    updatePlayerInfo();
}

// Show attack result
// Todo: refactor to dynamic DOM updates

function showAttackResult() {
    if (!attackResult) return;
    
    const resultDlg = document.getElementById('attackResultDialog');
    const resultContent = document.getElementById('attackResultContent');
    
    let resultHTML = '<h3>Battle Results</h3>';
    
    // Show dice rolls
    resultHTML += '<div class="dice-results">';
    resultHTML += '<div class="attacker-dice">';
    resultHTML += '<h4>Attacker Rolls</h4>';
    attackResult.attackRolls.forEach(roll => {
        resultHTML += `<div class="die die-${roll}">${roll}</div>`;
    });
    resultHTML += '</div>';
    
    resultHTML += '<div class="defender-dice">';
    resultHTML += '<h4>Defender Rolls</h4>';
    attackResult.defenseRolls.forEach(roll => {
        resultHTML += `<div class="die die-${roll}">${roll}</div>`;
    });
    resultHTML += '</div>';
    resultHTML += '</div>';
    
    // Show casualties
    resultHTML += '<div class="casualties">';
    resultHTML += `<p>Attacker lost ${attackResult.attackerLosses} units</p>`;
    resultHTML += `<p>Defender lost ${attackResult.defenderLosses} units</p>`;
    resultHTML += '</div>';
    
    // Show victory message if applicable
    if (attackResult.defenderDefeated) {
        resultHTML += '<div class="victory-message">';
        resultHTML += '<p>Territory captured!</p>';
        resultHTML += '</div>';
    }
    
    resultContent.innerHTML = resultHTML;
    resultDlg.style.display = 'block';
}

// End attack phase, start fortify phase
function endAttackPhase() {
    gamePhaseStep = 'fortify';
    attackMode = false;
    moveMode = false;
    selectedAttacker = null;
    selectedDefender = null;
    movingFromTerritory = null;
    movingToTerritory = null;
    
    updateGameControls();
    updateGameStatus();
    drawGrid();
}

// Start fortify move
function startFortify(q, r) {
    if (grid[q][r].owner !== currentPlayerIndex || grid[q][r].units < 2) {
        return false;
    }
    
    moveMode = true;
    movingFromTerritory = {q, r};
    movingToTerritory = null;
    
    // Find all connected territories for highlighting
    highlightConnectedFriendlyTerritories(q, r);
    
    updateGameStatus();
    drawGrid();
    
    return true;
}

// Highlight all territories connected to the source territory
// Refactor: refactor redundant code with the attackableTerritories function
function highlightConnectedFriendlyTerritories(q, r) {
    // Clear previously selectable territories
    for (let i = 0; i < gridWidth; i++) {
        for (let j = 0; j < gridHeight; j++) {
            grid[i][j].selectable = false;
        }
    }
    
    // BFS approach to find all attackable territories
    const queue = [{q, r}]; // Start with the selected territory
    const visited = new Set([`${q},${r}`]); // Track visited territories
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Get neighbors of current territory
        const neighbors = hexUtils.getNeighbors(current.q, current.r);
        
        for (const neighbor of neighbors) {
            if (!isValidCoordinate(neighbor.q, neighbor.r)) continue;
            
            const neighborKey = `${neighbor.q},${neighbor.r}`;
            if (visited.has(neighborKey)) continue;
            
            visited.add(neighborKey);
            
            const neighborTile = grid[neighbor.q][neighbor.r];
            
            // Check if neighbor is an attackable territory
            if (neighborTile.continent !== null &&
                neighborTile.owner == currentPlayerIndex) {
                // Mark as selectable
                neighborTile.selectable = true;
				queue.push(neighbor);
            }
            
            // If neighbor is a shipping route, add to queue to continue search
            if (neighborTile.isShippingRoute) {
                queue.push(neighbor);
            }
        }
    }
}


// Select destination for fortify
function selectFortifyDestination(q, r) {
    if (!movingFromTerritory) {
        return false;
    }
    
    // Check if destination is marked as selectable
    if (!grid[q][r].selectable) {
        return false;
    }
    
    movingToTerritory = {q, r};
    maxTroopsToMove = grid[movingFromTerritory.q][movingFromTerritory.r].units - 1; // Must leave at least 1 unit behind
    showFortifyDialog();
    
    return true;
}

// Show fortify dialog
function showFortifyDialog() {
    const fortifyDlg = document.getElementById('fortifyDialog');
    
    // Update source and destination info
    document.getElementById('sourceInfo').textContent = 
        `From: (${movingFromTerritory.q},${movingFromTerritory.r}) - ${grid[movingFromTerritory.q][movingFromTerritory.r].units} units`;
    
    document.getElementById('destinationInfo').textContent = 
        `To: (${movingToTerritory.q},${movingToTerritory.r}) - ${grid[movingToTerritory.q][movingToTerritory.r].units} units`;
    
    // Set up troops slider
    const troopsSlider = document.getElementById('troopsToMove');
    troopsSlider.max = maxTroopsToMove;
    troopsSlider.value = maxTroopsToMove
    troopsToMove = parseInt(troopsSlider.value);
    
    document.getElementById('troopMoveCount').textContent = troopsToMove;
    
    // Show the dialog
    fortifyDlg.style.display = 'block';
}

// Update troop count in fortify dialog
function updateTroopMoveCount() {
    troopsToMove = parseInt(document.getElementById('troopsToMove').value);
    document.getElementById('troopMoveCount').textContent = troopsToMove;
}

// Execute fortify move
function executeFortify() {
    if (!movingFromTerritory || !movingToTerritory) {
        return false;
    }
    
    // Get number of troops to move
    const troops = troopsToMove;
    
    if (troops <= 0 || troops >= grid[movingFromTerritory.q][movingFromTerritory.r].units) {
        return false;
    }
    
    // Move troops
    grid[movingFromTerritory.q][movingFromTerritory.r].units -= troops;
    grid[movingToTerritory.q][movingToTerritory.r].units += troops;
    
    // Hide dialog
    document.getElementById('fortifyDialog').style.display = 'none';
    
    // Reset fortify mode and automatically end fortify phase
    moveMode = false;
    movingFromTerritory = null;
    movingToTerritory = null;
    
    updateGameStatus();
    drawGrid();
    
    // Automatically end the fortify phase after one move
    endGameTurn();
    
    return true;
}

// Skip fortify phase: check for dead code
function skipFortify() {
    moveMode = false;
    movingFromTerritory = null;
    movingToTerritory = null;
    
    // Hide dialog if open
    document.getElementById('fortifyDialog').style.display = 'none';
    
    updateGameStatus();
    drawGrid();
	alert("Skip fortify code not dead code")
}

// Check if a player is eliminated (has no territories)
function isPlayerEliminated(playerIndex) {
    // Count player territories
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].owner === playerIndex) {
                return false; // Player has at least one territory
            }
        }
    }
    return true; // Player has no territories
}

// End player's turn
function endGameTurn() {
    // Reset all phase-specific selections
    attackMode = false;
    moveMode = false;
    selectedAttacker = null;
    selectedDefender = null;
    movingFromTerritory = null;
    movingToTerritory = null;
    attackResult = null;
    
    // Move to the next player, skipping eliminated players
    let nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    
    // Keep looking for a non-eliminated player
    let loopGuard = 0;
    while (isPlayerEliminated(nextPlayerIndex) && loopGuard < players.length) {
        nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
        loopGuard++; // Prevent infinite loop
    }
    
    // Check if the game is over (only one player remains)
    if (loopGuard >= players.length - 1) {
        // Game is over, find the winner
        let winner = -1;
        for (let i = 0; i < players.length; i++) {
            if (!isPlayerEliminated(i)) {
                winner = i;
                break;
            }
        }
        
        // Show game over message
        alert(`Game Over! Player ${winner + 1} wins!`);
        return;
    }
    
    currentPlayerIndex = nextPlayerIndex;
    
    // Reset to reinforcement phase
    gamePhaseStep = 'reinforcement';
    calculateReinforcements();
    
    updateGameControls();
    updateGameStatus();
    updatePlayerInfo();
    drawGrid();
}

// Update game controls based on current phase
// Todo: refactor to dynamic DOM updates

function updateGameControls() {
	// Highlight the map game controls (which territories the player can act on)
	highlightSelectableTerritories();
	
    const controls = document.querySelector('.controls');
    controls.innerHTML = '';
    
    if (gamePhaseStep === 'reinforcement') {
        const remainingUnits = players[currentPlayerIndex].unitsToPlace;
        
        const instructions = document.createElement('div');
        instructions.className = 'phase-instructions';
        instructions.innerHTML = `
            <h3>Reinforcement Phase</h3>
            <p>Click on your territories to place ${remainingUnits} reinforcement units.</p>
        `;
        controls.appendChild(instructions);
        
        const endPhaseBtn = document.createElement('button');
        endPhaseBtn.id = 'endReinforcementBtn';
        endPhaseBtn.textContent = 'End Reinforcement';
        endPhaseBtn.disabled = remainingUnits > 0;
        endPhaseBtn.addEventListener('click', endReinforcementPhase);
        controls.appendChild(endPhaseBtn);
    } 
    else if (gamePhaseStep === 'attack') {
        const instructions = document.createElement('div');
        instructions.className = 'phase-instructions';
        
        if (!attackMode) {
            instructions.innerHTML = `
                <h3>Attack Phase</h3>
                <p>Select one of your territories with at least 2 units to attack from.</p>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Attack Phase</h3>
                <p>Select an adjacent enemy territory to attack, or click your territory again to cancel.</p>
            `;
        }
        controls.appendChild(instructions);
        
        const endPhaseBtn = document.createElement('button');
        endPhaseBtn.id = 'endAttackBtn';
        endPhaseBtn.textContent = 'End Attack Phase';
        endPhaseBtn.addEventListener('click', endAttackPhase);
        controls.appendChild(endPhaseBtn);
    }
    else if (gamePhaseStep === 'fortify') {
        const instructions = document.createElement('div');
        instructions.className = 'phase-instructions';
        
        if (!moveMode) {
            instructions.innerHTML = `
                <h3>Fortify Phase</h3>
                <p>Select one of your territories to move troops from, or end your turn.</p>
            `;
        } else {
            instructions.innerHTML = `
                <h3>Fortify Phase</h3>
                <p>Select a connected friendly territory to move troops to.</p>
            `;
        }
        controls.appendChild(instructions);
        
        const endTurnBtn = document.createElement('button');
        endTurnBtn.id = 'endTurnBtn';
        endTurnBtn.textContent = 'End Turn';
        endTurnBtn.addEventListener('click', endGameTurn);
        controls.appendChild(endTurnBtn);
    }
    
    // Add save/load button in every phase
    const saveLoadBtn = document.createElement('button');
    saveLoadBtn.id = 'saveLoadBtn';
    saveLoadBtn.textContent = 'Save/Load Game';
    saveLoadBtn.addEventListener('click', showSaveLoadDialog);
    saveLoadBtn.style.marginTop = '10px';
    controls.appendChild(saveLoadBtn);
}

// Highlight selectable territories based on current phase
function highlightSelectableTerritories() {
    // Clear previous highlight info
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].selectable) {
                grid[q][r].selectable = false;
            }
        }
    }
    
    // Highlight based on current phase
    if (gamePhase !== 'game') return;
    
    if (gamePhaseStep === 'reinforcement') {
        // Highlight territories owned by current player
        for (let q = 0; q < gridWidth; q++) {
            for (let r = 0; r < gridHeight; r++) {
                if (grid[q][r].owner === currentPlayerIndex) {
                    grid[q][r].selectable = true;
                }
            }
        }
    } 
    else if (gamePhaseStep === 'attack') {
        if (!attackMode) {
            // Highlight territories owned by current player with at least 2 units
            for (let q = 0; q < gridWidth; q++) {
                for (let r = 0; r < gridHeight; r++) {
                    if (grid[q][r].owner === currentPlayerIndex && grid[q][r].units >= 2) {
                        grid[q][r].selectable = true;
                    }
                }
            }
        } 
        else if (selectedAttacker) {
            // Highlight adjacent enemy territories
            const neighbors = hexUtils.getNeighbors(selectedAttacker.q, selectedAttacker.r);
            
            for (const neighbor of neighbors) {
                if (!isValidCoordinate(neighbor.q, neighbor.r)) continue;
                
                if (grid[neighbor.q][neighbor.r].owner !== currentPlayerIndex && 
                    grid[neighbor.q][neighbor.r].continent !== null && 
                    !grid[neighbor.q][neighbor.r].isWater && 
                    !grid[neighbor.q][neighbor.r].isVolcano && 
                    !grid[neighbor.q][neighbor.r].isHurricane) {
                    
                    grid[neighbor.q][neighbor.r].selectable = true;
                }
            }
        }
    }
    else if (gamePhaseStep === 'fortify') {
        if (!moveMode) {
            // Highlight territories owned by current player with at least 2 units
            for (let q = 0; q < gridWidth; q++) {
                for (let r = 0; r < gridHeight; r++) {
                    if (grid[q][r].owner === currentPlayerIndex && grid[q][r].units >= 2) {
                        grid[q][r].selectable = true;
                    }
                }
            }
        }
        else if (movingFromTerritory) {
            // Highlight adjacent friendly territories
            const neighbors = hexUtils.getNeighbors(movingFromTerritory.q, movingFromTerritory.r);
            
            for (const neighbor of neighbors) {
                if (!isValidCoordinate(neighbor.q, neighbor.r)) continue;
                
                if (grid[neighbor.q][neighbor.r].owner === currentPlayerIndex) {
                    grid[neighbor.q][neighbor.r].selectable = true;
                }
            }
        }
    }
}

// Close attack result dialog
function closeAttackResult() {
    document.getElementById('attackResultDialog').style.display = 'none';
    attackResult = null;
}