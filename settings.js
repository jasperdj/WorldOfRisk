// Default settings object
const DEFAULT_SETTINGS = {
    // Basic settings
    gridSize: 21,
    playerCount: 4,
    continentTileMultiplier: 1,
    seaTiles: 20,
    worldTilesPerTurn: 1,
    shippingRoutesPerPlayer: 5,
    bombsPerPlayer: 1,
    
    // Continent settings
    maxNorthAmerica: 12,
    maxSouthAmerica: 9,
    maxEurope: 10,
    maxAfrica: 12,
    maxAsia: 12,
    maxAustralia: 7,
    
    // Unit settings
    unitsPerPlayer: 10,
    unitsPerTurn: 3,
    unitPlacementMode: "after",
    minUnitReinforcement: 3,
    minContinentBonus: 2,
    continentBonusDivisor: 2,
    continentBonusModifier: 1,
    
    // Combat settings
    attackerDice: 6,
    attackerOneDiceMin: 1,
    attackerTwoDiceMin: 2,
    attackerThreeDiceMin: 3,
    defenderDice: 6,
    defenderOneDiceMin: 1,
    defenderTwoDiceMin: 2,
    
    // Natural events 
    // Volcano
    volcanoOccuranceDice: 6,
    volcanoOccuranceModifier: 0,
    volcanoOccuranceThreshold: 5,
    
    volcanoLavaReachDice: 6,
    volcanoLavaReachModifier: 0,
    volcanoLavaReachThreshold: 3,
    
    volcanoSmokeMovementDice: 6,
    volcanoSmokeMovementModifier: 0,
    volcanoSmokeMovementThreshold: 3,
    
    volcanoClearsUpDice: 6,
    volcanoClearsUpModifier: 0,
    volcanoClearsUpThreshold: 3,
    
    // Hurricane
    hurricaneOccuranceDice: 6,
    hurricaneOccuranceModifier: 0,
    hurricaneOccuranceThreshold: 5,
    
    hurricaneClearsUpDice: 6,
    hurricaneClearsUpModifier: 0,
    hurricaneClearsUpThreshold: 3,
    
    // Fire
    fireLandChanceDice: 6,
    fireLandChanceModifier: 0,
    fireLandChanceThreshold: 3,
    
    fireTroopKillDice: 6,
    fireTroopKillModifier: 0,
    fireTroopKillThreshold: 4,
    
    // Lightning
    lightningOccuranceDice: 10,
    lightningOccuranceModifier: 0,
    lightningOccuranceThreshold: 8,
    
    // Technology
    minShippingDocks: 2,
    minShippingConnections: 3,
    shippingRoutesPerTurn: 1,
    
    shippingRoutePickupDice: 6,
    shippingRoutePickupModifier: 0,
    shippingRoutePickupThreshold: 3,
    
    portalMinContinents: 2,
    portalMinTroops: 3,
    portalMaxCount: 1,
    
    portalChanceDice: 6,
    portalChanceModifier: 0,
    portalChanceThreshold: 4,
    
    portalRange: 10,
    
    terraformerPickupDice: 6,
    terraformerPickupModifier: 0,
    terraformerPickupThreshold: 4,
    
    terraformerRange: 3
};

// Current settings that will be used for the game
let currentSettings = { ...DEFAULT_SETTINGS };

// Initialize settings functionality
function initSettings() {
    // Load settings from localStorage
    loadSettingsFromStorage();
    
    // Populate inputs with current settings
    populateSettingInputs();
    
    // Load presets from localStorage
    loadPresets();
    
    // Set up event listeners for preset buttons
    document.getElementById('loadPresetBtn').addEventListener('click', loadSelectedPreset);
    document.getElementById('savePresetBtn').addEventListener('click', saveCurrentPreset);
    document.getElementById('saveAsPresetBtn').addEventListener('click', saveAsNewPreset);
    document.getElementById('deletePresetBtn').addEventListener('click', deleteSelectedPreset);
    
    // Update the startGame function to use the current settings
    const originalStartGame = startGame;
    startGame = function() {
        // Save current settings before starting
        saveSettingsToStorage();
        
        // Get all settings from form inputs
        gatherSettingsFromInputs();
        
        // Set up CONTINENTS array with the continent size settings
        CONTINENTS[0].maxTiles = currentSettings.maxNorthAmerica;
        CONTINENTS[1].maxTiles = currentSettings.maxSouthAmerica;
        CONTINENTS[2].maxTiles = currentSettings.maxEurope;
        CONTINENTS[3].maxTiles = currentSettings.maxAfrica;
        CONTINENTS[4].maxTiles = currentSettings.maxAsia;
        CONTINENTS[5].maxTiles = currentSettings.maxAustralia;
        
        // Transfer settings to global variables
        gridSize = currentSettings.gridSize;
        playerCount = currentSettings.playerCount;
        seaTiles = currentSettings.seaTiles;
        continentTileMultiplier = currentSettings.continentTileMultiplier;
        unitsPerPlayer = currentSettings.unitsPerPlayer;
        unitsPerTurn = currentSettings.unitsPerTurn;
        unitPlacementMode = currentSettings.unitPlacementMode;
        shippingRoutesPerPlayer = currentSettings.shippingRoutesPerPlayer;
        bombsPerPlayer = currentSettings.bombsPerPlayer;
        
        // Call the original startGame with our gathered settings
        originalStartGame();
    };
	
	// Add save/load button to settings screen
	// Todo: refactor to dynamic DOM updates
	const settingsContainer = document.querySelector('.settings-container');
	const saveLoadPanel = document.createElement('div');
	saveLoadPanel.className = 'settings-panel';
	saveLoadPanel.innerHTML = `
		<h2>Save / Load Game</h2>
		<div class="settings-group">
			<button id="settingsSaveLoadBtn" class="preset-btn">Open Save/Load Dialog</button>
		</div>
	`;
	settingsContainer.appendChild(saveLoadPanel);

	document.getElementById('settingsSaveLoadBtn').addEventListener('click', showSaveLoadDialog);
}

