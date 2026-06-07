import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail, MapPin } from "lucide-react";
import SiteIcon from "@/components/ui/SiteIcon";
import CVPrintButton from "@/components/cv/CVPrintButton";
import { getBlogPosts } from "@/lib/content";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Curriculum Vitae",
  description:
    "Academic CV of Abdelouahab Mostafa — Master's student in Fundamental Mathematics at the University of Mila, Algeria.",
};

/* ═══════════════════════  Static CV data  ════════════════════════════════ */

const education = [
  {
    degree: "Master's in Fundamental Mathematics",
    institution:
      "Centre Universitaire Abdelhafid Boussouf — University of Mila",
    location: "Mila, Algeria",
    period: "2023 — Present",
    description:
      "Pursuing an advanced degree focused on the theoretical foundations of mathematics. " +
      "Current research interests include dynamical systems, functional analysis, and topology.",
    courses: [
      "Dynamical Systems",
      "Functional Analysis",
      "Algebraic Topology",
      "Measure Theory",
    ],
  },
  {
    degree: "Bachelor's in Mathematics",
    institution:
      "Centre Universitaire Abdelhafid Boussouf — University of Mila",
    location: "Mila, Algeria",
    period: "2020 — 2023",
    description:
      "Completed a rigorous undergraduate program covering the core areas of pure mathematics. " +
      "Developed strong foundations in analysis, algebra, and geometry.",
    courses: [
      "Real Analysis",
      "Abstract Algebra",
      "Linear Algebra",
      "Differential Equations",
    ],
  },
] as const;

const researchInterests = [
  {
    area: "Dynamical Systems",
    symbol: "𝒟",
    description:
      "Long-term behavior of systems evolving over time — stability, attractors, bifurcations, and chaos.",
  },
  {
    area: "Functional Analysis",
    symbol: "∫",
    description:
      "Infinite-dimensional vector spaces, Banach and Hilbert spaces, bounded operators and spectral theory.",
  },
  {
    area: "Topology",
    symbol: "τ",
    description:
      "General and algebraic topology: continuity, compactness, connectedness, and homotopy theory.",
  },
  {
    area: "Measure Theory",
    symbol: "μ",
    description:
      "Abstract measure spaces, Lebesgue integration, convergence theorems and product measures.",
  },
  {
    area: "Differential Equations",
    symbol: "∂",
    description:
      "Qualitative theory of ODEs and PDEs — existence, uniqueness, stability and asymptotic behavior.",
  },
  {
    area: "Ergodic Theory",
    symbol: "∑",
    description:
      "Statistical behavior of measure-preserving dynamical systems and long-time averages.",
  },
] as const;

const skills = [
  {
    category: "Mathematical Typesetting",
    items: ["LaTeX", "KaTeX", "BibTeX", "TikZ", "Beamer"],
  },
  {
    category: "Computer Algebra & Computation",
    items: [
      "SageMath",
      "Python + SymPy",
      "Mathematica (basic)",
      "Maple (basic)",
    ],
  },
  {
    category: "Programming & Web",
    items: ["Python", "TypeScript", "Next.js", "React", "MongoDB", "Git"],
  },
  {
    category: "Academic Tools",
    items: ["Zotero", "Overleaf", "VS Code", "GitHub", "Linux"],
  },
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
  "Abstract Algebra (Groups, Rings, Fields)",
  "Linear & Multilinear Algebra",
  "Numerical Analysis",
  "Probability & Statistics",
  "Differential Geometry",
  "Dynamical Systems",
  "Mathematical Logic",
  "Set Theory",
] as const;

const languages = [
  { name: "Arabic", level: "Native", stars: 5 },
  { name: "French", level: "Professional", stars: 4 },
  { name: "English", level: "Proficient", stars: 4 },
] as const;

