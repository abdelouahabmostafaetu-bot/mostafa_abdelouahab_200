'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';

const navLinks = [
  { href: '/', label: 'Profile' },
  { href: '/blog', label: 'Writing' },
  { href: '/notes', label: 'Notes' },
  { href: '/problems-with-coffee', label: 'Problems' },
  { href: '/library', label: 'Library' },
  { href: '/cv', label: 'CV' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-200 ${
        scrolled
          ? 'border-[var(--color-border)] bg-[var(--color-bg-elevated)]/92 shadow-sm backdrop-blur-md'
          : 'border-transparent bg-[var(--color-bg)]/72 backdrop-blur-sm'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group min-w-0">
          <span className="block truncate font-serif text-lg font-semibold leading-none tracking-tight text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]">
            Abdelouahab Mostafa
          </span>
          <span className="mt-1 hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-tertiary)] sm:block">
            Mathematics · University Profile
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-hover)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <button
                type="button"
                className="academic-button min-h-0 px-4 py-2 text-sm"
              >
                Admin sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text)] lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <div
        className={`lg:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        } fixed inset-0 top-16 z-40 bg-[rgba(24,32,51,0.28)] backdrop-blur-sm transition-opacity`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed right-3 top-20 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 shadow-2xl transition-all duration-200 lg:hidden ${
          isOpen
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <div className="grid gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-hover)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-3 border-t border-[var(--color-border)] pt-3">
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <button type="button" className="academic-button w-full">
                Admin sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
              Account
              <UserButton />
            </div>
          </Show>
        </div>
      </aside>
    </header>
  );
}
