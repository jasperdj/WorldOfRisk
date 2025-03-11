// Show tooltip for hex
let debug = true;

function showHexTooltip(hex, mouseX, mouseY) {
    const cell = grid[hex.q][hex.r];
    let tooltipText = '';
    
    if (cell.isShippingRoute) {
        tooltipText = 'Shipping Route' + (cell.isConnected ? ' (Connected)' : '');
    } else if (cell.isWater) {
        tooltipText = 'Water';
    } else if (cell.isVolcano) {
        tooltipText = 'Volcano';
    } else if (cell.isWildfire) {
        tooltipText = 'Wildfire';
    } else if (cell.isHurricane) {
        tooltipText = 'Hurricane';
    } else if (cell.continent === null) {
        tooltipText = 'Empty Tile';
    } else {
        tooltipText = CONTINENTS[cell.continent].name;
        
        if (cell.owner !== null) {
            tooltipText += ` (${players[cell.owner].name}: ${cell.units} units)`;
            
            // Add game phase tooltips
            if (gamePhase === 'game') {
                if (gamePhaseStep === 'reinforcement' && cell.owner === currentPlayerIndex) {
                    tooltipText += ' - Click to add reinforcement';
                } 
                else if (gamePhaseStep === 'attack') {
                    if (!attackMode && cell.owner === currentPlayerIndex && cell.units >= 2) {
                        tooltipText += ' - Click to attack from here';
                    } 
                    else if (attackMode && cell.owner !== currentPlayerIndex && cell.selectable) {
                        tooltipText += ' - Click to attack this territory';
                    }
                }
                else if (gamePhaseStep === 'fortify') {
                    if (!moveMode && cell.owner === currentPlayerIndex && cell.units >= 2) {
                        tooltipText += ' - Click to move troops from here';
                    } 
                    else if (moveMode && cell.owner === currentPlayerIndex && cell.selectable) {
                        tooltipText += ' - Click to move troops here';
                    }
                }
            }
        } else {
            tooltipText += ' (Unclaimed)';
            
            if (gamePhase === 'unitPlacement' && players[currentPlayerIndex].unitsToPlace > 0) {
                tooltipText += ' - Click to claim';
            }
        }
        
        // Additional info for unit placement phase
        if (gamePhase === 'unitPlacement') {
            if (cell.owner === currentPlayerIndex && players[currentPlayerIndex].unitsToPlace > 0) {
                tooltipText += ' - Click to add unit';
            } else if (cell.owner !== null && cell.owner !== currentPlayerIndex) {
                tooltipText += ' - Cannot place units here (owned by another player)';
            }
        }
    }
    
	// Todo: find better way to display debug info, or remove it entirely
    tooltip.textContent = tooltipText + " - q:" + hex.q + ", r: " + hex.r + ", selectable: " + cell.selectable;
    tooltip.style.display = 'block';
    tooltip.style.left = `${mouseX + 10}px`;
    tooltip.style.top = `${mouseY + 10}px`;
}

// Hide tooltip
function hideTooltip() {
    tooltip.style.display = 'none';
}

// Update game status text
// Todo: refactor to dynamic DOM updates
function updateGameStatus() {
    const statusElem = document.getElementById('gameStatus');
    const currentPlayer = players[currentPlayerIndex];
    
    if (gamePhase === 'creator') {
        statusElem.textContent = `Creator Phase: ${currentPlayer.name}'s Turn (${currentPlayer.cards.length} cards left)`;
    } else if (gamePhase === 'unitPlacement') {
        statusElem.textContent = `Unit Placement Phase: ${currentPlayer.name}'s Turn (${currentPlayer.unitsToPlace} units to place, ${currentPlayer.unitsRemaining} total remaining)`;
    } else if (gamePhase === 'game') {
        // Update for game phase steps
        if (gamePhaseStep === 'reinforcement') {
            statusElem.textContent = `Game Phase: ${currentPlayer.name}'s Turn - Reinforcement (${currentPlayer.unitsToPlace} units to place)`;
        } 
        else if (gamePhaseStep === 'attack') {
            if (!attackMode) {
                statusElem.textContent = `Game Phase: ${currentPlayer.name}'s Turn - Attack (Select attacker)`;
            } else {
                statusElem.textContent = `Game Phase: ${currentPlayer.name}'s Turn - Attack (Select defender)`;
            }
        } 
        else if (gamePhaseStep === 'fortify') {
            if (!moveMode) {
                statusElem.textContent = `Game Phase: ${currentPlayer.name}'s Turn - Fortify (Select source)`;
            } else {
                statusElem.textContent = `Game Phase: ${currentPlayer.name}'s Turn - Fortify (Select destination)`;
            }
        }
    }
}

