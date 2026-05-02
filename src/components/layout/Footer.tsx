import Link from 'next/link';
import { Mail } from 'lucide-react';
import SiteIcon from '@/components/ui/SiteIcon';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="max-w-5xl mx-auto px-4 py-7 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 sm:gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)] mb-1.5 tracking-tight sm:text-base sm:mb-2">
              Abdelouahab Mostafa
            </p>
            <p className="max-w-sm text-xs leading-5 text-[var(--color-text-secondary)] sm:text-sm sm:leading-6">
              Notes, articles, and research-oriented writing in mathematics from Mila, Algeria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
            <Link
              href="/blog"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-200"
            >
              Blog
            </Link>
            <Link
              href="/contact"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-200"
            >
              Contact
            </Link>
            <a
              href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2"
              aria-label="Email"
            >
              <Mail size={15} />
              Email
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2"
              aria-label="GitHub"
            >
              <SiteIcon name="github" alt="" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex flex-col gap-2 text-[11px] text-[var(--color-text-tertiary)] sm:mt-8 sm:pt-6 sm:gap-3 sm:text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {currentYear} Abdelouahab Mostafa</span>
        </div>
      </div>
    </footer>
  );
}
