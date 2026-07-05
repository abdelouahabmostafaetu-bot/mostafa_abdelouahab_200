import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import { checkRateLimit } from '@/lib/security';
import { renderMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import type { DoctorateExamType } from '@/types/doctorate-problem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CONTACT_EMAIL = 'abdelouahab.mostafa.etu@centre-univ-mila.dz';
const SITE_URL = 'www.mostafaabdelouahab.me';

type LeanProblem = {
  _id: unknown;
  title: string;
  slug: string;
  specialty: string;
  university: string;
  source: string;
  problemNumber?: number;
  statement: string;
  solution: string;
};

function parseExam(
  exam: string,
): { year: number; examType: DoctorateExamType } | null {
  const m = /^(\d{4})-(general|specialist)$/.exec(exam);
  if (!m) return null;
  return { year: Number(m[1]), examType: m[2] as DoctorateExamType };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function launchBrowser() {
  const puppeteer = await import('puppeteer-core');
  const chromiumModule = await import('@sparticuz/chromium');
  const chromium = chromiumModule.default;

  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath());

  return puppeteer.default.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
  });
}

function buildExamHtml(args: {
  year: number;
  examType: DoctorateExamType;
  specialty: string;
  problems: Array<{
    number: number;
    statementHtml: string;
    solutionHtml: string | null;
  }>;
}): string {
  const { year, examType, specialty, problems } = args;

  const epreuveLabel =
    examType === 'general'
      ? 'Math\u00e9matiques g\u00e9n\u00e9rales'
      : `Sp\u00e9cialit\u00e9${specialty ? ` \u2014 ${escapeHtml(specialty)}` : ''}`;

  const exercicesHtml = problems
    .map(
      (p) => `
      <section class="exercice">
        <div class="exercice-head">
          <span class="exercice-name">Exercice ${p.number}</span>
          <span class="exercice-rule"></span>
        </div>
        <div class="content">${p.statementHtml}</div>
      </section>`,
    )
    .join('\n');

  const solutionsHtml = problems
    .map(
      (p) => `
      <section class="exercice">
        <div class="exercice-head">
          <span class="exercice-name">Solution de l'exercice ${p.number}</span>
          <span class="exercice-rule"></span>
        </div>
        <div class="content">${
          p.solutionHtml ??
          '<p class="muted"><em>La solution de cet exercice sera publi\u00e9e prochainement.</em></p>'
        }</div>
      </section>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: #111;
    background: #fff;
    font-family: 'Noto Serif', Georgia, serif;
    font-size: 11pt;
    line-height: 1.6;
  }

  /* ── Document title ── */
  .doc-head { text-align: center; margin-bottom: 6px; }
  .doc-title {
    font-size: 16pt;
    font-weight: 700;
    letter-spacing: 0.01em;
    margin: 0;
  }
  .doc-subtitle {
    font-size: 10pt;
    color: #444;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-top: 5px;
  }
  .doc-rule {
    border: 0;
    border-top: 1.6px solid #111;
    margin: 14px 0 0;
  }
  .doc-rule + .doc-rule {
    border-top-width: 0.6px;
    margin-top: 2px;
    margin-bottom: 8px;
  }

  /* ── Exercices ── */
  .exercice { margin-top: 26px; }
  .exercice-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .exercice-name {
    font-size: 12.5pt;
    font-weight: 700;
    white-space: nowrap;
  }
  .exercice-rule {
    flex: 1;
    border-top: 1px solid #333;
    height: 0;
  }

  .content { text-align: justify; }
  .content p { margin: 7px 0; }
  .content ol, .content ul { margin: 7px 0; padding-left: 26px; }
  .content li { margin: 5px 0; }
  .content h1, .content h2, .content h3 {
    font-size: 11.5pt;
    margin: 14px 0 6px;
  }
  .content strong { font-weight: 700; }
  .content blockquote {
    margin: 9px 0;
    padding-left: 12px;
    border-left: 2px solid #999;
    color: #333;
  }
  .content code {
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    background: #f3f3f3;
    padding: 1px 4px;
  }
  .content table { border-collapse: collapse; margin: 9px 0; }
  .content table td, .content table th { border: 1px solid #333; padding: 4px 10px; }
  .katex { font-size: 1.08em; color: #111; }
  .katex-display { margin: 12px 0; }
  .math-scroll, .math-scroll__inner { overflow: visible !important; }
  .muted { color: #555; }

  /* ── Solutions part ── */
  .solutions-part { page-break-before: always; break-before: page; }
  .exercice, .content p, .content li { page-break-inside: auto; }

  /* ── Author note ── */
  .author-note {
    margin-top: 34px;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 12px 16px;
    font-size: 9.5pt;
    line-height: 1.6;
    color: #222;
    page-break-inside: avoid;
  }
  .author-note .note-title {
    font-weight: 700;
    font-size: 10pt;
    margin-bottom: 4px;
  }
  .author-note a { color: #222; }
</style>
</head>
<body>

  <!-- Document title -->
  <div class="doc-head">
    <h1 class="doc-title">\u00c9preuve : ${epreuveLabel}</h1>
    <div class="doc-subtitle">Concours d'acc\u00e8s au Doctorat LMD \u2014 ${year - 1}-${year}</div>
  </div>
  <hr class="doc-rule">
  <hr class="doc-rule">

  <!-- Part I: exercices -->
  ${exercicesHtml}

  <!-- Part II: solutions -->
  <div class="solutions-part">
    <div class="doc-head">
      <h1 class="doc-title">Corrig\u00e9 \u2014 Solutions d\u00e9taill\u00e9es</h1>
      <div class="doc-subtitle">${epreuveLabel} \u2014 ${year - 1}-${year}</div>
    </div>
    <hr class="doc-rule">
    <hr class="doc-rule">
    ${solutionsHtml}

    <!-- Author note -->
    <div class="author-note">
      <div class="note-title">Note</div>
      Les solutions pr\u00e9sent\u00e9es dans ce document ont \u00e9t\u00e9 r\u00e9dig\u00e9es par
      <strong>Mostafa Abdelouahab</strong> \u2014 il ne s'agit pas du corrig\u00e9 officiel du concours.
      Si vous remarquez une erreur, ou si vous avez une question ou une suggestion,
      contactez-moi\u00a0: <strong>${CONTACT_EMAIL}</strong> \u2022 ${SITE_URL}
    </div>
  </div>

</body>
</html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exam: string }> },
) {
  try {
    const rateLimitResponse = checkRateLimit(
      request,
      'doctorate-exams:pdf',
      5,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const { exam } = await params;
    const parsed = parseExam(exam);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Invalid exam reference' },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const problems = (await DoctorateProblem.find({
      published: true,
      year: parsed.year,
      examType: parsed.examType,
    })
      .sort({ problemNumber: 1, createdAt: 1 })
      .select(
        'title slug specialty university source problemNumber statement solution',
      )
      .lean()) as unknown as LeanProblem[];

    if (problems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Exam not found' },
        { status: 404 },
      );
    }

    /* Render every statement/solution (Markdown + LaTeX -> HTML with KaTeX) */
    const rendered = await Promise.all(
      problems.map(async (p, i) => ({
        number: p.problemNumber ?? i + 1,
        statementHtml: await renderMarkdownPreviewToHtml(p.statement ?? ''),
        solutionHtml: String(p.solution ?? '').trim()
          ? await renderMarkdownPreviewToHtml(p.solution)
          : null,
      })),
    );

    const html = buildExamHtml({
      year: parsed.year,
      examType: parsed.examType,
      specialty: problems[0].specialty ?? '',
      problems: rendered,
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

      const typeSlug =
        parsed.examType === 'general' ? 'generale' : 'specialite';
      const filename = `doctorat-${typeSlug}-${parsed.year}.pdf`;

      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=300',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Doctorate exam PDF error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate the PDF' },
      { status: 500 },
    );
  }
}
