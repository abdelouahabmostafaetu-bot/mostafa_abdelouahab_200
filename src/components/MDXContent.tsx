import { renderMDX } from "@/lib/mdx";

/**
 * MDXContent — renders a Markdown/MDX string with full LaTeX (KaTeX) support.
 *
 * Uses the same pipeline as blog posts:
 *   remark-math → remark-gfm → rehype-katex → rehype-slug
 *
 * Wrap the output in a `prose-academic blog-content` div at the call site
 * to apply article typography styles.
 */
export default async function MDXContent({ content }: { content: string }) {
  const rendered = await renderMDX(content);
  return <>{rendered}</>;
}
