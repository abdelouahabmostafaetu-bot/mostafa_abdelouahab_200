import Link from 'next/link';
import { Mail, Github } from 'lucide-react';
import MobileTabBar from '@/components/layout/MobileTabBar';
import BackToTop from '@/components/layout/BackToTop';

const exploreLinks = [
  { href: '/blog', label: 'Blog' },
  { href: '/notes', label: 'My Notes' },
  { href: '/problems-with-coffee', label: 'Problems' },
  { href: '/doctorate-exams', label: 'Doctorate' },
  { href: '/library', label: 'My Library' },
];

const aboutLinks = [
  { href: '/', label: 'About' },
  { href: '/cv', label: 'Curriculum Vitae' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="border-t border-[var(--border)] bg-[var(--bg-subtle)] pb-mobile-chrome">
        <div className="mx-auto max-w-wide px-4 py-12 sm:px-6 md:py-16">
          <div className="grid grid-cols-1 gap-10 text-center sm:grid-cols-2 sm:text-left md:grid-cols-[1.5fr_1fr_1fr]">
            {/* Identity */}
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-serif text-lg text-[var(--text)]">
                Abdelouahab Mostafa
              </span>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">
                Mathematics notes, problems &amp; research.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <a
                  href="https://github.com/abdelouahabmostafaetu-bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="press inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <Github className="h-5 w-5" aria-hidden="true" />
                </a>
                <Link
                  href="/contact"
                  aria-label="Contact"
                  className="press inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Explore */}
            <div>
              <h2 className="text-[0.7rem] font-semibold uppercase tracking-[var(--tracking-wide)] text-[var(--text-subtle)]">
                Explore
              </h2>
              <ul className="mt-4 space-y-2.5">
                {exploreLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-sm)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* About */}
            <div>
              <h2 className="text-[0.7rem] font-semibold uppercase tracking-[var(--tracking-wide)] text-[var(--text-subtle)]">
                About
              </h2>
              <ul className="mt-4 space-y-2.5">
                {aboutLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-[var(--radius-sm)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-[var(--border)] pt-6 text-center text-xs text-[var(--text-subtle)] sm:text-left">
            © {currentYear} Abdelouahab Mostafa. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Phone-only global chrome. Rendered from the persistent footer so it
          never remounts on navigation. Both are position:fixed and md:hidden. */}
      <MobileTabBar />
      <BackToTop />
    </>
  );
}
