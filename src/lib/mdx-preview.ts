import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';

type HtmlNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HtmlNode[];
  [key: string]: unknown;
};

const MATH_SCROLL_CLASS = 'math-scroll';
const MATH_SCROLL_INNER_CLASS = 'math-scroll__inner';

function getClassNames(node: HtmlNode) {
  const className = node.properties?.className ?? node.properties?.class;

  if (Array.isArray(className)) {
    return className.map(String);
  }

  if (typeof className === 'string') {
    return className.split(/\s+/).filter(Boolean);
  }

  return [];
}

function hasClass(node: HtmlNode, className: string) {
  return getClassNames(node).includes(className);
}

function isDisplayMathNode(node: HtmlNode) {
  if (node.type !== 'element') {
    return false;
  }

  if (hasClass(node, 'katex-display')) {
    return true;
  }

  const display = node.properties?.display;
  return node.tagName === 'mjx-container' && (display === true || display === 'true');
}

function createWrapper(node: HtmlNode): HtmlNode {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: [MATH_SCROLL_CLASS] },
    children: [
      {
        type: 'element',
        tagName: 'div',
        properties: { className: [MATH_SCROLL_INNER_CLASS] },
        children: [node],
      },
    ],
  };
}

function wrapDisplayMath(parent: HtmlNode) {
  if (!Array.isArray(parent.children)) {
    return;
  }

  parent.children = parent.children.map((child) => {
    if (isDisplayMathNode(child) && !hasClass(parent, MATH_SCROLL_INNER_CLASS)) {
      return createWrapper(child);
    }

    wrapDisplayMath(child);
    return child;
  });
}

function rehypeWrapDisplayMath() {
  return (tree: unknown) => {
    wrapDisplayMath(tree as HtmlNode);
  };
}

export async function renderMarkdownPreviewToHtml(source: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex, { strict: false, throwOnError: false })
    .use(rehypeWrapDisplayMath)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(source);

  return String(file);
}

export async function renderInlineMarkdownPreviewToHtml(source: string) {
  const inlineSource = source
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, math: string) => `$${math.trim()}$`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math: string) => `$${math.trim()}$`)
    .replace(/\s+/g, ' ')
    .trim();
  const html = await renderMarkdownPreviewToHtml(inlineSource);
  const paragraphMatch = html.match(/^<p>([\s\S]*)<\/p>$/);

  return paragraphMatch ? paragraphMatch[1] ?? '' : html;
}
