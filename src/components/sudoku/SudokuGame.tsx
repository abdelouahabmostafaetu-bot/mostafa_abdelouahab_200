'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Eraser, Trophy } from 'lucide-react';

type Mode = 'hard' | 'master';
type CellPosition = [number, number];

type PersistedSudokuState = {
  version: 1;
  mode: Mode;
  initialBoard: number[][];
  board: number[][];
  selectedCell: CellPosition | null;
  isWon: boolean;
  elapsedSeconds: number;
  hintUsed?: boolean;
};

interface SudokuStateStorage {
  load(): Promise<PersistedSudokuState | null>;
  save(state: PersistedSudokuState): Promise<void>;
  clear(): Promise<void>;
}

type ModeConfig = {
  label: string;
  size: number;
  subgrid: number;
  empties: number;
  description: string;
  symbols: string[];
};

const MODE_CONFIG: Record<Mode, ModeConfig> = {
  hard: {
    label: 'Hard 9x9',
    size: 9,
    subgrid: 3,
    empties: 58,
    description: 'Standard 9x9 hard board.',
    symbols: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  },
  master: {
    label: 'Master 16x16',
    size: 16,
    subgrid: 4,
    empties: 190,
    description: 'Extended 16x16 master board.',
    symbols: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
  },
};

const STORAGE_KEY = 'sudoku-state-v1';

const isMode = (value: unknown): value is Mode =>
  value === 'hard' || value === 'master';

const isValidBoard = (value: unknown, size: number): value is number[][] => {
  if (!Array.isArray(value) || value.length !== size) return false;

  return value.every((row) => {
    if (!Array.isArray(row) || row.length !== size) return false;
    return row.every(
      (cell) =>
        typeof cell === 'number' &&
        Number.isInteger(cell) &&
        cell >= 0 &&
        cell <= size
    );
  });
};

const isValidSelectedCell = (
  value: unknown,
  size: number
): value is CellPosition | null => {
  if (value === null) return true;
  if (!Array.isArray(value) || value.length !== 2) return false;

  const [row, col] = value;
  return (
    typeof row === 'number' &&
    Number.isInteger(row) &&
    row >= 0 &&
    row < size &&
    typeof col === 'number' &&
    Number.isInteger(col) &&
    col >= 0 &&
    col < size
  );
};

const parsePersistedState = (raw: string): PersistedSudokuState | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedSudokuState>;
    if (parsed.version !== 1 || !isMode(parsed.mode)) return null;

    const size = MODE_CONFIG[parsed.mode].size;
    if (!isValidBoard(parsed.initialBoard, size) || !isValidBoard(parsed.board, size)) {
      return null;
    }
    if (!isValidSelectedCell(parsed.selectedCell, size)) return null;
    if (typeof parsed.isWon !== 'boolean') return null;
    if (
      typeof parsed.elapsedSeconds !== 'number' ||
      !Number.isFinite(parsed.elapsedSeconds) ||
      parsed.elapsedSeconds < 0
    ) {
      return null;
    }

    return {
      version: 1,
      mode: parsed.mode,
      initialBoard: parsed.initialBoard,
      board: parsed.board,
      selectedCell: parsed.selectedCell,
      isWon: parsed.isWon,
      elapsedSeconds: Math.floor(parsed.elapsedSeconds),
      hintUsed: typeof parsed.hintUsed === 'boolean' ? parsed.hintUsed : false,
    };
  } catch {
    return null;
  }
};

class LocalStorageSudokuStateStorage implements SudokuStateStorage {
  constructor(private readonly key: string) {}

  async load() {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(this.key);
    if (!raw) return null;

    const state = parsePersistedState(raw);
    if (!state) {
      window.localStorage.removeItem(this.key);
      return null;
    }

    return state;
  }

  async save(state: PersistedSudokuState) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.key, JSON.stringify(state));
  }

  async clear() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(this.key);
  }
}

// Swap this adapter later for IndexedDB or backend sync without touching game logic.
const sudokuStateStorage: SudokuStateStorage = new LocalStorageSudokuStateStorage(STORAGE_KEY);

const createEmptyBoard = (size: number) =>
  Array.from({ length: size }, () => Array(size).fill(0));

const shuffleArray = <T,>(items: T[]) => {
  const next = [...items];

  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
};

