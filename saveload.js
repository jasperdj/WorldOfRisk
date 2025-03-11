// Save current game state
function saveGameState() {
    // Get game name from user
    const gameName = prompt("Enter a name for this saved game:", "Game " + new Date().toLocaleDateString());
    if (!gameName) return;
    
    // Create game state object
    const gameState = {
        timestamp: Date.now(),
        name: gameName,
        grid: grid,
        players: players,
        currentPlayerIndex: currentPlayerIndex,
        gamePhase: gamePhase,
        gamePhaseStep: gamePhaseStep,
        CONTINENTS: CONTINENTS,
        gridWidth: gridWidth,
        gridHeight: gridHeight,
        // Save settings as well
        settings: currentSettings
    };
    
    // Get existing saved games
    let savedGames = JSON.parse(localStorage.getItem('riskGameSaves')) || {};
    
    // Add new save
    const saveId = 'save_' + Date.now();
    savedGames[saveId] = gameState;
    
    // Save to localStorage
    localStorage.setItem('riskGameSaves', JSON.stringify(savedGames));
    
    alert("Game saved successfully!");
    updateSavedGamesList();
}

// Update the loadGameState function
function loadGameState(saveId) {
    // Get saved games
    const savedGames = JSON.parse(localStorage.getItem('riskGameSaves')) || {};
    
    // Check if save exists
    if (!savedGames[saveId]) {
        alert("Save not found!");
        return;
    }
    
    // Confirm load
    if (!confirm("Load this saved game? Current game progress will be lost.")) {
        return;
    }
    
    // Get save data
    const saveData = savedGames[saveId];
    
    // Restore game state
    grid = saveData.grid;
    players = saveData.players;
    currentPlayerIndex = saveData.currentPlayerIndex;
    gamePhase = saveData.gamePhase;
    gamePhaseStep = saveData.gamePhaseStep || 'reinforcement'; // For backward compatibility
    CONTINENTS = saveData.CONTINENTS;
    gridWidth = saveData.gridWidth;
    gridHeight = saveData.gridHeight;
    
    // Restore settings if available
    if (saveData.settings) {
        currentSettings = saveData.settings;
    }
    
    // Hide setup screen, show game
    document.getElementById('initialSettings').style.display = 'none';
    document.getElementById('gameInterface').style.display = 'block';
    
    // Reset UI state variables
    selectedCard = null;
    selectedHex = null;
    attackMode = false;
    moveMode = false;
    selectedAttacker = null;
    selectedDefender = null;
    movingFromTerritory = null;
    movingToTerritory = null;
    
    // Update UI
    if (gamePhase === 'game') {
        updateGameControls();
    } else if (gamePhase === 'unitPlacement') {
        // Set up UI for unit placement phase
        document.getElementById('endTurnBtn').textContent = 'End Turn';
        document.getElementById('endTurnBtn').disabled = false;
        document.getElementById('endCreatorPhaseBtn').textContent = 'End Unit Placement Phase';
        document.getElementById('simulateGameBtn').disabled = true;
        document.getElementById('playerHand').style.display = 'none';
    }
    
    updateGameStatus();
    updatePlayerInfo();
    updatePlayerHand();
    updateContinentStatus();
    drawGrid();
    
    closeSaveLoadDialog();
    
    alert("Game loaded successfully!");
}

// Delete saved game
function deleteGameState(saveId) {
    // Get saved games
    const savedGames = JSON.parse(localStorage.getItem('riskGameSaves')) || {};
    
    // Check if save exists
    if (!savedGames[saveId]) {
        alert("Save not found!");
        return;
    }
    
    // Confirm delete
    if (!confirm("Are you sure you want to delete this saved game?")) {
        return;
    }
    
    // Delete save
    delete savedGames[saveId];
    
    // Update localStorage
    localStorage.setItem('riskGameSaves', JSON.stringify(savedGames));
    
    alert("Game deleted successfully!");
    updateSavedGamesList();
}

// Show save/load dialog
// Todo: refactor to dynamic DOM updates
function showSaveLoadDialog() {
    // Create dialog if it doesn't exist
    if (!document.getElementById('saveLoadDialog')) {
        const dialog = document.createElement('div');
        dialog.id = 'saveLoadDialog';
        dialog.className = 'game-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-content" style="width: 500px; max-width: 90%; position: relative; margin: 50px auto;">
                <h3>Save / Load Game</h3>
                <button id="saveGameBtn" style="margin-bottom: 15px;">Save Current Game</button>
                <div id="savedGamesList" style="max-height: 300px; overflow-y: auto;">
                    <p>No saved games found.</p>
                </div>
                <div class="dialog-buttons">
                    <button onclick="closeSaveLoadDialog()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        document.getElementById('saveGameBtn').addEventListener('click', saveGameState);
    }
    
    // Update saved games list
    updateSavedGamesList();
    
    // Show dialog
    document.getElementById('saveLoadDialog').style.display = 'flex';
}

// Close save/load dialog
function closeSaveLoadDialog() {
    document.getElementById('saveLoadDialog').style.display = 'none';
}

// Update saved games list
// Todo: refactor to dynamic DOM updates
// Todo: refactor UI since it is a little bit cramped
function updateSavedGamesList() {
    const listElem = document.getElementById('savedGamesList');
    
    // Get saved games
    const savedGames = JSON.parse(localStorage.getItem('riskGameSaves')) || {};
    const saveIds = Object.keys(savedGames);
    
    if (saveIds.length === 0) {
        listElem.innerHTML = '<p>No saved games found.</p>';
        return;
    }
    
    // Sort by timestamp (newest first)
    saveIds.sort((a, b) => savedGames[b].timestamp - savedGames[a].timestamp);
    
    let html = '<table style="width:100%; border-collapse: collapse;">';
    html += '<tr><th style="text-align:left;">Game</th><th style="text-align:left;">Date</th><th>Actions</th></tr>';
    
    for (const saveId of saveIds) {
        const game = savedGames[saveId];
        const date = new Date(game.timestamp).toLocaleString();
        
        html += `<tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">${game.name}</td>
            <td style="padding: 8px;">${date}</td>
            <td style="padding: 8px; text-align: center;">
                <button onclick="loadGameState('${saveId}')" style="margin-right: 5px;">Load</button>
                <button onclick="deleteGameState('${saveId}')">Delete</button>
            </td>
        </tr>`;
    }
    
    html += '</table>';
    listElem.innerHTML = html;
}