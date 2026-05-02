import React from 'react';

export const metadata = {
  title: 'Math Q&A Search | Abdelouahab Mostafa',
  description: 'Search Mathematics Stack Exchange and LaTeX results without any AI backend.',
};

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const params = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry) params.append(key, entry);
      });
      return;
    }
    if (value) params.set(key, value);
  });

  const iframeSrc = params.toString()
    ? `/search-app/index.html?${params.toString()}`
    : '/search-app/index.html';

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 bg-[var(--color-bg)] md:top-16">
      <iframe
        src={iframeSrc}
        className="h-full w-full border-none"
        title="Search"
      />
    </div>
  );
}
