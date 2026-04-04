import type { Metadata } from 'next';
import SudokuGame from '@/components/sudoku/SudokuGame';

export const metadata: Metadata = {
  title: 'Sudoku',
  description: 'Play a game of Sudoku and solve puzzles.',
};

export default function SudokuPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#07111f] overflow-hidden sm:pb-20 sm:pt-20 pt-4 pb-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[10%] h-[40vh] w-[40vw] rounded-full bg-amber-400/10 blur-[100px]" />
        <div className="absolute right-[-10%] top-[40%] h-[50vh] w-[50vw] rounded-full bg-amber-300/10 blur-[100px]" />
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_60%)]" />
      </div>

      <div className="relative mx-auto h-full w-full max-w-7xl px-0 sm:px-6 pb-6">
        <SudokuGame />
      </div>
    </div>
  );
}
