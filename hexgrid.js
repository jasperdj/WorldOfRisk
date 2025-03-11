// Hex grid utilities
// Todo: import https://github.com/flauwekeul/honeycomb instead of homebrew solution
// Todo: alternatively: parameterize to allow for as many edges as you want. Pentagon would be interesting
const hexUtils = {
    toPixel: (q, r) => {
        const x = hexSize * 3/2 * q;
        const y = hexSize * Math.sqrt(3) * (r + q/2);
        return {x, y};
    },
    fromPixel: (x, y) => {
        const q = (2/3 * x) / hexSize;
        const r = ((-1/3 * x) + (Math.sqrt(3)/3 * y)) / hexSize;
        return hexUtils.axialRound(q, r);
    },
    axialRound: (q, r) => {
        let s = -q - r;
        let qRound = Math.round(q);
        let rRound = Math.round(r);
        let sRound = Math.round(s);
        const qDiff = Math.abs(qRound - q);
        const rDiff = Math.abs(rRound - r);
        const sDiff = Math.abs(sRound - s);
        if (qDiff > rDiff && qDiff > sDiff) {
            qRound = -rRound - sRound;
        } else if (rDiff > sDiff) {
            rRound = -qRound - sRound;
        }
        return {q: qRound, r: rRound};
    },
    getNeighbors: (q, r) => [
        {q: q+1, r: r},     // right
        {q: q+1, r: r-1},   // upper right
        {q: q, r: r-1},     // upper left
        {q: q-1, r: r},     // left
        {q: q-1, r: r+1},   // lower left
        {q: q, r: r+1}      // lower right
    ]
};

// Helper function to check if a coordinate is within grid bounds
function isValidCoordinate(q, r) {
    return q >= 0 && q < gridWidth && r >= 0 && r < gridHeight && grid[q][r].valid;
}

// Initialize grid
function initGrid() {
    grid = [];
    
    const centerQ = Math.floor(gridWidth / 2);
    const centerR = Math.floor(gridHeight / 2);
    const radius = Math.min(gridWidth, gridHeight) * 0.45;
    
    for (let q = 0; q < gridWidth; q++) {
        grid[q] = [];
        for (let r = 0; r < gridHeight; r++) {
            const cubeX = q - centerQ;
            const cubeZ = r - centerR;
            const cubeY = -cubeX - cubeZ;
            const distance = Math.max(Math.abs(cubeX), Math.abs(cubeY), Math.abs(cubeZ));
            
			// Todo: refactor to flexible grid element types and remove booleans
			// Todo: remove isConnected, dead code
            grid[q][r] = {
                q, r,
                continent: null,
                isWater: distance > radius,
                isVolcano: false,
                isHurricane: false,
                isWildfire: false,
                isShippingRoute: false,
                shippingRouteOrientation: 0,
                isConnected: false,
                valid: distance <= radius,
                owner: null,
                units: 0,
				selectable: false 

            };
        }
    }
}

// Draw a single hexagon
// Todo: remove code redundancy with drawHexHighlight with parameterized function
function drawHexagon(x, y, fillColor, strokeColor) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angleDeg = 60 * i;
        const angleRad = (Math.PI / 180) * angleDeg;
        
        const xPos = x + hexSize * Math.cos(angleRad);
        const yPos = y + hexSize * Math.sin(angleRad);
        
        if (i === 0) {
            ctx.moveTo(xPos, yPos);
        } else {
            ctx.lineTo(xPos, yPos);
        }
    }
    ctx.closePath();
    
    ctx.fillStyle = fillColor;
    ctx.fill();
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
}

// Draw highlighted hexagon
function drawHexHighlight(x, y, strokeColor = '#f39c12', lineWidth = 3) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angleDeg = 60 * i;
        const angleRad = (Math.PI / 180) * angleDeg;
        
        const xPos = x + hexSize * Math.cos(angleRad);
        const yPos = y + hexSize * Math.sin(angleRad);
        
        if (i === 0) {
            ctx.moveTo(xPos, yPos);
        } else {
            ctx.lineTo(xPos, yPos);
        }
    }
    ctx.closePath();
    
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
}

// Resize the canvas based on window size
function resizeCanvas() {
    const canvasContainer = document.querySelector('.canvas-container');
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';
    
    const gridPixelWidth = gridWidth * 1.5 + 0.5;
    const gridPixelHeight = gridHeight * Math.sqrt(3) + 1;
    
    const widthConstraint = containerWidth / gridPixelWidth;
    const heightConstraint = containerHeight / gridPixelHeight;
    
    // Maximize the hex size while maintaining aspect ratio
    hexSize = Math.floor(Math.min(widthConstraint, heightConstraint) * 0.9);
    hexWidth = hexSize * 2;
    hexHeight = Math.floor(hexSize * Math.sqrt(3));
    
    // Set canvas dimensions
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    if (dpr > 1) {
        canvas.width *= dpr;
        canvas.height *= dpr;
        ctx.scale(dpr, dpr);
    }
    
    drawGrid();
}

