import Link from 'next/link';
import { Mail, Github } from 'lucide-react';

const siteLinks = [
  { href: '/blog', label: 'Blog' },
  { href: '/notes', label: 'My Notes' },
  { href: '/problems-with-coffee', label: 'Problems' },
  { href: '/library', label: 'My Library' },
];

const aboutLinks = [
  { href: '/cv', label: 'Curriculum Vitae' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-24 border-t"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-muted)' }}
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Identity */}
          <div className="md:col-span-2">
            <p
              className="text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem' }}
            >
              Abdelouahab Mostafa
            </p>
            <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Notes, articles, and research-oriented writing in mathematics from
              Mila, Algeria.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://github.com/abdelouahabmostafaetu-bot"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Github size={17} />
              </a>
              <a
                href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
                aria-label="Email"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Mail size={17} />
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              Explore
            </p>
            <ul className="space-y-2.5">
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-accent)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              About
            </p>
            <ul className="space-y-2.5">
              {aboutLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-accent)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-12 border-t pt-6 text-sm text-[var(--color-text-tertiary)]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          &copy; {currentYear} Abdelouahab Mostafa
        </div>
      </div>
    </footer>
  );
}
