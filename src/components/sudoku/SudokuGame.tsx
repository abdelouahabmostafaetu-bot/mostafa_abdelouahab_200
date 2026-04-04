'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Clock3, Eraser, RefreshCcw, Trophy } from 'lucide-react';

type Mode = 'hard' | 'master';

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

const NUMBER_FONT_CLASS = 'font-mono font-semibold tabular-nums';

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

    setInitialBoard(puzzle.map((row) => [...row]));
    setBoard(puzzle.map((row) => [...row]));
    setIsWon(false);
    setSelectedCell(null);
    setElapsedSeconds(0);
    setGameVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    startNewGame(mode);
  }, [mode, startNewGame]);

  useEffect(() => {
    const complete = board.every((row) => row.every((value) => value !== 0));
    setIsWon(complete && conflictCount === 0);
  }, [board, conflictCount]);

  useEffect(() => {
    if (isWon) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [gameVersion, isWon]);

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
      ? 'h-6 w-6 text-[11px] sm:h-8 sm:w-8 sm:text-sm'
      : 'h-9 w-9 text-base sm:h-[3.1rem] sm:w-[3.1rem] sm:text-lg';

  return (
    <div className="w-full">
      <div className="grid gap-3 sm:max-w-[320px]">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{card.title}</p>
              <card.icon className="h-4 w-4 text-amber-300/80" />
            </div>
            <p className={`mt-3 text-xl text-white ${NUMBER_FONT_CLASS}`}>{card.value}</p>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.72),rgba(10,18,32,0.9))] p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Difficulty</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(MODE_CONFIG) as Mode[]).map((level) => {
                const isActive = mode === level;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      if (level === mode) {
                        startNewGame(level);
                        return;
                      }

                      setMode(level);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'border-amber-300/50 bg-amber-400/20 text-white shadow-[0_12px_30px_rgba(251,191,36,0.18)]'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                    aria-pressed={isActive}
                  >
                    {MODE_CONFIG[level].label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {MODE_CONFIG[mode].description}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col items-center">
            <div className="mb-3 w-full max-w-[720px] rounded-[20px] border border-white/10 bg-white/[0.03] px-3 py-3 sm:px-4 sm:py-4">
              <div>
                {statusLabel ? (
                  <p className="text-sm font-semibold text-white">{statusLabel}</p>
                ) : null}
                {statusDescription ? (
                  <p className="mt-1 text-xs text-slate-400">{statusDescription}</p>
                ) : null}
              </div>
            </div>

            <div className="w-full max-w-[720px] rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-2 sm:p-3 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#6b7280_transparent]">
                <div className="mx-auto w-max overflow-hidden rounded-[18px] border border-white/10 bg-[#07111f] sm:rounded-[24px]">
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
                            ? 'border-r-2 border-slate-200/20'
                            : 'border-r border-slate-200/10';
                        const borderBottom =
                          (rowIndex + 1) % activeConfig.subgrid === 0 &&
                          rowIndex < activeConfig.size - 1
                            ? 'border-b-2 border-slate-200/20'
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
                            className={`flex ${cellSizeClass} ${NUMBER_FONT_CLASS} select-none items-center justify-center transition-all duration-150 ${bgClass} ${textClass} ${ringClass} ${borderRight} ${borderBottom} hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300`}
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
              <div className="mt-4 flex items-center gap-3 rounded-full border border-amber-300/25 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-200">
                <Trophy className="h-4 w-4" />
                Puzzle solved. Beautiful work.
              </div>
            )}
          </div>

          <aside className="grid gap-4">
            <section className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 sm:rounded-[26px] sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Keypad</p>
                  <p className="mt-2 text-lg font-semibold text-white">Number controls</p>
                </div>
                <RefreshCcw className="h-4 w-4 text-amber-300/80" />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Tap a cell, then tap a number.
              </p>

              <div
                className={`mt-4 grid ${
                  activeConfig.size === 16 ? 'grid-cols-4' : 'grid-cols-3'
                } gap-2.5`}
              >
                {numberPadValues.map((num) => {
                  const isActive = selectedValue === num && selectedIsEditable;

                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberInput(num)}
                      disabled={!selectedIsEditable}
                      className={`h-11 rounded-xl border text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:h-12 sm:text-lg ${NUMBER_FONT_CLASS} ${
                        isActive
                          ? 'border-amber-300/50 bg-amber-400/20 text-white'
                          : 'border-white/10 bg-slate-950/40 text-slate-100 hover:border-white/20 hover:bg-white/[0.06]'
                      } disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-950/20 disabled:text-slate-600`}
                    >
                      {toSymbol(num, activeConfig.symbols)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleNumberInput(0)}
                  disabled={!selectedIsEditable}
                  className={`${activeConfig.size === 16 ? 'col-span-4' : 'col-span-3'} inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:bg-slate-950/20 disabled:text-slate-600`}
                  aria-label="Clear cell"
                  title="Clear cell"
                >
                  <Eraser className="h-4 w-4" />
                  Clear selected cell
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
