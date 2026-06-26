'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

const navLinks = [
  { href: '/', label: 'Profile', icon: 'home' },
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
    const handleScroll = () => setScrolled(window.scrollY > 6);
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
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-[var(--color-border)] bg-[var(--color-bg)]/92 shadow-sm backdrop-blur-xl'
          : 'border-[var(--color-border)]/70 bg-[var(--color-bg)]/84 backdrop-blur-xl'
      }`}
    >
      <nav className="university-container">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] font-serif text-sm font-semibold text-white shadow-sm">
              AM
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] sm:text-base">
                Abdelouahab Mostafa
              </span>
              <span className="hidden text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] sm:block">
                Mathematics · University Profile
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive(link.href)
                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button
                  type="button"
                  className="ml-1 rounded-full border border-[var(--color-border)] bg-white/60 px-3.5 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  Sign in
                </button>
              </SignInButton>
            </Show>

            <Show when="signed-in">
              <div className="ml-2">
                <UserButton />
              </div>
            </Show>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/60 text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] lg:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      <div
        className={`lg:hidden fixed inset-0 top-16 z-40 bg-[var(--color-text)]/25 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`lg:hidden fixed right-3 top-20 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 shadow-2xl transition-all duration-200 ${
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
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                isActive(link.href)
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <SiteIcon name={link.icon} alt="" className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>
      </aside>
    </header>
  );
}
