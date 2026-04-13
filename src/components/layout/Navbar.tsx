'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/sudoku', label: 'Sudoku' },
  { href: '/search', label: 'Search' },
  { href: '/library', label: 'My Library' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <nav className="max-w-5xl mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="group flex flex-col leading-none">
            <span className="text-base font-semibold text-[var(--color-text)] transition-colors duration-200 group-hover:text-[var(--color-accent)]">
              Abdelouahab Mostafa
            </span>
            <span className="hidden sm:block mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              Mathematics Notes
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                  isActive(link.href)
                    ? 'bg-[var(--color-bg-muted)] text-[var(--color-text)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-2 pl-2 border-l border-[var(--color-border)]">
              
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-md border border-[var(--color-border)] p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div
          className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center px-6 border-b border-[var(--color-border)]">
            <span className="text-base font-semibold text-[var(--color-text)]">
              Menu
            </span>
          </div>
          <div className="flex flex-col p-4 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-md px-4 py-3 text-sm transition-colors duration-150 ${
                  isActive(link.href)
                    ? 'bg-[var(--color-bg-muted)] font-medium text-[var(--color-text)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </aside>
      </nav>
    </header>
  );
}
