import Link from 'next/link';
import { Mail } from 'lucide-react';
import SiteIcon from '@/components/ui/SiteIcon';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="academic-shell py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <p className="font-serif text-2xl text-[var(--color-text)]">
              Abdelouahab Mostafa
            </p>
            <p className="mt-3 max-w-md text-sm leading-7 text-[var(--color-text-secondary)]">
              Personal academic website for mathematics notes, articles, problem solving,
              and university-level learning resources.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/blog" className="rounded-full px-3 py-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]">
              Articles
            </Link>
            <Link href="/notes" className="rounded-full px-3 py-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]">
              Notes
            </Link>
            <Link href="/cv" className="rounded-full px-3 py-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]">
              CV
            </Link>
            <a
              href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2 font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              aria-label="Email"
            >
              <Mail size={15} />
              Email
            </a>
            <a
              href="https://github.com/abdelouahabmostafaetu-bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2 font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              aria-label="GitHub"
            >
              <SiteIcon name="github" alt="" className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-tertiary)] sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {currentYear} Abdelouahab Mostafa</span>
          <span>Designed for clarity, stability, and academic reading.</span>
        </div>
      </div>
    </footer>
  );
}
