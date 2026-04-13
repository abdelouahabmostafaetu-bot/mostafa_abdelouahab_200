import type { Metadata } from 'next';
import SudokuGame from '@/components/sudoku/SudokuGame';

export const metadata: Metadata = {
  title: 'Sudoku',
  description: 'Play a game of Sudoku and solve puzzles.',
};

export default function SudokuPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden overscroll-none touch-manipulation sm:pb-20 sm:pt-20 pt-4 pb-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/5 to-transparent sm:hidden" />
        <div className="hidden sm:block absolute left-[-10%] top-[10%] h-[40vh] w-[40vw] rounded-full bg-slate-400/10 blur-[80px] lg:blur-[100px]" />
        <div className="hidden sm:block absolute right-[-10%] top-[40%] h-[50vh] w-[50vw] rounded-full bg-slate-500/10 blur-[80px] lg:blur-[100px]" />
      </div>

      <div className="relative mx-auto h-full w-full max-w-7xl px-0 sm:px-6 pb-6">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 text-center mb-4 tracking-tight drop-shadow-md pb-2">
          Mostafa&apos;s Sudoku
        </h1>
        <SudokuGame />
      </div>
    </div>
  );
}
