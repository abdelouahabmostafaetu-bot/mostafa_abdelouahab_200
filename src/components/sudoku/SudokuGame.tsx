'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Clock3, Eraser, RefreshCcw, Trophy } from 'lucide-react';

type Mode = 'hard' | 'master';

type PersistedSudokuState = {
  version: 1;
  mode: Mode;
  initialBoard: number[][];
  board: number[][];
  selectedCell: [number, number] | null;
  isWon: boolean;
  elapsedSeconds: number;
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
    label: 'Hard',
    size: 9,
    subgrid: 3,
    empties: 50,
    description: 'Standard 9x9 hard board.',
    symbols: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  },
  master: {
    label: 'Master',
    size: 16,
    subgrid: 4,
    empties: 170,
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
): value is [number, number] | null => {
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

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const clampIndex = (value: number, max: number) => Math.min(max, Math.max(0, value));

const toSymbol = (value: number, symbols: string[]) => {
  if (value === 0) return '';
  return symbols[value - 1] ?? String(value);
};

const NUMBER_FONT_CLASS = 'font-mono font-semibold tabular-nums leading-none tracking-normal';

export default function SudokuGame() {
  const [mode, setMode] = useState<Mode>('hard');
  const activeConfig = MODE_CONFIG[mode];
  const [initialBoard, setInitialBoard] = useState<number[][]>(() =>
    createEmptyBoard(MODE_CONFIG.hard.size)
  );
  const [board, setBoard] = useState<number[][]>(() => createEmptyBoard(MODE_CONFIG.hard.size));
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [gameVersion, setGameVersion] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  const conflicts = useMemo(
    () => computeConflicts(board, activeConfig.subgrid),
    [board, activeConfig.subgrid]
  );
  const selectedValue = selectedCell ? board[selectedCell[0]]?.[selectedCell[1]] ?? 0 : 0;
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

    const snapshot: PersistedSudokuState = {
      version: 1,
      mode,
      initialBoard,
      board,
      selectedCell,
      isWon,
      elapsedSeconds,
    };

    void sudokuStateStorage.save(snapshot);
  }, [isHydrated, mode, initialBoard, board, selectedCell, isWon, elapsedSeconds]);

  useEffect(() => {
    const complete = board.every((row) => row.every((value) => value !== 0));
    setIsWon(complete && conflictCount === 0);
  }, [board, conflictCount]);

  useEffect(() => {
    if (!isHydrated || isWon) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [gameVersion, isHydrated, isWon]);

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell([row, col]);
  };

  const handleNumberInput = useCallback(
    (num: number) => {
      if (!selectedCell) return;
      if (num < 0 || num > activeConfig.size) return;

      const [row, col] = selectedCell;
      if (initialBoard[row]?.[col] !== 0) return;

      setBoard((current) => {
        const next = current.map((nextRow) => [...nextRow]);
        next[row][col] = next[row][col] === num ? 0 : num;
        return next;
      });
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
  const statusDescription = isWon
    ? 'Excellent work. Every row, column, and box is complete.'
    : conflictCount > 0
      ? 'Review the amber cells to remove repeated values.'
      : '';
  const hasStatus = Boolean(statusLabel || statusDescription);

  const statCards: Array<{
    title: string;
    value: string;
    hint: string;
    icon: LucideIcon;
  }> = [
    {
      title: 'Time',
      value: formatTime(elapsedSeconds),
      hint: isWon ? 'Finished session' : 'Current session',
      icon: Clock3,
    },
  ];

  const cellSizeClass =
    activeConfig.size === 16
      ? 'h-[20px] w-[20px] sm:h-7 sm:w-7 md:h-8 md:w-8 text-[9px] sm:text-[11px] md:text-sm'
      : 'h-[9vw] w-[9vw] sm:h-[3.1rem] sm:w-[3.1rem] max-w-[44px] max-h-[44px] text-base md:text-lg lg:text-xl';
  const keypadButtonSizeClass =
    activeConfig.size === 16
      ? 'h-9 text-sm sm:h-11 sm:text-base'
      : 'h-12 text-base sm:h-14 sm:text-lg lg:h-16 lg:text-xl';

  return (
    <div className="mx-auto w-full max-w-lg lg:max-w-4xl xl:max-w-5xl">
      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] w-full">
          {(Object.keys(MODE_CONFIG) as Mode[]).map((level) => {
            const isActive = mode === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => startNewGame(level)}
                className={`flex-none touch-manipulation rounded-full border px-5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'border-amber-300/50 bg-amber-400/20 text-white shadow-[0_4px_20px_rgba(251,191,36,0.15)]'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {MODE_CONFIG[level].label}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 w-full sm:w-auto">
          {statCards.map((card) => (
            <div
              key={card.title}
              className="flex-1 sm:flex-none flex items-center justify-between sm:justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 sm:px-6 sm:py-2.5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <card.icon className="h-4 w-4 text-amber-300/80" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400 hidden sm:inline-block">
                  {card.title}
                </span>
              </div>
              <span className={`text-base font-medium text-white ${NUMBER_FONT_CLASS}`}>
                {card.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-center lg:items-start justify-center">
        {/* Board Section */}
        <div className="flex flex-col items-center w-full max-w-[100vw]">
          {hasStatus ? (
            <div className="mb-4 w-full text-center">
              {statusLabel ? (
                <p className="text-sm font-medium text-amber-300/90">{statusLabel}</p>
              ) : null}
              {statusDescription ? (
                <p className="mt-1 text-xs text-slate-400">{statusDescription}</p>
              ) : null}
            </div>
          ) : null}

          <div className="w-full relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[12px] sm:rounded-[20px] overflow-hidden">
            <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#6b7280_transparent]">
              <div className="w-auto mx-auto border-2 border-slate-700 bg-[#0A1220]">
                {board.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex">
                    {row.map((cell, colIndex) => {
                        const isFixed = initialBoard[rowIndex][colIndex] !== 0;
                        const isSelected =
                          selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex;

                        const selectedRow = selectedCell?.[0];
                        const selectedCol = selectedCell?.[1];
                        const inSameBox =
                          selectedCell &&
                          Math.floor(rowIndex / activeConfig.subgrid) ===
                            Math.floor(selectedRow! / activeConfig.subgrid) &&
                          Math.floor(colIndex / activeConfig.subgrid) ===
                            Math.floor(selectedCol! / activeConfig.subgrid);
                        const isRelated =
                          selectedCell &&
                          (rowIndex === selectedRow ||
                            colIndex === selectedCol ||
                            inSameBox);
                        const isSameValue =
                          selectedCell && selectedValue !== 0 && cell === selectedValue;
                        const isConflict = conflicts[rowIndex][colIndex];

                        const borderRight =
                          (colIndex + 1) % activeConfig.subgrid === 0 &&
                          colIndex < activeConfig.size - 1
                            ? 'border-r-[3px] border-slate-200/40'
                            : 'border-r border-slate-200/10';
                        const borderBottom =
                          (rowIndex + 1) % activeConfig.subgrid === 0 &&
                          rowIndex < activeConfig.size - 1
                            ? 'border-b-[3px] border-slate-200/40'
                            : 'border-b border-slate-200/10';

                        let bgClass = 'bg-transparent';
                        if (isRelated) bgClass = 'bg-white/[0.04]';
                        if (isSameValue) bgClass = 'bg-amber-300/15';
                        if (isConflict) bgClass = 'bg-rose-300/20';
                        if (isSelected) bgClass = 'bg-amber-300/25';

                        let textClass = isFixed
                          ? 'font-semibold text-slate-100'
                          : 'font-semibold text-amber-200';
                        if (isConflict && !isFixed) {
                          textClass = 'font-semibold text-rose-300';
                        }

                        const ringClass = isSelected
                          ? 'ring-2 ring-inset ring-amber-300/80'
                          : isConflict
                            ? 'ring-1 ring-inset ring-rose-300/60'
                            : '';

                        return (
                          <button
                            type="button"
                            key={`${rowIndex}-${colIndex}`}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                            className={`touch-manipulation flex ${cellSizeClass} ${NUMBER_FONT_CLASS} select-none items-center justify-center transition-all duration-150 ${bgClass} ${textClass} ${ringClass} ${borderRight} ${borderBottom} hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300`}
                            aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}`}
                            aria-selected={isSelected}
                          >
                            {toSymbol(cell, activeConfig.symbols)}
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isWon && (
            <div className="mt-6 flex items-center justify-center gap-3 rounded-full border border-amber-300/30 bg-amber-400/10 px-6 py-3 text-sm font-medium text-amber-200 shadow-lg">
              <Trophy className="h-5 w-5 text-amber-300" />
              Puzzle solved! Amazing work.
            </div>
          )}
        </div>

        {/* Keypad Section */}
        <aside className="w-full max-w-[400px] lg:w-[320px] lg:mt-8 shrink-0 pb-10">
          <div className="rounded-[24px] border border-white/5 bg-white/5 p-4 sm:p-6 backdrop-blur-xl shadow-2xl">
            <div className="mb-4 text-center">
              <p className="text-sm font-medium text-slate-300 mb-1">Number Pad</p>
              <p className="text-xs text-slate-500">Select a cell to enter numbers</p>
            </div>

            <div
              className={`grid ${
                activeConfig.size === 16 ? 'grid-cols-4' : 'grid-cols-3'
              } gap-3`}
            >
              {numberPadValues.map((num) => {
                const isActive = selectedValue === num && selectedIsEditable;

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumberInput(num)}
                    disabled={!selectedIsEditable}
                    className={`touch-manipulation ${keypadButtonSizeClass} rounded-2xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${NUMBER_FONT_CLASS} ${
                      isActive
                        ? 'border-amber-400/60 bg-amber-400/20 text-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30 ring-inset'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {toSymbol(num, activeConfig.symbols)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleNumberInput(0)}
                disabled={!selectedIsEditable}
                className={`${activeConfig.size === 16 ? 'col-span-4' : 'col-span-3'} touch-manipulation inline-flex h-12 lg:h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label="Clear cell"
              >
                <Eraser className="h-[18px] w-[18px]" />
                Clear Selection
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