const buildSolvedBoard = (size: number, subgrid: number) => {
  const pattern = (row: number, col: number) =>
    (subgrid * (row % subgrid) + Math.floor(row / subgrid) + col) % size;
  const range = Array.from({ length: size }, (_, index) => index);
  const groupRange = Array.from({ length: subgrid }, (_, index) => index);

  const rows = shuffleArray(groupRange).flatMap((group) =>
    shuffleArray(groupRange).map((row) => group * subgrid + row)
  );
  const cols = shuffleArray(groupRange).flatMap((group) =>
    shuffleArray(groupRange).map((col) => group * subgrid + col)
  );
  const numbers = shuffleArray(range.map((value) => value + 1));

  return rows.map((row) => cols.map((col) => numbers[pattern(row, col)]));
};

const generatePuzzle = (config: ModeConfig) => {
  const solved = buildSolvedBoard(config.size, config.subgrid);
  const puzzle = solved.map((row) => [...row]);
  const maxEmpties = config.size * config.size - 1;
  let count = Math.min(config.empties, maxEmpties);

  while (count > 0) {
    const row = Math.floor(Math.random() * config.size);
    const col = Math.floor(Math.random() * config.size);

    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      count--;
    }
  }

  return puzzle;
};

const computeConflicts = (board: number[][], subgrid: number) => {
  const size = board.length;
  const conflicts = Array.from({ length: size }, () => Array(size).fill(false));

  for (let row = 0; row < size; row++) {
    const positionsByValue = new Map<number, number[]>();

    for (let col = 0; col < size; col++) {
      const value = board[row][col];
      if (value === 0) continue;

      const list = positionsByValue.get(value) ?? [];
      list.push(col);
      positionsByValue.set(value, list);
    }

    for (const cols of positionsByValue.values()) {
      if (cols.length > 1) {
        for (const col of cols) conflicts[row][col] = true;
      }
    }
  }

  for (let col = 0; col < size; col++) {
    const positionsByValue = new Map<number, number[]>();

    for (let row = 0; row < size; row++) {
      const value = board[row][col];
      if (value === 0) continue;

      const list = positionsByValue.get(value) ?? [];
      list.push(row);
      positionsByValue.set(value, list);
    }

    for (const rows of positionsByValue.values()) {
      if (rows.length > 1) {
        for (const row of rows) conflicts[row][col] = true;
      }
    }
  }

  for (let boxRow = 0; boxRow < subgrid; boxRow++) {
    for (let boxCol = 0; boxCol < subgrid; boxCol++) {
      const positionsByValue = new Map<number, Array<[number, number]>>();

      for (let row = boxRow * subgrid; row < boxRow * subgrid + subgrid; row++) {
        for (let col = boxCol * subgrid; col < boxCol * subgrid + subgrid; col++) {
          const value = board[row][col];
          if (value === 0) continue;

          const list = positionsByValue.get(value) ?? [];
          list.push([row, col]);
          positionsByValue.set(value, list);
        }
      }

      for (const cells of positionsByValue.values()) {
        if (cells.length > 1) {
          for (const [row, col] of cells) conflicts[row][col] = true;
        }
      }
    }
  }

  return conflicts;
};

const clampIndex = (value: number, max: number) => Math.min(max, Math.max(0, value));

const toSymbol = (value: number, symbols: string[]) => {
  if (value === 0) return '';
  return symbols[value - 1] ?? String(value);
};

const NUMBER_FONT_CLASS = 'font-mono font-semibold tabular-nums leading-none tracking-normal';

type SudokuBoardProps = {
  board: number[][];
  config: ModeConfig;
  conflicts: boolean[][];
  initialBoard: number[][];
  selectedCell: CellPosition | null;
  selectedValue: number;
  onCellPress: (row: number, col: number) => void;
};