// Load settings from localStorage
function loadSettingsFromStorage() {
    const savedSettings = localStorage.getItem('worldOfRiskSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            currentSettings = { ...DEFAULT_SETTINGS, ...parsedSettings };
        } catch (e) {
            console.error('Error loading settings:', e);
            currentSettings = { ...DEFAULT_SETTINGS };
        }
    }
}

// Save settings to localStorage
function saveSettingsToStorage() {
    try {
        gatherSettingsFromInputs();
        localStorage.setItem('worldOfRiskSettings', JSON.stringify(currentSettings));
    } catch (e) {
        console.error('Error saving settings:', e);
    }
}

// Populate all form inputs with current settings
function populateSettingInputs() {
    // Iterate through all setting inputs and set their values
    document.querySelectorAll('.setting-input').forEach(input => {
        if (input.id in currentSettings) {
            if (input.type === 'select-one') {
                input.value = currentSettings[input.id];
            } else if (input.type === 'number') {
                input.value = currentSettings[input.id];
            }
        }
    });
}

// Gather settings from all form inputs
function gatherSettingsFromInputs() {
    document.querySelectorAll('.setting-input').forEach(input => {
        if (input.id !== 'presetSelector') {
            if (input.type === 'number') {
                currentSettings[input.id] = parseFloat(input.value);
            } else {
                currentSettings[input.id] = input.value;
            }
        }
    });
}

// Presets management
function loadPresets() {
    const presets = getPresets();
    const presetSelector = document.getElementById('presetSelector');
    
    // Clear existing options except the first one (Default)
    while (presetSelector.options.length > 1) {
        presetSelector.remove(1);
    }
    
    // Add presets to selector
    Object.keys(presets).forEach(presetName => {
        const option = document.createElement('option');
        option.value = presetName;
        option.textContent = presetName;
        presetSelector.appendChild(option);
    });
}

function getPresets() {
    const presetsJson = localStorage.getItem('worldOfRiskPresets');
    if (presetsJson) {
        try {
            return JSON.parse(presetsJson);
        } catch (e) {
            console.error('Error loading presets:', e);
            return {};
        }
    }
    return {};
}

function savePresets(presets) {
    try {
        localStorage.setItem('worldOfRiskPresets', JSON.stringify(presets));
    } catch (e) {
        console.error('Error saving presets:', e);
    }
}

function loadSelectedPreset() {
    const presetSelector = document.getElementById('presetSelector');
    const selectedPreset = presetSelector.value;
    
    if (selectedPreset === 'default') {
        currentSettings = { ...DEFAULT_SETTINGS };
        populateSettingInputs();
        return;
    }
    
    const presets = getPresets();
    if (presets[selectedPreset]) {
        currentSettings = { ...DEFAULT_SETTINGS, ...presets[selectedPreset] };
        populateSettingInputs();
    }
}

function saveCurrentPreset() {
    const presetSelector = document.getElementById('presetSelector');
    const selectedPreset = presetSelector.value;
    
    if (selectedPreset === 'default') {
        saveAsNewPreset();
        return;
    }
    
    gatherSettingsFromInputs();
    const presets = getPresets();
    presets[selectedPreset] = { ...currentSettings };
    savePresets(presets);
}

function saveAsNewPreset() {
    const presetName = prompt('Enter a name for this preset:');
    if (!presetName) return;
    
    gatherSettingsFromInputs();
    const presets = getPresets();
    presets[presetName] = { ...currentSettings };
    savePresets(presets);
    
    // Reload presets and select the new one
    loadPresets();
    document.getElementById('presetSelector').value = presetName;
}

function deleteSelectedPreset() {
    const presetSelector = document.getElementById('presetSelector');
    const selectedPreset = presetSelector.value;
    
    if (selectedPreset === 'default') {
        alert('Cannot delete the default preset.');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the preset "${selectedPreset}"?`)) {
        const presets = getPresets();
        delete presets[selectedPreset];
        savePresets(presets);
        
        // Reload presets and select default
        loadPresets();
        presetSelector.value = 'default';
        loadSelectedPreset();
    }
}

// Call this when the DOM is loaded to initialize the settings
document.addEventListener('DOMContentLoaded', initSettings);