// Game configuration
const config = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
};

// Game state
let gameState = {
    board: [],
    revealed: [],
    flagged: [],
    mines: 0,
    gameOver: false,
    firstClick: true,
    timer: null,
    time: 0,
    difficulty: 'easy',
    rows: 9,
    cols: 9
};

// DOM elements
const boardElement = document.getElementById('board');
const minesCountElement = document.getElementById('mines-count');
const flagsCountElement = document.getElementById('flags-count');
const timeElement = document.getElementById('time');
const gameOverElement = document.getElementById('game-over');
const gameOverMessageElement = document.getElementById('game-over-message');
const playAgainButton = document.getElementById('play-again');
const newGameButton = document.getElementById('new-game');
const easyButton = document.getElementById('easy');
const mediumButton = document.getElementById('medium');
const hardButton = document.getElementById('hard');

// Initialize the game
function initGame() {
    // Clear previous game
    clearInterval(gameState.timer);
    gameState = {
        board: [],
        revealed: [],
        flagged: [],
        mines: config[gameState.difficulty].mines,
        gameOver: false,
        firstClick: true,
        timer: null,
        time: 0,
        difficulty: gameState.difficulty,
        rows: config[gameState.difficulty].rows,
        cols: config[gameState.difficulty].cols
    };

    // Update UI
    minesCountElement.textContent = gameState.mines;
    flagsCountElement.textContent = 0;
    timeElement.textContent = 0;
    gameOverElement.classList.add('hidden');

    // Create empty board
    boardElement.style.setProperty('--cols', gameState.cols);
    boardElement.innerHTML = '';

    // Initialize game state arrays
    for (let i = 0; i < gameState.rows; i++) {
        gameState.board[i] = [];
        gameState.revealed[i] = [];
        gameState.flagged[i] = [];
        for (let j = 0; j < gameState.cols; j++) {
            gameState.board[i][j] = 0;
            gameState.revealed[i][j] = false;
            gameState.flagged[i][j] = false;

            // Create cell element
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-label', `Cell at row ${i+1}, column ${j+1}, not revealed`);
            cell.tabIndex = 0;

            // Add event listeners
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('contextmenu', handleCellRightClick);
            cell.addEventListener('touchstart', handleTouchStart, { passive: false });
            cell.addEventListener('touchend', handleTouchEnd, { passive: false });
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleCellClick(e);
                if (e.key === ' ') handleCellRightClick(e);
            });

            boardElement.appendChild(cell);
        }
    }
}

// Place mines on the board (after first click to ensure safe start)
function placeMines(firstRow, firstCol) {
    let minesPlaced = 0;
    
    while (minesPlaced < gameState.mines) {
        const row = Math.floor(Math.random() * gameState.rows);
        const col = Math.floor(Math.random() * gameState.cols);
        
        // Don't place mine on first click cell or adjacent cells
        const isFirstClickArea = Math.abs(row - firstRow) <= 1 && Math.abs(col - firstCol) <= 1;
        
        if (!isFirstClickArea && gameState.board[row][col] !== -1) {
            gameState.board[row][col] = -1; // -1 represents a mine
            minesPlaced++;
            
            // Update adjacent cells
            for (let i = Math.max(0, row - 1); i <= Math.min(gameState.rows - 1, row + 1); i++) {
                for (let j = Math.max(0, col - 1); j <= Math.min(gameState.cols - 1, col + 1); j++) {
                    if (gameState.board[i][j] !== -1) {
                        gameState.board[i][j]++;
                    }
                }
            }
        }
    }
}

// Handle cell click
function handleCellClick(e) {
    e.preventDefault();
    const row = parseInt(e.currentTarget.dataset.row);
    const col = parseInt(e.currentTarget.dataset.col);
    
    if (gameState.gameOver || gameState.flagged[row][col]) return;
    
    // First click - place mines and start timer
    if (gameState.firstClick) {
        gameState.firstClick = false;
        placeMines(row, col);
        startTimer();
    }
    
    revealCell(row, col);
    updateBoard();
    checkGameStatus();
}

// Handle right click (flag)
function handleCellRightClick(e) {
    e.preventDefault();
    if (gameState.gameOver || gameState.firstClick) return;
    
    const row = parseInt(e.currentTarget.dataset.row);
    const col = parseInt(e.currentTarget.dataset.col);
    
    if (!gameState.revealed[row][col]) {
        gameState.flagged[row][col] = !gameState.flagged[row][col];
        updateFlagsCount();
        updateBoard();
    }
}

// Touch handling for mobile devices
let touchStartTime;
function handleTouchStart(e) {
    touchStartTime = Date.now();
}

function handleTouchEnd(e) {
    e.preventDefault();
    const touchDuration = Date.now() - touchStartTime;
    const row = parseInt(e.currentTarget.dataset.row);
    const col = parseInt(e.currentTarget.dataset.col);
    
    if (touchDuration > 300) { // Long press for flag
        handleCellRightClick(e);
    } else { // Short press for reveal
        handleCellClick(e);
    }
}

