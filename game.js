// Telegram Web App initialization
const tg = window.Telegram.WebApp;
tg.expand();

// Game constants
const ROWS = 6;
const COLS = 5;
const SYMBOL_SIZE = 80;
const SYMBOLS = {
    'ZEUS': { char: '⚡', value: 50, color: '#FFD700', name: 'Zeus' },
    'CROWN': { char: '👑', value: 25, color: '#FFA500', name: 'Crown' },
    'HOURGLASS': { char: '⌛', value: 15, color: '#00FF00', name: 'Hourglass' },
    'RING': { char: '💍', value: 10, color: '#FF69B4', name: 'Ring' },
    'SCROLL': { char: '📜', value: 8, color: '#FF4500', name: 'Scroll' },
    'CHALICE': { char: '🏆', value: 5, color: '#9370DB', name: 'Chalice' },
    'BLUE_GEM': { char: '💎', value: 3, color: '#00FFFF', name: 'Blue Gem' },
    'GREEN_GEM': { char: '💚', value: 2, color: '#00FF00', name: 'Green Gem' }
};

const SYMBOL_KEYS = Object.keys(SYMBOLS);

// Game state
let balance = 1000;
let currentBet = 10;
let currentMultiplier = 1;
let isSpinning = false;
let isTumbling = false;
let grid = [];
let winAmount = 0;
let winningCells = [];
let animationFrame = null;
let particles = [];

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// DOM elements
const balanceEl = document.getElementById('balance');
const currentBetEl = document.getElementById('currentBet');
const winAmountEl = document.getElementById('winAmount');
const multiplierEl = document.getElementById('multiplier');
const spinBtn = document.getElementById('spinBtn');
const paytableGrid = document.getElementById('paytableGrid');

// Calculate grid position
const gridX = (canvas.width - (COLS * SYMBOL_SIZE)) / 2;
const gridY = (canvas.height - (ROWS * SYMBOL_SIZE)) / 2 + 30;

// Particle class for explosion effect
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 5;
        this.color = color;
        this.size = Math.random() * 10 + 5;
        this.life = 1;
        this.decay = 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3; // gravity
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Initialize game
function initGame() {
    createPaytable();
    initGrid();
    updateBalance();
    updateBet();
    setupEventListeners();
    draw();
}

// Create paytable grid
function createPaytable() {
    SYMBOL_KEYS.forEach(key => {
        const symbol = SYMBOLS[key];
        const item = document.createElement('div');
        item.className = 'symbol-item';
        item.innerHTML = `
            <div class="symbol-canvas" style="display: flex; align-items: center; justify-content: center; font-size: 24px; color: ${symbol.color};">${symbol.char}</div>
            <span>${symbol.name} - ${symbol.value}x</span>
        `;
        paytableGrid.appendChild(item);
    });
}

// Initialize grid with random symbols
function initGrid() {
    grid = [];
    for (let row = 0; row < ROWS; row++) {
        grid[row] = [];
        for (let col = 0; col < COLS; col++) {
            grid[row][col] = getRandomSymbol();
        }
    }
}

// Get random symbol key
function getRandomSymbol() {
    return SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('decreaseBet').addEventListener('click', decreaseBet);
    document.getElementById('increaseBet').addEventListener('click', increaseBet);
    spinBtn.addEventListener('click', spin);
}

// Decrease bet
function decreaseBet() {
    if (!isSpinning && currentBet > 10) {
        currentBet -= 10;
        updateBet();
    }
}

// Increase bet
function increaseBet() {
    if (!isSpinning && currentBet < balance) {
        currentBet += 10;
        updateBet();
    }
}

// Update bet display
function updateBet() {
    currentBetEl.textContent = currentBet;
}

// Update balance display
function updateBalance() {
    balanceEl.textContent = Math.floor(balance);
}

// Main spin function
async function spin() {
    if (isSpinning || currentBet > balance) return;
    
    // Deduct bet
    balance -= currentBet;
    updateBalance();
    
    isSpinning = true;
    spinBtn.disabled = true;
    winAmountEl.textContent = '0';
    winAmount = 0;
    winningCells = [];
    
    // Random multiplier between 1x and 100x
    currentMultiplier = Math.floor(Math.random() * 100) + 1;
    multiplierEl.textContent = `${currentMultiplier}x`;
    
    // Initial spin animation
    await animateSpin();
    
    // Start tumble sequence
    await tumbleSequence();
    
    isSpinning = false;
    spinBtn.disabled = false;
}

