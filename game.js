// Telegram Web App initialization
const tg = window.Telegram.WebApp;
tg.expand();

// Game constants
const SYMBOLS = ['⚡', '👑', '⌛', '💍', '📜', '🏆', '💎', '💚'];
const SYMBOL_VALUES = {
    '⚡': 50,   // Zeus
    '👑': 25,   // Crown
    '⌛': 15,   // Hourglass
    '💍': 10,   // Ring
    '📜': 8,    // Scroll
    '🏆': 5,    // Chalice
    '💎': 3,    // Blue Gem
    '💚': 2     // Green Gem
};

const REEL_COUNT = 6;
const VISIBLE_SYMBOLS = 3;

// Game state
let balance = 1000;
let currentBet = 10;
let currentMultiplier = 1;
let isSpinning = false;
let reels = [];

// DOM elements
const balanceEl = document.getElementById('balance');
const currentBetEl = document.getElementById('currentBet');
const winAmountEl = document.getElementById('winAmount');
const multiplierEl = document.getElementById('multiplier');
const spinBtn = document.getElementById('spinBtn');
const reelsContainer = document.getElementById('reelsContainer');

// Initialize game
function initGame() {
    updateBalance();
    updateBet();
    createReels();
    setupEventListeners();
}

// Create reel elements
function createReels() {
    for (let i = 0; i < REEL_COUNT; i++) {
        const reel = document.getElementById(`reel${i + 1}`);
        if (reel) {
            const symbols = generateReelSymbols(VISIBLE_SYMBOLS);
            reels[i] = symbols;
            updateReelDisplay(reel, symbols);
        }
    }
}

// Generate random symbols for a reel
function generateReelSymbols(count) {
    const symbols = [];
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * SYMBOLS.length);
        symbols.push(SYMBOLS[randomIndex]);
    }
    return symbols;
}

// Update reel display
function updateReelDisplay(reel, symbols) {
    reel.innerHTML = '';
    symbols.forEach(symbol => {
        const symbolDiv = document.createElement('div');
        symbolDiv.className = 'symbol';
        symbolDiv.textContent = symbol;
        reel.appendChild(symbolDiv);
    });
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
    balanceEl.textContent = balance;
}

// Spin the reels
async function spin() {
    if (isSpinning || currentBet > balance) return;
    
    // Deduct bet
    balance -= currentBet;
    updateBalance();
    
    isSpinning = true;
    spinBtn.disabled = true;
    winAmountEl.textContent = '0';
    
    // Add spinning animation
    document.querySelectorAll('.reel').forEach(reel => {
        reel.classList.add('spinning');
    });
    
    // Random multiplier between 1x and 100x
    const multiplier = Math.floor(Math.random() * 100) + 1;
    currentMultiplier = multiplier;
    multiplierEl.textContent = `${multiplier}x`;
    
    // Spin each reel with delay
    const spinPromises = [];
    for (let i = 0; i < REEL_COUNT; i++) {
        spinPromises.push(spinReel(i, i * 200));
    }
    
    // Wait for all reels to stop
    await Promise.all(spinPromises);
    
    // Remove spinning animation
    document.querySelectorAll('.reel').forEach(reel => {
        reel.classList.remove('spinning');
    });
    
    // Calculate winnings
    calculateWinnings();
    
    isSpinning = false;
    spinBtn.disabled = false;
}

// Spin individual reel
function spinReel(reelIndex, delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            const reel = document.getElementById(`reel${reelIndex + 1}`);
            const newSymbols = generateReelSymbols(VISIBLE_SYMBOLS);
            reels[reelIndex] = newSymbols;
            updateReelDisplay(reel, newSymbols);
            resolve();
        }, delay);
    });
}

// Calculate winnings
function calculateWinnings() {
    let totalWin = 0;
    let winningPositions = [];
    
    // Check for winning combinations (simplified - check all symbols in first reel)
    for (let row = 0; row < VISIBLE_SYMBOLS; row++) {
        const firstSymbol = reels[0][row];
        let matchCount = 1;
        
        // Check consecutive reels for matching symbols
        for (let reel = 1; reel < REEL_COUNT; reel++) {
            if (reels[reel][row] === firstSymbol) {
                matchCount++;
            } else {
                break;
            }
        }
        
        // Calculate win if at least 3 matching symbols
        if (matchCount >= 3) {
            const symbolValue = SYMBOL_VALUES[firstSymbol] || 1;
            const win = currentBet * symbolValue * (matchCount - 2) * (currentMultiplier / 10);
            totalWin += win;
            
            // Mark winning positions
            for (let reel = 0; reel < matchCount; reel++) {
                winningPositions.push({ reel, row });
            }
        }
    }
    
    // Highlight winning symbols
    highlightWinningSymbols(winningPositions);
    
    // Add win to balance
    if (totalWin > 0) {
        balance += Math.floor(totalWin);
        winAmountEl.textContent = Math.floor(totalWin);
        
        // Show win animation
        document.querySelector('.slot-machine').classList.add('win-highlight');
        setTimeout(() => {
            document.querySelector('.slot-machine').classList.remove('win-highlight');
        }, 500);
    }
    
    updateBalance();
    
    // Check if balance is too low
    if (balance < currentBet) {
        currentBet = Math.max(10, Math.floor(balance / 10) * 10);
        updateBet();
    }
}

// Highlight winning symbols
function highlightWinningSymbols(positions) {
    // Reset all symbols
    document.querySelectorAll('.symbol').forEach(symbol => {
        symbol.style.textShadow = 'none';
        symbol.style.transform = 'none';
    });
    
    // Highlight winning symbols
    positions.forEach(({ reel, row }) => {
        const reelElement = document.getElementById(`reel${reel + 1}`);
        if (reelElement && reelElement.children[row]) {
            reelElement.children[row].style.textShadow = '0 0 20px #ffd700, 0 0 40px #ffa500';
            reelElement.children[row].style.transform = 'scale(1.2)';
        }
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

// Add some demo spins on load for visual effect
setTimeout(() => {
    if (!isSpinning) {
        spin();
    }
}, 1000);
