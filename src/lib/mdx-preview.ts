import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeMathjax from 'rehype-mathjax/browser';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';

export async function renderMarkdownPreviewToHtml(source: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeMathjax, {
      tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']],
      },
    })
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(source);

  return String(file);
}
