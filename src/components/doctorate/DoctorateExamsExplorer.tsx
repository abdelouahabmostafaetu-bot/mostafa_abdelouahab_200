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
  SearchX,
} from "lucide-react";
import {
  EXAM_TYPE_LABELS,
  type DoctorateExamType,
  type DoctorateProblemSummary,
} from "@/types/doctorate-problem";
import Reveal from "@/components/visual/Reveal";
import MathMotif from "@/components/visual/MathMotif";
import CountUp from "@/components/visual/CountUp";

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
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm " +
  "text-[var(--text-muted)] outline-none transition-colors duration-150 motion-reduce:transition-none " +
  "hover:border-[var(--border-strong)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:w-auto";

/** Color-coded tag using accent variants only. */
function ExamTypeBadge({ type }: { type: DoctorateExamType }) {
  const isGeneral = type === "general";
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ring-1 ring-inset ${
        isGeneral
          ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent-muted)]"
          : "bg-[var(--surface-raised)] text-[var(--accent-strong)] ring-[var(--border-strong)]"
      }`}
    >
      {EXAM_TYPE_LABELS[type]}
    </span>
  );
}

function compactPages(currentPage: number, totalPages: number) {
  const pages: Array<number | "dots"> = [];
  for (let page = 1; page <= totalPages; page += 1) {
    const shouldShow =
      page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;

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

  const hasActiveFilters =
    examType !== "all" ||
    year !== "all" ||
    university !== "all" ||
    specialty !== "all";

  const clearFilters = () => {
    setExamType("all");
    setYear("all");
    setUniversity("all");
    setSpecialty("all");
    setCurrentPage(1);
  };

  return (
    <div className="mx-auto max-w-wide px-4 py-10 sm:px-6 md:py-14">
      {/* ===== Header ===== */}
      <header className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
        <div className="absolute inset-0 bg-hero-mesh" aria-hidden="true" />
        <MathMotif
          name="integral"
          opacity={0.1}
          className="absolute -right-2 top-1/2 hidden h-[130%] -translate-y-1/2 sm:block"
        />
        <div className="relative z-10 max-w-2xl">
          <p className="eyebrow flex items-center gap-2">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Doctorate Entrance Exams
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-[var(--text)] sm:text-5xl">
            Doctorate Exam Archive
          </h1>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-[var(--text-muted)]">
            Past mathematics doctorate (PhD) entrance exams in Algeria — general
            and specialist papers from previous years, with complete solutions.
          </p>
          <p className="mt-4 text-sm text-[var(--text-subtle)]">
            <CountUp
              value={exams.length}
              className="font-semibold text-[var(--text)]"
            />{" "}
            {exams.length === 1 ? "exam" : "exams"} archived
          </p>
        </div>
      </header>

      {/* ===== Filter bar ===== */}
      <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 text-sm font-medium text-[var(--accent)] transition-colors duration-150 hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:ml-auto"
            >
              <SearchX className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <p className="mt-3 text-xs text-[var(--text-subtle)]">
            Showing{" "}
            <span className="font-semibold text-[var(--text-muted)]">
              {filtered.length}
            </span>{" "}
            of {exams.length}
          </p>
        )}
      </div>

      {/* ===== Results ===== */}
      {visibleExams.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--surface)] text-[var(--text-subtle)]">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-5 font-serif text-xl text-[var(--text)]">
            No exams match your filters
          </h2>
          <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
            Try widening your selection, or clear the filters to see every
            archived exam.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <SearchX className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleExams.map((exam, i) => (
            <Reveal key={exam.key} className="h-full" delay={(i % 3) * 70}>
              <article
                className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] transition duration-200 ease-out hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow-glow)] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-2.5 py-1 text-sm font-semibold text-[var(--text)]">
                    {exam.year}
                  </span>
                  <ExamTypeBadge type={exam.examType} />
                </div>

                <h2 className="mt-4 font-serif text-xl leading-snug text-[var(--text)] transition-colors duration-150 group-hover:text-[var(--accent)]">
                  {exam.specialty || "Mathematics"}
                </h2>
                {exam.university ? (
                  <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                    {exam.university}
                  </p>
                ) : null}

                <div className="mt-5 flex items-center gap-2.5 pt-4 border-t border-[var(--border)]">
                  <Link
                    href={`/doctorate-exams/exam/${exam.key}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--bg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] motion-reduce:transition-none"
                  >
                    Open
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>

                  {isAuthenticated ? (
                    <a
                      href={`/doctorate-exams/download/${exam.key}`}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      PDF
                    </a>
                  ) : (
                    <Link
                      href="/sign-in"
                      aria-label="Sign in to download the PDF"
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-subtle)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      PDF
                    </Link>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}

      {/* ===== Pagination ===== */}
      {filtered.length > EXAMS_PER_PAGE ? (
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-[var(--text-subtle)]">
            Page {safePage} of {totalPages}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {pages.map((page, index) =>
                page === "dots" ? (
                  <span
                    key={`dots-${index}`}
                    className="px-1 text-sm text-[var(--text-subtle)]"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    aria-current={page === safePage ? "page" : undefined}
                    className={`h-11 min-w-11 rounded-[var(--radius-md)] border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none ${
                      page === safePage
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={safePage === totalPages}
              className="inline-flex h-11 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] px-3 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transition-none"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
