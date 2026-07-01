'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.css';
import InteractivePlot from './InteractivePlot';
import GeometryDiagram from './GeometryDiagram';
import Surface3D from './Surface3D';

/**
 * Renders an assistant answer that mixes Markdown, fenced code, math, graphs,
 * geometry diagrams, and 3D surfaces.
 *
 * Strategy:
 *   1. Pull out fenced code blocks and every math span first, render them, and
 *      leave tiny placeholders behind (so Markdown never mangles them).
 *      A fenced block tagged `plot` (or `graph`) becomes a real INTERACTIVE
 *      graph (pan / zoom / hover); a block tagged `geometry` (or `geo`) becomes
 *      an auto-scaled geometry diagram; a block tagged `plot3d` (or `surface`)
 *      becomes an interactive 3D surface. All render as React components.
 *   2. Render the remaining text as Markdown: headings, lists, bold/italic,
 *      inline code, dividers, paragraphs.
 *   3. Put the rendered code and math back in, and interleave the components.
 *
 * Each display equation and code block also gets its own hover "Copy" button
 * (see ai-copy-btn); a single delegated click handler on the root reads the
 * base64-encoded raw source from the button and writes it to the clipboard.
 */

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Safely stash raw source (LaTeX / code) inside an HTML attribute so the copy
// handler can recover the exact original text. Unicode-safe.
function encodeAttr(raw: string): string {
  try {
    return btoa(encodeURIComponent(raw));
  } catch {
    return '';
  }
}

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return escapeHtml(tex);
  }
}

const COPY_BTN_CLS =
  'ai-copy-btn absolute right-1.5 top-1.5 z-10 inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]';

// A framed display equation with its own "Copy LaTeX" button.
function mathBlockHtml(tex: string): string {
  const enc = encodeAttr(tex.trim());
  return (
    '<div class="group relative my-3 overflow-x-auto">' +
    renderMath(tex, true) +
    '<button type="button" data-label="Copy LaTeX" data-copy="' +
    enc +
    '" aria-label="Copy LaTeX" class="' +
    COPY_BTN_CLS +
    '">Copy LaTeX</button>' +
    '</div>'
  );
}

const CODE_CLS = 'rounded bg-[var(--color-bg-muted)] px-1 py-0.5 text-[0.85em] font-mono';

function renderInline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code class="' + CODE_CLS + '">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--color-accent)] underline underline-offset-2">$1</a>');
  return out;
}

type Extracted = { text: string; blocks: string[]; inlines: string[]; plots: string[][]; diagrams: string[]; surfaces: string[] };

function extractMath(input: string): Extracted {
  const blocks: string[] = [];
  const inlines: string[] = [];
  const plots: string[][] = [];
  const diagrams: string[] = [];
  const surfaces: string[] = [];
  let out = input;

  const pushBlockHtml = (htmlValue: string): string => {
    const idx = blocks.length;
    blocks.push(htmlValue);
    return '\n\u0001B' + idx + '\u0001\n';
  };
  const pushInline = (tex: string): string => {
    const idx = inlines.length;
    inlines.push(renderMath(tex, false));
    return '\u0001I' + idx + '\u0001';
  };

  // Fenced code blocks first (so math/markdown inside them stays literal).
  // `plot`/`graph` -> interactive graph; `geometry`/`geo` -> geometry diagram;
  // `plot3d`/`surface`/`3d` -> interactive 3D surface.
  out = out.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const language = String(lang || '').toLowerCase();
    if (language === 'plot' || language === 'graph') {
      const funcs = String(code)
        .split(/[\n;]+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
      if (funcs.length > 0) {
        const idx = plots.length;
        plots.push(funcs);
        return '\n\u0001P' + idx + '\u0001\n';
      }
    }
    if (language === 'geometry' || language === 'geo') {
      const body = String(code).replace(/\n$/, '');
      if (body.trim().length > 0) {
        const idx = diagrams.length;
        diagrams.push(body);
        return '\n\u0001G' + idx + '\u0001\n';
      }
    }
    if (language === 'plot3d' || language === 'surface' || language === '3d') {
      const lines = String(code)
        .split(/[\n;]+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
      if (lines.length > 0) {
        const idx = surfaces.length;
        surfaces.push(lines[0]);
        return '\n\u0001S' + idx + '\u0001\n';
      }
    }
    const raw = String(code).replace(/\n$/, '');
    const bodyEsc = escapeHtml(raw);
    const enc = encodeAttr(raw);
    return pushBlockHtml(
      '<div class="group relative my-3">' +
        '<pre class="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-3 text-[13px] leading-6"><code>' +
        bodyEsc +
        '</code></pre>' +
        '<button type="button" data-label="Copy code" data-copy="' +
        enc +
        '" aria-label="Copy code" class="' +
        COPY_BTN_CLS +
        '">Copy code</button>' +
        '</div>',
    );
  });

  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => pushBlockHtml(mathBlockHtml(tex)));
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, tex) => pushBlockHtml(mathBlockHtml(tex)));
  out = out.replace(/\$([^$\n]+?)\$/g, (_m, tex) => pushInline(tex));
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, tex) => pushInline(tex));

  return { text: out, blocks, inlines, plots, diagrams, surfaces };
}

