import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import MathAIChat from '@/components/math-ai/MathAIChat';
import './math-ai-theme.css';

export const metadata: Metadata = {
  title: 'Math AI',
  description: 'An AI assistant focused only on mathematics.',
};

export default async function MathAIPage() {
  await auth.protect();

  return (
    <div className="math-ai-shell relative pt-20 pb-8">
      <div className="math-ai-aurora" aria-hidden="true">
        <span className="math-ai-orb math-ai-orb--a" />
        <span className="math-ai-orb math-ai-orb--b" />
        <span className="math-ai-orb math-ai-orb--c" />
      </div>
      <div className="math-ai-grid" aria-hidden="true" />
      <div className="relative max-w-3xl mx-auto px-4 md:px-6">
        <div className="math-ai-stage">
          <MathAIChat />
        </div>
      </div>
    </div>
  );
}