// Count units for a player
function countPlayerUnits(playerIndex) {
    let count = 0;
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].owner === playerIndex) {
                count += grid[q][r].units;
            }
        }
    }
    return count;
}

// Count territories for a player
function countPlayerTerritories(playerIndex) {
    let count = 0;
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].owner === playerIndex) {
                count++;
            }
        }
    }
    return count;
}

// Update player info display
// Todo: refactor to dynamic DOM updates

function updatePlayerInfo() {
    const container = document.getElementById('playerInfo');
    container.innerHTML = '';
    
    players.forEach((player, i) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.style.borderLeftColor = player.color;
        
        if (i === currentPlayerIndex) {
            playerCard.style.fontWeight = 'bold';
            playerCard.style.boxShadow = '0 0 8px rgba(0,0,0,0.3)';
        }
        
        let playerInfo = `
            <div>${player.name} ${player.symbol}</div>
        `;
        
        if (gamePhase === 'creator') {
            playerInfo += `<div>Cards: ${player.cards.length}</div>`;
        } else if (gamePhase === 'unitPlacement' || gamePhase === 'game') {
            const unitCount = countPlayerUnits(i);
            const territoryCount = countPlayerTerritories(i);
            playerInfo += `
                <div>Territories: ${territoryCount}</div>
                <div>Units: ${unitCount}</div>
            `;
            
            if (gamePhase === 'unitPlacement') {
                playerInfo += `<div>Units to place: ${player.unitsToPlace}</div>`;
                playerInfo += `<div>Units remaining: ${player.unitsRemaining}</div>`;
            }
        }
        
        playerInfo += `<div class="territory-status">${i === currentPlayerIndex ? '(Current Turn)' : ''}</div>`;
        
        playerCard.innerHTML = playerInfo;
        container.appendChild(playerCard);
    });
}

// Update player hand display
function updatePlayerHand() {
    const container = document.getElementById('handCards');
    container.innerHTML = '';
    
    if (gamePhase !== 'creator') {
        // Collapse the hand if not in creator phase
        document.getElementById('playerHand').classList.add('collapsed');
        return;
    }
    
    // Ensure the hand is expanded in creator phase
    document.getElementById('playerHand').classList.remove('collapsed');
    
    const currentPlayer = players[currentPlayerIndex];
    
    // Add cards
    currentPlayer.cards.forEach((card, i) => {
        const cardElem = document.createElement('div');
        cardElem.className = 'card';
        
        // Create hex card container
        const hexCard = document.createElement('div');
        hexCard.className = 'hex-card';
        hexCard.style.backgroundColor = card.color;
        hexCard.style.color = colorUtils.isDark(card.color) ? 'white' : 'black';
        
        // Add card name
        hexCard.textContent = card.type === 'SEA' ? 'Sea' : 
                            card.type === 'BOMB' ? 'Bomb' :
                            card.type === 'TSUNAMI' ? 'Tsunami' :
                            card.type === 'VOLCANO' ? 'Volcano' :
                            card.type === 'SHIPPING_ROUTE' ? 'Ship' :
                            card.name.split(' ')[0];
        
        // Mark special cards
        if (card.type === 'BOMB' || card.type === 'TSUNAMI' || card.type === 'VOLCANO' || card.type === 'SHIPPING_ROUTE') {
            hexCard.classList.add('special-card');
        }
        
        cardElem.appendChild(hexCard);
        
        // Check if this continent card is playable
        let isPlayable = true;
        if (card.type === 'CONTINENT') {
            isPlayable = canContinentBeExpanded(card.continentIndex);
        }
        
        if (!isPlayable) {
            cardElem.classList.add('unplayable');
            cardElem.title = 'This continent cannot be expanded anymore';
        }
        
        if (selectedCard === i) {
            cardElem.classList.add('selected');
        }
        
        // Add hover tooltip
        if (card.description) {
            cardElem.title = card.description;
        }
        
        cardElem.addEventListener('click', () => {
            // Reset unit placement if a card is selected
            selectedUnitPlacement = false;
            
            if (isPlayable) {
                selectCard(i);
            } else {
                alert('This continent cannot be expanded anymore. The card will be discarded at the end of your turn.');
            }
        });
        
        container.appendChild(cardElem);
    });
    
    // Add individual unit placement cards if in "during" mode
    if (unitPlacementMode === 'during' && currentPlayer.unitsToPlace > 0) {
        // Add each unit as a separate card
        for (let i = 0; i < currentPlayer.unitsToPlace; i++) {
            const unitCardElem = document.createElement('div');
            unitCardElem.className = 'card unit-card';
            unitCardElem.dataset.unitIndex = i;
            
            const unitCircle = document.createElement('div');
            unitCircle.className = 'unit-circle';
            unitCircle.style.backgroundColor = currentPlayer.color;
            unitCircle.textContent = '1';
            unitCardElem.appendChild(unitCircle);
            
            unitCardElem.title = `Place a unit on your territory`;
            
            if (selectedUnitPlacement && unitCardElem.dataset.unitIndex == selectedUnitIndex) {
                unitCardElem.classList.add('selected');
            }
            
            unitCardElem.addEventListener('click', (e) => {
                // Deselect territory card if any
                selectedCard = null;
                // Reset previous unit selection
                document.querySelectorAll('.card.selected').forEach(card => card.classList.remove('selected'));
                // Mark this unit card as selected
                unitCardElem.classList.add('selected');
                // Set special flags for unit placement
                selectedUnitPlacement = true;
                selectedUnitIndex = i;
            });
            
            container.appendChild(unitCardElem);
        }
    }
}

