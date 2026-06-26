import Link from 'next/link';
import { Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <p className="font-serif text-xl font-semibold text-[var(--color-text)]">
              Abdelouahab Mostafa
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)]">
              Personal academic website for mathematics notes, problems, library
              resources, and research-oriented writing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/blog" className="academic-button min-h-0 px-4 py-2">Writing</Link>
            <Link href="/notes" className="academic-button min-h-0 px-4 py-2">Notes</Link>
            <Link href="/library" className="academic-button min-h-0 px-4 py-2">Library</Link>
            <Link href="/cv" className="academic-button min-h-0 px-4 py-2">CV</Link>
            <a
              href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
              className="academic-button min-h-0 gap-2 px-4 py-2"
              aria-label="Email"
            >
              <Mail size={15} />
              Email
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-text-tertiary)]">
          © {currentYear} Abdelouahab Mostafa. Built for clear academic reading.
        </div>
      </div>
    </footer>
  );
}
