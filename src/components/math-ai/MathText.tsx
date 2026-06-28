'use client';

import { type ReactNode } from 'react';
import katex from 'katex';
import 'katex/dist/katex.css';
import InteractivePlot from './InteractivePlot';

/**
 * Renders an assistant answer that mixes Markdown, fenced code, math, and graphs.
 *
 * Strategy:
 *   1. Pull out fenced code blocks and every math span first, render them, and
 *      leave tiny placeholders behind (so Markdown never mangles them).
 *      A fenced block tagged `plot` (or `graph`) becomes a real INTERACTIVE
 *      graph (pan / zoom / hover) rendered as a React component.
 *   2. Render the remaining text as Markdown: headings, lists, bold/italic,
 *      inline code, dividers, paragraphs.
 *   3. Put the rendered code and math back in, and interleave the graphs.
 */

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

type Extracted = { text: string; blocks: string[]; inlines: string[]; plots: string[][] };

function extractMath(input: string): Extracted {
  const blocks: string[] = [];
  const inlines: string[] = [];
  const plots: string[][] = [];
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
  // A `plot`/`graph` block becomes an interactive graph instead.
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
    const body = escapeHtml(String(code).replace(/\n$/, ''));
    return pushBlockHtml(
      '<pre class="my-3 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-3 text-[13px] leading-6"><code>' +
        body +
        '</code></pre>',
    );
  });

  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) =>
    pushBlockHtml('<div class="my-3 overflow-x-auto">' + renderMath(tex, true) + '</div>'),
  );
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, tex) =>
    pushBlockHtml('<div class="my-3 overflow-x-auto">' + renderMath(tex, true) + '</div>'),
  );
  out = out.replace(/\$([^$\n]+?)\$/g, (_m, tex) => pushInline(tex));
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, tex) => pushInline(tex));

  return { text: out, blocks, inlines, plots };
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
  const { text: stripped, blocks, inlines, plots } = extractMath(text || '');
  let html = renderMarkdown(stripped, blocks);
  html = html.replace(/\u0001I(\d+)\u0001/g, (_m, n) => inlines[Number(n)] || '');
  html = html.replace(/\u0001B(\d+)\u0001/g, (_m, n) => blocks[Number(n)] || '');

  const segments = html.split(/\u0001P(\d+)\u0001/);
  const nodes: ReactNode[] = [];
  for (let s = 0; s < segments.length; s++) {
    if (s % 2 === 1) {
      const idx = Number(segments[s]);
      nodes.push(<InteractivePlot key={'plot-' + s} expressions={plots[idx] || []} />);
    } else if (segments[s]) {
      const htmlProp = { __html: segments[s] };
      nodes.push(<div key={'html-' + s} dangerouslySetInnerHTML={htmlProp} />);
    }
  }

  return (
    <div className="text-[15px] leading-7 text-[var(--color-text)] [&_.katex-display]:my-3">
      {nodes}
    </div>
  );
}