// Animate initial spin
function animateSpin() {
    return new Promise(resolve => {
        let spinFrames = 0;
        const maxFrames = 30;
        
        function spinAnimation() {
            if (spinFrames < maxFrames) {
                // Randomize grid for spin effect
                for (let row = 0; row < ROWS; row++) {
                    for (let col = 0; col < COLS; col++) {
                        if (Math.random() > 0.7) {
                            grid[row][col] = getRandomSymbol();
                        }
                    }
                }
                draw();
                spinFrames++;
                animationFrame = requestAnimationFrame(spinAnimation);
            } else {
                // Final random grid
                initGrid();
                draw();
                cancelAnimationFrame(animationFrame);
                resolve();
            }
        }
        
        spinAnimation();
    });
}

// Tumble sequence
async function tumbleSequence() {
    let hasWins = true;
    let tumbleCount = 0;
    
    while (hasWins && tumbleCount < 20) { // Prevent infinite loops
        hasWins = false;
        
        // Check for wins
        const wins = checkWins();
        
        if (wins.length > 0) {
            hasWins = true;
            winningCells = wins;
            
            // Calculate win amount
            const winValue = calculateWinValue(wins);
            winAmount += winValue;
            winAmountEl.textContent = Math.floor(winAmount);
            
            // Explosion animation
            await explodeWinningCells(wins);
            
            // Tumble - drop new symbols
            await tumbleSymbols();
            
            // Redraw grid
            draw();
            
            // Small delay between tumbles
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        tumbleCount++;
    }
    
    // Add total win to balance
    if (winAmount > 0) {
        balance += Math.floor(winAmount * (currentMultiplier / 10));
        updateBalance();
        
        // Show win celebration
        await celebrateWin();
    }
}

// Check for winning combinations
function checkWins() {
    const wins = [];
    
    // Check horizontal lines
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS - 2; col++) {
            const symbol = grid[row][col];
            if (grid[row][col + 1] === symbol && grid[row][col + 2] === symbol) {
                // Found 3 in a row
                wins.push({ row, col });
                wins.push({ row, col: col + 1 });
                wins.push({ row, col: col + 2 });
                
                // Check for 4th and 5th
                if (col + 3 < COLS && grid[row][col + 3] === symbol) {
                    wins.push({ row, col: col + 3 });
                    if (col + 4 < COLS && grid[row][col + 4] === symbol) {
                        wins.push({ row, col: col + 4 });
                    }
                }
            }
        }
    }
    
    // Remove duplicates
    return [...new Map(wins.map(item => [JSON.stringify(item), item])).values()];
}

// Calculate win value
function calculateWinValue(wins) {
    if (wins.length === 0) return 0;
    
    // Group wins by symbol
    const symbolGroups = {};
    wins.forEach(cell => {
        const symbol = grid[cell.row][cell.col];
        if (!symbolGroups[symbol]) {
            symbolGroups[symbol] = [];
        }
        symbolGroups[symbol].push(cell);
    });
    
    let total = 0;
    Object.keys(symbolGroups).forEach(symbol => {
        const count = symbolGroups[symbol].length;
        const symbolValue = SYMBOLS[symbol].value;
        total += currentBet * symbolValue * (count - 2);
    });
    
    return total;
}

// Explode winning cells with particles
function explodeWinningCells(cells) {
    return new Promise(resolve => {
        particles = [];
        
        cells.forEach(cell => {
            const x = gridX + cell.col * SYMBOL_SIZE + SYMBOL_SIZE / 2;
            const y = gridY + cell.row * SYMBOL_SIZE + SYMBOL_SIZE / 2;
            const symbol = SYMBOLS[grid[cell.row][cell.col]];
            
            // Create particles
            for (let i = 0; i < 15; i++) {
                particles.push(new Particle(x, y, symbol.color));
            }
            
            // Remove winning cell
            grid[cell.row][cell.col] = null;
        });
        
        let frames = 0;
        function animateExplosion() {
            if (frames < 60 && particles.length > 0) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                draw(); // Draw remaining grid
                
                // Update and draw particles
                particles = particles.filter(p => p.update());
                particles.forEach(p => p.draw(ctx));
                
                frames++;
                animationFrame = requestAnimationFrame(animateExplosion);
            } else {
                particles = [];
                cancelAnimationFrame(animationFrame);
                resolve();
            }
        }
        
        animateExplosion();
    });
}

