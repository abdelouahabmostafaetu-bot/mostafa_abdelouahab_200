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

type MarkdownNode = {
  type?: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hChildren?: MarkdownNode[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const MATH_SCROLL_CLASS = 'math-scroll';
const MATH_SCROLL_INNER_CLASS = 'math-scroll__inner';

type MathReferenceMap = Map<string, string>;

const BRACED_LABEL_PATTERN = /\\label\s*\{([^{}]+)\}/g;
const LOOSE_LABEL_PATTERN = /\\label\s*:?\s*([A-Za-z][\w.-]*)\s*:\s*([A-Za-z0-9_.:-]+)/g;
const BRACED_EQREF_PATTERN = /\\eqref\s*\{([^{}]+)\}/g;
const LOOSE_EQREF_PATTERN = /\\eqref\s*:?\s*([A-Za-z][\w.-]*)\s*:\s*([A-Za-z0-9_.:-]+)/g;
const BRACED_REF_PATTERN = /(^|[^A-Za-z])\\ref\s*\{([^{}]+)\}/g;
const LOOSE_REF_PATTERN =
  /(^|[^A-Za-z])\\ref\s*:?\s*([A-Za-z][\w.-]*)\s*:\s*([A-Za-z0-9_.:-]+)/g;

function normalizeReferenceId(value: string) {
  return value.replace(/\s+/g, '').replace(/^:+/, '');
}

function buildReferenceId(left: string, right: string) {
  return normalizeReferenceId(`${left}:${right}`);
}

function inferReferenceNumber(id: string) {
  return normalizeReferenceId(id).match(/(\d+)$/)?.[1] ?? '';
}

function collectMathReferenceLabels(source: string): MathReferenceMap {
  const labels: MathReferenceMap = new Map();
  let nextLabelNumber = 1;

  function addLabel(id: string) {
    const normalizedId = normalizeReferenceId(id);

    if (!normalizedId || labels.has(normalizedId)) {
      return;
    }

    labels.set(normalizedId, inferReferenceNumber(normalizedId) || String(nextLabelNumber));
    nextLabelNumber += 1;
  }

  source
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .forEach((chunk) => {
      if (chunk.startsWith('```') || chunk.startsWith('~~~')) {
        return;
      }

      for (const match of chunk.matchAll(BRACED_LABEL_PATTERN)) {
        addLabel(match[1] ?? '');
      }

      for (const match of chunk.matchAll(LOOSE_LABEL_PATTERN)) {
        addLabel(buildReferenceId(match[1] ?? '', match[2] ?? ''));
      }
    });

  return labels;
}

function getReferenceNumber(id: string, labels: MathReferenceMap) {
  const normalizedId = normalizeReferenceId(id);
  return labels.get(normalizedId) || inferReferenceNumber(normalizedId);
}

function formatEqref(id: string, labels: MathReferenceMap) {
  const number = getReferenceNumber(id, labels);
  return number ? `\\text{(${number})}` : '\\text{(?)}';
}

function formatRef(id: string, labels: MathReferenceMap) {
  const number = getReferenceNumber(id, labels);
  return number ? `\\text{${number}}` : '\\text{?}';
}

function normalizeKatexReferences(value: string, labels: MathReferenceMap) {
  return value
    .replace(BRACED_EQREF_PATTERN, (_, id: string) => formatEqref(id, labels))
    .replace(LOOSE_EQREF_PATTERN, (_, left: string, right: string) =>
      formatEqref(buildReferenceId(left, right), labels),
    )
    .replace(BRACED_REF_PATTERN, (_, prefix: string, id: string) => `${prefix}${formatRef(id, labels)}`)
    .replace(LOOSE_REF_PATTERN, (_, prefix: string, left: string, right: string) =>
      `${prefix}${formatRef(buildReferenceId(left, right), labels)}`,
    );
}

function normalizeKatexLabels(value: string, labels: MathReferenceMap, isDisplayMath: boolean) {
  const hasTag = /\\tag\*?\s*\{/.test(value);
  let usedGeneratedTag = false;

  function replacement(id: string) {
    const number = getReferenceNumber(id, labels);

    if (isDisplayMath && number && !hasTag && !usedGeneratedTag) {
      usedGeneratedTag = true;
      return `\\tag{${number}}`;
    }

    return '';
  }

  return value
    .replace(BRACED_LABEL_PATTERN, (_, id: string) => replacement(id))
    .replace(LOOSE_LABEL_PATTERN, (_, left: string, right: string) =>
      replacement(buildReferenceId(left, right)),
    );
}

function normalizeKatexMathValue(value: string, labels: MathReferenceMap, isDisplayMath: boolean) {
  const normalizedValue = value
    .replace(/\\begin\{align\*?\}/g, '\\begin{aligned}')
    .replace(/\\end\{align\*?\}/g, '\\end{aligned}');

  return normalizeKatexLabels(
    normalizeKatexReferences(normalizedValue, labels),
    labels,
    isDisplayMath,
  );
}

function normalizeKatexMarkdownChunk(value: string) {
  return value
    .replace(/\$\$\s*\\begin\{align\*?\}/g, () => '$$\n\\begin{aligned}')
    .replace(/\\end\{align\*?\}\s*\$\$/g, () => '\\end{aligned}\n$$');
}

function normalizeKatexMarkdownSource(source: string) {
  return source
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g)
    .map((chunk) => {
      if (chunk.startsWith('```') || chunk.startsWith('~~~')) {
        return chunk;
      }

      return normalizeKatexMarkdownChunk(chunk);
    })
    .join('');
}

function updateFirstTextChildValue(nodes: MarkdownNode[] | undefined, value: string): boolean {
  if (!Array.isArray(nodes)) {
    return false;
  }

  for (const child of nodes) {
    if (child.type === 'text') {
      child.value = value;
      return true;
    }

    if (updateFirstTextChildValue(child.children, value)) {
      return true;
    }
  }

  return false;
}

function setMathNodeValue(node: MarkdownNode, value: string) {
  node.value = value;
  updateFirstTextChildValue(node.data?.hChildren, value);
}

function normalizeMathNodes(node: MarkdownNode, labels: MathReferenceMap) {
  if ((node.type === 'math' || node.type === 'inlineMath') && typeof node.value === 'string') {
    setMathNodeValue(
      node,
      normalizeKatexMathValue(node.value, labels, node.type === 'math'),
    );
  }

  if (!Array.isArray(node.children)) {
    return;
  }

  node.children.forEach((child) => normalizeMathNodes(child, labels));
}

function createRemarkNormalizeKatexMath(labels: MathReferenceMap) {
  return function remarkNormalizeKatexMath() {
    return (tree: unknown) => {
      normalizeMathNodes(tree as MarkdownNode, labels);
    };
  };
}

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
  const normalizedSource = normalizeKatexMarkdownSource(source);
  const referenceLabels = collectMathReferenceLabels(normalizedSource);

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(createRemarkNormalizeKatexMath(referenceLabels))
    .use(remarkRehype)
    .use(rehypeKatex, { strict: false, throwOnError: false })
    .use(rehypeWrapDisplayMath)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(normalizedSource);

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