/* ════════════════════════  Sub-components  ══════════════════════════════ */

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-7 border-b border-[var(--color-border)] pb-3">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)] md:text-[10px]">
        {eyebrow}
      </p>
      <h2
        className="text-xl font-semibold text-[var(--color-text)] md:text-2xl"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {title}
      </h2>
    </div>
  );
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${value} out of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i < value ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
          }`}
        />
      ))}
    </div>
  );
}

/* ════════════════════════  Page  ════════════════════════════════════════ */

export default async function CVPage() {
  /* Fetch recent published blog posts to use as "Publications & Writing" */
  const recentPosts = await getBlogPosts()
    .then((posts) => posts.slice(0, 6))
    .catch(() => []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-24 pt-20 print:pt-4 print:pb-8">
      <div className="mx-auto max-w-4xl px-4 md:px-6 print:max-w-none print:px-8">
        {/* ── Top navigation (hidden when printing) ── */}
        <div className="mb-8 flex items-center justify-between print:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to Home
          </Link>
          <CVPrintButton />
        </div>

        {/* ══════════════════  HEADER  ══════════════════ */}
        <header className="mb-12 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-10 print:rounded-none print:border-0 print:p-0">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Name + title */}
            <div className="flex-1">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
                Curriculum Vitae
              </p>
              <h1
                className="text-4xl font-semibold leading-[1.05] text-[var(--color-text)] sm:text-5xl"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Abdelouahab
                <br className="hidden sm:block" /> Mostafa
              </h1>
              <p className="mt-3 text-sm text-[var(--color-text-secondary)] sm:text-base">
                Master&rsquo;s Student in Fundamental Mathematics
              </p>

              {/* Contact chips */}
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin
                    size={12}
                    className="text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  Mila, Algeria
                </span>
                <a
                  href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-accent)]"
                >
                  <Mail
                    size={12}
                    className="text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  mostafaabdelouahab.etu@centre-univ-mila.dz
                </a>
                <a
                  href="https://www.mostafaabdelouahab.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-accent)]"
                >
                  <ExternalLink
                    size={12}
                    className="text-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                  mostafaabdelouahab.me
                </a>
              </div>
            </div>

            {/* Monogram badge */}
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#194a50] text-[1.75rem] font-bold text-[#4f98a3] print:hidden"
              style={{ fontFamily: "var(--font-serif)" }}
              aria-hidden="true"
            >
              AM
            </div>
          </div>
        </header>

        {/* ══════════════════  EDUCATION  ══════════════════ */}
        <section className="mb-14">
          <SectionHeader eyebrow="Academic Background" title="Education" />
          <div className="space-y-8">
            {education.map((edu) => (
              <div
                key={edu.degree}
                className="relative border-l-2 border-[var(--color-accent)]/30 pl-6"
              >
                {/* Timeline dot */}
                <div className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-bg)]" />

                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3
                      className="text-base font-semibold text-[var(--color-text)] md:text-lg"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {edu.degree}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[var(--color-accent)]">
                      {edu.institution}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                      {edu.location}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[var(--color-border)] px-3 py-1 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                    {edu.period}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {edu.description}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {edu.courses.map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════  RESEARCH INTERESTS  ══════════════════ */}
        <section className="mb-14">
          <SectionHeader eyebrow="Academic Focus" title="Research Interests" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {researchInterests.map((item) => (
              <div
                key={item.area}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]/40"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 font-mono text-base text-[var(--color-accent)]"
                    aria-hidden="true"
                  >
                    {item.symbol}
                  </span>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">
                    {item.area}
                  </h3>
                </div>
                <p className="text-xs leading-[1.7] text-[var(--color-text-secondary)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════  SKILLS  ══════════════════ */}
        <section className="mb-14">
          <SectionHeader eyebrow="Technical Expertise" title="Skills & Tools" />
          <div className="grid gap-7 sm:grid-cols-2">
            {skills.map(({ category, items }) => (
              <div key={category}>
                <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  {category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════  RELEVANT COURSES  ══════════════════ */}
        <section className="mb-14">
          <SectionHeader
            eyebrow="Academic Coursework"
            title="Relevant Courses"
          />
          <div className="flex flex-wrap gap-2">
            {relevantCourses.map((course) => (
              <span
                key={course}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]"
              >
                {course}
              </span>
            ))}
          </div>
        </section>

        {/* ══════════════════  PUBLICATIONS / WRITING  ══════════════════ */}
        {recentPosts.length > 0 && (
          <section className="mb-14">
            <SectionHeader
              eyebrow="Academic Writing"
              title="Publications & Notes"
            />
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)]/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                        {post.category}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">
                        {formatDate(post.publishedAt || post.createdAt)}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">
                        {post.readingTime}
                      </span>
                    </div>
                    <h3
                      className="text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-1"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                      {post.excerpt}
                    </p>
                  </div>
                  <ExternalLink
                    size={13}
                    className="mt-1 shrink-0 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)] transition-colors"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
            <div className="mt-5">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
              >
                <SiteIcon name="blog" alt="" className="h-3.5 w-3.5" />
                View all posts →
              </Link>
            </div>
          </section>
        )}

        {/* ══════════════════  LANGUAGES  ══════════════════ */}
        <section className="mb-14">
          <SectionHeader eyebrow="Communication" title="Languages" />
          <div className="flex flex-wrap gap-4">
            {languages.map(({ name, level, stars }) => (
              <div
                key={name}
                className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {name}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                    {level}
                  </p>
                  <div className="mt-1.5">
                    <StarRating value={stars} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════  ONLINE PRESENCE  ══════════════════ */}
        <section className="mb-14 print:hidden">
          <SectionHeader eyebrow="Digital" title="Online Presence" />
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/blog", label: "Mathematics Blog", icon: "blog" },
              { href: "/notes", label: "Mathematical Notes", icon: "notebook" },
              {
                href: "/problems-with-coffee",
                label: "Problem Sets",
                icon: "math",
              },
              { href: "/library", label: "Book Library", icon: "library" },
            ].map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <SiteIcon
                  name={icon as "blog" | "notebook" | "math" | "library"}
                  alt=""
                  className="h-4 w-4"
                />
                {label}
                <ExternalLink
                  size={11}
                  className="text-[var(--color-text-tertiary)]"
                  aria-hidden="true"
                />
              </Link>
            ))}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <SiteIcon name="github" alt="" className="h-4 w-4" />
              GitHub
              <ExternalLink
                size={11}
                className="text-[var(--color-text-tertiary)]"
                aria-hidden="true"
              />
            </a>
          </div>
        </section>

        {/* ══════════════════  CONTACT CTA  ══════════════════ */}
        <div className="print:hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3
                className="text-lg font-semibold text-[var(--color-text)]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Interested in collaborating?
              </h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                I&rsquo;m always open to academic discussions, research
                questions, and collaboration.
              </p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[#0f0e0d] transition-opacity hover:opacity-90"
            >
              <Mail size={14} aria-hidden="true" />
              Get in Touch
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
