"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  GraduationCap,
  Search,
  X,
  Lock,
  Building2,
  CalendarDays,
  Layers,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import {
  EXAM_TYPE_LABELS,
  type DoctorateExamType,
  type DoctorateProblemSummary,
} from "@/types/doctorate-problem";

type Props = { problems: DoctorateProblemSummary[]; isAuthenticated?: boolean };

type ExamGroup = {
  key: string; // route key: examId (e.g. "3") or legacy "${year}-${examType}"
  year: number;
  examType: DoctorateExamType;
  university: string;
  specialty: string;
  problemCount: number;
  solutionCount: number;
  tags: string[];
};

type SortMode = "newest" | "oldest";

const selectClass =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-xs " +
  "text-[var(--color-text-secondary)] outline-none transition-colors focus:border-[var(--color-accent)]";

function ExamTypeBadge({ type }: { type: DoctorateExamType }) {
  const isGeneral = type === "general";
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em]"
      style={
        isGeneral
          ? {
              borderColor: "color-mix(in oklab, var(--color-accent) 40%, transparent)",
              background: "color-mix(in oklab, var(--color-accent) 12%, transparent)",
              color: "var(--color-accent)",
            }
          : {
              borderColor: "rgba(56, 189, 248, 0.4)",
              background: "rgba(56, 189, 248, 0.12)",
              color: "rgb(125, 211, 252)",
            }
      }
    >
      {EXAM_TYPE_LABELS[type]}
    </span>
  );
}

