/**
 * Sudoku Generator & Solver
 * Generates valid puzzles with unique solutions
 */

const Sudoku = (() => {
  // Fisher-Yates shuffle
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Check if placing num at (row, col) is valid
  function isValid(board, row, col, num) {
    // Row
    for (let c = 0; c < 9; c++) {
      if (board[row][c] === num) return false;
    }
    // Column
    for (let r = 0; r < 9; r++) {
      if (board[r][col] === num) return false;
    }
    // 3x3 box
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (board[r][c] === num) return false;
      }
    }
    return true;
  }

  // Solve board using backtracking (returns true if solvable)
  function solve(board) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (isValid(board, r, c, num)) {
              board[r][c] = num;
              if (solve(board)) return true;
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  // Count solutions (stop at 2 for efficiency)
  function countSolutions(board, limit = 2) {
    let count = 0;
    function _solve() {
      if (count >= limit) return;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (isValid(board, r, c, num)) {
                board[r][c] = num;
                _solve();
                board[r][c] = 0;
                if (count >= limit) return;
              }
            }
            return;
          }
        }
      }
      count++;
    }
    _solve();
    return count;
  }

  // Generate a complete valid board
  function generateFull() {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    solve(board);
    return board;
  }

  // Deep copy a board
  function copyBoard(board) {
    return board.map(row => [...row]);
  }

  // Generate puzzle by removing cells from complete board
  function generate(difficulty = 'easy') {
    const clueCount = {
      easy: 38,     // 38 clues → 43 to remove
      medium: 30,   // 30 clues → 51 to remove
      hard: 24      // 24 clues → 57 to remove
    };

    const target = clueCount[difficulty] || 38;
    const solution = generateFull();
    const puzzle = copyBoard(solution);

    // Create list of all cells in random order
    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells.push([r, c]);
      }
    }
    const shuffledCells = shuffle(cells);

    let removed = 0;
    const toRemove = 81 - target;

    for (const [r, c] of shuffledCells) {
      if (removed >= toRemove) break;

      const val = puzzle[r][c];
      puzzle[r][c] = 0;

      // Check unique solution
      const testBoard = copyBoard(puzzle);
      if (countSolutions(testBoard) !== 1) {
        puzzle[r][c] = val; // Put it back
      } else {
        removed++;
      }
    }

    return { puzzle, solution };
  }

  return { generate, isValid, solve, copyBoard };
})();