// Draw the hexagonal grid
// Todo: does not have perfect grid placement with different screen dimensions
// Todo: messy code, can easily be refactor into much more readable and smaller chunk of code
// Todo: 0.23 = grid scale, should be a UI configuration property
function drawGrid() {	
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const gridWidthPx = gridWidth * hexSize * 1.5;
    const gridHeightPx = gridHeight * hexHeight;
    
    const offsetX = (canvas.width / window.devicePixelRatio - gridWidthPx) / 2;
    const verticalShift = gridHeightPx * 0.23;
    const offsetY = (canvas.height / window.devicePixelRatio - gridHeightPx) / 2 - verticalShift;
    
    // Draw deep ocean background
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const bombSelected = selectedCard !== null && 
                        currentPlayerIndex >= 0 && 
                        players[currentPlayerIndex].cards[selectedCard] && 
                        players[currentPlayerIndex].cards[selectedCard].type === 'BOMB';
    
    const shippingRouteSelected = selectedCard !== null && 
                              currentPlayerIndex >= 0 && 
                              players[currentPlayerIndex].cards[selectedCard] && 
                              players[currentPlayerIndex].cards[selectedCard].type === 'SHIPPING_ROUTE';
    
    // Get all directly connected land tiles (for highlighting)
    const connectedLandTiles = new Set();
    findConnectedLandTiles(connectedLandTiles);
    
    // First pass: Draw all base hexagons
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            const cell = grid[q][r];
            if (!cell.valid) continue;
            
            const {x, y} = hexUtils.toPixel(q, r);
            
            // Draw hex based on its state
			// Todo: move this into drawUtil js file
            if (cell.isVolcano) {
                drawHexagon(x + offsetX, y + offsetY, '#e74c3c', '#922b21');
                
                // Add volcano symbol
                ctx.beginPath();
                ctx.moveTo(x + offsetX, y + offsetY - hexSize/2);
                ctx.lineTo(x + offsetX - hexSize/3, y + offsetY + hexSize/4);
                ctx.lineTo(x + offsetX + hexSize/3, y + offsetY + hexSize/4);
                ctx.closePath();
                ctx.fillStyle = '#922b21';
                ctx.fill();
            }
			// Todo: move this into drawUtil js file
            else if (cell.isWildfire) {
                drawHexagon(x + offsetX, y + offsetY, '#e67e22', '#d35400');
                
                // Add fire symbol (flames)
                const flameHeight = hexSize * 0.6;
                const flameWidth = hexSize * 0.4;
                
                ctx.beginPath();
                ctx.moveTo(x + offsetX - flameWidth/2, y + offsetY + flameHeight/3);
                ctx.quadraticCurveTo(
                    x + offsetX - flameWidth/4, y + offsetY - flameHeight/4,
                    x + offsetX, y + offsetY - flameHeight/2
                );
                ctx.quadraticCurveTo(
                    x + offsetX + flameWidth/4, y + offsetY - flameHeight/4,
                    x + offsetX + flameWidth/2, y + offsetY + flameHeight/3
                );
                ctx.quadraticCurveTo(
                    x + offsetX, y + offsetY,
                    x + offsetX - flameWidth/2, y + offsetY + flameHeight/3
                );
                ctx.fillStyle = '#f39c12';
                ctx.fill();
            } 
			// Todo: move this into drawUtil js file
            else if (cell.isHurricane) {
                drawHexagon(x + offsetX, y + offsetY, '#8e44ad', '#6c3483');
                
                // Draw hurricane spiral
                ctx.beginPath();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                
                const spiralRadius = hexSize * 0.6;
                let angle = 0;
                let radius = spiralRadius * 0.2;
                ctx.moveTo(x + offsetX + radius, y + offsetY);
                
                for (let i = 0; i < 720; i++) {
                    angle += 0.1;
                    radius += 0.08;
                    if (radius > spiralRadius) break;
                    
                    const newX = x + offsetX + radius * Math.cos(angle);
                    const newY = y + offsetY + radius * Math.sin(angle);
                    ctx.lineTo(newX, newY);
                }
                
                ctx.stroke();
            }
            else if (cell.isShippingRoute) {
                drawHexagon(x + offsetX, y + offsetY, '#216694', '#174b6b');
                drawShippingRoute(x + offsetX, y + offsetY, cell.shippingRouteOrientation);
                
                if (cell.isConnected) {
                    //drawHexHighlight(x + offsetX, y + offsetY, 'rgba(255, 255, 255, 0.8)', 3);
                }
            }
            else if (cell.continent === null && !cell.isWater) {
                drawHexagon(x + offsetX, y + offsetY, '#f0f0f0', '#cccccc');
            } 
            else if (cell.isWater) {
                drawHexagon(x + offsetX, y + offsetY, '#3498db', '#2980b9');
            } 
            else if (cell.continent !== null && CONTINENTS[cell.continent]) {
                const continent = CONTINENTS[cell.continent];
                const fillColor = continent.color;
                const strokeColor = colorUtils.darken(fillColor, 20);
                
                drawHexagon(x + offsetX, y + offsetY, fillColor, strokeColor);
            } else {
                drawHexagon(x + offsetX, y + offsetY, '#f0f0f0', '#cccccc');
            }
            
			
            // Highlight selected hex
			// Todo: add sub typing to cell types (static, special, etc.) to about this boolean orgy
            if (selectedHex && selectedHex.q === q && selectedHex.r === r) {
                if (bombSelected || 
                   (shippingRouteSelected && 
                    ((cell.isWater && !cell.isShippingRoute && !cell.isHurricane) || 
                     (cell.continent === null && !cell.isWater && !cell.isVolcano && !cell.isHurricane && !cell.isShippingRoute))) ||
                   (cell.continent === null && !cell.isWater && !cell.isVolcano && !cell.isHurricane && !cell.isShippingRoute) ||
                   // Highlight for unit placement phase
                   (gamePhase === 'unitPlacement' && 
                    cell.continent !== null && !cell.isWater && !cell.isVolcano && !cell.isHurricane && !cell.isWildfire && !cell.isShippingRoute && 
                    (cell.owner === null || cell.owner === currentPlayerIndex) && 
                    players[currentPlayerIndex].unitsToPlace > 0)) {
                    drawHexHighlight(x + offsetX, y + offsetY, '#f39c12');
                }
            }
        }
    }
	
	// Todo: move colors into UI configuration
	if (gamePhase === 'game') {
        for (let q = 0; q < gridWidth; q++) {
            for (let r = 0; r < gridHeight; r++) {
                if (grid[q][r].selectable) {
                    const {x, y} = hexUtils.toPixel(q, r);
                    
                    // Different highlight colors based on phase
                    let highlightColor = '#f39c12'; // Default orange
                    
                    if (gamePhaseStep === 'reinforcement') {
                        highlightColor = '#2ecc71'; // Green for reinforcement
                    } else if (gamePhaseStep === 'attack') {
                        if (!attackMode || (selectedAttacker && selectedAttacker.q === q && selectedAttacker.r === r)) {
                            highlightColor = '#e74c3c'; // Red for attack source
                        } else {
                            highlightColor = '#c0392b'; // Darker red for attack targets
                        }
                    } else if (gamePhaseStep === 'fortify') {
                        if (!moveMode || (movingFromTerritory && movingFromTerritory.q === q && movingFromTerritory.r === r)) {
                            highlightColor = '#3498db'; // Blue for fortify source
                        } else {
                            highlightColor = '#2980b9'; // Darker blue for fortify targets
                        }
                    }
                    
                    drawHexHighlight(x + offsetX, y + offsetY, highlightColor);
                }
            }
        }
    }
    
    // Special highlights for selected territories in game phase
    if (gamePhase === 'game') {
        // Highlight selected attacker
        if (selectedAttacker) {
            const {x, y} = hexUtils.toPixel(selectedAttacker.q, selectedAttacker.r);
            drawHexHighlight(x + offsetX, y + offsetY, '#e74c3c', 4);
        }
        
        // Highlight selected defender
        if (selectedDefender) {
            const {x, y} = hexUtils.toPixel(selectedDefender.q, selectedDefender.r);
            drawHexHighlight(x + offsetX, y + offsetY, '#c0392b', 4);
        }
        
        // Highlight fortify source
        if (movingFromTerritory) {
            const {x, y} = hexUtils.toPixel(movingFromTerritory.q, movingFromTerritory.r);
            drawHexHighlight(x + offsetX, y + offsetY, '#3498db', 4);
        }
        
        // Highlight fortify destination
        if (movingToTerritory) {
            const {x, y} = hexUtils.toPixel(movingToTerritory.q, movingToTerritory.r);
            drawHexHighlight(x + offsetX, y + offsetY, '#2980b9', 4);
        }
    }
    
   // Fourth pass: Draw player ownership and units with improved visibility
	for (let q = 0; q < gridWidth; q++) {
		for (let r = 0; r < gridHeight; r++) {
			if (grid[q][r].owner !== null) {
				const {x, y} = hexUtils.toPixel(q, r);
				const player = players[grid[q][r].owner];
				
				// Draw larger player symbol with unit count inside
				const symbolSize = hexSize * 0.6; // Much larger than before
				
				// Todo: move to drawUtil js file or class interface implementation
				// Draw player symbol circle
				ctx.fillStyle = player.color;
				ctx.strokeStyle = 'white';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(x + offsetX, y + offsetY, symbolSize, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				
				// Add unit count inside the symbol in large text
				if (grid[q][r].units > 0) {
					ctx.fillStyle = colorUtils.isDark(player.color) ? 'white' : 'black';
					ctx.font = `bold ${Math.floor(symbolSize * 0.8)}px Arial`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(grid[q][r].units.toString(), x + offsetX, y + offsetY);
				}
			}
		}
	}
    
    // Highlight placeable territories during unit placement
    if (gamePhase === 'unitPlacement' && players[currentPlayerIndex].unitsToPlace > 0) {
        for (let q = 0; q < gridWidth; q++) {
            for (let r = 0; r < gridHeight; r++) {
                if (grid[q][r].continent !== null && !grid[q][r].isWater && !grid[q][r].isVolcano && 
                    !grid[q][r].isHurricane && !grid[q][r].isWildfire && !grid[q][r].isShippingRoute &&
                    (grid[q][r].owner === null || grid[q][r].owner === currentPlayerIndex)) {
                    
                    if (selectedHex && selectedHex.q === q && selectedHex.r === r) {
                        continue; // Already highlighted the selected hex
                    }
                    
                    const {x, y} = hexUtils.toPixel(q, r);
                    drawHexHighlight(x + offsetX, y + offsetY, players[currentPlayerIndex].color + '40', 2); // 40 adds 25% transparency
                }
            }
        }
    }
}

