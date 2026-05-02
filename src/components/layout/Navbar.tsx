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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
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
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div
          className={`md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 border-r border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center px-6 border-b border-[var(--color-border)]">
            <span className="text-base font-semibold text-[var(--color-text)]">
              Menu
            </span>
          </div>
          <div className="flex flex-col p-4 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-lg px-4 py-3 text-sm transition-colors duration-150 ${
                  isActive(link.href)
                    ? 'bg-[var(--color-bg-elevated)] font-medium text-[var(--color-text)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <SiteIcon name={link.icon} alt="" className="h-4 w-4" />
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
                      className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="redirect">
                    <button
                      type="button"
                      className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-bg)] transition-opacity duration-150 hover:opacity-90"
                    >
                      Sign up
                    </button>
                  </SignUpButton>
                </div>
              </Show>

              <Show when="signed-in">
                <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-2.5">
                  <span className="text-sm text-[var(--color-text-secondary)]">Account</span>
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