function StatCell({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 p-4 md:p-5"
      style={{ background: "var(--color-bg-elevated)" }}
    >
      <div className="flex items-center gap-2 text-[var(--color-accent)]">
        {icon}
        <span
          className="text-2xl font-normal text-[var(--color-text)] md:text-[1.7rem]"
          style={{ fontFamily: "var(--font-serif)", fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </span>
      </div>
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
        {label}
      </span>
    </div>
  );
}

/**
 * DoctorateExamsExplorer — a browsable archive of past doctorate entrance
 * exams. Search, live stats, and year-grouped timeline are all derived from
 * the `problems` prop on the client; no data fetching or DB access happens
 * here. Each exam links to its full view and (for signed-in users) a printable
 * PDF, using the same routes as before.
 */
export default function DoctorateExamsExplorer({
  problems,
  isAuthenticated,
}: Props) {
  const exams = useMemo(() => {
    const map = new Map<string, ExamGroup>();
    for (const p of problems) {
      const hasId = p.examId != null;
      const groupKey = hasId ? `id-${p.examId}` : `${p.year}-${p.examType}`;
      const routeKey = hasId ? String(p.examId) : `${p.year}-${p.examType}`;
      const existing = map.get(groupKey);
      if (existing) {
        existing.problemCount += 1;
        if (p.hasSolution) existing.solutionCount += 1;
        if (!existing.university && p.university) existing.university = p.university;
        if (!existing.specialty && p.specialty) existing.specialty = p.specialty;
        for (const t of p.tags ?? []) {
          if (t && !existing.tags.includes(t)) existing.tags.push(t);
        }
      } else {
        map.set(groupKey, {
          key: routeKey,
          year: p.year,
          examType: p.examType,
          university: p.university,
          specialty: p.specialty,
          problemCount: 1,
          solutionCount: p.hasSolution ? 1 : 0,
          tags: [...(p.tags ?? [])].filter(Boolean),
        });
      }
    }
    return [...map.values()];
  }, [problems]);

  const [query, setQuery] = useState("");
  const [examType, setExamType] = useState<"all" | DoctorateExamType>("all");
  const [year, setYear] = useState<string>("all");
  const [university, setUniversity] = useState<string>("all");
  const [specialty, setSpecialty] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("newest");

  const years = useMemo(
    () => [...new Set(exams.map((e) => e.year))].sort((a, b) => b - a),
    [exams],
  );
  const universities = useMemo(
    () =>
      [...new Set(exams.map((e) => e.university).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [exams],
  );
  const specialties = useMemo(
    () =>
      [...new Set(exams.map((e) => e.specialty).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [exams],
  );

  const stats = useMemo(() => {
    const totalProblems = exams.reduce((sum, e) => sum + e.problemCount, 0);
    return {
      exams: exams.length,
      problems: totalProblems,
      years: years.length,
      universities: universities.length,
    };
  }, [exams, years, universities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = exams.filter((e) => {
      if (examType !== "all" && e.examType !== examType) return false;
      if (year !== "all" && String(e.year) !== year) return false;
      if (university !== "all" && e.university !== university) return false;
      if (specialty !== "all" && e.specialty !== specialty) return false;
      if (q) {
        const haystack = [
          e.specialty,
          e.university,
          String(e.year),
          EXAM_TYPE_LABELS[e.examType],
          ...e.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    result.sort((a, b) =>
      sort === "newest"
        ? b.year - a.year || a.examType.localeCompare(b.examType)
        : a.year - b.year || a.examType.localeCompare(b.examType),
    );
    return result;
  }, [exams, examType, year, university, specialty, query, sort]);

  const grouped = useMemo(() => {
    const map = new Map<number, ExamGroup[]>();
    for (const e of filtered) {
      const bucket = map.get(e.year);
      if (bucket) bucket.push(e);
      else map.set(e.year, [e]);
    }
    return [...map.entries()].sort(([a], [b]) =>
      sort === "newest" ? b - a : a - b,
    );
  }, [filtered, sort]);

  const activeFilters =
    (examType !== "all" ? 1 : 0) +
    (year !== "all" ? 1 : 0) +
    (university !== "all" ? 1 : 0) +
    (specialty !== "all" ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearAll = () => {
    setQuery("");
    setExamType("all");
    setYear("all");
    setUniversity("all");
    setSpecialty("all");
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-24">
      {/* ── Header ── */}
      <header className="pt-14 pb-8 md:pt-20">
        <div className="mb-4 flex items-center gap-2 text-[var(--color-accent)]">
          <GraduationCap size={18} />
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.22em]">
            Doctorate Entrance Exams — Algeria
          </span>
        </div>
        <h1
          className="font-normal text-[var(--color-text)]"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(2.1rem, 6vw, 3.1rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Exam Archive
        </h1>
        <p className="mt-5 max-w-[58ch] text-[var(--color-text-secondary)]" style={{ lineHeight: 1.7 }}>
          Past mathematics doctorate (PhD) entrance exams from Algerian
          universities: general and specialist papers from previous years, each
          with complete, professionally written solutions.
        </p>
      </header>

      {/* ── Live stats ── */}
      <div
        className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border md:grid-cols-4"
        style={{ borderColor: "var(--color-border)", background: "var(--color-border)" }}
      >
        <StatCell icon={<FileText size={16} />} value={stats.exams} label="Exams" />
        <StatCell icon={<Layers size={16} />} value={stats.problems} label="Problems" />
        <StatCell icon={<CalendarDays size={16} />} value={stats.years} label="Years" />
        <StatCell icon={<Building2 size={16} />} value={stats.universities} label="Universities" />
      </div>

      {/* ── Search + sort ── */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by specialty, university, year, or topic"
            aria-label="Search exams"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-9 pr-9 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)]"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort exams"
          className={"sm:w-44 " + selectClass}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* ── Filters ── */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <select
          value={examType}
          onChange={(e) => setExamType(e.target.value as "all" | DoctorateExamType)}
          className={selectClass}
          aria-label="Filter by exam type"
        >
          <option value="all">All exam types</option>
          <option value="general">General Exam</option>
          <option value="specialist">Specialist Exam</option>
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className={selectClass}
          aria-label="Filter by year"
        >
          <option value="all">All years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          className={selectClass}
          aria-label="Filter by university"
        >
          <option value="all">All universities</option>
          {universities.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className={"md:col-span-3 " + selectClass}
          aria-label="Filter by specialty"
        >
          <option value="all">All specialties</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ── Active filter summary ── */}
      <div className="mt-4 flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
          <SlidersHorizontal size={13} />
          Showing {filtered.length} of {exams.length} exam{exams.length !== 1 ? "s" : ""}
        </p>
        {activeFilters > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
          >
            <X size={13} />
            Clear filters ({activeFilters})
          </button>
        ) : null}
      </div>

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div
          className="mt-10 rounded-xl border border-dashed px-6 py-16 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-[var(--color-text)]" style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}>
            {exams.length === 0
              ? "The archive is being prepared"
              : "No exams match your filters"}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {exams.length === 0
              ? "Past exams and solutions will appear here soon."
              : "Try a different search or clear the filters."}
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {grouped.map(([groupYear, groupExams]) => (
            <section key={groupYear}>
              {/* Year heading */}
              <div className="mb-5 flex items-baseline gap-3">
                <h2
                  className="font-normal text-[var(--color-text)]"
                  style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", fontVariantNumeric: "tabular-nums" }}
                >
                  {groupYear}
                </h2>
                <span className="h-px flex-1" style={{ background: "var(--color-border)" }} />
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {groupExams.length} exam{groupExams.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Exam rows */}
              <div className="space-y-3">
                {groupExams.map((e) => (
                  <article
                    key={e.key}
                    className="group rounded-xl border p-5 transition-colors duration-200 hover:border-[var(--color-accent)] md:p-6"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-bg-elevated)" }}
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      {/* Info */}
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <ExamTypeBadge type={e.examType} />
                          {e.specialty ? (
                            <span
                              className="text-[var(--color-text)]"
                              style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}
                            >
                              {e.specialty}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-text-secondary)]">
                          {e.university ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 size={13} className="text-[var(--color-text-tertiary)]" />
                              {e.university}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1.5">
                            <Layers size={13} className="text-[var(--color-text-tertiary)]" />
                            {e.problemCount} problem{e.problemCount !== 1 ? "s" : ""}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2
                              size={13}
                              className={
                                e.solutionCount > 0
                                  ? "text-[var(--color-accent)]"
                                  : "text-[var(--color-text-tertiary)]"
                              }
                            />
                            {e.solutionCount}/{e.problemCount} solved
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2.5">
                        <Link
                          href={`/doctorate-exams/exam/${e.key}`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200"
                          style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
                        >
                          View Full Exam
                          <ArrowRight size={15} />
                        </Link>
                        {isAuthenticated ? (
                          <Link
                            href={`/doctorate-exams/download/${e.key}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                            style={{ borderColor: "var(--color-border)" }}
                            aria-label="Download exam as PDF"
                          >
                            <Download size={15} />
                            <span className="hidden sm:inline">PDF</span>
                          </Link>
                        ) : (
                          <Link
                            href="/sign-in"
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium text-[var(--color-text-tertiary)] transition-colors duration-200 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                            style={{ borderColor: "var(--color-border)" }}
                            aria-label="Sign in to download"
                          >
                            <Lock size={14} />
                            <span className="hidden sm:inline">PDF</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
