import type { Metadata } from 'next';
import Link from 'next/link';
import { Github, Mail, MapPin, School } from 'lucide-react';
import ContactFormClient from '@/components/contact/ContactFormClient';
import SiteIcon from '@/components/ui/SiteIcon';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with Abdelouahab Mostafa — Master\'s student in Fundamental Mathematics at the University of Mila, Algeria.',
};

/* ─── Static data ─────────────────────────────────────────────────────────── */
const contactDetails = [
  {
    icon: Mail,
    label: 'Email',
    value: 'mostafaabdelouahab.etu@centre-univ-mila.dz',
    href:  'mailto:mostafaabdelouahab.etu@centre-univ-mila.dz',
    copyable: true,
  },
  {
    icon: School,
    label: 'Institution',
    value: 'University of Mila — Mathematics Department',
    href:  null,
    copyable: false,
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Mila, Algeria',
    href:  null,
    copyable: false,
  },
] as const;

const quickLinks = [
  { href: '/blog',                  label: 'Read the Blog',          icon: 'blog'     },
  { href: '/notes',                 label: 'Browse My Notes',        icon: 'notebook' },
  { href: '/problems-with-coffee',  label: 'Problems with Coffee',   icon: 'math'     },
  { href: '/library',               label: 'My Book Library',        icon: 'library'  },
  { href: '/cv',                    label: 'View My CV',             icon: 'document' },
] as const;

/* ─── Info row in the sidebar ─────────────────────────────────────────────── */
function ContactDetail({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href: string | null;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
        <Icon size={15} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="mt-0.5 block break-all text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            {value}
          </a>
        ) : (
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{value}</p>
        )}
      </div>
    </li>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(243,107,22,0.06),transparent_40rem)] pb-20 pt-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">

        {/* ── Page header ── */}
        <header className="mb-10 border-b border-[var(--color-border)] pb-8 md:mb-14 md:pb-10">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)] md:text-xs">
            Get in Touch
          </p>
          <h1
            className="text-3xl font-semibold text-[var(--color-text)] md:text-5xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Contact
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)] md:text-base md:leading-8">
            Have a question about mathematics, want to discuss research, or just want to say
            hello? I&rsquo;d be happy to hear from you.
          </p>
        </header>

        {/* ── Two-column layout ── */}
        <div className="grid gap-12 md:grid-cols-[1fr_340px] lg:gap-16">

          {/* LEFT — contact form */}
          <section>
            <h2
              className="mb-6 text-lg font-semibold text-[var(--color-text)] md:text-xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Send a Message
            </h2>
            <ContactFormClient />
          </section>

          {/* RIGHT — sidebar */}
          <aside className="space-y-10">

            {/* Contact details */}
            <div>
              <h2
                className="mb-5 text-base font-semibold text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Contact Details
              </h2>
              <ul className="space-y-4">
                {contactDetails.map((d) => (
                  <ContactDetail key={d.label} {...d} />
                ))}
              </ul>
            </div>

            {/* Social / external links */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Connect
              </h3>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <SiteIcon name="github" alt="" className="h-4 w-4" />
                  GitHub
                </a>
                <a
                  href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <Mail size={15} aria-hidden="true" />
                  Email
                </a>
              </div>
            </div>

            {/* Response time note */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Response Time
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                I typically respond within <span className="font-medium text-[var(--color-text)]">2–4 days</span>.
                For urgent academic matters, please write me directly via email.
              </p>
            </div>

            {/* Explore the site */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Explore the Site
              </h3>
              <nav className="flex flex-col gap-2">
                {quickLinks.map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
                  >
                    <SiteIcon name={icon} alt="" className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