function renderMarkdown(text: string, blocks: string[]): string {
  const lines = text.split('\n');
  const html: string[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length > 0) {
      html.push('<p class="my-2">' + para.map(renderInline).join('<br/>') + '</p>');
      para = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    const blockMatch = t.match(/^\u0001B(\d+)\u0001$/);
    if (blockMatch) {
      flushPara();
      html.push(blocks[Number(blockMatch[1])] || '');
      i++;
      continue;
    }

    const plotMatch = t.match(/^\u0001P(\d+)\u0001$/);
    if (plotMatch) {
      flushPara();
      html.push('\u0001P' + plotMatch[1] + '\u0001');
      i++;
      continue;
    }

    const geoMatch = t.match(/^\u0001G(\d+)\u0001$/);
    if (geoMatch) {
      flushPara();
      html.push('\u0001G' + geoMatch[1] + '\u0001');
      i++;
      continue;
    }

    const surfMatch = t.match(/^\u0001S(\d+)\u0001$/);
    if (surfMatch) {
      flushPara();
      html.push('\u0001S' + surfMatch[1] + '\u0001');
      i++;
      continue;
    }

    if (t === '') {
      flushPara();
      i++;
      continue;
    }

    if (t === '---' || t === '***' || t === '___') {
      flushPara();
      html.push('<hr class="my-4 border-[var(--color-border)]"/>');
      i++;
      continue;
    }

    const heading = t.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara();
      const lvl = heading[1].length;
      const cls =
        lvl === 1
          ? 'text-lg font-semibold mt-4 mb-2'
          : lvl === 2
            ? 'text-base font-semibold mt-3 mb-2'
            : 'text-sm font-semibold mt-3 mb-1';
      const tag = 'h' + String(lvl + 1);
      html.push('<' + tag + ' class="' + cls + '">' + renderInline(heading[2]) + '</' + tag + '>');
      i++;
      continue;
    }

    if (/^[-*+]\s+/.test(t)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^[-*+]\s+/, '');
        items.push('<li class="my-0.5">' + renderInline(item) + '</li>');
        i++;
      }
      html.push('<ul class="list-disc pl-5 my-2 space-y-1">' + items.join('') + '</ul>');
      continue;
    }

    if (/^\d+\.\s+/.test(t)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^\d+\.\s+/, '');
        items.push('<li class="my-0.5">' + renderInline(item) + '</li>');
        i++;
      }
      html.push('<ol class="list-decimal pl-5 my-2 space-y-1">' + items.join('') + '</ol>');
      continue;
    }

    para.push(raw);
    i++;
  }
  flushPara();
  return html.join('');
}

export default function MathText({ text }: { text: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { text: stripped, blocks, inlines, plots, diagrams, surfaces } = extractMath(text || '');
  let html = renderMarkdown(stripped, blocks);
  html = html.replace(/\u0001I(\d+)\u0001/g, (_m, n) => inlines[Number(n)] || '');
  html = html.replace(/\u0001B(\d+)\u0001/g, (_m, n) => blocks[Number(n)] || '');

  // One delegated click handler powers every per-block copy button.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const btn = target ? (target.closest('.ai-copy-btn') as HTMLElement | null) : null;
      if (!btn || !root.contains(btn)) return;
      const enc = btn.getAttribute('data-copy') || '';
      let value = '';
      try {
        value = decodeURIComponent(atob(enc));
      } catch {
        value = '';
      }
      if (!value) return;
      const restore = btn.getAttribute('data-label') || 'Copy';
      navigator.clipboard
        .writeText(value)
        .then(() => {
          btn.textContent = 'Copied';
          btn.style.color = '#22c55e';
          btn.style.borderColor = '#22c55e';
          btn.style.opacity = '1';
          setTimeout(() => {
            btn.textContent = restore;
            btn.style.color = '';
            btn.style.borderColor = '';
            btn.style.opacity = '';
          }, 1500);
        })
        .catch(() => {});
    }
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [text]);

  const segments = html.split(/\u0001([PGS])(\d+)\u0001/);
  const nodes: ReactNode[] = [];
  for (let s = 0; s < segments.length; s += 3) {
    const textSeg = segments[s];
    if (textSeg) {
      const htmlProp = { __html: textSeg };
      nodes.push(<div key={'html-' + s} dangerouslySetInnerHTML={htmlProp} />);
    }
    const kind = segments[s + 1];
    const num = segments[s + 2];
    if (kind !== undefined && num !== undefined) {
      const idx = Number(num);
      if (kind === 'P') {
        nodes.push(<InteractivePlot key={'plot-' + s} expressions={plots[idx] || []} />);
      } else if (kind === 'G') {
        nodes.push(<GeometryDiagram key={'geo-' + s} spec={diagrams[idx] || ''} />);
      } else if (kind === 'S') {
        nodes.push(<Surface3D key={'surf-' + s} expression={surfaces[idx] || ''} />);
      }
    }
  }

  return (
    <div
      ref={rootRef}
      className="text-[15px] leading-7 text-[var(--color-text)] [&_.katex-display]:my-3"
    >
      {nodes}
    </div>
  );
}
