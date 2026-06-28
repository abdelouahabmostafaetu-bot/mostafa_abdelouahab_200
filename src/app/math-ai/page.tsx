import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import MathAIChat from '@/components/math-ai/MathAIChat';

export const metadata: Metadata = {
  title: 'Math AI',
  description:
    'An AI assistant focused only on mathematics — solve problems step by step and discover international research papers.',
};

export default async function MathAIPage() {
  await auth.protect();

  return (
    <div className="pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <header className="mb-6">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] font-medium mb-2">
            AI Assistant
          </p>
          <h1
            className="text-2xl md:text-4xl font-semibold text-[var(--color-text)] mb-3"
            style= fontFamily: 'var(--font-heading)' 
          >
            Math AI
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-6 max-w-2xl">
            A focused assistant for mathematics only. Ask it to solve and explain
            problems step by step with proper notation, or search international
            research papers — open access, free to read.
          </p>
        </header>

        <MathAIChat />
      </div>
    </div>
  );
}
