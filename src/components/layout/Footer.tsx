import Link from 'next/link';
import { Mail, Github } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-[var(--color-text)] mb-2 tracking-tight">
              Abdelouahab Mostafa
            </p>
            <p className="max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">
              Notes, articles, and research-oriented writing in mathematics from Mila, Algeria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
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
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              aria-label="Email"
            >
              <Mail size={15} />
              Email
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              aria-label="GitHub"
            >
              <Github size={15} />
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex flex-col gap-3 text-xs text-[var(--color-text-tertiary)] sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {currentYear} Abdelouahab Mostafa</span>
        </div>
      </div>
    </footer>
  );
}
