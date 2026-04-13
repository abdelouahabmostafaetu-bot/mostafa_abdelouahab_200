import React from 'react';

export const metadata = {
  title: 'My Library | Abdelouahab Mostafa',
  description: 'View my curated mathematics library.',
};

export default function LibraryPage() {
  return (
    <div className="w-full h-screen pt-16 flex flex-col">
      <iframe
        src="/my-library/index.html"
        className="w-full flex-grow border-none"
        title="My Library"
      />
    </div>
  );
}