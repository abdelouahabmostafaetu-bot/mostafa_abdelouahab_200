'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

const navLinks = [
  { href: '/', label: 'About', icon: 'home' },
  { href: '/blog', label: 'Blog', icon: 'blog' },
  { href: '/problems-with-coffee', label: 'Problems', icon: 'equation' },
  { href: '/search', label: 'Search', icon: 'search' },
  { href: '/library', label: 'My Library', icon: 'library' },
] satisfies Array<{ href: string; label: string; icon: SiteIconName }>;

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
      className={`fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)] transition-all duration-300 ${
        scrolled
          ? 'md:border-[var(--color-border)] md:bg-[var(--color-bg)]/95 md:backdrop-blur-md'
          : 'md:border-transparent md:bg-transparent'
      }`}
    >
      <nav className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between md:h-16">
          <Link href="/" className="group flex flex-col leading-none">
            <span className="text-sm font-semibold text-[var(--color-text)] transition-colors duration-200 group-hover:text-[var(--color-accent)] sm:text-base">
              Abdelouahab Mostafa
            </span>
            <span className="hidden sm:block mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              Mathematics Notes
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1">
              {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                    isActive(link.href)
                      ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text)] font-medium'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <SiteIcon name={link.icon} alt="" className="h-4 w-4" />
                  {link.label}
                  </span>
                </Link>
              ))}
            </div>

            <div className="ml-2 flex items-center gap-2">
              <Show when="signed-out">
                <SignInButton mode="redirect">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="redirect">
                  <button
                    type="button"
                    className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-bg)] transition-opacity duration-150 hover:opacity-90"
                  >
                    Sign up
                  </button>
                </SignUpButton>
              </Show>

              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        <div
          className={`md:hidden fixed inset-0 z-40 bg-black/70 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-[min(17rem,82vw)] border-r border-[var(--color-border)] bg-[#080808] shadow-2xl transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-14 items-center px-4 border-b border-[var(--color-border)]">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              Menu
            </span>
          </div>
          <div className="flex flex-col p-3 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-md px-3 py-2 text-xs transition-colors duration-150 ${
                  isActive(link.href)
                    ? 'bg-[var(--color-bg-elevated)] font-medium text-[var(--color-text)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <SiteIcon name={link.icon} alt="" className="h-3.5 w-3.5" />
                {link.label}
                </span>
              </Link>
            ))}

            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <Show when="signed-out">
                <div className="flex flex-col gap-2">
                  <SignInButton mode="redirect">
                    <button
                      type="button"
                      className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="redirect">
                    <button
                      type="button"
                      className="w-full rounded-md bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[var(--color-bg)] transition-opacity duration-150 hover:opacity-90"
                    >
                      Sign up
                    </button>
                  </SignUpButton>
                </div>
              </Show>

              <Show when="signed-in">
                <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2">
                  <span className="text-xs text-[var(--color-text-secondary)]">Account</span>
                  <UserButton />
                </div>
              </Show>
            </div>
          </div>
        </aside>
      </nav>
    </header>
  );
}
