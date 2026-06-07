import type { Metadata } from "next";
import { Mail, MapPin, School } from "lucide-react";
import SiteIcon from "@/components/ui/SiteIcon";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact information for Abdelouahab Mostafa — mathematics student at the University of Mila, Algeria.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="mx-auto max-w-lg px-4 md:px-6">
        <header className="mb-10 border-b border-[var(--color-border)] pb-8">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Get in Touch
          </p>
          <h1
            className="text-3xl font-semibold text-[var(--color-text)] md:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Contact
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
            Feel free to reach out for academic discussions, research questions,
            or anything else.
          </p>
        </header>

        <ul className="space-y-5">
          <li className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
              <Mail size={15} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Email
              </p>
              <a
                href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
                className="mt-0.5 block break-all text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
              >
                mostafaabdelouahab.etu@centre-univ-mila.dz
              </a>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
              <School size={15} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Institution
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                University of Mila — Department of Mathematics
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
              <MapPin size={15} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Location
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
                Mila, Algeria
              </p>
            </div>
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <SiteIcon name="github" alt="" className="h-4 w-4" />
            GitHub
          </a>
          <a
            href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            <Mail size={15} aria-hidden="true" />
            Email
          </a>
        </div>
      </div>
    </div>
  );
}
