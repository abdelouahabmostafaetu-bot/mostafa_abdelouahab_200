import { createElement } from 'react';
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import { getMDXComponents } from '@/components/blog/MDXComponents';
import {
  collectMathReferenceLabels,
  createRemarkNormalizeKatexMath,
  normalizeKatexMarkdownSource,
  rehypeWrapDisplayMath,
  renderMarkdownPreviewToHtml,
} from '@/lib/mdx-preview';
import { sanitizeMarkdownSource } from '@/lib/security';

export async function renderMDX(source: string) {
  const normalizedSource = normalizeKatexMarkdownSource(sanitizeMarkdownSource(source));
  const referenceLabels = collectMathReferenceLabels(normalizedSource);

  try {
    const { content } = await compileMDX({
      source: normalizedSource,
      options: {
        mdxOptions: {
          remarkPlugins: [
            remarkMath,
            remarkGfm,
            createRemarkNormalizeKatexMath(referenceLabels),
          ],
          rehypePlugins: [
            [rehypeKatex, { strict: false, throwOnError: false }],
            rehypeWrapDisplayMath,
            rehypeSlug,
          ],
        },
      },
      components: getMDXComponents({}),
    });

    return content;
  } catch (error) {
    console.error('MDX render failed; falling back to Markdown renderer:', error);
    const html = await renderMarkdownPreviewToHtml(source);

    return createElement('div', {
      className: 'blog-content-fallback',
      dangerouslySetInnerHTML: { __html: html },
    });
  }
}

export function extractHeadings(content: string) {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    headings.push({ id, text, level });
  }

  return headings;
}
