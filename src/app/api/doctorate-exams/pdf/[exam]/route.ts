import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { DoctorateProblem } from "@/lib/models/doctorate-problem";
import { checkRateLimit } from "@/lib/security";
import { renderMarkdownPreviewToHtml } from "@/lib/mdx-preview";
import {
  buildExamDocumentHtml,
  escapeHtml,
  launchBrowser,
} from "@/lib/doctorate-pdf";
import type { DoctorateExamType } from "@/types/doctorate-problem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type LeanProblem = {
  _id: unknown;
  title: string;
  slug: string;
  specialty: string;
  university: string;
  source: string;
  year: number;
  examType: DoctorateExamType;
  problemNumber?: number;
  statement: string;
  solution: string;
};

type ParsedExam =
  { examId: number } | { year: number; examType: DoctorateExamType };

function parseExam(exam: string): ParsedExam | null {
  if (/^\d+$/.test(exam)) return { examId: Number(exam) };
  const m = /^(\d{4})-(general|specialist)$/.exec(exam);
  if (!m) return null;
  return { year: Number(m[1]), examType: m[2] as DoctorateExamType };
}

function buildQuery(parsed: ParsedExam): Record<string, unknown> {
  return "examId" in parsed
    ? { published: true, examId: parsed.examId }
    : { published: true, year: parsed.year, examType: parsed.examType };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exam: string }> },
) {
  try {
    /* ── Auth wall ── */
    const user = await getSessionUser();
    if (!user) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect_url", request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl, { status: 302 });
    }

    const rateLimitResponse = checkRateLimit(request, "doctorate-exams:pdf", 5);
    if (rateLimitResponse) return rateLimitResponse;

    const { exam } = await params;
    const parsed = parseExam(exam);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: "Invalid exam reference" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const problems = (await DoctorateProblem.find(buildQuery(parsed))
      .sort({ problemNumber: 1, createdAt: 1 })
      .select(
        "title slug specialty university source year examType problemNumber statement solution",
      )
      .lean()) as unknown as LeanProblem[];

    if (problems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Exam not found" },
        { status: 404 },
      );
    }

    const year = problems[0].year;
    const examType = problems[0].examType;
    const specialty = problems[0].specialty ?? "";

    /* Render every statement/solution (Markdown + LaTeX -> HTML with KaTeX) */
    const rendered = await Promise.all(
      problems.map(async (p, i) => ({
        number: p.problemNumber ?? i + 1,
        statementHtml: await renderMarkdownPreviewToHtml(p.statement ?? ""),
        solutionHtml: String(p.solution ?? "").trim()
          ? await renderMarkdownPreviewToHtml(p.solution)
          : null,
      })),
    );

    const epreuveLabel =
      examType === "general"
        ? "Math\u00e9matiques g\u00e9n\u00e9rales"
        : `Sp\u00e9cialit\u00e9${specialty ? ` \u2014 ${escapeHtml(specialty)}` : ""}`;

    const html = buildExamDocumentHtml({
      documentTitle: `\u00c9preuve : ${epreuveLabel}`,
      documentSubtitle: `Concours d'acc\u00e8s au Doctorat LMD \u2014 ${year - 1}-${year}`,
      groups: [{ year, problems: rendered }],
      includeSolutions: true,
      includeToc: false,
    });

    /* Generate the PDF with headless Chromium */
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "load",
        timeout: 45000,
      });
      /* Wait for webfonts and the KaTeX stylesheet to settle */
      await page
        .waitForNetworkIdle({ idleTime: 500, timeout: 15000 })
        .catch(() => {});
      await page.evaluateHandle("document.fonts.ready");

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate:
          '<div style="width:100%;font-size:9px;color:#555;text-align:center;font-family:Georgia,serif;">' +
          'Page <span class="pageNumber"></span> sur <span class="totalPages"></span></div>',
      });

      const typeSlug = examType === "general" ? "generale" : "specialite";
      const filename = `doctorat-${typeSlug}-${year}.pdf`;

      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "public, max-age=300",
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Doctorate exam PDF error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate the PDF" },
      { status: 500 },
    );
  }
}
