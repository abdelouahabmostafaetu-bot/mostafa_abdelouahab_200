import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, MapPin } from "lucide-react";
import SiteIcon from "@/components/ui/SiteIcon";
import CVPrintButton from "@/components/cv/CVPrintButton";
import { getCVData } from "@/lib/cv-data";
import { getCurrentAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Curriculum Vitae",
  description:
    "Academic CV of Abdelouahab Mostafa — Master's student in Fundamental Mathematics at the University of Mila, Algeria.",
};

/* ─── Static sections (skills, courses, languages) ─────────────────────── */

const skills = [
  {
    category: "Mathematical Typesetting",
    items: ["LaTeX", "KaTeX", "BibTeX", "TikZ", "Beamer"],
  },
  { category: "Computation", items: ["SageMath", "Python + SymPy"] },
  {
    category: "Programming & Web",
    items: ["Python", "TypeScript", "Next.js", "MongoDB", "Git"],
  },
  { category: "Tools", items: ["Zotero", "Overleaf", "VS Code", "GitHub"] },
] as const;

const relevantCourses = [
  "Real Analysis I & II",
  "Complex Analysis",
  "Functional Analysis",
  "Measure Theory & Integration",
  "General Topology",
  "Algebraic Topology",
  "Ordinary Differential Equations",
  "Partial Differential Equations",
  "Abstract Algebra",
  "Linear Algebra",
  "Numerical Analysis",
  "Probability & Statistics",
  "Differential Geometry",
  "Dynamical Systems",
  "Mathematical Logic",
  "Set Theory",
] as const;

const languages = [
  { name: "Arabic", level: "Native" },
  { name: "French", level: "Professional" },
  { name: "English", level: "Proficient" },
] as const;

/* ─── Section heading ───────────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-5 border-b border-[var(--color-border)] pb-3">
      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
        {eyebrow}
      </p>
      <h2
        className="text-lg font-semibold text-[var(--color-text)] md:text-xl"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {title}
      </h2>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default async function CVPage() {
  const [cvData, adminUser] = await Promise.all([
    getCVData(),
    getCurrentAdminUser(),
  ]);

  return (
    <div className="min-h-screen pb-24 pt-20">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        {/* ── Top bar ── */}
        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={13} />
            Home
          </Link>
          <div className="flex items-center gap-2">
            {adminUser && (
              <Link
                href="/cv/admin"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <SiteIcon name="edit" alt="" className="h-3.5 w-3.5" />
                Edit CV
              </Link>
            )}
            <CVPrintButton />
          </div>
        </div>

        {/* ══════════  HEADER — plain text, no box  ══════════ */}
        <header className="mb-14 border-b border-[var(--color-border)] pb-8">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Curriculum Vitae
          </p>
          <h1
            className="text-4xl font-semibold leading-tight text-[var(--color-text)] md:text-5xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Abdelouahab Mostafa
          </h1>
          <p className="mt-2 text-base text-[var(--color-text-secondary)]">
            Master&rsquo;s Student in Fundamental Mathematics
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} className="text-[var(--color-accent)]" />
              Mila, Algeria
            </span>
            <a
              href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-accent)]"
            >
              <Mail size={13} className="text-[var(--color-accent)]" />
              mostafaabdelouahab.etu@centre-univ-mila.dz
            </a>
          </div>
        </header>

        {/* ══════════  EDUCATION  ══════════ */}
        <section className="mb-12">
          <SectionHeader eyebrow="Academic Background" title="Education" />
          <div className="space-y-6">
            {cvData.education.map((edu, i) => (
              <div
                key={i}
                className="relative border-l-2 border-[var(--color-accent)]/25 pl-5"
              >
                <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3
                      className="text-sm font-semibold text-[var(--color-text)] md:text-base"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {edu.degree}
                    </h3>
                    <p className="mt-0.5 text-sm text-[var(--color-accent)]">
                      {edu.institution}
                    </p>
                    {edu.location && (
                      <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                        {edu.location}
                      </p>
                    )}
                  </div>
                  {edu.period && (
                    <span className="shrink-0 rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                      {edu.period}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════  RESEARCH INTERESTS — simple chips, no description  ══════════ */}
        {cvData.researchInterests.length > 0 && (
          <section className="mb-12">
            <SectionHeader
              eyebrow="Academic Focus"
              title="Research Interests"
            />
            <div className="flex flex-wrap gap-2">
              {cvData.researchInterests.map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ══════════  SKILLS  ══════════ */}
        <section className="mb-12">
          <SectionHeader eyebrow="Technical Expertise" title="Skills & Tools" />
          <div className="grid gap-5 sm:grid-cols-2">
            {skills.map(({ category, items }) => (
              <div key={category}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  {category}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <span
                      key={item}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-secondary)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════  RELEVANT COURSES  ══════════ */}
        <section className="mb-12">
          <SectionHeader
            eyebrow="Academic Coursework"
            title="Relevant Courses"
          />
          <div className="flex flex-wrap gap-1.5">
            {relevantCourses.map((course) => (
              <span
                key={course}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]"
              >
                {course}
              </span>
            ))}
          </div>
        </section>

        {/* ══════════  LANGUAGES  ══════════ */}
        <section className="mb-12">
          <SectionHeader eyebrow="Communication" title="Languages" />
          <div className="flex flex-wrap gap-3">
            {languages.map(({ name, level }) => (
              <div
                key={name}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                  {level}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════  ONLINE PRESENCE  ══════════ */}
        <section className="print:hidden">
          <SectionHeader eyebrow="Digital" title="Online Presence" />
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/blog", label: "Blog", icon: "blog" },
              { href: "/notes", label: "Notes", icon: "notebook" },
              {
                href: "/problems-with-coffee",
                label: "Problems",
                icon: "math",
              },
              { href: "/library", label: "Library", icon: "library" },
            ].map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <SiteIcon
                  name={icon as "blog" | "notebook" | "math" | "library"}
                  alt=""
                  className="h-3.5 w-3.5"
                />
                {label}
              </Link>
            ))}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <SiteIcon name="github" alt="" className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
