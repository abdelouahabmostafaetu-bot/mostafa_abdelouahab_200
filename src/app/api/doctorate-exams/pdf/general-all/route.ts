import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import { checkRateLimit } from '@/lib/security';
import { renderMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import {
  buildExamDocumentHtml,
  launchBrowser,
  type ExamYearGroup,
} from '@/lib/doctorate-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const OUTPUT_FILENAME = 'doctorat-generale-problemes-toutes-annees.pdf';

type LeanProblem = {
  _id: unknown;
  year: number;
  problemNumber?: number;
  statement: string;
};

/**
 * GET /api/doctorate-exams/pdf/general-all
 *
 * Generates a single combined PDF containing every published GENERAL exam
 * problem statement, across all years — problem statements ONLY, no
 * solutions. Grouped by year with a clickable table of contents.
 *
 * Same Puppeteer + Chromium + KaTeX pipeline as the single-exam route
 * (src/app/api/doctorate-exams/pdf/[exam]/route.ts) via the shared
 * src/lib/doctorate-pdf.ts helper — no LaTeX toolchain involved.
 */
export async function GET(request: NextRequest) {
  try {
    /* ── Auth wall (same pattern as the single-exam route) ── */
    const user = await getSessionUser();
    if (!user) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect_url', request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl, { status: 302 });
    }

    const rateLimitResponse = checkRateLimit(
      request,
      'doctorate-exams:pdf-general-all',
      5,
    );
    if (rateLimitResponse) return rateLimitResponse;

    await connectToDatabase();

    /* Single query: every published general-exam problem, across all years. */
    const problems = (await DoctorateProblem.find({
      published: true,
      examType: 'general',
    })
      .sort({ year: -1, problemNumber: 1 })
      .select('year problemNumber statement')
      .lean()) as unknown as LeanProblem[];

    if (problems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No general exam problems found' },
        { status: 404 },
      );
    }

    /* Render statements only (Markdown + LaTeX -> HTML via KaTeX).
     * Rendered in parallel — this is CPU-bound and fast per problem, so it
     * comfortably fits within maxDuration = 60s even for a large archive. */
    const rendered = await Promise.all(
      problems.map(async (p, i) => ({
        year: p.year,
        number: p.problemNumber ?? i + 1,
        statementHtml: await renderMarkdownPreviewToHtml(p.statement ?? ''),
      })),
    );

    /* Group by year, preserving the year DESC / problemNumber ASC order
     * already applied by the MongoDB query above. */
    const groupsByYear = new Map<number, ExamYearGroup>();
    for (const p of rendered) {
      const entry = {
        number: p.number,
        statementHtml: p.statementHtml,
        solutionHtml: null,
      };
      const existing = groupsByYear.get(p.year);
      if (existing) {
        existing.problems.push(entry);
      } else {
        groupsByYear.set(p.year, { year: p.year, problems: [entry] });
      }
    }
    const groups = [...groupsByYear.values()];

    const html = buildExamDocumentHtml({
      documentTitle: '\u00c9preuve : Math\u00e9matiques g\u00e9n\u00e9rales',
      documentSubtitle:
        'Concours d\u2019acc\u00e8s au Doctorat LMD \u2014 Archive compl\u00e8te, toutes ann\u00e9es',
      groups,
      includeSolutions: false, // problems only — no solutions section at all
      includeToc: true, // clickable table of contents grouped by year
    });

    /* Generate the PDF with headless Chromium */
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'load',
        timeout: 45000,
      });
      /* Wait for webfonts and the KaTeX stylesheet to settle */
      await page
        .waitForNetworkIdle({ idleTime: 500, timeout: 15000 })
        .catch(() => {});
      await page.evaluateHandle('document.fonts.ready');

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate:
          '<div style="width:100%;font-size:9px;color:#555;text-align:center;font-family:Georgia,serif;">' +
          'Page <span class="pageNumber"></span> sur <span class="totalPages"></span></div>',
      });

      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${OUTPUT_FILENAME}"`,
          /* Heavier route (renders every general-exam problem + launches
           * Chromium) and content only changes when an admin publishes a
           * new/updated general problem — cache longer than the per-exam
           * route, with a stale-while-revalidate window to avoid ever
           * blocking a request on a full regeneration. */
          'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Doctorate general-all PDF error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate the PDF' },
      { status: 500 },
    );
  }
}