// Draw a shipping route with boat icon instead of dotted line
// Todo: move to drawUtil js file or tile interface implementation
function drawShippingRoute(x, y, orientation) {
    // Draw a simple boat icon instead of the dotted line
    ctx.save();
    
    // Boat base color
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    // Draw a simple boat shape
    const boatScale = hexSize * 0.9;
    
    // Draw boat hull
    ctx.beginPath();
    ctx.moveTo(x - boatScale * 0.5, y + boatScale * 0.2);
    ctx.lineTo(x + boatScale * 0.5, y + boatScale * 0.2);
    ctx.lineTo(x + boatScale * 0.3, y + boatScale * 0.5);
    ctx.lineTo(x - boatScale * 0.3, y + boatScale * 0.5);
    ctx.closePath();
    ctx.fill();
    
    // Draw sail (triangle)
    ctx.beginPath();
    ctx.moveTo(x, y - boatScale * 0.4);
    ctx.lineTo(x, y + boatScale * 0.2);
    ctx.lineTo(x + boatScale * 0.3, y);
    ctx.closePath();
    ctx.fill();
    
    // Restore context
    ctx.restore();
}

// Draw continent boundaries
// Todo: this doesn't work well at all, turned off for the time being, medium complexity to fix, probably not worth it
function drawContinentBoundaries(offsetX, offsetY) {
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            const cell = grid[q][r];
            if (cell.valid && cell.continent !== null) {
                const neighbors = hexUtils.getNeighbors(q, r);
                
                neighbors.forEach((neighbor, i) => {
                    if (!isValidCoordinate(neighbor.q, neighbor.r)) return;
                    
                    const neighborCell = grid[neighbor.q][neighbor.r];
                    if (neighborCell.continent !== cell.continent || neighborCell.isWater) {
                        const {x, y} = hexUtils.toPixel(q, r);
                        const startAngle = (60 * i) * (Math.PI / 180);
                        const endAngle = (60 * (i + 1)) * (Math.PI / 180);
                        
                        ctx.beginPath();
                        ctx.moveTo(
                            x + offsetX + hexSize * Math.cos(startAngle),
                            y + offsetY + hexSize * Math.sin(startAngle)
                        );
                        ctx.lineTo(
                            x + offsetX + hexSize * Math.cos(endAngle),
                            y + offsetY + hexSize * Math.sin(endAngle)
                        );
                        
                        ctx.lineWidth = 2.5;
                        ctx.strokeStyle = colorUtils.darken(CONTINENTS[cell.continent].color, 30);
                        ctx.stroke();
                    }
                });
            }
        }
    }
}