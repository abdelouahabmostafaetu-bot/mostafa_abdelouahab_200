import { Suspense } from 'react';
import SearchFrameClient from './SearchFrameClient';

export const metadata = {
  title: 'Math Q&A Search | Abdelouahab Mostafa',
  description: 'Search Mathematics Stack Exchange and LaTeX results without any AI backend.',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg)]" />}>
      <SearchFrameClient />
    </Suspense>
  );
}
