/**
 * Shared HTML/PDF rendering helpers for the Doctorate Exam Archive.
 *
 * Used by:
 *   - src/app/api/doctorate-exams/pdf/[exam]/route.ts        (single exam, with solutions)
 *   - src/app/api/doctorate-exams/pdf/general-all/route.ts   (all general exams, problems only)
 *
 * Rendering pipeline: Markdown + LaTeX -> HTML (KaTeX) -> headless Chromium -> PDF.
 * No LaTeX toolchain involved — Vercel serverless cannot run pdflatex/xelatex anyway.
 */

const CONTACT_EMAIL = 'abdelouahab.mostafa.etu@centre-univ-mila.dz';
const SITE_URL = 'www.mostafaabdelouahab.me';

export type ExamProblemHtml = {
  number: number;
  statementHtml: string;
  solutionHtml: string | null;
};

export type ExamYearGroup = {
  year: number;
  problems: ExamProblemHtml[];
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Launches headless Chromium via @sparticuz/chromium, compatible with
 * Vercel serverless functions (no system Chrome installation required).
 */
export async function launchBrowser() {
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

/* ── Shared document styles ────────────────────────────────────────────── */
const DOCUMENT_STYLES = `
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

  /* ── Table of contents (multi-year combined documents) ── */
  .page-break { break-after: page; page-break-after: always; }
  .toc { margin: 18px 0 0; }
  .toc-title {
    font-size: 13pt;
    font-weight: 700;
    margin-bottom: 16px;
    border-bottom: 1.2px solid #111;
    padding-bottom: 6px;
  }
  .toc-year { margin-bottom: 16px; break-inside: avoid; }
  .toc-year-link {
    font-size: 12pt;
    font-weight: 700;
    color: #111;
    text-decoration: none;
  }
  .toc-list { list-style: none; margin: 6px 0 0; padding-left: 16px; }
  .toc-list li { margin: 4px 0; }
  .toc-list a { color: #333; text-decoration: none; font-size: 10.5pt; }
  .toc-list a:hover { text-decoration: underline; }

  /* ── Year grouping (combined multi-year documents) ── */
  .year-group { margin-top: 10px; }
  .year-group:first-of-type { margin-top: 0; }
  .year-heading {
    font-size: 14pt;
    font-weight: 700;
    margin: 32px 0 14px;
    padding-bottom: 6px;
    border-bottom: 1.6px solid #111;
    page-break-after: avoid;
    break-after: avoid-page;
  }
  .year-group:first-of-type .year-heading { margin-top: 0; }

  /* ── Exercices ── */
  .exercice { margin-top: 26px; break-inside: avoid-page; }
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
`;

function renderProblemSection(p: ExamProblemHtml, anchorId: string): string {
  return `
      <section class="exercice" id="${anchorId}">
        <div class="exercice-head">
          <span class="exercice-name">Exercice ${p.number}</span>
          <span class="exercice-rule"></span>
        </div>
        <div class="content">${p.statementHtml}</div>
      </section>`;
}

function renderSolutionSection(p: ExamProblemHtml): string {
  return `
      <section class="exercice">
        <div class="exercice-head">
          <span class="exercice-name">Solution de l'exercice ${p.number}</span>
          <span class="exercice-rule"></span>
        </div>
        <div class="content">${
          p.solutionHtml ??
          '<p class="muted"><em>La solution de cet exercice sera publi\u00e9e prochainement.</em></p>'
        }</div>
      </section>`;
}

function anchorId(year: number, problemNumber: number): string {
  return `y${year}-e${problemNumber}`;
}

export type BuildExamDocumentOptions = {
  /** Main heading shown at the top of the document. */
  documentTitle: string;
  /** Subtitle shown beneath the main heading (and reused for the solutions section). */
  documentSubtitle: string;
  /** One group per exam year. A single-exam document simply passes one group. */
  groups: ExamYearGroup[];
  /**
   * When true, appends a page-broken "Solutions" section with the author note.
   * When false, the document contains problem statements ONLY — no solutions
   * section is rendered at all, and no author note is appended.
   */
  includeSolutions: boolean;
  /**
   * When true, renders a clickable table of contents (grouped by year) on
   * its own page before the problem statements. Intended for combined,
   * multi-year documents.
   */
  includeToc?: boolean;
};

/**
 * Builds the full HTML document for a Doctorate exam PDF.
 *
 * Shared by both the single-exam route (includeSolutions: true, one group)
 * and the combined "all general exams" route (includeSolutions: false,
 * includeToc: true, one group per year).
 */
export function buildExamDocumentHtml(opts: BuildExamDocumentOptions): string {
  const { documentTitle, documentSubtitle, groups, includeSolutions, includeToc = false } = opts;

  const tocHtml = includeToc
    ? `
  <nav class="toc">
    <h2 class="toc-title">Table des mati\u00e8res</h2>
    ${groups
      .map(
        (g) => `
    <div class="toc-year">
      <a class="toc-year-link" href="#year-${g.year}">Ann\u00e9e ${g.year}</a>
      <ul class="toc-list">
        ${g.problems
          .map(
            (p) =>
              `<li><a href="#${anchorId(g.year, p.number)}">Exercice ${p.number}</a></li>`,
          )
          .join('\n        ')}
      </ul>
    </div>`,
      )
      .join('\n')}
  </nav>
  <div class="page-break"></div>`
    : '';

  const bodyHtml = groups
    .map(
      (g) => `
    <section class="year-group">
      <h2 class="year-heading" id="year-${g.year}">Ann\u00e9e ${g.year}</h2>
      ${g.problems.map((p) => renderProblemSection(p, anchorId(g.year, p.number))).join('\n')}
    </section>`,
    )
    .join('\n');

  const solutionsHtml = includeSolutions
    ? `
  <div class="solutions-part">
    <div class="doc-head">
      <h1 class="doc-title">Corrig\u00e9 \u2014 Solutions d\u00e9taill\u00e9es</h1>
      <div class="doc-subtitle">${documentSubtitle}</div>
    </div>
    <hr class="doc-rule">
    <hr class="doc-rule">
    ${groups
      .map(
        (g) => `
    <section class="year-group">
      <h2 class="year-heading">Ann\u00e9e ${g.year}</h2>
      ${g.problems.map((p) => renderSolutionSection(p)).join('\n')}
    </section>`,
      )
      .join('\n')}

    <div class="author-note">
      <div class="note-title">Note</div>
      Les solutions pr\u00e9sent\u00e9es dans ce document ont \u00e9t\u00e9 r\u00e9dig\u00e9es par
      <strong>Mostafa Abdelouahab</strong> \u2014 il ne s'agit pas du corrig\u00e9 officiel du concours.
      Si vous remarquez une erreur, ou si vous avez une question ou une suggestion,
      contactez-moi\u00a0: <strong>${CONTACT_EMAIL}</strong> \u2022 ${SITE_URL}
    </div>
  </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
<style>${DOCUMENT_STYLES}</style>
</head>
<body>

  <div class="doc-head">
    <h1 class="doc-title">${documentTitle}</h1>
    <div class="doc-subtitle">${documentSubtitle}</div>
  </div>
  <hr class="doc-rule">
  <hr class="doc-rule">
  ${tocHtml}
  ${bodyHtml}
  ${solutionsHtml}

</body>
</html>`;
}