// Reveal a cell and adjacent cells if empty
function revealCell(row, col) {
    if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols || 
        gameState.revealed[row][col] || gameState.flagged[row][col]) {
        return;
    }
    
    gameState.revealed[row][col] = true;
    
    // If it's a mine, game over
    if (gameState.board[row][col] === -1) {
        gameState.gameOver = true;
        revealAllMines();
        return;
    }
    
    // If it's an empty cell, reveal adjacent cells
    if (gameState.board[row][col] === 0) {
        for (let i = Math.max(0, row - 1); i <= Math.min(gameState.rows - 1, row + 1); i++) {
            for (let j = Math.max(0, col - 1); j <= Math.min(gameState.cols - 1, col + 1); j++) {
                if (!(i === row && j === col)) {
                    revealCell(i, j);
                }
            }
        }
    }
}

// Reveal all mines when game is lost
function revealAllMines() {
    for (let i = 0; i < gameState.rows; i++) {
        for (let j = 0; j < gameState.cols; j++) {
            if (gameState.board[i][j] === -1) {
                gameState.revealed[i][j] = true;
            }
        }
    }
}

// Update the board UI
function updateBoard() {
    const cells = boardElement.querySelectorAll('.cell');
    
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        cell.className = 'cell';
        
        if (gameState.revealed[row][col]) {
            cell.classList.add('revealed');
            
            if (gameState.board[row][col] === -1) {
                cell.classList.add('mine');
                cell.setAttribute('aria-label', `Mine at row ${row+1}, column ${col+1}`);
            } else if (gameState.board[row][col] > 0) {
                cell.classList.add(`cell-${gameState.board[row][col]}`);
                cell.textContent = gameState.board[row][col];
                cell.setAttribute('aria-label', `Number ${gameState.board[row][col]} at row ${row+1}, column ${col+1}`);
            } else {
                cell.setAttribute('aria-label', `Empty cell at row ${row+1}, column ${col+1}`);
            }
        } else if (gameState.flagged[row][col]) {
            cell.classList.add('flagged');
            cell.setAttribute('aria-label', `Flagged cell at row ${row+1}, column ${col+1}`);
        } else {
            cell.setAttribute('aria-label', `Hidden cell at row ${row+1}, column ${col+1}`);
        }
    });
}

// Update flags count display
function updateFlagsCount() {
    let flagCount = 0;
    
    for (let i = 0; i < gameState.rows; i++) {
        for (let j = 0; j < gameState.cols; j++) {
            if (gameState.flagged[i][j]) {
                flagCount++;
            }
        }
    }
    
    flagsCountElement.textContent = flagCount;
}

// Start the game timer
function startTimer() {
    clearInterval(gameState.timer);
    gameState.time = 0;
    timeElement.textContent = gameState.time;
    
    gameState.timer = setInterval(() => {
        gameState.time++;
        timeElement.textContent = gameState.time;
    }, 1000);
}

// Check if the game is won or lost
function checkGameStatus() {
    if (gameState.gameOver) {
        endGame(false);
        return;
    }
    
    // Check if all non-mine cells are revealed
    let allRevealed = true;
    
    for (let i = 0; i < gameState.rows; i++) {
        for (let j = 0; j < gameState.cols; j++) {
            if (gameState.board[i][j] !== -1 && !gameState.revealed[i][j]) {
                allRevealed = false;
                break;
            }
        }
        if (!allRevealed) break;
    }
    
    if (allRevealed) {
        endGame(true);
    }
}

// End the game (win or lose)
function endGame(isWin) {
    gameState.gameOver = true;
    clearInterval(gameState.timer);
    
    if (isWin) {
        gameOverMessageElement.textContent = 'You Win!';
    } else {
        gameOverMessageElement.textContent = 'Game Over!';
    }
    
    gameOverElement.classList.remove('hidden');
}

// Event listeners for buttons
playAgainButton.addEventListener('click', initGame);
newGameButton.addEventListener('click', initGame);

easyButton.addEventListener('click', () => {
    gameState.difficulty = 'easy';
    easyButton.classList.add('active');
    mediumButton.classList.remove('active');
    hardButton.classList.remove('active');
    initGame();
});

mediumButton.addEventListener('click', () => {
    gameState.difficulty = 'medium';
    easyButton.classList.remove('active');
    mediumButton.classList.add('active');
    hardButton.classList.remove('active');
    initGame();
});

hardButton.addEventListener('click', () => {
    gameState.difficulty = 'hard';
    easyButton.classList.remove('active');
    mediumButton.classList.remove('active');
    hardButton.classList.add('active');
    initGame();
});

// Start the game
initGame();
