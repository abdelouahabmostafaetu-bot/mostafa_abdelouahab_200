import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import MathAIChat from '@/components/math-ai/MathAIChat';

export const metadata: Metadata = {
  title: 'Math AI',
  description: 'An AI assistant focused only on mathematics.',
};

export default async function MathAIPage() {
  await auth.protect();

  return (
    <div className="pt-20 pb-8">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <MathAIChat />
      </div>
    </div>
  );
}
