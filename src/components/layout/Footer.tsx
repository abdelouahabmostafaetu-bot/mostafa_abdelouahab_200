import Link from 'next/link';
import { Mail, Github, ExternalLink } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)]/85 bg-[var(--color-surface)]/85">
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

          <div className="flex flex-wrap items-center gap-4 text-sm">
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
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-all duration-200"
              aria-label="Email"
            >
              <Mail size={15} />
              Email
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)] transition-all duration-200"
              aria-label="GitHub"
            >
              <Github size={15} />
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--color-border)]/70 pt-6 text-xs text-[var(--color-text-tertiary)] sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {currentYear} Abdelouahab Mostafa</span>
          <span className="flex items-center gap-1">
            Built with Next.js
            <ExternalLink size={10} className="opacity-50" />
          </span>
        </div>
      </div>
    </footer>
  );
}
