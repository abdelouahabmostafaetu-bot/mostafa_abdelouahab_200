/**
 * Sudoku App — Game UI & Logic
 */

(function () {
  // ========================================
  // STATE
  // ========================================
  let board = [];        // Current board state (user entries)
  let solution = [];     // Complete solution
  let given = [];        // Boolean grid — which cells are pre-filled
  let notes = [];        // 9x9 array of Sets for pencil marks
  let history = [];      // Undo stack: { row, col, prevVal, prevNotes }
  let selectedCell = null; // { row, col }
  let difficulty = 'easy';
  let errors = 0;
  let maxErrors = 3;
  let timerInterval = null;
  let seconds = 0;
  let notesMode = false;
  let gameActive = false;

  // ========================================
  // DOM REFS
  // ========================================
  const boardEl = document.getElementById('board');
  const timerEl = document.getElementById('timer');
  const errorsEl = document.getElementById('errors');
  const numpadEl = document.getElementById('numpad');
  const newGameBtn = document.getElementById('newGameBtn');
  const undoBtn = document.getElementById('undoBtn');
  const eraseBtn = document.getElementById('eraseBtn');
  const notesBtn = document.getElementById('notesBtn');
  const hintBtn = document.getElementById('hintBtn');
  const winModal = document.getElementById('winModal');
  const winText = document.getElementById('winText');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const gameOverModal = document.getElementById('gameOverModal');
  const tryAgainBtn = document.getElementById('tryAgainBtn');
  const diffBtns = document.querySelectorAll('.diff-btn');

  // ========================================
  // AUDIO (Web Audio API)
  // ========================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSFX(freq = 440, duration = 0.08, type = 'sine') {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playPlace() { playSFX(600, 0.06, 'sine'); }
  function playError() { playSFX(200, 0.15, 'square'); }
  function playWin() {
    playSFX(523, 0.15, 'sine');
    setTimeout(() => playSFX(659, 0.15, 'sine'), 100);
    setTimeout(() => playSFX(784, 0.2, 'sine'), 200);
  }
  function playSelect() { playSFX(800, 0.03, 'sine'); }

  // ========================================
  // TIMER
  // ========================================
  function startTimer() {
    stopTimer();
    seconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      seconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s} seconds`;
    return `${m}m ${s}s`;
  }

  // ========================================
  // BOARD RENDERING
  // ========================================
  function createBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute('role', 'button');
        cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}`);
        cell.addEventListener('click', () => selectCell(r, c));
        boardEl.appendChild(cell);
      }
    }
  }

  function renderBoard() {
    const cells = boardEl.querySelectorAll('.cell');
    const numCounts = Array(10).fill(0);

    cells.forEach(cell => {
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);
      const val = board[r][c];

      // Reset classes
      cell.className = 'cell';
      cell.innerHTML = '';

      if (given[r][c]) {
        cell.classList.add('given');
      }

      // Highlight logic
      if (selectedCell) {
        const sr = selectedCell.row;
        const sc = selectedCell.col;

        if (r === sr && c === sc) {
          cell.classList.add('selected');
        } else if (r === sr || c === sc) {
          cell.classList.add('highlighted');
        } else if (
          Math.floor(r / 3) === Math.floor(sr / 3) &&
          Math.floor(c / 3) === Math.floor(sc / 3)
        ) {
          cell.classList.add('highlighted');
        }

        // Same number highlight
        const selectedVal = board[sr][sc];
        if (selectedVal && val === selectedVal && !(r === sr && c === sc)) {
          cell.classList.add('same-number');
        }
      }

      // Display value or notes
      if (val !== 0) {
        cell.textContent = val;
        numCounts[val]++;

        // Check for errors in user-placed cells
        if (!given[r][c] && val !== solution[r][c]) {
          cell.classList.add('error');
        }
      } else if (notes[r] && notes[r][c] && notes[r][c].size > 0) {
        const grid = document.createElement('div');
        grid.className = 'notes-grid';
        for (let n = 1; n <= 9; n++) {
          const span = document.createElement('span');
          span.textContent = notes[r][c].has(n) ? n : '';
          grid.appendChild(span);
        }
        cell.appendChild(grid);
      }
    });

    // Update number pad — mark completed numbers
    const numBtns = numpadEl.querySelectorAll('.num-btn');
    numBtns.forEach(btn => {
      const num = parseInt(btn.dataset.num);
      btn.classList.toggle('completed', numCounts[num] >= 9);

      // Highlight active number
      const selectedVal = selectedCell ? board[selectedCell.row][selectedCell.col] : 0;
      btn.classList.toggle('active-num', selectedVal === num && selectedVal !== 0);
    });

    // Update errors display
    errorsEl.textContent = `${errors}/${maxErrors}`;
    if (errors >= 2) {
      errorsEl.style.color = 'var(--color-error)';
    } else {
      errorsEl.style.color = '';
    }

    // Update notes button
    notesBtn.classList.toggle('active', notesMode);
  }

  // ========================================
  // CELL SELECTION
  // ========================================
  function selectCell(row, col) {
    initAudio();
    playSelect();
    selectedCell = { row, col };
    renderBoard();
  }

  // ========================================
  // NUMBER INPUT
  // ========================================
  function placeNumber(num) {
    if (!selectedCell || !gameActive) return;

    const { row, col } = selectedCell;
    if (given[row][col]) return;

    initAudio();

    if (notesMode) {
      // Toggle note
      if (board[row][col] !== 0) return; // Can't note on filled cell

      const prevNotes = new Set(notes[row][col]);
      history.push({ row, col, prevVal: 0, prevNotes, type: 'note' });

      if (notes[row][col].has(num)) {
        notes[row][col].delete(num);
      } else {
        notes[row][col].add(num);
      }
      playPlace();
    } else {
      // Place number
      const prevVal = board[row][col];
      const prevNotes = new Set(notes[row][col]);

      if (num === solution[row][col]) {
        // Correct
        history.push({ row, col, prevVal, prevNotes, type: 'place' });
        board[row][col] = num;
        notes[row][col] = new Set();

        // Remove this note from peers
        removeNoteFromPeers(row, col, num);

        playPlace();

        // Pop animation
        const cellEl = getCellEl(row, col);
        if (cellEl) {
          cellEl.classList.add('pop');
          setTimeout(() => cellEl.classList.remove('pop'), 200);
        }

        // Check win
        if (checkWin()) {
          handleWin();
          return;
        }
      } else {
        // Wrong
        errors++;
        history.push({ row, col, prevVal, prevNotes, type: 'place' });
        board[row][col] = num;
        notes[row][col] = new Set();

        playError();

        // Shake animation
        const cellEl = getCellEl(row, col);
        if (cellEl) {
          cellEl.classList.add('shake');
          setTimeout(() => cellEl.classList.remove('shake'), 300);
        }

        if (errors >= maxErrors) {
          handleGameOver();
          return;
        }
      }
    }

    renderBoard();
  }

  function removeNoteFromPeers(row, col, num) {
    // Row & column
    for (let i = 0; i < 9; i++) {
      notes[row][i].delete(num);
      notes[i][col].delete(num);
    }
    // Box
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        notes[r][c].delete(num);
      }
    }
  }

  function getCellEl(row, col) {
    return boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  }

  // ========================================
  // ERASE
  // ========================================
  function eraseCell() {
    if (!selectedCell || !gameActive) return;
    const { row, col } = selectedCell;
    if (given[row][col]) return;

    const prevVal = board[row][col];
    const prevNotes = new Set(notes[row][col]);

    if (prevVal === 0 && prevNotes.size === 0) return;

    history.push({ row, col, prevVal, prevNotes, type: 'erase' });
    board[row][col] = 0;
    notes[row][col] = new Set();

    playPlace();
    renderBoard();
  }

  // ========================================
  // UNDO
  // ========================================
  function undo() {
    if (history.length === 0 || !gameActive) return;

    const action = history.pop();
    board[action.row][action.col] = action.prevVal;
    notes[action.row][action.col] = action.prevNotes;

    // Undo error if it was a wrong placement
    if (action.type === 'place' && action.prevVal !== board[action.row][action.col]) {
      const currentVal = board[action.row][action.col]; // After undo, this is prevVal
      // If the undone value was wrong, decrement errors
      // We need to check if the value we're removing was wrong
    }

    playPlace();
    renderBoard();
  }

  // ========================================
  // HINT
  // ========================================
  function giveHint() {
    if (!gameActive) return;

    // Find empty cell (prefer selected, then random)
    let row, col;

    if (selectedCell && board[selectedCell.row][selectedCell.col] === 0 && !given[selectedCell.row][selectedCell.col]) {
      row = selectedCell.row;
      col = selectedCell.col;
    } else {
      // Find random empty cell
      const empty = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) empty.push([r, c]);
        }
      }
      if (empty.length === 0) return;
      [row, col] = empty[Math.floor(Math.random() * empty.length)];
    }

    initAudio();

    const prevVal = board[row][col];
    const prevNotes = new Set(notes[row][col]);
    history.push({ row, col, prevVal, prevNotes, type: 'hint' });

    board[row][col] = solution[row][col];
    notes[row][col] = new Set();
    given[row][col] = true; // Mark as given so it can't be edited
    removeNoteFromPeers(row, col, solution[row][col]);

    selectedCell = { row, col };
    playPlace();

    const cellEl = getCellEl(row, col);
    if (cellEl) {
      cellEl.classList.add('pop');
      setTimeout(() => cellEl.classList.remove('pop'), 200);
    }

    if (checkWin()) {
      handleWin();
      return;
    }

    renderBoard();
  }

  // ========================================
  // WIN / GAME OVER
  // ========================================
  function checkWin() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }

  function handleWin() {
    gameActive = false;
    stopTimer();
    playWin();

    boardEl.classList.add('win');
    setTimeout(() => boardEl.classList.remove('win'), 500);

    winText.textContent = `Completed in ${formatTime(seconds)} with ${errors} error${errors !== 1 ? 's' : ''}.`;
    setTimeout(() => winModal.classList.add('visible'), 600);

    renderBoard();
  }

  function handleGameOver() {
    gameActive = false;
    stopTimer();
    playError();

    // Reveal solution briefly
    setTimeout(() => {
      gameOverModal.classList.add('visible');
    }, 500);

    renderBoard();
  }

  // ========================================
  // NEW GAME
  // ========================================
  function newGame() {
    initAudio();
    winModal.classList.remove('visible');
    gameOverModal.classList.remove('visible');

    const result = Sudoku.generate(difficulty);
    board = result.puzzle.map(row => [...row]);
    solution = result.solution;
    given = result.puzzle.map(row => row.map(v => v !== 0));
    notes = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set())
    );
    history = [];
    selectedCell = null;
    errors = 0;
    notesMode = false;
    gameActive = true;

    createBoard();
    renderBoard();
    startTimer();
  }

  // ========================================
  // KEYBOARD SUPPORT
  // ========================================
  document.addEventListener('keydown', (e) => {
    if (!gameActive) return;

    const key = e.key;

    // Number keys
    if (key >= '1' && key <= '9') {
      e.preventDefault();
      placeNumber(parseInt(key));
      return;
    }

    // Arrow keys
    if (selectedCell) {
      let { row, col } = selectedCell;
      if (key === 'ArrowUp' && row > 0) { selectCell(row - 1, col); e.preventDefault(); }
      else if (key === 'ArrowDown' && row < 8) { selectCell(row + 1, col); e.preventDefault(); }
      else if (key === 'ArrowLeft' && col > 0) { selectCell(row, col - 1); e.preventDefault(); }
      else if (key === 'ArrowRight' && col < 8) { selectCell(row, col + 1); e.preventDefault(); }
    }

    // Delete/Backspace
    if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault();
      eraseCell();
    }

    // N for notes toggle
    if (key === 'n' || key === 'N') {
      notesMode = !notesMode;
      renderBoard();
    }

    // Z for undo
    if ((key === 'z' || key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    }
  });

  // ========================================
  // EVENT LISTENERS
  // ========================================

  // Number pad
  numpadEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.num-btn');
    if (!btn) return;
    placeNumber(parseInt(btn.dataset.num));
  });

  // Action buttons
  undoBtn.addEventListener('click', undo);
  eraseBtn.addEventListener('click', eraseCell);
  notesBtn.addEventListener('click', () => {
    notesMode = !notesMode;
    renderBoard();
  });
  hintBtn.addEventListener('click', giveHint);

  // Difficulty
  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.diff;
      newGame();
    });
  });

  // New game
  newGameBtn.addEventListener('click', newGame);
  playAgainBtn.addEventListener('click', newGame);
  tryAgainBtn.addEventListener('click', newGame);

  // Close modals on overlay click
  winModal.addEventListener('click', (e) => {
    if (e.target === winModal) winModal.classList.remove('visible');
  });
  gameOverModal.addEventListener('click', (e) => {
    if (e.target === gameOverModal) gameOverModal.classList.remove('visible');
  });

  // ========================================
  // THEME TOGGLE
  // ========================================
  (function () {
    const t = document.querySelector('[data-theme-toggle]');
    const r = document.documentElement;
    let d = 'dark'; // Default to dark theme per user preference
    r.setAttribute('data-theme', d);
    if (t) {
      updateThemeIcon(t, d);
      t.addEventListener('click', () => {
        d = d === 'dark' ? 'light' : 'dark';
        r.setAttribute('data-theme', d);
        t.setAttribute('aria-label', 'Switch to ' + (d === 'dark' ? 'light' : 'dark') + ' mode');
        updateThemeIcon(t, d);
      });
    }
    function updateThemeIcon(el, theme) {
      el.innerHTML = theme === 'dark'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  })();

  // ========================================
  // PREVENT ZOOM ON DOUBLE TAP
  // ========================================
  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      e.preventDefault();
    }
    lastTap = now;
  }, { passive: false });

  // ========================================
  // INIT
  // ========================================
  newGame();

})();
