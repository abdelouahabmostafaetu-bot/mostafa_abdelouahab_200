import React from 'react';

export const metadata = {
  title: 'Search | Abdelouahab Mostafa',
  description: 'Search across StackExchange Mathematics',
};

type SearchPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function SearchPage({ searchParams = {} }: SearchPageProps) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
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
    <div className="w-full h-screen pt-16 flex flex-col">
      <iframe
        src={iframeSrc}
        className="w-full flex-grow border-none"
        title="Search"
      />
    </div>
  );
}
