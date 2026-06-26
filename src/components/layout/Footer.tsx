import Link from 'next/link';
import { Mail } from 'lucide-react';
import SiteIcon from '@/components/ui/SiteIcon';

const footerLinks = [
  { href: '/blog', label: 'Writing' },
  { href: '/notes', label: 'Notes' },
  { href: '/library', label: 'Library' },
  { href: '/cv', label: 'CV' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[#172033] text-[#f7f3ea]">
      <div className="university-container py-10 md:py-14">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 font-serif text-sm font-semibold">
                AM
              </span>
              <div>
                <p className="text-base font-bold">Abdelouahab Mostafa</p>
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                  Mathematics · University of Mila
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/68">
              A personal academic website for mathematical notes, research-oriented writing,
              problem solving, and references.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/12 px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-4 border-t border-white/12 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {currentYear} Abdelouahab Mostafa. All rights reserved.</span>
          <div className="flex flex-wrap gap-2">
            <a
              href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 px-3 py-2 font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white"
              aria-label="Email"
            >
              <Mail size={14} />
              Email
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 px-3 py-2 font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white"
              aria-label="GitHub"
            >
              <SiteIcon name="github" alt="" className="h-3.5 w-3.5 invert" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
