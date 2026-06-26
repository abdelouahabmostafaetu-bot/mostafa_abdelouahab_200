import Link from 'next/link';
import { Mail } from 'lucide-react';
import SiteIcon from '@/components/ui/SiteIcon';

const footerLinks = [
  { href: '/blog', label: 'Articles' },
  { href: '/notes', label: 'Notes' },
  { href: '/problems-with-coffee', label: 'Problems' },
  { href: '/cv', label: 'CV' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg)]/70">
      <div className="university-container py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent)] font-serif text-sm font-semibold text-white">
                AM
              </span>
              <div>
                <p className="font-serif text-xl text-[var(--color-text)]">
                  Abdelouahab Mostafa
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Mathematics · University of Mila
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)]">
              A simple professional academic website for mathematical notes, articles, problems, and research-oriented study.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
              className="university-button-secondary gap-2 px-4 py-2 text-sm"
              aria-label="Email"
            >
              <Mail size={15} />
              Email
            </a>
            <a
              href="https://github.com/abdelouahabmostafaetu-bot"
              target="_blank"
              rel="noopener noreferrer"
              className="university-button-secondary gap-2 px-4 py-2 text-sm"
              aria-label="GitHub"
            >
              <SiteIcon name="github" alt="" className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-text-tertiary)]">
          <span>&copy; {currentYear} Abdelouahab Mostafa. Academic portfolio.</span>
        </div>
      </div>
    </footer>
  );
}
