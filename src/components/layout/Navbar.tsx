'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X, LayoutDashboard } from 'lucide-react';
import SiteIcon, { type SiteIconName } from '@/components/ui/SiteIcon';

type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string;
  isAdmin?: boolean;
};

const navLinks = [
  { href: '/', label: 'About', icon: 'home' },
  { href: '/blog', label: 'Blog', icon: 'blog' },
  { href: '/notes', label: 'My Notes', icon: 'notebook' },
  { href: '/problems-with-coffee', label: 'Problems', icon: 'math' },
  { href: '/doctorate-exams', label: 'Doctorate', icon: 'math' },
  { href: '/library', label: 'My Library', icon: 'library' },
] satisfies Array<{ href: string; label: string; icon: SiteIconName }>;

function Avatar({ user, size }: { user: SessionUser; size: string }) {
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={user.name || user.email || 'Profile'}
        className={`${size} rounded-full object-cover ring-1 ring-[var(--border)]`}
      />
    );
  }
  return (
    <span
      className={`${size} flex items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--border)] text-sm font-semibold uppercase`}
    >
      {(user.name || user.email || '?').charAt(0).toUpperCase()}
    </span>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Elevate the bar with a subtle shadow once the page is scrolled.
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close on Escape + lock body scroll while the drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  // Load the signed-in user for the account area.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { user?: SessionUser | null }) => {
        if (!cancelled) setUser(d?.user ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAuthLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const links = navLinks;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md transition-shadow duration-250 motion-reduce:transition-none ${
        scrolled ? 'shadow-[var(--shadow-card)]' : 'shadow-none'
      }`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg) 82%, transparent)',
      }}
    >
      <nav
        className="mx-auto flex h-16 max-w-wide items-center justify-between gap-4 px-4 sm:px-6"
        aria-label="Primary"
      >
        {/* Left: identity */}
        <Link
          href="/"
          className="flex min-h-[44px] shrink-0 flex-col justify-center leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-sm)]"
        >
          <span className="font-serif text-lg text-[var(--text)]">
            Abdelouahab Mostafa
          </span>
          <span className="text-[0.7rem] uppercase tracking-[var(--tracking-wide)] text-[var(--text-subtle)]">
            Mathematics Notes
          </span>
        </Link>

        {/* Center: desktop links */}
        <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  active
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--accent)]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: account (desktop) */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {authLoaded && !user && (
            <Link
              href="/sign-in"
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Sign in
            </Link>
          )}
          {user && (
            <>
              <Link
                href="/dashboard"
                aria-label="View dashboard"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-md)] px-2 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <Avatar user={user} size="h-8 w-8" />
                <span className="max-w-[10rem] truncate">
                  {user.name || user.email}
                </span>
              </Link>
              <a
                href="/api/auth/signout"
                aria-label="Sign out"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </a>
            </>
          )}
        </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] md:hidden"
        >
          {isOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile: overlay */}
      <div
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Mobile: slide-in drawer */}
      <aside
        id="mobile-nav"
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-sm flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
          <span className="text-[0.7rem] uppercase tracking-[var(--tracking-wide)] text-[var(--text-subtle)]">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile primary">
          <ul className="flex flex-col gap-1">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-[44px] items-center gap-3 rounded-[var(--radius-md)] px-3 text-[0.95rem] font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      active
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
                    }`}
                  >
                    <SiteIcon
                      name={link.icon}
                      alt=""
                      className="h-5 w-5 opacity-80"
                    />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          {authLoaded && !user && (
            <Link
              href="/sign-in"
              onClick={() => setIsOpen(false)}
              className="flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)] transition-colors duration-150 hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Sign in
            </Link>
          )}
          {user && (
            <div className="flex flex-col gap-1">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex min-h-[44px] items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <Avatar user={user} size="h-8 w-8" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[var(--text)]">
                    {user.name || user.email}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-subtle)]">
                    <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                    View dashboard
                  </span>
                </span>
              </Link>
              <a
                href="/api/auth/signout"
                className="flex min-h-[44px] items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                Sign out
              </a>
            </div>
          )}
        </div>
      </aside>
    </header>
  );
}
