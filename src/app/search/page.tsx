import React from 'react';

export const metadata = {
  title: 'Search | Abdelouahab Mostafa',
  description: 'Search across StackExchange Mathematics',
};

export default function SearchPage() {
  return (
    <div className="w-full h-screen pt-16 flex flex-col">
      <iframe
        src="/search-app/index.html"
        className="w-full flex-grow border-none"
        title="Search"
      />
    </div>
  );
}