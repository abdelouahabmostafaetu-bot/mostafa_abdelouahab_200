import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';

export async function renderMarkdownPreviewToHtml(source: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex, { strict: false, throwOnError: false })
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(source);

  return String(file);
}

export async function renderInlineMarkdownPreviewToHtml(source: string) {
  const html = await renderMarkdownPreviewToHtml(source.replace(/\s+/g, ' ').trim());
  const paragraphMatch = html.match(/^<p>([\s\S]*)<\/p>$/);

  return paragraphMatch ? paragraphMatch[1] ?? '' : html;
}
