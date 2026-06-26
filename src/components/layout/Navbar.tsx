'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

const navLinks = [
  { href: '/', label: 'About', icon: 'home' },
  { href: '/blog', label: 'Articles', icon: 'blog' },
  { href: '/notes', label: 'Notes', icon: 'equation' },
  { href: '/problems-with-coffee', label: 'Problems', icon: 'math' },
  { href: '/library', label: 'Library', icon: 'library' },
  { href: '/contact', label: 'Contact', icon: 'document' },
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
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-200 ${
        scrolled
          ? 'border-[var(--color-border)] bg-[var(--color-bg)]/92 shadow-[0_12px_35px_rgba(23,32,51,0.08)] backdrop-blur-xl'
          : 'border-[var(--color-border)] bg-[var(--color-bg)]/82 backdrop-blur-xl'
      }`}
    >
      <nav className="academic-shell">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="Home">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] font-serif text-sm font-semibold text-[var(--color-accent)] shadow-sm transition-colors group-hover:border-[var(--color-accent)]">
              AM
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold tracking-tight text-[var(--color-text)] sm:text-base">
                Abdelouahab Mostafa
              </span>
              <span className="hidden text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] sm:block">
                Mathematics · University
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/72 p-1 shadow-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-2 text-sm transition-colors duration-150 ${
                    isActive(link.href)
                      ? 'bg-[var(--color-accent)] text-white shadow-sm'
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

            <Show when="signed-out">
              <div className="flex items-center gap-2">
                <SignInButton mode="redirect">
                  <button
                    type="button"
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="redirect">
                  <button
                    type="button"
                    className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                  >
                    Join
                  </button>
                </SignUpButton>
              </div>
            </Show>

            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2 text-[var(--color-text-secondary)] shadow-sm transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div
          className={`lg:hidden fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity duration-200 ${
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`lg:hidden fixed bottom-0 right-0 top-0 z-50 w-[min(22rem,86vw)] border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl transition-transform duration-250 ease-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-5">
            <span className="font-serif text-lg text-[var(--color-text)]">Menu</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-1 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-[var(--color-accent)] text-white'
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
                <div className="grid gap-2">
                  <SignInButton mode="redirect">
                    <button
                      type="button"
                      className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="redirect">
                    <button
                      type="button"
                      className="rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
                    >
                      Join
                    </button>
                  </SignUpButton>
                </div>
              </Show>

              <Show when="signed-in">
                <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-4 py-3">
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
