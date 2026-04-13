import React from 'react';

export const metadata = {
  title: 'Sudoku Game | Abdelouahab Mostafa',
  description: 'Play Sudoku natively.',
};

export default function SudokuPage() {
  return (
    <div className="w-full h-screen pt-16 flex flex-col">
      <iframe
        src="/sudoku/index.html"
        className="w-full flex-grow border-none"
        title="Sudoku"
      />
    </div>
  );
}