// Tumble symbols - drop new ones from top
function tumbleSymbols() {
    return new Promise(resolve => {
        // Drop existing symbols down
        for (let col = 0; col < COLS; col++) {
            let writeRow = ROWS - 1;
            for (let row = ROWS - 1; row >= 0; row--) {
                if (grid[row][col] !== null) {
                    if (writeRow !== row) {
                        grid[writeRow][col] = grid[row][col];
                        grid[row][col] = null;
                    }
                    writeRow--;
                }
            }
            
            // Fill empty cells at top with new symbols
            for (let row = 0; row <= writeRow; row++) {
                grid[row][col] = getRandomSymbol();
            }
        }
        
        // Animate the tumble
        let tumbleOffset = 0;
        const tumbleFrames = 20;
        
        function animateTumble() {
            if (tumbleOffset < tumbleFrames) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw grid with falling animation
                for (let row = 0; row < ROWS; row++) {
                    for (let col = 0; col < COLS; col++) {
                        if (grid[row][col]) {
                            const x = gridX + col * SYMBOL_SIZE;
                            let y = gridY + row * SYMBOL_SIZE;
                            
                            // Add falling effect for new symbols
                            if (row <= 2 && grid[row][col] && tumbleOffset < tumbleFrames) {
                                const progress = tumbleOffset / tumbleFrames;
                                y -= (1 - progress) * SYMBOL_SIZE * 2;
                            }
                            
                            drawSymbol(grid[row][col], x, y);
                        }
                    }
                }
                
                tumbleOffset++;
                animationFrame = requestAnimationFrame(animateTumble);
            } else {
                cancelAnimationFrame(animationFrame);
                draw(); // Final draw
                resolve();
            }
        }
        
        animateTumble();
    });
}

// Draw symbol with effects
function drawSymbol(symbolKey, x, y, isWinning = false) {
    const symbol = SYMBOLS[symbolKey];
    
    // Symbol background
    ctx.shadowColor = symbol.color;
    ctx.shadowBlur = isWinning ? 30 : 20;
    
    // Gradient background
    const gradient = ctx.createRadialGradient(x + 40, y + 40, 10, x + 40, y + 40, 50);
    gradient.addColorStop(0, symbol.color);
    gradient.addColorStop(0.7, '#2a2a3a');
    gradient.addColorStop(1, '#1a1a2a');
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = symbol.color;
    ctx.lineWidth = isWinning ? 4 : 3;
    
    // Draw rounded rectangle
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 5, SYMBOL_SIZE - 10, SYMBOL_SIZE - 10, 15);
    ctx.fill();
    ctx.stroke();
    
    // Draw symbol character
    ctx.shadowBlur = 20;
    ctx.font = `bold ${SYMBOL_SIZE / 2}px Arial`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol.char, x + SYMBOL_SIZE / 2, y + SYMBOL_SIZE / 2);
    
    // Reset shadow
    ctx.shadowBlur = 0;
}

// Canvas utility function for rounded rectangles
CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
};

// Draw entire game
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const x = gridX + col * SYMBOL_SIZE;
            const y = gridY + row * SYMBOL_SIZE;
            
            // Draw cell background
            ctx.fillStyle = 'rgba(42, 26, 58, 0.7)';
            ctx.beginPath();
            ctx.roundRect(x, y, SYMBOL_SIZE, SYMBOL_SIZE, 10);
            ctx.fill();
            ctx.stroke();
            
            // Draw symbol if exists
            if (grid[row] && grid[row][col]) {
                const isWinning = winningCells.some(cell => cell.row === row && cell.col === col);
                drawSymbol(grid[row][col], x, y, isWinning);
            }
        }
    }
    
    // Draw particles
    particles.forEach(p => p.draw(ctx));
}

// Celebrate win animation
function celebrateWin() {
    return new Promise(resolve => {
        let flashCount = 0;
        
        function flash() {
            if (flashCount < 6) {
                ctx.fillStyle = `rgba(255, 215, 0, ${flashCount % 2 === 0 ? 0.3 : 0})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                flashCount++;
                animationFrame = requestAnimationFrame(flash);
            } else {
                cancelAnimationFrame(animationFrame);
                draw();
                resolve();
            }
        }
        
        flash();
    });
}

// Initialize Telegram Mini App
tg.ready();
tg.MainButton.setText('Play Gates of Olympus');
tg.MainButton.show();

// Handle main button click
tg.onEvent('mainButtonClicked', () => {
    spin();
});

// Start the game
initGame();

// Auto-play demo on load
setTimeout(() => {
    if (!isSpinning) {
        spin();
    }
}, 1000);
