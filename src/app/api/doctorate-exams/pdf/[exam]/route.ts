import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorateProblem } from '@/lib/models/doctorate-problem';
import { checkRateLimit } from '@/lib/security';
import { renderMarkdownPreviewToHtml } from '@/lib/mdx-preview';
import type { DoctorateExamType } from '@/types/doctorate-problem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  university: string;
  specialty: string;
  source: string;
  problems: Array<{ number: number; statementHtml: string; solutionHtml: string | null }>;
}): string {
  const { year, examType, university, specialty, source, problems } = args;

  const epreuveLabel =
    examType === 'general'
      ? 'Math\u00e9matiques g\u00e9n\u00e9rales'
      : `\u00c9preuve de Sp\u00e9cialit\u00e9${specialty ? ` \u2014 ${escapeHtml(specialty)}` : ''}`;

  const exercicesHtml = problems
    .map(
      (p) => `
      <section class="exercice">
        <h2 class="exercice-title">Exercice ${p.number}</h2>
        <div class="content">${p.statementHtml}</div>
      </section>`,
    )
    .join('\n');

  const solutionsHtml = problems
    .map(
      (p) => `
      <section class="exercice">
        <h2 class="exercice-title">Solution de l'exercice ${p.number}</h2>
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
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: #111;
    background: #fff;
    font-family: 'Noto Serif', Georgia, serif;
    font-size: 11pt;
    line-height: 1.55;
  }
  .ar {
    font-family: 'Amiri', 'Noto Serif', serif;
    direction: rtl;
  }
  /* ── Official header ── */
  .head-center { text-align: center; }
  .head-center .ar-line { font-size: 13pt; font-weight: 700; }
  .head-center .fr-line { font-size: 11.5pt; font-weight: 700; margin-top: 2px; }
  .head-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-top: 10px;
  }
  .head-row .left { font-size: 9.5pt; font-weight: 700; max-width: 55%; }
  .head-row .right { font-size: 11pt; font-weight: 700; text-align: right; }
  .double-rule {
    border: 0;
    border-top: 2.2px solid #111;
    margin: 8px 0 2px;
  }
  .double-rule + .double-rule { margin-top: 0; border-top-width: 1px; }
  .dept-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    font-size: 10.5pt;
    margin: 6px 0;
  }
  /* ── Concours title ── */
  .concours {
    text-align: center;
    font-size: 13.5pt;
    font-weight: 700;
    margin: 22px 0 4px;
  }
  .concours-rule { border: 0; border-top: 1.5px solid #111; margin: 6px 0 14px; }
  .epreuve {
    text-align: center;
    font-size: 12pt;
    font-weight: 700;
    margin-bottom: 14px;
  }
  /* ── Info table ── */
  table.info {
    border-collapse: collapse;
    margin: 0 auto 8px;
    font-size: 10.5pt;
  }
  table.info th, table.info td {
    border: 1.2px solid #111;
    padding: 4px 16px;
    text-align: center;
  }
  table.info th { font-weight: 700; }
  .source {
    text-align: center;
    font-size: 9pt;
    font-style: italic;
    color: #444;
    margin: 6px auto 0;
    max-width: 92%;
  }
  /* ── Exercices ── */
  .exercice { margin-top: 22px; }
  .exercice-title {
    font-size: 12pt;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
    margin: 0 0 8px;
  }
  .content p { margin: 6px 0; }
  .content ol, .content ul { margin: 6px 0; padding-left: 24px; }
  .content li { margin: 4px 0; }
  .content h1, .content h2, .content h3 {
    font-size: 11.5pt;
    margin: 12px 0 6px;
  }
  .content blockquote {
    margin: 8px 0;
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
  .content table { border-collapse: collapse; margin: 8px 0; }
  .content table td, .content table th { border: 1px solid #333; padding: 4px 10px; }
  .katex { font-size: 1.06em; color: #111; }
  .katex-display { margin: 10px 0; }
  .math-scroll, .math-scroll__inner { overflow: visible !important; }
  .muted { color: #555; }
  /* ── Solutions part ── */
  .solutions-part { page-break-before: always; break-before: page; }
  .solutions-title {
    text-align: center;
    font-size: 14pt;
    font-weight: 700;
    margin: 0 0 4px;
  }
  .solutions-sub {
    text-align: center;
    font-size: 10pt;
    color: #444;
    margin-bottom: 8px;
  }
  .exercice, .content p, .content li { page-break-inside: auto; }
</style>
</head>
<body>

  <!-- Official header -->
  <div class="head-center">
    <div class="ar ar-line">\u0627\u0644\u062c\u0645\u0647\u0648\u0631\u064a\u0629 \u0627\u0644\u062c\u0632\u0627\u0626\u0631\u064a\u0629 \u0627\u0644\u062f\u064a\u0645\u0642\u0631\u0627\u0637\u064a\u0629 \u0627\u0644\u0634\u0639\u0628\u064a\u0629</div>
    <div class="fr-line">R\u00e9publique Alg\u00e9rienne D\u00e9mocratique et Populaire</div>
  </div>

  <div class="head-row">
    <div class="left">Minist\u00e8re de l'Enseignement Sup\u00e9rieur et de la Recherche Scientifique</div>
    <div class="right ar">\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0639\u0627\u0644\u064a \u0648\u0627\u0644\u0628\u062d\u062b \u0627\u0644\u0639\u0644\u0645\u064a</div>
  </div>

  <hr class="double-rule">
  <hr class="double-rule">

  <div class="dept-row">
    <div>${university ? escapeHtml(university) : 'Universit\u00e9'}<br>Facult\u00e9 des Sciences</div>
    <div class="ar">\u0643\u0644\u064a\u0629 \u0627\u0644\u0639\u0644\u0648\u0645</div>
  </div>

  <hr class="double-rule">

  <div class="dept-row">
    <div>D\u00e9partement de Math\u00e9matiques</div>
    <div class="ar">\u0642\u0633\u0645 \u0627\u0644\u0631\u064a\u0627\u0636\u064a\u0627\u062a</div>
  </div>

  <!-- Concours title -->
  <div class="concours">Concours d'acc\u00e8s \u00e0 la premi\u00e8re ann\u00e9e Doctorat LMD ${year - 1}-${year}</div>
  <hr class="concours-rule">
  <div class="epreuve">\u00c9preuve : ${epreuveLabel}</div>

  <!-- Info table -->
  <table class="info">
    <tr><th>Fili\u00e8re</th><th>Sp\u00e9cialit\u00e9s</th><th>Ann\u00e9e</th></tr>
    <tr><td>Math\u00e9matiques</td><td>${escapeHtml(specialty || 'Math\u00e9matiques')}</td><td>${year}</td></tr>
  </table>

  ${source ? `<p class="source">${escapeHtml(source)}</p>` : ''}

  <!-- Part I: exercices -->
  ${exercicesHtml}

  <!-- Part II: solutions -->
  <div class="solutions-part">
    <div class="solutions-title">Corrig\u00e9 \u2014 Solutions d\u00e9taill\u00e9es</div>
    <div class="solutions-sub">${epreuveLabel} \u2014 ${year}</div>
    <hr class="concours-rule">
    ${solutionsHtml}
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
      university: problems[0].university ?? '',
      specialty: problems[0].specialty ?? '',
      source: problems[0].source ?? '',
      problems: rendered,
    });

    /* Generate the PDF with headless Chromium */
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 45000,
      });
      await page.evaluateHandle('document.fonts.ready');

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
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
