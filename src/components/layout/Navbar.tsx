'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

const navLinks = [
  { href: '/', label: 'About', icon: 'home' },
  { href: '/blog', label: 'Writing', icon: 'blog' },
  { href: '/notes', label: 'Notes', icon: 'notebook' },
  { href: '/problems-with-coffee', label: 'Problems', icon: 'equation' },
  { href: '/library', label: 'Library', icon: 'library' },
  { href: '/cv', label: 'CV', icon: 'document' },
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
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-[var(--color-border)] bg-[var(--color-bg)]/92 shadow-[0_8px_24px_rgba(23,32,51,0.06)] backdrop-blur-xl'
          : 'border-transparent bg-[var(--color-bg)]/72 backdrop-blur-md'
      }`}
    >
      <nav className="university-container">
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[#172033] font-serif text-sm font-semibold text-[#f7f3ea] shadow-sm md:h-11 md:w-11">
              AM
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold tracking-tight text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] md:text-base">
                Abdelouahab Mostafa
              </span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] sm:block">
                Mathematics · University of Mila
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/58 p-1 shadow-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-all duration-150 ${
                    isActive(link.href)
                      ? 'bg-[#172033] text-[#f7f3ea] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button type="button" className="university-button-secondary min-h-0 px-4 py-2 text-sm">
                  Sign in
                </button>
              </SignInButton>
            </Show>

            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex rounded-full border border-[var(--color-border)] bg-white/70 p-2.5 text-[var(--color-text)] shadow-sm transition-colors hover:bg-[var(--color-bg-muted)] lg:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-40 bg-[#172033]/35 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed bottom-0 right-0 top-0 z-50 w-[min(21rem,88vw)] border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-5">
          <div>
            <p className="text-sm font-bold text-[var(--color-text)]">Menu</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">Academic navigation</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full border border-[var(--color-border)] p-2 text-[var(--color-text-secondary)]"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 p-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                isActive(link.href)
                  ? 'bg-[#172033] text-[#f7f3ea]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <SiteIcon name={link.icon} alt="" className="h-4 w-4" />
              {link.label}
            </Link>
          ))}

          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button type="button" className="university-button-primary w-full">
                  Sign in
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white/60 px-4 py-3">
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Account</span>
                <UserButton />
              </div>
            </Show>
          </div>
        </div>
      </aside>
    </header>
  );
}
