'use client';

import katex from 'katex';

type Segment = { type: 'text' | 'inline' | 'block'; value: string };

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatText(input: string): string {
  let out = escapeHtml(input);
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-[var(--color-bg-muted)] px-1 py-0.5 text-[0.85em]">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\n/g, '<br/>');
  return out;
}

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false });
  } catch {
    return escapeHtml(tex);
  }
}

export default function MathText({ text }: { text: string }) {
  const segments: Segment[] = [];
  const regex = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'block', value: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'block', value: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: 'inline', value: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'inline', value: match[4] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  const parts = segments.map((seg) => {
    if (seg.type === 'text') return formatText(seg.value);
    if (seg.type === 'block') {
      return '<div class="my-2 overflow-x-auto">' + renderMath(seg.value, true) + '</div>';
    }
    return renderMath(seg.value, false);
  });

  const html = parts.join('');
  const htmlProp = { __html: html };

  return (
    <div
      className="text-sm leading-7 text-[var(--color-text)]"
      dangerouslySetInnerHTML={htmlProp}
    />
  );
}