const SudokuBoard = memo(function SudokuBoard({
  board,
  config,
  conflicts,
  initialBoard,
  selectedCell,
  selectedValue,
  onCellPress,
}: SudokuBoardProps) {
  const cellSizeClass =
    config.size === 16
      ? 'text-[9px] sm:text-xs md:text-sm'
      : 'text-sm sm:text-base md:text-xl lg:text-2xl';

  return (
    <div className="w-full flex-col flex items-center max-w-[100vw] select-none touch-manipulation">
      <div className="w-full max-w-[500px] relative rounded-[12px] sm:rounded-[20px] overflow-hidden p-1 sm:p-2">
        <div
          className="w-full mx-auto border-[2px] border-amber-400/80 bg-[#0A1220] aspect-square"
          style={{
            display: 'grid',
            gridTemplateRows: `repeat(${config.size}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))`,
          }}
        >
          {board.flatMap((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isFixed = initialBoard[rowIndex][colIndex] !== 0;
              const hasSelectedCell = selectedCell !== null;
              const selectedRow = selectedCell?.[0] ?? -1;
              const selectedCol = selectedCell?.[1] ?? -1;
              const isSelected = selectedRow === rowIndex && selectedCol === colIndex;
              const inSameBox =
                hasSelectedCell &&
                Math.floor(rowIndex / config.subgrid) ===
                  Math.floor(selectedRow / config.subgrid) &&
                Math.floor(colIndex / config.subgrid) ===
                  Math.floor(selectedCol / config.subgrid);
              const isRelated =
                hasSelectedCell &&
                (rowIndex === selectedRow || colIndex === selectedCol || inSameBox);
              const isSameValue = selectedValue !== 0 && cell === selectedValue;
              const isConflict = conflicts[rowIndex][colIndex];

              const borderRight =
                colIndex === config.size - 1
                  ? ''
                  : (colIndex + 1) % config.subgrid === 0
                    ? 'border-r-[2px] border-r-amber-400/80'
                    : 'border-r-[1px] border-r-slate-700/80';
              const borderBottom =
                rowIndex === config.size - 1
                  ? ''
                  : (rowIndex + 1) % config.subgrid === 0
                    ? 'border-b-[2px] border-b-amber-400/80'
                    : 'border-b-[1px] border-b-slate-700/80';

              let bgClass = 'bg-transparent';
              if (isRelated) bgClass = 'bg-white/[0.04]';
              if (isSameValue) bgClass = 'bg-amber-300/15';
              if (isSelected) bgClass = 'bg-amber-300/25';

              let textClass = isFixed
                ? 'font-semibold text-slate-100'
                : 'font-semibold text-amber-200';
              if (isConflict && !isFixed) {
                textClass = 'font-semibold text-rose-500';
              }

              const ringClass = isSelected ? 'ring-2 ring-inset ring-amber-300/80 z-10' : '';

              return (
                <button
                  type="button"
                  key={`${rowIndex}-${colIndex}`}
                  onPointerDown={() => onCellPress(rowIndex, colIndex)}
                  className={`touch-manipulation flex w-full h-full ${cellSizeClass} ${NUMBER_FONT_CLASS} select-none items-center justify-center ${bgClass} ${textClass} ${ringClass} ${borderRight} ${borderBottom} active:bg-amber-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300`}
                  aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}`}
                >
                  {toSymbol(cell, config.symbols)}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});

type SudokuKeypadProps = {
  hasSelection: boolean;
  keypadButtonSizeClass: string;
  numberPadValues: number[];
  onInput: (num: number) => void;
  selectedIsEditable: boolean;
  selectedValue: number;
  symbols: string[];
};

const SudokuKeypad = memo(function SudokuKeypad({
  hasSelection,
  keypadButtonSizeClass,
  numberPadValues,
  onInput,
  selectedIsEditable,
  selectedValue,
  symbols,
}: SudokuKeypadProps) {
  const canUseNumberPad = !hasSelection || selectedIsEditable;

  return (
    <div className="w-full max-w-[450px] mt-6 pb-2 flex flex-wrap justify-center gap-2 sm:gap-3 px-1">
      {numberPadValues.map((num) => {
        const isActive = selectedValue === num && canUseNumberPad;

        return (
          <button
            key={num}
            type="button"
            onPointerDown={() => onInput(num)}
            disabled={!canUseNumberPad}
            aria-pressed={isActive}
            className={`touch-manipulation flex items-center justify-center ${keypadButtonSizeClass} rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${NUMBER_FONT_CLASS} ${
              isActive
                ? 'border-amber-400/60 bg-amber-400/20 text-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30 ring-inset'
                : 'border-white/10 bg-white/5 text-slate-200 active:bg-white/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {toSymbol(num, symbols)}
          </button>
        );
      })}

      <button
        type="button"
        onPointerDown={() => onInput(0)}
        disabled={!canUseNumberPad}
        className={`touch-manipulation flex items-center justify-center ${keypadButtonSizeClass} rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-200 active:bg-rose-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label="Clear cell"
      >
        <Eraser className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
    </div>
  );
});

export default function SudokuGame() {
  const [mode, setMode] = useState<Mode>('hard');
  const activeConfig = MODE_CONFIG[mode];
  const [initialBoard, setInitialBoard] = useState<number[][]>(() =>
    createEmptyBoard(MODE_CONFIG.hard.size)
  );
  const [board, setBoard] = useState<number[][]>(() => createEmptyBoard(MODE_CONFIG.hard.size));
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [gameVersion, setGameVersion] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [fastModeNumber, setFastModeNumber] = useState<number | null>(null);
  const elapsedSecondsRef = useRef(0);

  const conflicts = useMemo(
    () => computeConflicts(board, activeConfig.subgrid),
    [board, activeConfig.subgrid]
  );
  const selectedValue =
    fastModeNumber !== null
      ? fastModeNumber
      : selectedCell
        ? board[selectedCell[0]]?.[selectedCell[1]] ?? 0
        : 0;
  const selectedIsEditable = selectedCell
    ? initialBoard[selectedCell[0]]?.[selectedCell[1]] === 0
    : false;
  const conflictCount = useMemo(
    () => conflicts.flat().filter(Boolean).length,
    [conflicts]
  );
  const numberPadValues = useMemo(
    () => Array.from({ length: activeConfig.size }, (_, index) => index + 1),
    [activeConfig.size]
  );
  const keyToValue = useMemo(() => {
    const map = new Map<string, number>();

    activeConfig.symbols.forEach((symbol, index) => {
      map.set(symbol.toLowerCase(), index + 1);
    });

    return map;
  }, [activeConfig.symbols]);

  const startNewGame = useCallback((nextMode: Mode) => {
    const config = MODE_CONFIG[nextMode];
    const puzzle = generatePuzzle(config);

    setMode(nextMode);
    setInitialBoard(puzzle.map((row) => [...row]));
    setBoard(puzzle.map((row) => [...row]));
    setIsWon(false);
    setSelectedCell(null);
    setFastModeNumber(null);
    elapsedSecondsRef.current = 0;
    setElapsedSeconds(0);
    setGameVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const saved = await sudokuStateStorage.load();
      if (cancelled) return;

      if (saved) {
        setMode(saved.mode);
        setInitialBoard(saved.initialBoard.map((row) => [...row]));
        setBoard(saved.board.map((row) => [...row]));
        setSelectedCell(
          saved.selectedCell ? [saved.selectedCell[0], saved.selectedCell[1]] : null
        );
        setIsWon(saved.isWon);
        elapsedSecondsRef.current = saved.elapsedSeconds;
        setElapsedSeconds(saved.elapsedSeconds);
        setGameVersion((version) => version + 1);
      } else {
        startNewGame('hard');
      }
      setIsHydrated(true);
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [startNewGame]);

  useEffect(() => {
    if (!isHydrated) return;

    void sudokuStateStorage.save({
      version: 1,
      mode,
      initialBoard,
      board,
      selectedCell,
      isWon,
      elapsedSeconds: elapsedSecondsRef.current,
    });
  }, [isHydrated, mode, initialBoard, board, selectedCell, isWon, elapsedSeconds]);

  useEffect(() => {
    if (!isHydrated) return;

    const persistCurrentState = () => {
      void sudokuStateStorage.save({
        version: 1,
        mode,
        initialBoard,
        board,
        selectedCell,
        isWon,
        elapsedSeconds: elapsedSecondsRef.current,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistCurrentState();
      }
    };

    window.addEventListener('pagehide', persistCurrentState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', persistCurrentState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isHydrated, mode, initialBoard, board, selectedCell, isWon]);

  useEffect(() => {
    const complete = board.every((row) => row.every((value) => value !== 0));
    setIsWon(complete && conflictCount === 0);
  }, [board, conflictCount]);

  useEffect(() => {
    if (!isHydrated || isWon) return;

    const interval = window.setInterval(() => {
      elapsedSecondsRef.current += 1;

      if (elapsedSecondsRef.current % 5 === 0) {
        setElapsedSeconds(elapsedSecondsRef.current);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [gameVersion, isHydrated, isWon]);

  useEffect(() => {
    if (isWon) {
      setElapsedSeconds(elapsedSecondsRef.current);
    }
  }, [isWon]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (fastModeNumber !== null) {
        if (initialBoard[row]?.[col] === 0) {
          setBoard((current) => {
            const next = current.map((nextRow) => [...nextRow]);
            next[row][col] = next[row][col] === fastModeNumber ? 0 : fastModeNumber;
            return next;
          });
        }
        return;
      }

      setSelectedCell((current) => {
        if (current?.[0] === row && current[1] === col) {
          return null;
        }

        return [row, col];
      });
    },
    [fastModeNumber, initialBoard]
  );

  const handleNumberInput = useCallback(
    (num: number) => {
      if (num < 0 || num > activeConfig.size) return;

      if (!selectedCell) {
        setFastModeNumber((current) => (current === num ? null : num));
        return;
      }

      const [row, col] = selectedCell;
      if (initialBoard[row]?.[col] !== 0) {
        setFastModeNumber((current) => (current === num ? null : num));
        setSelectedCell(null);
        return;
      }

      setBoard((current) => {
        const next = current.map((nextRow) => [...nextRow]);
        next[row][col] = next[row][col] === num ? 0 : num;
        return next;
      });

      setFastModeNumber(num);
      setSelectedCell(null);
    },
    [activeConfig.size, initialBoard, selectedCell]
  );

  const moveSelection = useCallback(
    (rowOffset: number, colOffset: number) => {
      setSelectedCell((current) => {
        if (!current) return [0, 0];

        return [
          clampIndex(current[0] + rowOffset, activeConfig.size - 1),
          clampIndex(current[1] + colOffset, activeConfig.size - 1),
        ];
      });
    },
    [activeConfig.size]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const normalizedKey = event.key.toLowerCase();
      const mappedValue = keyToValue.get(normalizedKey);

      if (mappedValue) {
        event.preventDefault();
        handleNumberInput(mappedValue);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        if (selectedCell) {
          event.preventDefault();
          handleNumberInput(0);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelection(-1, 0);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelection(1, 0);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveSelection(0, -1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveSelection(0, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumberInput, keyToValue, moveSelection, selectedCell]);

  const statusLabel = isWon
    ? 'Solved perfectly'
    : conflictCount > 0
      ? `${conflictCount} highlighted cell${conflictCount === 1 ? '' : 's'}`
      : '';
  const keypadButtonSizeClass =
    activeConfig.size === 16
      ? 'h-9 w-9 text-sm sm:h-10 sm:w-10 sm:text-base'
      : 'h-10 w-10 text-base sm:h-12 sm:w-12 sm:text-xl';

  return (
    <div className="mx-auto w-full max-w-lg lg:max-w-4xl xl:max-w-5xl flex flex-col items-center">
      <div className="mb-4 flex w-full max-w-[500px] flex-col items-center justify-center px-2 min-h-[40px] gap-2 relative">
        <div className="flex w-full justify-end">
          <div className="group relative flex flex-col items-end">
            {/* New Game Dropdown Trigger */}
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1.5 pl-3 pr-2 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10 active:scale-95"
            >
              New Game
              <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
            </button>
            {/* Dropdown Menu */}
            <div className="absolute top-full right-0 mt-2 flex hidden min-w-[140px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0A1220] shadow-xl group-hover:flex z-50">
              <button
                type="button"
                onClick={() => startNewGame('hard')}
                className="px-4 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-white/5 active:bg-white/10"
              >
                Hard 9x9
              </button>
              <div className="h-px w-full bg-white/5" />
              <button
                type="button"
                onClick={() => startNewGame('master')}
                className="px-4 py-2.5 text-left text-sm font-medium text-amber-200 hover:bg-white/5 active:bg-white/10"
              >
                Master 16x16
              </button>
            </div>
          </div>
        </div>

        {/* Status Error Label entirely absolutely centered underneath the button bar if there's space, or we can just keep it exactly where it was before but slightly shifted. */}
        <div className="flex flex-col w-full text-center items-center pointer-events-none absolute bottom-0 left-0 right-0 top-0 justify-center">
          {statusLabel && (
            <span className="text-xs font-medium text-amber-300/90">{statusLabel}</span>
          )}
        </div>
      </div>

      <SudokuBoard
        board={board}
        config={activeConfig}
        conflicts={conflicts}
        initialBoard={initialBoard}
        selectedCell={selectedCell}
        selectedValue={selectedValue}
        onCellPress={handleCellClick}
      />

      {isWon && (
        <div className="mt-4 w-full max-w-[500px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-5 text-sm font-medium text-amber-200">
          <div className="flex items-center gap-2 text-base pb-1">
            <Trophy className="h-5 w-5 text-amber-300" />
            Puzzle solved! What would you like to play next?
          </div>
          <div className="flex flex-wrap gap-3 justify-center items-center w-full">
            <button
              type="button"
              onClick={() => startNewGame('hard')}
              className="flex-1 min-w-[140px] rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white active:bg-white/20 text-center"
            >
              Play Hard 9x9
            </button>
            <button
              type="button"
              onClick={() => startNewGame('master')}
              className="flex-1 min-w-[140px] rounded-full border border-amber-400/60 bg-amber-400/20 px-5 py-2.5 text-sm font-semibold text-amber-100 active:bg-amber-400/30 text-center"
            >
              Play Master 16x16
            </button>
          </div>
        </div>
      )}

      <SudokuKeypad
        hasSelection={selectedCell !== null}
        keypadButtonSizeClass={keypadButtonSizeClass}
        numberPadValues={numberPadValues}
        onInput={handleNumberInput}
        selectedIsEditable={selectedIsEditable}
        selectedValue={selectedValue}
        symbols={activeConfig.symbols}
      />

    </div>
  );
}
