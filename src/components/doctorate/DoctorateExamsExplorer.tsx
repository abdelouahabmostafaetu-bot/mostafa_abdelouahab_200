"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  Lock,
} from "lucide-react";
import {
  EXAM_TYPE_LABELS,
  type DoctorateExamType,
  type DoctorateProblemSummary,
} from "@/types/doctorate-problem";

type Props = { problems: DoctorateProblemSummary[]; isAuthenticated?: boolean };

type ExamGroup = {
  key: string;
  year: number;
  examType: DoctorateExamType;
  university: string;
  specialty: string;
};

const EXAMS_PER_PAGE = 6;

const selectClass =
  "h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm " +
  "text-[var(--color-text-secondary)] outline-none transition-colors focus:border-[var(--color-accent)]";

function ExamTypeBadge({ type }: { type: DoctorateExamType }) {
  return (
    <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">
      {EXAM_TYPE_LABELS[type]}
    </span>
  );
}

function compactPages(currentPage: number, totalPages: number) {
  const pages: Array<number | "dots"> = [];
  for (let page = 1; page <= totalPages; page += 1) {
    const shouldShow =
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1;

    if (shouldShow) {
      pages.push(page);
    } else if (pages[pages.length - 1] !== "dots") {
      pages.push("dots");
    }
  }
  return pages;
}

/**
 * DoctorateExamsExplorer — simple public archive browser.
 * Data comes from the server prop only. No database calls happen here.
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
        if (!existing.university && p.university) existing.university = p.university;
        if (!existing.specialty && p.specialty) existing.specialty = p.specialty;
      } else {
        map.set(groupKey, {
          key: routeKey,
          year: p.year,
          examType: p.examType,
          university: p.university,
          specialty: p.specialty,
        });
      }
    }

    return [...map.values()].sort(
      (a, b) => b.year - a.year || a.examType.localeCompare(b.examType),
    );
  }, [problems]);

  const [examType, setExamType] = useState<"all" | DoctorateExamType>("all");
  const [year, setYear] = useState("all");
  const [university, setUniversity] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

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

  const filtered = useMemo(() => {
    return exams.filter((e) => {
      if (examType !== "all" && e.examType !== examType) return false;
      if (year !== "all" && String(e.year) !== year) return false;
      if (university !== "all" && e.university !== university) return false;
      if (specialty !== "all" && e.specialty !== specialty) return false;
      return true;
    });
  }, [exams, examType, year, university, specialty]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / EXAMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleExams = filtered.slice(
    (safePage - 1) * EXAMS_PER_PAGE,
    safePage * EXAMS_PER_PAGE,
  );
  const pages = compactPages(safePage, totalPages);

  const resetToFirstPage = () => setCurrentPage(1);

  const clearFilters = () => {
    setExamType("all");
    setYear("all");
    setUniversity("all");
    setSpecialty("all");
    setCurrentPage(1);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-14 md:pt-20">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[var(--color-accent)]">
          <GraduationCap size={18} />
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
            Doctorate Entrance Exams
          </span>
        </div>
      </header>

      {/* Controls */}
      <section
        className="mb-8 rounded-xl border p-4 md:p-5"
        style={{ borderColor: "var(--color-border)", background: "var(--color-bg-elevated)" }}
        aria-label="Exam filters"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <select
            value={examType}
            onChange={(e) => {
              setExamType(e.target.value as "all" | DoctorateExamType);
              resetToFirstPage();
            }}
            className={selectClass}
            aria-label="Filter by exam type"
          >
            <option value="all">All exam types</option>
            <option value="general">General Exam</option>
            <option value="specialist">Specialist Exam</option>
          </select>

          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              resetToFirstPage();
            }}
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
            onChange={(e) => {
              setUniversity(e.target.value);
              resetToFirstPage();
            }}
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
            onChange={(e) => {
              setSpecialty(e.target.value);
              resetToFirstPage();
            }}
            className={selectClass}
            aria-label="Filter by specialty"
          >
            <option value="all">All specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="h-11 rounded-lg border px-4 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            Clear
          </button>
        </div>
      </section>

      {/* Results */}
      {visibleExams.length === 0 ? (
        <section
          className="rounded-xl border border-dashed px-6 py-14 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="text-[var(--color-text)]" style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}>
            No exams found.
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Try a different filter.
          </p>
        </section>
      ) : (
        <section className="space-y-3" aria-label="Exam list">
          {visibleExams.map((exam) => (
            <article
              key={exam.key}
              className="rounded-xl border p-5 transition-colors hover:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-border)", background: "var(--color-bg-elevated)" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="text-[var(--color-text)]"
                      style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontVariantNumeric: "tabular-nums" }}
                    >
                      {exam.year}
                    </span>
                    <ExamTypeBadge type={exam.examType} />
                  </div>

                  <h2 className="text-base font-medium text-[var(--color-text)]">
                    {exam.specialty || "Mathematics"}
                  </h2>
                  {exam.university ? (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {exam.university}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/doctorate-exams/exam/${exam.key}`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors"
                    style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
                  >
                    Open
                    <ArrowRight size={15} />
                  </Link>

                  {isAuthenticated ? (
                    <Link
                      href={`/doctorate-exams/download/${exam.key}`}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      style={{ borderColor: "var(--color-border)" }}
                      aria-label="Download exam PDF"
                    >
                      <Download size={15} />
                      PDF
                    </Link>
                  ) : (
                    <Link
                      href="/sign-in"
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      style={{ borderColor: "var(--color-border)" }}
                      aria-label="Sign in to download PDF"
                    >
                      <Lock size={14} />
                      PDF
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Pagination */}
      {filtered.length > EXAMS_PER_PAGE ? (
        <nav className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between" aria-label="Exam pagination">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Page {safePage} of {totalPages}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              className="inline-flex h-10 items-center gap-1 rounded-lg border px-3 text-sm text-[var(--color-text-secondary)] transition-colors disabled:opacity-40"
              style={{ borderColor: "var(--color-border)" }}
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <div className="hidden items-center gap-1 sm:flex">
              {pages.map((page, index) =>
                page === "dots" ? (
                  <span key={`dots-${index}`} className="px-2 text-sm text-[var(--color-text-tertiary)]">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className="h-10 min-w-10 rounded-lg border px-3 text-sm font-medium transition-colors"
                    style={
                      page === safePage
                        ? {
                            borderColor: "var(--color-accent)",
                            background: "var(--color-accent)",
                            color: "var(--color-bg)",
                          }
                        : {
                            borderColor: "var(--color-border)",
                            color: "var(--color-text-secondary)",
                          }
                    }
                    aria-current={page === safePage ? "page" : undefined}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
              className="inline-flex h-10 items-center gap-1 rounded-lg border px-3 text-sm text-[var(--color-text-secondary)] transition-colors disabled:opacity-40"
              style={{ borderColor: "var(--color-border)" }}
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </nav>
      ) : null}
    </main>
  );
}
