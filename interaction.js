// Handle mouse movement
// Todo: parameterize grid size (0.23) in UI settings
function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const canvasX = (mouseX / rect.width) * canvas.width;
    const canvasY = (mouseY / rect.height) * canvas.height;
    
    const gridWidthPx = gridWidth * hexSize * 1.5;
    const gridHeightPx = gridHeight * hexHeight;
    
    const offsetX = (canvas.width / window.devicePixelRatio - gridWidthPx) / 2;
    const verticalShift = gridHeightPx * 0.23;
    const offsetY = (canvas.height / window.devicePixelRatio - gridHeightPx) / 2 - verticalShift;
    
    const gridX = canvasX / window.devicePixelRatio - offsetX;
    const gridY = canvasY / window.devicePixelRatio - offsetY;
    const hex = hexUtils.fromPixel(gridX, gridY);
    
    if (isValidCoordinate(hex.q, hex.r)) {
        selectedHex = hex;
        showHexTooltip(hex, event.clientX, event.clientY);
    } else {
        selectedHex = null;
        hideTooltip();
    }
    
    drawGrid();
}

// Handle click on the canvas
function handleClick(event) {
    if (!selectedHex || simulationInProgress) {
        return;
    }
    
    const q = selectedHex.q;
    const r = selectedHex.r;
    
    if (!grid[q][r].valid) {
        return;
    }
    
    // Handle unit placement during creator phase
    if (gamePhase === 'creator' && selectedUnitPlacement && unitPlacementMode === 'during') {
        // Only allow placing units on continent tiles
        if (grid[q][r].continent !== null && !grid[q][r].isWater && !grid[q][r].isVolcano && 
            !grid[q][r].isHurricane && !grid[q][r].isWildfire && !grid[q][r].isShippingRoute) {
            
            // If no owner, claim the territory for the current player
            if (grid[q][r].owner === null) {
                grid[q][r].owner = currentPlayerIndex;
                grid[q][r].units = 1;
                
                players[currentPlayerIndex].unitsToPlace--;
                players[currentPlayerIndex].unitsRemaining--;
                
                selectedUnitPlacement = false;
				selectedUnitIndex = -1;
                updatePlayerHand();
                drawGrid();
                updatePlayerInfo();
            }
            // If already owned by current player, add a unit
            else if (grid[q][r].owner === currentPlayerIndex) {
                grid[q][r].units++;
                
                players[currentPlayerIndex].unitsToPlace--;
                players[currentPlayerIndex].unitsRemaining--;
                
                selectedUnitPlacement = false;
                updatePlayerHand();
                drawGrid();
                updatePlayerInfo();
            }
            // If owned by another player, can't place units here
            else {
                alert("You cannot place units on territories owned by other players.");
            }
            return;
        } else if (grid[q][r].isWater || grid[q][r].isVolcano || grid[q][r].isHurricane || 
                  grid[q][r].isWildfire || grid[q][r].isShippingRoute) {
            alert("You cannot place units on non-territory tiles.");
            return;
        } else {
            alert("You must claim a territory by placing continent cards first.");
            return;
        }
    }
    
    // Handle regular card placement in creator phase
    if (gamePhase === 'creator') {
        // Check if we're clicking on the last placed shipping route to rotate it
        if (lastPlacedTile && lastPlacedTile.q === q && lastPlacedTile.r === r && grid[q][r].isShippingRoute) {
            rotateShippingRoute(q, r);
            updateAllShippingRouteConnections();
            drawGrid();
            return;
        }
        
        if (selectedCard === null) {
            return;
        }
        
        const card = players[currentPlayerIndex].cards[selectedCard];
        
        // Handle wildfire card
        if (card.type === 'WILDFIRE') {
            if (grid[q][r].continent !== null) {
                const continentIndex = grid[q][r].continent;
                const continentName = CONTINENTS[continentIndex].name;
                
                // Roll a dice (1-6) for spread distance
                const spreadDistance = 1 + Math.floor(Math.random() * 6);
                alert(`Wildfire dice roll: ${spreadDistance} - Fire will spread up to ${spreadDistance} tiles through ${continentName}.`);
                
                const tilesAffected = createWildfireEffect(q, r, continentIndex);
                console.log(`Wildfire affected ${tilesAffected} tiles in the ${continentName} continent.`);
                
                players[currentPlayerIndex].cards.splice(selectedCard, 1);
                selectedCard = null;
                
                updatePlayerHand();
                drawGrid();
                updateContinentStatus();
                
                document.getElementById('endTurnBtn').disabled = false;
            } else {
                alert("You can only place a wildfire on an existing continent tile.");
            }
            return;
        }
        
        // Handle bomb card
        if (card.type === 'BOMB') {
            if (grid[q][r].continent !== null || grid[q][r].isWater || grid[q][r].isVolcano || grid[q][r].isHurricane || grid[q][r].isWildfire || grid[q][r].isShippingRoute) {
                const previousContinent = grid[q][r].continent;
                grid[q][r].continent = null;
                grid[q][r].isWater = false;
                grid[q][r].isVolcano = false;
                grid[q][r].isHurricane = false;
                grid[q][r].isWildfire = false;
                grid[q][r].isShippingRoute = false;
                grid[q][r].shippingRouteOrientation = 0;
                grid[q][r].isConnected = false;
                
                if (previousContinent !== null && CONTINENTS[previousContinent]) {
                    CONTINENTS[previousContinent].placedTiles--;
                }
                
                updateAllShippingRouteConnections();
                
                players[currentPlayerIndex].cards.splice(selectedCard, 1);
                selectedCard = null;
                
                lastPlacedTile = null;
                
                updatePlayerHand();
                drawGrid();
                updateContinentStatus();
                
                document.getElementById('endTurnBtn').disabled = false;
            } else {
                alert("You can only use a bomb on an existing tile (land or water).");
            }
            return;
        }
        
        // Handle shipping route card
        if (card.type === 'SHIPPING_ROUTE') {
            if ((grid[q][r].isWater && !grid[q][r].isShippingRoute && !grid[q][r].isHurricane) || 
               (grid[q][r].continent === null && !grid[q][r].isWater && !grid[q][r].isVolcano && !grid[q][r].isHurricane && !grid[q][r].isWildfire && !grid[q][r].isShippingRoute)) {
                
                grid[q][r].isWater = true;
                grid[q][r].isShippingRoute = true;
                grid[q][r].shippingRouteOrientation = 0;
                grid[q][r].isConnected = false;
                
                lastPlacedTile = {q, r};
                
                updateAllShippingRouteConnections();
                
                players[currentPlayerIndex].cards.splice(selectedCard, 1);
                selectedCard = null;
                
                updatePlayerHand();
                drawGrid();
                
                document.getElementById('endTurnBtn').disabled = false;
            } else {
                alert("Shipping routes can only be placed on empty or water tiles.");
            }
            return;
        }
        
        // Handle Hurricane card
        if (card.type === 'HURRICANE') {
            if (grid[q][r].continent === null && !grid[q][r].isWater && !grid[q][r].isVolcano && !grid[q][r].isHurricane && !grid[q][r].isWildfire && !grid[q][r].isShippingRoute) {
                grid[q][r].isWater = true;
                grid[q][r].isHurricane = true;
                
                players[currentPlayerIndex].cards.splice(selectedCard, 1);
                selectedCard = null;
                
                lastPlacedTile = null;
                
                updatePlayerHand();
                drawGrid();
                updateContinentStatus();
                
                document.getElementById('endTurnBtn').disabled = false;
            } else {
                alert("You can only place a hurricane on an empty tile.");
            }
            return;
        }
        
        // For normal cards, check if the tile is already claimed
        if (grid[q][r].continent !== null || grid[q][r].isWater || grid[q][r].isVolcano || grid[q][r].isWildfire || grid[q][r].isHurricane || grid[q][r].isShippingRoute) {
            return;
        }
        
        // Handle continent card
        if (card.type === 'CONTINENT') {
            if (card.continentIndex === undefined || CONTINENTS[card.continentIndex].placedTiles >= CONTINENTS[card.continentIndex].maxTiles) {
                alert(`Maximum tiles (${CONTINENTS[card.continentIndex].maxTiles}) for ${CONTINENTS[card.continentIndex].name} already placed.`);
                return;
            }
            
            // Check if adjacent to same continent (unless it's the first tile of this type)
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
                    alert(`Continent tiles must be placed adjacent to existing tiles of the same continent.`);
                    return;
                }
            }
            
            grid[q][r].continent = card.continentIndex;
            CONTINENTS[card.continentIndex].placedTiles++;
            
            updateAllShippingRouteConnections();
        } 
        else if (card.type === 'SEA') {
            grid[q][r].isWater = true;
        }
        else if (card.type === 'TSUNAMI') {
            // Use the createTsunamiEffect function to create a cone of sea tiles
            const tilesAffected = createTsunamiEffect(q, r);
            console.log(`Tsunami affected ${tilesAffected} tiles in addition to the origin tile.`);
        }
        else if (card.type === 'VOLCANO') {
            grid[q][r].isVolcano = true;
            grid[q][r].continent = null;
        }
        
        players[currentPlayerIndex].cards.splice(selectedCard, 1);
        selectedCard = null;
        
        lastPlacedTile = null;
        
        updatePlayerHand();
        drawGrid();
        updateContinentStatus();
        
        document.getElementById('endTurnBtn').disabled = false;
    }
    // Handle clicks for unit placement phase
    else if (gamePhase === 'unitPlacement') {
        // Only allow placing units on land tiles that belong to a continent
        if (grid[q][r].continent !== null && !grid[q][r].isWater && !grid[q][r].isVolcano && 
            !grid[q][r].isHurricane && !grid[q][r].isWildfire && !grid[q][r].isShippingRoute) {
            
            // Check if current player has units to place
            if (players[currentPlayerIndex].unitsToPlace <= 0) {
                alert("You have no more units to place this turn. End your turn.");
                return;
            }
            
            // If no owner, claim the territory for the current player
            if (grid[q][r].owner === null) {
                grid[q][r].owner = currentPlayerIndex;
                grid[q][r].units = 1;
                
                players[currentPlayerIndex].unitsToPlace--;
                players[currentPlayerIndex].unitsRemaining--;
                
                updateGameStatus();
                updatePlayerInfo();
                drawGrid();
                
                if (players[currentPlayerIndex].unitsToPlace <= 0) {
                    document.getElementById('endTurnBtn').disabled = false;
                }
            }
            // If already owned by current player, add a unit
            else if (grid[q][r].owner === currentPlayerIndex) {
                grid[q][r].units++;
                
                players[currentPlayerIndex].unitsToPlace--;
                players[currentPlayerIndex].unitsRemaining--;
                
                updateGameStatus();
                updatePlayerInfo();
                drawGrid();
                
                if (players[currentPlayerIndex].unitsToPlace <= 0) {
                    document.getElementById('endTurnBtn').disabled = false;
                }
            }
            // If owned by another player, can't place units here
            else {
                alert("You cannot place units on territories owned by other players.");
            }
        } else if (grid[q][r].isWater || grid[q][r].isVolcano || grid[q][r].isHurricane || 
                  grid[q][r].isWildfire || grid[q][r].isShippingRoute) {
            alert("You cannot place units on non-territory tiles.");
        }
    }
    // Handle clicks for game phase
    else if (gamePhase === 'game') {
        const q = selectedHex.q;
        const r = selectedHex.r;
        
        // Check if valid territory
        if (!grid[q][r].valid) {
            return;
        }
        
        // Reinforcement phase
        if (gamePhaseStep === 'reinforcement') {
            placeReinforcement(q, r);
        } 
        // Attack phase
        else if (gamePhaseStep === 'attack') {
            if (!attackMode) {
                // Select attacker territory
                startAttack(q, r);
            } else {
                // Select defender territory
                selectDefender(q, r);
            }
        }
        // Fortify phase
        else if (gamePhaseStep === 'fortify') {
            if (!moveMode) {
                // Select source territory
                startFortify(q, r);
            } else {
                // Select destination territory
                selectFortifyDestination(q, r);
            }
        }
    }
}