// Select a card from the hand
function selectCard(index) {
    if (simulationInProgress) return;
    
    selectedCard = (selectedCard === index) ? null : index;
    updatePlayerHand();
}

// Update continent status
function updateContinentStatus() {
    const container = document.getElementById('continentStatus');
    container.innerHTML = '';
    
    CONTINENTS.forEach((continent, i) => {
        const badge = document.createElement('div');
        badge.className = 'continent-badge';
        badge.style.backgroundColor = continent.color;
        badge.style.color = colorUtils.isDark(continent.color) ? 'white' : 'black';
        
        badge.textContent = `${continent.name}: ${continent.placedTiles}/${continent.maxTiles}`;
        
        container.appendChild(badge);
    });
}

// Calculate game statistics
function calculateGameStats() {
    const continentStats = {};
    
    for (let i = 0; i < CONTINENTS.length; i++) {
        continentStats[i] = {
            name: CONTINENTS[i].name,
            size: CONTINENTS[i].placedTiles
        };
    }
    
    let connectedShippingRoutes = 0;
    let totalShippingRoutes = 0;
    
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].isShippingRoute) {
                totalShippingRoutes++;
                if (grid[q][r].isConnected) {
                    connectedShippingRoutes++;
                }
            }
        }
    }
    
    // Count territories by player
    const playerTerritories = {};
    const playerUnits = {};
    
    for (let i = 0; i < players.length; i++) {
        playerTerritories[i] = 0;
        playerUnits[i] = 0;
    }
    
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (grid[q][r].owner !== null) {
                playerTerritories[grid[q][r].owner]++;
                playerUnits[grid[q][r].owner] += grid[q][r].units;
            }
        }
    }
    
	// Todo: refactor to dynamic DOM updates
    const infoPanel = document.createElement('div');
    infoPanel.className = 'info-panel';
    infoPanel.innerHTML = `
        <h3>World Map Created!</h3>
        <p>The map has been successfully generated. Here are the continent statistics:</p>
        <ul>
            ${Object.keys(continentStats).map(c => 
                `<li><span style="color:${CONTINENTS[c].color};">${continentStats[c].name}</span>: ${continentStats[c].size} tiles</li>`
            ).join('')}
        </ul>
        <p>Shipping Routes: ${connectedShippingRoutes} connected out of ${totalShippingRoutes} total</p>
        <p>Player Territory Control:</p>
        <ul>
            ${Object.keys(playerTerritories).map(p => 
                `<li><span style="color:${players[p].color};">${players[p].name}</span>: ${playerTerritories[p]} territories, ${playerUnits[p]} units</li>`
            ).join('')}
        </ul>
        <p>Now you can start playing Risk on this custom map!</p>
    `;
    
    const controls = document.querySelector('.controls');
    controls.innerHTML = '';
    controls.appendChild(infoPanel);
}