import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MathCopyButton from '@/features/blog/components/MathCopyButton';
import PdfDownloadButton from '@/features/blog/components/PdfDownloadButton';
import TableOfContents from '@/features/blog/components/TableOfContents';
import { TagList } from '@/features/blog/components/Tag';
import { getBlogPost, getBlogPosts } from '@/features/blog/lib/blog-content';
import { renderMDX, extractHeadings } from '@/features/blog/lib/blog-mdx';

export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) return { title: 'Post Not Found' };
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getBlogPost(params.slug);

  if (!post) {
    notFound();
  }

  const content = await renderMDX(post.content);
  const headings = extractHeadings(post.content);

  return (
    <div className="pt-16 md:pt-28 pb-12 md:pb-20">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <Link
          href="/blog"
          className="group mb-6 md:mb-10 inline-flex items-center gap-1.5 text-[10px] md:text-xs uppercase tracking-[0.16em] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors duration-200"
        >
          <ArrowLeft size={12} />
          All Posts
        </Link>

        <div className="flex gap-10 xl:gap-14">
          <article className="flex-grow min-w-0">
            <div className="md:rounded-xl border-none md:border md:border-[var(--color-border)] bg-transparent md:bg-[var(--color-surface)] py-2 md:p-10">
              <header className="mb-8 md:mb-12 border-b border-[var(--color-border)]/60 pb-6 md:pb-8">
                <div className="mb-4 md:mb-5 flex flex-wrap items-center gap-2.5 text-xs text-[var(--color-text-tertiary)] uppercase tracking-widest font-medium">
                  <span>{post.category}</span>
                </div>

                <h1
                  className="text-[1.95rem] md:text-[2.8rem] font-semibold text-[var(--color-text)] leading-[1.1]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p className="mt-4 md:mt-5 text-base md:text-lg text-[var(--color-text-secondary)] leading-7 md:leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                {post.tags.length > 0 && (
                  <div className="mt-5">
                    <TagList tags={post.tags} size="md" />
                  </div>
                )}
                
                <PdfDownloadButton title={post.title} />
              </header>

              <div className="prose-academic">
                <MathCopyButton />
                {content}
              </div>

              <div className="mt-16 border-t border-[var(--color-border)]/60 pt-8">
                <Link
                  href="/blog"
                  className="group inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors duration-200 font-medium"
                >
                  <ArrowLeft size={14} />
                  Back to all posts
                </Link>
              </div>
            </div>
          </article>

          {headings.length > 0 && (
            <aside className="hidden xl:block w-48 flex-shrink-0">
              <TableOfContents headings={headings} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