function setupHandToggle() {
    const handToggle = document.getElementById('handToggle');
    const playerHand = document.getElementById('playerHand');
    
    // Start with hand collapsed if in unit placement or game phase
    if (gamePhase !== 'creator') {
        playerHand.classList.add('collapsed');
    }
    
    handToggle.addEventListener('click', () => {
        playerHand.classList.toggle('collapsed');
    });
}

// Set up event listeners
function setupEventListeners() {
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('resize', resizeCanvas);
    
    document.getElementById('endTurnBtn').addEventListener('click', endTurn);
    document.getElementById('endCreatorPhaseBtn').addEventListener('click', () => {
        if (gamePhase === 'creator') {
            endCreatorPhase();
        } else if (gamePhase === 'unitPlacement') {
            endUnitPlacementPhase();
        }
    });
    document.getElementById('simulateGameBtn').addEventListener('click', toggleSimulation);
    
    // Add save/load button
    const controlsDiv = document.querySelector('.controls');
    const saveLoadBtn = document.createElement('button');
    saveLoadBtn.id = 'saveLoadBtn';
    saveLoadBtn.textContent = 'Save/Load Game';
    saveLoadBtn.addEventListener('click', showSaveLoadDialog);
    controlsDiv.appendChild(saveLoadBtn);
    
    setupHandToggle();
}

