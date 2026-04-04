import type { Metadata } from 'next';
import SudokuGame from '@/components/sudoku/SudokuGame';

export const metadata: Metadata = {
  title: 'Sudoku',
  description: 'Play a game of Sudoku and solve puzzles.',
};

export default function SudokuPage() {
  return (
    <div className="relative overflow-hidden pb-20 pt-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_58%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,28,0.96),rgba(10,18,32,0.92))] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.32)] md:p-6">
          <SudokuGame />
        </div>
      </div>
    </div>
  );
}
